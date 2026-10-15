#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1420-access.XXXXXX")
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
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, tier public.tier NOT NULL DEFAULT 'none',
  purchased_at timestamptz, refunded_at timestamptz,
  revenuecat_user_id text, trial_started_at timestamptz,
  trial_ends_at timestamptz, is_admin boolean NOT NULL DEFAULT false,
  signup_cohort text, updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON public.profiles FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
CREATE TABLE public.posthog_trial_event_deliveries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  event_timestamp timestamptz NOT NULL,
  event_properties jsonb NOT NULL,
  claim_token uuid NOT NULL
);
CREATE TABLE public.purchase_refund_states (user_id uuid PRIMARY KEY);
GRANT SELECT, DELETE ON public.purchase_refund_states TO service_role;
CREATE TABLE public.promo_campaigns (
  id uuid PRIMARY KEY, payment_required boolean, campaign_type text,
  discount_kind text
);
CREATE TABLE public.promo_redemption_attempts (
  id uuid PRIMARY KEY, user_id uuid, code_id uuid, campaign_id uuid,
  status text, store_product_id text, created_at timestamptz DEFAULT now()
);
GRANT SELECT, UPDATE ON public.promo_redemption_attempts TO service_role;
CREATE FUNCTION public.confirm_current_user_promo_redemption(
  uuid, uuid, uuid, text, text, text
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS \$\$
  SELECT jsonb_build_object('status', 'confirmed', 'identity', \$4)
\$\$;
CREATE FUNCTION public.confirm_promo_redemption_for_user(
  uuid, uuid, uuid, uuid, text, text, text
) RETURNS jsonb LANGUAGE sql AS \$\$
  SELECT CASE WHEN \$3 = '00000000-0000-0000-0000-000000000099'::uuid
    THEN '{"status":"product_mismatch"}'::jsonb
    ELSE '{"status":"confirmed"}'::jsonb END
\$\$;
INSERT INTO public.profiles (id) VALUES
  ('00000000-0000-0000-0000-000000000001');
INSERT INTO public.promo_campaigns VALUES
  ('00000000-0000-0000-0000-000000000010', false, 'free_lifetime', 'free'),
  ('00000000-0000-0000-0000-000000000011', true, 'fixed_price_lifetime', 'fixed_price');
INSERT INTO public.promo_redemption_attempts
  (id, user_id, code_id, campaign_id) VALUES
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000011');
\i $repo/supabase/migrations/20261015164631_legacy_entitlement_compatibility_bridge.sql
\i $repo/supabase/migrations/20261015165240_apply_verified_revenuecat_access.sql
\i $repo/supabase/migrations/20261015183639_resolve_stale_revenuecat_reconciliations.sql
DO \$\$
BEGIN
  IF has_function_privilege('authenticated',
    'public.resolve_stale_revenuecat_reconciliation(uuid,timestamptz,timestamptz)',
    'EXECUTE') THEN
    RAISE EXCEPTION 'client can resolve a reconciliation request';
  END IF;
END;
\$\$;
DO \$\$
BEGIN
  IF has_function_privilege('authenticated',
    'public.apply_verified_revenuecat_lifetime_access(uuid,timestamptz,text,uuid,uuid,uuid,timestamptz)',
    'EXECUTE') OR NOT has_function_privilege('service_role',
    'public.apply_verified_revenuecat_lifetime_access(uuid,timestamptz,text,uuid,uuid,uuid,timestamptz)',
    'EXECUTE') THEN
    RAISE EXCEPTION 'verified grant function permissions are wrong';
  END IF;
END;
\$\$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO \$\$
DECLARE result jsonb;
BEGIN
  PERFORM public.request_current_user_revenuecat_reconciliation();
  result := public.confirm_current_user_promo_redemption(
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000011',
    'forged', 'domani_lifetime_friends', NULL
  );
  IF result->>'status' <> 'server_verification_required' THEN
    RAISE EXCEPTION 'paid promo accepted caller-supplied purchase evidence';
  END IF;
  result := public.confirm_current_user_promo_redemption(
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000010',
    'forged', 'domani_lifetime', NULL
  );
  IF result->>'status' <> 'confirmed'
     OR result->>'identity' <> '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'free promo compatibility or identity binding failed';
  END IF;
END;
\$\$;
RESET ROLE;
SET ROLE service_role;
DO \$\$
DECLARE result jsonb; v_seen_at timestamptz; v_resolved boolean;
BEGIN
  v_seen_at := public.claim_current_user_revenuecat_sync(
    '00000000-0000-0000-0000-000000000001'
  );
  IF v_seen_at IS NULL OR public.claim_current_user_revenuecat_sync(
    '00000000-0000-0000-0000-000000000001'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated sync attempts were not rate limited';
  END IF;
  result := public.apply_verified_revenuecat_lifetime_access(
    '00000000-0000-0000-0000-000000000001', now() - interval '1 day',
    'domani_lifetime', NULL, NULL, NULL, v_seen_at
  );
  IF result->>'status' <> 'synced_new_lifetime' THEN
    RAISE EXCEPTION 'verified first grant failed';
  END IF;
  result := public.apply_verified_revenuecat_lifetime_access(
    '00000000-0000-0000-0000-000000000001', now() - interval '1 day',
    'domani_lifetime', NULL, NULL, NULL, v_seen_at
  );
  IF result->>'status' <> 'synced' THEN
    RAISE EXCEPTION 'duplicate verification was not idempotent';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.revenuecat_access_reconciliation_requests
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
      AND reconciled_at = requested_at AND attempts = 1
  ) THEN
    RAISE EXCEPTION 'reconciliation request was not completed';
  END IF;
  IF (SELECT count(*) FROM public.claim_pending_revenuecat_reconciliations()) <> 0 THEN
    RAISE EXCEPTION 'completed reconciliation was claimed again';
  END IF;
  UPDATE public.revenuecat_access_reconciliation_requests
    SET requested_at = requested_at + interval '1 minute', last_attempt_at = NULL
    WHERE user_id = '00000000-0000-0000-0000-000000000001';
  IF (SELECT count(*) FROM public.claim_pending_revenuecat_reconciliations()) <> 1
     OR (SELECT count(*) FROM public.claim_pending_revenuecat_reconciliations()) <> 0 THEN
    RAISE EXCEPTION 'pending reconciliation claim was not leased';
  END IF;
  PERFORM public.apply_verified_revenuecat_lifetime_access(
    '00000000-0000-0000-0000-000000000001', now() - interval '1 day',
    'domani_lifetime', NULL, NULL, NULL, v_seen_at
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.revenuecat_access_reconciliation_requests
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
      AND requested_at > reconciled_at
  ) THEN
    RAISE EXCEPTION 'new request was cleared by an older verification';
  END IF;
  UPDATE public.profiles SET tier = 'none', purchased_at = NULL,
    refunded_at = now() WHERE id = '00000000-0000-0000-0000-000000000001';
  result := public.apply_verified_revenuecat_lifetime_access(
    '00000000-0000-0000-0000-000000000001', now() - interval '1 day',
    'domani_lifetime'
  );
  IF result->>'status' <> 'stale_refund' THEN
    RAISE EXCEPTION 'stale entitlement reversed a refund';
  END IF;
  v_resolved := public.resolve_stale_revenuecat_reconciliation(
    '00000000-0000-0000-0000-000000000001', now() - interval '1 day',
    v_seen_at
  );
  IF NOT v_resolved OR NOT EXISTS (
    SELECT 1 FROM public.revenuecat_access_reconciliation_requests
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
      AND requested_at > reconciled_at
  ) THEN
    RAISE EXCEPTION 'old verification cleared a newer queue request';
  END IF;
  v_resolved := public.resolve_stale_revenuecat_reconciliation(
    '00000000-0000-0000-0000-000000000001', now() - interval '1 day',
    (SELECT requested_at FROM public.revenuecat_access_reconciliation_requests
      WHERE user_id = '00000000-0000-0000-0000-000000000001')
  );
  IF NOT v_resolved OR EXISTS (
    SELECT 1 FROM public.revenuecat_access_reconciliation_requests
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
      AND requested_at > reconciled_at
  ) THEN
    RAISE EXCEPTION 'stale refunded purchase remained queued';
  END IF;
  UPDATE public.revenuecat_access_reconciliation_requests
    SET requested_at = requested_at + interval '1 minute', last_attempt_at = NULL
    WHERE user_id = '00000000-0000-0000-0000-000000000001';
  v_resolved := public.resolve_stale_revenuecat_reconciliation(
    '00000000-0000-0000-0000-000000000001', now() + interval '1 day',
    (SELECT requested_at FROM public.revenuecat_access_reconciliation_requests
      WHERE user_id = '00000000-0000-0000-0000-000000000001')
  );
  IF v_resolved OR NOT EXISTS (
    SELECT 1 FROM public.revenuecat_access_reconciliation_requests
    WHERE user_id = '00000000-0000-0000-0000-000000000001'
      AND requested_at > reconciled_at
  ) THEN
    RAISE EXCEPTION 'newer verified purchase request was closed';
  END IF;
  BEGIN
    PERFORM public.apply_verified_revenuecat_lifetime_access(
      '00000000-0000-0000-0000-000000000001', now(),
      'domani_lifetime_friends'
    );
    RAISE EXCEPTION 'promo-gated grant without context succeeded';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.apply_verified_revenuecat_lifetime_access(
      '00000000-0000-0000-0000-000000000001', now(),
      'domani_lifetime_friends',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000099',
      '00000000-0000-0000-0000-000000000003'
    );
    RAISE EXCEPTION 'failed promo confirmation granted access';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  result := public.apply_revenuecat_webhook_transition(
    '00000000-0000-0000-0000-000000000001', 'grant',
    now() + interval '1 second', now() - interval '1 day', 'domani_lifetime'
  );
  IF result->>'status' <> 'stale' THEN
    RAISE EXCEPTION 'delayed purchase webhook reversed a refund';
  END IF;
  BEGIN
    PERFORM public.apply_revenuecat_webhook_transition(
      '00000000-0000-0000-0000-000000000001', 'reversal',
      now() + interval '1 second', now() - interval '1 day',
      'domani_lifetime_friends',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000099',
      '00000000-0000-0000-0000-000000000003'
    );
    RAISE EXCEPTION 'failed webhook promo confirmation granted access';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  result := public.apply_revenuecat_webhook_transition(
    '00000000-0000-0000-0000-000000000001', 'reversal',
    now() + interval '1 second', now() - interval '1 day', 'domani_lifetime'
  );
  IF result->>'status' <> 'applied' THEN
    RAISE EXCEPTION 'valid refund reversal was blocked';
  END IF;
  result := public.apply_revenuecat_webhook_transition(
    '00000000-0000-0000-0000-000000000001', 'refund',
    now() - interval '2 days'
  );
  IF result->>'status' <> 'stale' THEN
    RAISE EXCEPTION 'older refund overwrote restored access';
  END IF;
  result := public.apply_revenuecat_webhook_transition(
    '00000000-0000-0000-0000-000000000001', 'refund',
    now() + interval '2 seconds'
  );
  IF result->>'status' <> 'applied' THEN
    RAISE EXCEPTION 'newer refund did not revoke access';
  END IF;
  result := public.apply_revenuecat_webhook_transition(
    '00000000-0000-0000-0000-000000000001', 'refund',
    now() + interval '2 seconds'
  );
  IF result->>'status' <> 'already_applied' THEN
    RAISE EXCEPTION 'duplicate refund was not idempotent';
  END IF;
  BEGIN
    PERFORM public.apply_revenuecat_webhook_transition(
      '00000000-0000-0000-0000-000000000001', 'reversal',
      now() + interval '3 seconds', now() + interval '3 seconds',
      'domani_lifetime_friends'
    );
    RAISE EXCEPTION 'unconfirmed promo refund reversal granted access';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  UPDATE public.promo_redemption_attempts
    SET status = 'confirmed', store_product_id = 'domani_lifetime_friends'
    WHERE id = '00000000-0000-0000-0000-000000000030';
  result := public.apply_revenuecat_webhook_transition(
    '00000000-0000-0000-0000-000000000001', 'reversal',
    now() + interval '3 seconds', now() + interval '3 seconds',
    'domani_lifetime_friends'
  );
  IF result->>'status' <> 'applied' THEN
    RAISE EXCEPTION 'confirmed promo refund reversal was blocked';
  END IF;
END;
\$\$;
RESET ROLE;
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000001'
      AND tier = 'lifetime' AND purchased_at IS NOT NULL AND refunded_at IS NULL
  ) THEN
    RAISE EXCEPTION 'confirmed promo reversal did not restore access';
  END IF;
END;
\$\$;
SQL
echo "DEV-1420 verified access SQL test passed"
