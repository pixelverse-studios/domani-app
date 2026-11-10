#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-atomic-refund.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
psql=("$pg_bin/psql" -X -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
# Load the real current transition and its role grants, without unrelated promo
# schema/fixtures. This branch of the transition does not confirm a promo.
sed -n '/^CREATE OR REPLACE FUNCTION public.apply_revenuecat_webhook_transition(/,$p' \
  "$repo/supabase/migrations/20261020132646_recover_delayed_verified_paid_promos.sql" \
  >"$fixture_dir/transition.sql"
"${psql[@]}" <<SQL
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE TYPE public.tier AS ENUM ('none','trialing','lifetime');
CREATE TYPE public.refund_request_status AS ENUM ('pending_review','approved','denied');
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY,tier public.tier DEFAULT 'lifetime',purchased_at timestamptz,
 refunded_at timestamptz,trial_ends_at timestamptz,revenuecat_user_id text,updated_at timestamptz
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.purchase_refund_states (
 user_id uuid PRIMARY KEY,platform text,status public.refund_request_status,client_hint text,
 requested_at timestamptz,resolved_at timestamptz,last_source text,last_error text
);
CREATE TABLE public.promo_redemption_attempts (
 id uuid,user_id uuid,code_id uuid,campaign_id uuid,store_product_id text,status text
);
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
\i $fixture_dir/transition.sql
\i $repo/supabase/migrations/20261020133858_atomic_revenuecat_refund_state.sql
INSERT INTO public.profiles(id,purchased_at) SELECT
 ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,'2026-10-01'
 FROM generate_series(1,4) i;
DO \$\$ DECLARE who text; BEGIN
 FOREACH who IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_function_privilege(who,
   'public.apply_revenuecat_webhook_transition_with_refund_state(uuid,text,timestamptz,text,text,timestamptz,text,uuid,uuid,uuid,text)','EXECUTE') THEN
   RAISE EXCEPTION 'Ordinary role can apply approved refund state'; END IF;
 END LOOP;
END \$\$;
SET ROLE authenticated;
DO \$\$ BEGIN
 BEGIN
  PERFORM public.apply_revenuecat_webhook_transition_with_refund_state(
   '00000000-0000-0000-0000-000000000001','refund','2026-10-02','APP_STORE','REFUND');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Client refund accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END \$\$;
RESET ROLE;
SET ROLE service_role;
DO \$\$ DECLARE result jsonb; BEGIN
 result := public.apply_revenuecat_webhook_transition_with_refund_state(
  '00000000-0000-0000-0000-000000000001','refund','2026-10-02','app_store','REFUND');
 IF result->>'status'<>'applied' OR NOT EXISTS(SELECT 1 FROM public.purchase_refund_states
  WHERE user_id='00000000-0000-0000-0000-000000000001' AND platform='ios' AND status='approved'
   AND client_hint IS NULL AND requested_at='2026-10-02' AND resolved_at='2026-10-02'
   AND last_source='revenuecat:REFUND' AND last_error IS NULL) THEN
  RAISE EXCEPTION 'Accepted refund and canonical hint not atomic'; END IF;
 result := public.apply_revenuecat_webhook_transition_with_refund_state(
  '00000000-0000-0000-0000-000000000001','refund','2026-10-02','APP_STORE','REFUND');
 IF result->>'status'<>'already_applied' THEN RAISE EXCEPTION 'Duplicate refund was not idempotent'; END IF;
 PERFORM public.apply_revenuecat_webhook_transition_with_refund_state(
  '00000000-0000-0000-0000-000000000001','grant','2026-10-03','APP_STORE','INITIAL_PURCHASE',
  '2026-10-03','domani_lifetime');
 result := public.apply_revenuecat_webhook_transition_with_refund_state(
  '00000000-0000-0000-0000-000000000001','refund','2026-10-02','APP_STORE','REFUND');
 IF result->>'status'<>'stale' OR EXISTS(SELECT 1 FROM public.purchase_refund_states
  WHERE user_id='00000000-0000-0000-0000-000000000001') THEN
  RAISE EXCEPTION 'Old duplicate recreated cleared refund hint'; END IF;
 PERFORM public.apply_revenuecat_webhook_transition_with_refund_state(
  '00000000-0000-0000-0000-000000000002','refund','2026-10-02','MAC_APP_STORE','CANCELLATION');
 IF NOT EXISTS(SELECT 1 FROM public.purchase_refund_states
  WHERE user_id='00000000-0000-0000-0000-000000000002' AND status='approved'
   AND last_source='revenuecat:CANCELLATION') THEN RAISE EXCEPTION 'Mac refund hint lost'; END IF;
 PERFORM public.apply_revenuecat_webhook_transition_with_refund_state(
  '00000000-0000-0000-0000-000000000003','refund','2026-10-02','PLAY_STORE','REFUND');
 IF EXISTS(SELECT 1 FROM public.purchase_refund_states
  WHERE user_id='00000000-0000-0000-0000-000000000003') THEN
  RAISE EXCEPTION 'Android refund minted iOS hint'; END IF;
END \$\$;
RESET ROLE;
-- A hint-storage failure must roll back the matching profile transition.
CREATE FUNCTION public.fail_refund_fixture() RETURNS trigger LANGUAGE plpgsql AS \$\$
BEGIN RAISE EXCEPTION 'fixture storage failure'; END \$\$;
CREATE TRIGGER fail_refund_fixture BEFORE INSERT ON public.purchase_refund_states
 FOR EACH ROW EXECUTE FUNCTION public.fail_refund_fixture();
SET ROLE service_role;
DO \$\$ BEGIN
 BEGIN
  PERFORM public.apply_revenuecat_webhook_transition_with_refund_state(
   '00000000-0000-0000-0000-000000000004','refund','2026-10-02','APP_STORE','REFUND');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Fixture storage failure not raised';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000004'
  AND tier='lifetime' AND purchased_at='2026-10-01' AND refunded_at IS NULL) THEN
  RAISE EXCEPTION 'Profile changed despite refund hint failure'; END IF;
END \$\$;
RESET ROLE;
DROP TRIGGER fail_refund_fixture ON public.purchase_refund_states;
SQL
# Two separate transactions race: refund holds the profile lock through hint
# persistence; the newer grant waits then clears the hint under the same lock.
"${psql[@]}" <<'SQL' &
BEGIN;
SET ROLE service_role;
SELECT public.apply_revenuecat_webhook_transition_with_refund_state(
 '00000000-0000-0000-0000-000000000004','refund','2026-10-02','APP_STORE','REFUND');
SELECT pg_sleep(0.5);
COMMIT;
SQL
refund_pid=$!
"${psql[@]}" <<'SQL' &
SET ROLE service_role;
SELECT public.apply_revenuecat_webhook_transition_with_refund_state(
 '00000000-0000-0000-0000-000000000004','grant','2026-10-03','APP_STORE','INITIAL_PURCHASE',
 '2026-10-03','domani_lifetime');
SQL
grant_pid=$!
wait "$refund_pid"
wait "$grant_pid"
"${psql[@]}" <<'SQL'
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000004'
  AND tier='lifetime' AND purchased_at='2026-10-03' AND refunded_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.purchase_refund_states
  WHERE user_id='00000000-0000-0000-0000-000000000004') THEN
  RAISE EXCEPTION 'Racing older refund survived newer grant'; END IF;
END $$;
SQL
echo 'DEV-1420 atomic refund state role, rollback, duplicate and concurrency tests passed'
