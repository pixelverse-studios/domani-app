#!/usr/bin/env bash
# Independent cluster only; no DATABASE_URL or shared/hosted database access.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-webhook-lease.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
psql=("$pg_bin/psql" -X -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${psql[@]}" <<SQL
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.revenuecat_webhook_events (
 event_id text PRIMARY KEY,event_type text NOT NULL,app_user_id text,
 original_app_user_id text,aliases jsonb NOT NULL DEFAULT '[]',product_id text,
 store text,environment text,event_timestamp timestamptz,processed_action text NOT NULL,
 raw_event jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,processing_error text
);
ALTER TABLE public.revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.revenuecat_webhook_events TO service_role;
\i $repo/supabase/migrations/20261020133249_lease_revenuecat_webhook_processing.sql
DO \$\$
DECLARE who text;
BEGIN
 FOREACH who IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_function_privilege(who,'public.claim_revenuecat_webhook_event(jsonb)','EXECUTE') THEN
   RAISE EXCEPTION '% may claim private webhook',who;
  END IF;
 END LOOP;
END;
\$\$;
SET ROLE authenticated;
DO \$\$ BEGIN
 BEGIN
  PERFORM public.claim_revenuecat_webhook_event('{"id":"forged","type":"INITIAL_PURCHASE"}');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Ordinary role claimed event';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END \$\$;
RESET ROLE;
SET ROLE service_role;
DO \$\$
DECLARE result jsonb; old_token uuid; new_token uuid; changed integer;
 event jsonb := '{"id":"lease-contract","type":"INITIAL_PURCHASE","event_timestamp_ms":1234567890000,"product_id":"domani_lifetime","aliases":["fixture-only"]}';
BEGIN
 result := public.claim_revenuecat_webhook_event(event);
 old_token := (result->>'token')::uuid;
 IF result->>'status'<>'claimed' OR old_token IS NULL THEN RAISE EXCEPTION 'Initial claim failed'; END IF;
 IF public.claim_revenuecat_webhook_event(event)->>'status'<>'in_progress' THEN
  RAISE EXCEPTION 'Active duplicate was not in progress'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.revenuecat_webhook_events WHERE event_id='lease-contract'
  AND raw_event=event AND claim_token=old_token AND processed_at IS NULL) THEN
  RAISE EXCEPTION 'Claim lost original event or completion state'; END IF;
 -- A dead processor can be replaced after the five-minute lease.
 UPDATE public.revenuecat_webhook_events SET claimed_at=clock_timestamp()-interval '6 minutes'
 WHERE event_id='lease-contract';
 result := public.claim_revenuecat_webhook_event(event);
 new_token := (result->>'token')::uuid;
 IF result->>'status'<>'claimed' OR new_token IS NULL OR new_token=old_token THEN
  RAISE EXCEPTION 'Expired lease not replaced'; END IF;
 -- Mirror the handler finalize and release predicates. A stale process must
 -- neither mark completion nor clear its replacement processor's token.
 UPDATE public.revenuecat_webhook_events SET processed_action='stale-finalized',
  processed_at=now(),claim_token=NULL,claimed_at=NULL
 WHERE event_id='lease-contract' AND claim_token=old_token;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Stale token finalized'; END IF;
 UPDATE public.revenuecat_webhook_events SET processed_action='retry_pending',claim_token=NULL,claimed_at=NULL
 WHERE event_id='lease-contract' AND claim_token=old_token;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Stale token released replacement'; END IF;
 -- An explicit transient failure releases its own claim and retains the body.
 UPDATE public.revenuecat_webhook_events SET processed_action='retry_pending',claim_token=NULL,claimed_at=NULL
 WHERE event_id='lease-contract' AND claim_token=new_token;
 result := public.claim_revenuecat_webhook_event(event);
 IF result->>'status'<>'claimed' THEN RAISE EXCEPTION 'Released failure was not retryable'; END IF;
 new_token := (result->>'token')::uuid;
 UPDATE public.revenuecat_webhook_events SET processed_action='granted_lifetime',processed_at=now(),
  claim_token=NULL,claimed_at=NULL WHERE event_id='lease-contract' AND claim_token=new_token;
 IF public.claim_revenuecat_webhook_event(event)->>'status'<>'already_processed' THEN
  RAISE EXCEPTION 'Completed event was reprocessed'; END IF;
 -- Pre-lease crash rows have no token or claimed_at; created_at is their lease baseline.
 INSERT INTO public.revenuecat_webhook_events(event_id,event_type,processed_action,raw_event,created_at)
 VALUES('old-crash','INITIAL_PURCHASE','processing','{}',now()-interval '6 minutes');
 IF public.claim_revenuecat_webhook_event('{"id":"old-crash","type":"INITIAL_PURCHASE"}')->>'status'<>'claimed' THEN
  RAISE EXCEPTION 'Pre-lease orphan was not recovered'; END IF;
END;
\$\$;
SQL
# Force overlap: the first session holds its insertion until after the second
# starts. The competing INSERT waits, then observes the committed active lease.
"${psql[@]}" -At >"$fixture_dir/first.result" <<'SQL' &
BEGIN;
SET ROLE service_role;
SELECT public.claim_revenuecat_webhook_event('{"id":"race","type":"INITIAL_PURCHASE"}')->>'status';
SELECT pg_sleep(0.5);
COMMIT;
SQL
first_pid=$!
"${psql[@]}" -At >"$fixture_dir/second.result" <<'SQL' &
SET ROLE service_role;
SELECT public.claim_revenuecat_webhook_event('{"id":"race","type":"INITIAL_PURCHASE"}')->>'status';
SQL
second_pid=$!
wait "$first_pid"
wait "$second_pid"
# Scheduling may start either connection first; exactly one can own the lease.
claimed_count=$(cat "$fixture_dir/first.result" "$fixture_dir/second.result" | awk '$0=="claimed" {n++} END {print n+0}')
progress_count=$(cat "$fixture_dir/first.result" "$fixture_dir/second.result" | awk '$0=="in_progress" {n++} END {print n+0}')
[[ $claimed_count == 1 && $progress_count == 1 ]] || {
  echo 'Concurrent webhook claim did not elect exactly one processor' >&2; exit 1;
}
echo 'DEV-1420 webhook lease role, expiry, retry, token fencing and concurrency tests passed'
