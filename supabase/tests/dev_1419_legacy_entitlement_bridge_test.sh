#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1419-bridge.XXXXXX")
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
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, tier public.tier NOT NULL DEFAULT 'none',
  purchased_at timestamptz, refunded_at timestamptz,
  revenuecat_user_id text, trial_started_at timestamptz,
  trial_ends_at timestamptz, is_admin boolean NOT NULL DEFAULT false,
  signup_cohort text, full_name text
);
CREATE TABLE public.posthog_trial_event_deliveries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  event_timestamp timestamptz NOT NULL,
  event_properties jsonb NOT NULL,
  claim_token uuid NOT NULL
);
ALTER TABLE public.posthog_trial_event_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.posthog_trial_event_deliveries FROM PUBLIC, anon, authenticated;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
CREATE FUNCTION public.prevent_profile_is_admin_client_update()
RETURNS trigger LANGUAGE plpgsql AS \$\$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'is_admin cannot be changed';
  END IF;
  RETURN NEW;
END;
\$\$;
CREATE TRIGGER prevent_profile_is_admin_client_update
  BEFORE UPDATE OF is_admin ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_is_admin_client_update();
INSERT INTO public.profiles (id, tier, signup_cohort) VALUES
  ('00000000-0000-0000-0000-000000000001', 'none', 'general'),
  ('00000000-0000-0000-0000-000000000002', 'none', 'general'),
  ('00000000-0000-0000-0000-000000000004', 'lifetime', 'early_adopter');
\i $repo/supabase/migrations/20261015164631_legacy_entitlement_compatibility_bridge.sql
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
UPDATE public.profiles SET tier = 'trialing',
  trial_started_at = '2000-01-01', trial_ends_at = '2999-01-01'
  WHERE id = '00000000-0000-0000-0000-000000000001';
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND tier = 'trialing'
      AND trial_started_at > now() - interval '1 minute'
      AND trial_ends_at = trial_started_at + interval '14 days'
  ) THEN
    RAISE EXCEPTION 'legacy trial did not receive canonical dates';
  END IF;
END;
\$\$;
UPDATE public.profiles SET tier = 'none', trial_ends_at = '2999-01-01',
  purchased_at = now(), refunded_at = now(), revenuecat_user_id = 'forged',
  is_admin = true, signup_cohort = 'early_adopter'
  WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET tier = 'lifetime', purchased_at = now()
  WHERE id = '00000000-0000-0000-0000-000000000001';
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND tier = 'trialing'
      AND purchased_at IS NULL AND refunded_at IS NULL
      AND revenuecat_user_id IS NULL AND NOT is_admin
      AND signup_cohort = 'general'
      AND trial_ends_at = trial_started_at + interval '14 days'
  ) THEN
    RAISE EXCEPTION 'forged entitlement or trial extension was accepted';
  END IF;
  IF has_table_privilege('authenticated',
       'public.revenuecat_access_reconciliation_requests', 'SELECT')
     OR has_table_privilege('authenticated',
       'public.revenuecat_access_reconciliation_requests', 'INSERT')
     OR has_table_privilege('authenticated',
       'public.revenuecat_access_reconciliation_requests', 'UPDATE') THEN
    RAISE EXCEPTION 'client can access private reconciliation queue';
  END IF;
  BEGIN
    PERFORM count(*) FROM public.revenuecat_access_reconciliation_requests;
    RAISE EXCEPTION 'private reconciliation queue was readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
\$\$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
INSERT INTO public.profiles (id, tier, purchased_at, refunded_at,
  revenuecat_user_id, trial_started_at, trial_ends_at, is_admin, signup_cohort)
VALUES ('00000000-0000-0000-0000-000000000003', 'lifetime', now(), now(),
  'forged', now(), '2999-01-01', true, 'early_adopter');
RESET ROLE;
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000003'
      AND tier = 'none' AND purchased_at IS NULL AND refunded_at IS NULL
      AND revenuecat_user_id IS NULL AND trial_started_at IS NULL
      AND trial_ends_at IS NULL AND NOT is_admin AND signup_cohort IS NULL
  ) THEN
    RAISE EXCEPTION 'forged profile insert was accepted';
  END IF;
  IF (SELECT count(*) FROM public.revenuecat_access_reconciliation_requests) <> 2
     OR NOT EXISTS (
       SELECT 1 FROM public.revenuecat_access_reconciliation_requests
       WHERE user_id = '00000000-0000-0000-0000-000000000004'
     ) THEN
    RAISE EXCEPTION 'legacy attempts or historical lifetime account did not queue';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.posthog_trial_event_deliveries AS delivery
    JOIN public.profiles AS profile ON profile.id = delivery.user_id
    WHERE profile.id = '00000000-0000-0000-0000-000000000001'
      AND delivery.event_timestamp = profile.trial_started_at
      AND (delivery.event_properties->>'trial_expires_at')::timestamptz =
        profile.trial_ends_at
  ) THEN
    RAISE EXCEPTION 'legacy trial did not enqueue canonical analytics event';
  END IF;
END;
\$\$;
CREATE FUNCTION public.start_trial_with_posthog_outbox()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS \$\$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  UPDATE public.profiles SET tier = 'trialing',
    trial_started_at = now(), trial_ends_at = now() + interval '14 days'
    WHERE id = auth.uid() RETURNING * INTO v_profile;
  INSERT INTO public.posthog_trial_event_deliveries (
    user_id, event_timestamp, event_properties, claim_token
  ) VALUES (
    v_profile.id, v_profile.trial_started_at, '{}'::jsonb, gen_random_uuid()
  );
  RETURN to_jsonb(v_profile);
END;
\$\$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SET ROLE authenticated;
DO \$\$ BEGIN PERFORM public.start_trial_with_posthog_outbox(); END \$\$;
RESET ROLE;
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000002'
      AND tier = 'trialing' AND trial_started_at IS NOT NULL
  ) OR (SELECT count(*) FROM public.posthog_trial_event_deliveries) <> 2 THEN
    RAISE EXCEPTION 'current trial RPC was changed by the legacy bridge';
  END IF;
END;
\$\$;
SET ROLE service_role;
UPDATE public.profiles SET tier = 'lifetime', purchased_at = now(),
  refunded_at = NULL WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE public.revenuecat_access_reconciliation_requests
  SET reconciled_at = requested_at, attempts = attempts + 1
  WHERE user_id = '00000000-0000-0000-0000-000000000001';
RESET ROLE;
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '00000000-0000-0000-0000-000000000001'
      AND tier = 'lifetime' AND purchased_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'service verification write was blocked';
  END IF;
END;
\$\$;
SQL
echo "DEV-1419 legacy entitlement bridge SQL test passed"
