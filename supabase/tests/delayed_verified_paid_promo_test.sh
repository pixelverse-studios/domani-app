#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-delayed-promo.XXXXXX")
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
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');
CREATE TYPE public.promo_redemption_status AS ENUM ('valid','confirmed','expired');
CREATE TYPE public.promo_code_status AS ENUM ('active','exhausted');
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY, tier public.tier DEFAULT 'none', purchased_at timestamptz,
 refunded_at timestamptz, trial_ends_at timestamptz, revenuecat_user_id text,
 updated_at timestamptz
);
CREATE TABLE public.promo_codes (
 id uuid PRIMARY KEY, status public.promo_code_status DEFAULT 'active',
 redemption_count integer DEFAULT 0, max_redemptions integer DEFAULT 100,
 max_redemptions_per_user integer DEFAULT 100
);
CREATE TABLE public.promo_campaigns (
 id uuid PRIMARY KEY, ios_product_id text, android_product_id text,
 redemption_count integer DEFAULT 0, max_redemptions integer DEFAULT 100,
 max_redemptions_per_user integer DEFAULT 100
);
CREATE TABLE public.promo_redemption_attempts (
 id uuid PRIMARY KEY, user_id uuid, code_id uuid, campaign_id uuid,
 status public.promo_redemption_status DEFAULT 'valid', platform text DEFAULT 'ios',
 created_at timestamptz, confirmed_at timestamptz, revenuecat_app_user_id text,
 store_product_id text, store_transaction_id text, error_code text, error_message text,
 response_payload jsonb DEFAULT '{}'
);
CREATE TABLE public.purchase_refund_states(user_id uuid PRIMARY KEY);
CREATE TABLE public.revenuecat_access_reconciliation_requests (
 user_id uuid PRIMARY KEY, requested_at timestamptz, reconciled_at timestamptz,
 last_attempt_at timestamptz
);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
\i $repo/supabase/migrations/20261020132646_recover_delayed_verified_paid_promos.sql
DO \$\$
BEGIN
 IF has_function_privilege('anon','public.confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text,timestamptz)','EXECUTE')
 OR has_function_privilege('authenticated','public.confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text,timestamptz)','EXECUTE') THEN
   RAISE EXCEPTION 'Clients can confirm paid promos';
 END IF;
END;
\$\$;
INSERT INTO public.profiles(id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO public.promo_codes(id) VALUES ('20000000-0000-4000-8000-000000000001');
INSERT INTO public.promo_campaigns(id,ios_product_id) VALUES
 ('30000000-0000-4000-8000-000000000001','domani_lifetime_friends');
INSERT INTO public.promo_redemption_attempts(id,user_id,code_id,campaign_id,created_at)
SELECT ('40000000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,
 '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
 '30000000-0000-4000-8000-000000000001', now() - interval '2 days'
FROM generate_series(1,7) i;
SET ROLE service_role;
DO \$\$
DECLARE result jsonb; purchase_at timestamptz := now() - interval '2 days' + interval '10 minutes';
BEGIN
 result := public.apply_verified_revenuecat_lifetime_access(
  '10000000-0000-4000-8000-000000000001',purchase_at,'domani_lifetime_friends',
  '40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001');
 IF result->>'accessGranted' <> 'true' OR result#>>'{promoConfirmation,status}' <> 'confirmed' THEN
  RAISE EXCEPTION 'Delayed valid purchase failed: %',result;
 END IF;
 result := public.apply_verified_revenuecat_lifetime_access(
  '10000000-0000-4000-8000-000000000001',purchase_at,'domani_lifetime_friends',
  '40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001');
 IF result#>>'{promoConfirmation,status}' <> 'already_confirmed' OR
  (SELECT redemption_count FROM public.promo_codes LIMIT 1) <> 1 THEN
  RAISE EXCEPTION 'Retry consumed promo again';
 END IF;
 -- A later recorded purchase must not substitute for the evidence passed now.
 UPDATE public.profiles SET purchased_at = purchase_at;
 BEGIN
  PERFORM public.apply_verified_revenuecat_lifetime_access(
   '10000000-0000-4000-8000-000000000001',purchase_at + interval '1 hour','domani_lifetime_friends',
   '40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Late purchase accepted';
 EXCEPTION WHEN raise_exception THEN NULL;
 END;
 BEGIN
  PERFORM public.apply_verified_revenuecat_lifetime_access(
   '10000000-0000-4000-8000-000000000001',purchase_at - interval '1 hour','domani_lifetime_friends',
   '40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Purchase before attempt accepted';
 EXCEPTION WHEN raise_exception THEN NULL;
 END;
 BEGIN
  PERFORM public.apply_verified_revenuecat_lifetime_access(
   '10000000-0000-4000-8000-000000000001',purchase_at,'domani_lifetime_early',
   '40000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Wrong product accepted';
 EXCEPTION WHEN raise_exception THEN NULL;
 END;
 BEGIN
  PERFORM public.apply_verified_revenuecat_lifetime_access(
   '10000000-0000-4000-8000-000000000001',purchase_at,'domani_lifetime_friends',
   '40000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000099',
   '30000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Wrong binding accepted';
 EXCEPTION WHEN raise_exception THEN NULL;
 END;
 result := public.apply_revenuecat_webhook_transition(
  '10000000-0000-4000-8000-000000000001','grant',now(),purchase_at,'domani_lifetime_friends',
  '40000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001','verified-store-transaction');
 IF result->>'status' <> 'applied' OR
   (SELECT redemption_count FROM public.promo_codes LIMIT 1) <> 2 THEN
  RAISE EXCEPTION 'Delayed webhook failed or failed attempts consumed counts: %',result;
 END IF;
 result := public.apply_revenuecat_webhook_transition(
  '10000000-0000-4000-8000-000000000001','refund',now());
 result := public.apply_revenuecat_webhook_transition(
  '10000000-0000-4000-8000-000000000001','reversal',now()+interval '1 second',
  now()+interval '1 second','domani_lifetime_friends',
  '40000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001','verified-store-transaction');
 IF result->>'status' <> 'applied' OR
   (SELECT redemption_count FROM public.promo_codes LIMIT 1) <> 2 THEN
  RAISE EXCEPTION 'Delayed refund reversal with original promo context failed: %',result;
 END IF;
 IF (SELECT count(*) FROM public.promo_redemption_attempts WHERE status='confirmed') <> 2 THEN
  RAISE EXCEPTION 'Failed grant persisted promo state';
 END IF;
END;
\$\$;
SQL
echo "Delayed verified paid promo test passed"
