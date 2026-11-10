#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1420-email.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT

"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
"$pg_bin/psql" -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SQL
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
\$\$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  deleted_at timestamptz,
  deletion_scheduled_for timestamptz
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO service_role;
CREATE FUNCTION public.schedule_account_deletion(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS \$\$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'wrong caller'; END IF;
  UPDATE public.profiles SET deleted_at = now(),
    deletion_scheduled_for = now() + interval '30 days' WHERE id = p_user_id;
END;
\$\$;
CREATE FUNCTION public.cancel_account_deletion(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS \$\$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'wrong caller'; END IF;
  UPDATE public.profiles SET deleted_at = NULL,
    deletion_scheduled_for = NULL WHERE id = p_user_id;
END;
\$\$;
INSERT INTO public.profiles (id, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Recorded Name');
INSERT INTO public.profiles (id, full_name, deleted_at, deletion_scheduled_for)
VALUES ('00000000-0000-0000-0000-000000000002', 'In-flight deletion',
  now() - interval '1 minute', now() + interval '30 days');
\i $repo/supabase/migrations/20261015175330_claim_account_email_events.sql
\i $repo/supabase/migrations/20261015183555_retry_pending_account_emails.sql
DO \$\$
BEGIN
  IF has_table_privilege('authenticated', 'public.account_email_events', 'SELECT')
     OR has_function_privilege('authenticated',
       'public.claim_account_email_event(uuid,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.claim_account_email_event(uuid,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.list_pending_account_email_events(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'email claim permissions are wrong';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.account_email_events
    WHERE user_id = '00000000-0000-0000-0000-000000000002'
      AND event_type = 'account_deletion'
  ) THEN
    RAISE EXCEPTION 'in-flight released-client event was lost';
  END IF;
END;
\$\$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
UPDATE public.profiles SET deleted_at = now(),
  deletion_scheduled_for = now() + interval '2 days'
WHERE id = '00000000-0000-0000-0000-000000000001';
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'direct client deletion state write succeeded';
  END IF;
END;
\$\$;
SELECT public.schedule_account_deletion('00000000-0000-0000-0000-000000000001');
RESET ROLE;
SET ROLE service_role;
DO \$\$
DECLARE result jsonb; token uuid; event_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.list_pending_account_email_events()) <> 2 THEN
    RAISE EXCEPTION 'pending account emails were not listed for retry';
  END IF;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_reactivation', 'verified@example.com'
  );
  IF result->>'status' <> 'no_matching_event' THEN
    RAISE EXCEPTION 'wrong event type was claimable';
  END IF;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_deletion', 'verified@example.com'
  );
  IF result->>'status' <> 'claimed'
     OR result->>'email' <> 'verified@example.com'
     OR result->>'name' <> 'Recorded Name'
     OR result->>'deletionScheduledFor' IS NULL THEN
    RAISE EXCEPTION 'recorded deletion event was not claimed';
  END IF;
  token := (result->>'claimToken')::uuid;
  event_id := (result->>'id')::uuid;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_deletion', 'forged@example.com'
  );
  IF result->>'status' <> 'in_progress' THEN
    RAISE EXCEPTION 'duplicate email claim was not blocked';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_pending_account_email_events()
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
  ) THEN RAISE EXCEPTION 'leased email appeared in retry list'; END IF;
  IF public.finish_account_email_event(event_id, gen_random_uuid(), true) THEN
    RAISE EXCEPTION 'wrong claim token completed delivery';
  END IF;
  IF NOT public.finish_account_email_event(event_id, token, false) THEN
    RAISE EXCEPTION 'provider failure did not release claim';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.list_pending_account_email_events()
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
  ) THEN RAISE EXCEPTION 'failed email was not retryable'; END IF;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_deletion', 'forged@example.com'
  );
  IF result->>'email' <> 'verified@example.com' THEN
    RAISE EXCEPTION 'retry changed verified recipient';
  END IF;
  IF NOT public.finish_account_email_event(
    event_id, (result->>'claimToken')::uuid, true
  ) THEN RAISE EXCEPTION 'delivery completion failed'; END IF;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_deletion', 'forged@example.com'
  );
  IF result->>'status' <> 'already_sent' THEN
    RAISE EXCEPTION 'sent email was claimable again';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_pending_account_email_events()
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
  ) THEN RAISE EXCEPTION 'sent email remained in retry list'; END IF;
END;
\$\$;
RESET ROLE;
SET ROLE authenticated;
SELECT public.cancel_account_deletion('00000000-0000-0000-0000-000000000001');
RESET ROLE;
SET ROLE service_role;
DO \$\$
DECLARE result jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.list_pending_account_email_events()
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
      AND event_type = 'account_deletion'
  ) THEN RAISE EXCEPTION 'stale deletion remained in retry list'; END IF;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_deletion', 'verified@example.com'
  );
  IF result->>'status' <> 'no_matching_event' THEN
    RAISE EXCEPTION 'stale deletion event was claimable after reactivation';
  END IF;
  result := public.claim_account_email_event(
    '00000000-0000-0000-0000-000000000001',
    'account_reactivation', 'verified@example.com'
  );
  IF result->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'recorded reactivation was not claimable';
  END IF;
END;
\$\$;
RESET ROLE;
INSERT INTO public.profiles (id, full_name) VALUES
  ('00000000-0000-0000-0000-000000000003', 'Retry A'),
  ('00000000-0000-0000-0000-000000000004', 'Retry B');
UPDATE public.profiles SET deleted_at = now(),
  deletion_scheduled_for = now() + interval '30 days'
WHERE id IN ('00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004');
SET ROLE service_role;
DO \$\$
DECLARE first_user uuid; second_user uuid;
BEGIN
  SELECT user_id INTO first_user FROM public.list_pending_account_email_events(1);
  SELECT user_id INTO second_user FROM public.list_pending_account_email_events(1);
  IF first_user IS NULL OR second_user IS NULL OR first_user = second_user THEN
    RAISE EXCEPTION 'failed retry monopolized the queue';
  END IF;
END;
\$\$;
SQL
echo "DEV-1420 account email SQL test passed"
