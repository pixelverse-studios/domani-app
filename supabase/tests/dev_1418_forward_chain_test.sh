#!/usr/bin/env bash
# Rehearse the complete forward chain on a synthetic production-head baseline.
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1418-chain.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT

"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
"$pg_bin/psql" -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
  -f "$repo/supabase/tests/domani_feedback_fixture.sql" \
  -f "$repo/supabase/tests/domani_users_fixture.sql" \
  -f "$repo/supabase/migrations/20260920191645_domani_user_insights.sql" >/dev/null

"$pg_bin/psql" -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SQL
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
\$\$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');
CREATE TYPE public.admin_action AS ENUM ('read');
CREATE TYPE public.audit_action AS ENUM ('create');
CREATE TABLE public.admin_audit_log (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System can insert audit logs" ON public.admin_audit_log
  FOR INSERT TO PUBLIC WITH CHECK (true);
GRANT INSERT ON public.admin_audit_log TO PUBLIC, anon, authenticated;
ALTER TABLE public.profiles
  ADD COLUMN tier public.tier DEFAULT 'none',
  ADD COLUMN refunded_at timestamptz,
  ADD COLUMN purchased_at timestamptz,
  ADD COLUMN trial_started_at timestamptz,
  ADD COLUMN trial_ends_at timestamptz,
  ADD COLUMN revenuecat_user_id text,
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
CREATE TABLE public.posthog_trial_event_deliveries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  event_timestamp timestamptz NOT NULL,
  event_properties jsonb NOT NULL,
  claim_token uuid NOT NULL
);
ALTER TABLE public.posthog_trial_event_deliveries ENABLE ROW LEVEL SECURITY;
UPDATE public.profiles SET tier = 'trialing', trial_started_at = now(),
  trial_ends_at = now() + interval '14 days'
WHERE id = '10000000-0000-4000-8000-000000000001';
CREATE TABLE public.system_categories (id uuid PRIMARY KEY, position integer);
CREATE TABLE public.user_categories (
  id uuid PRIMARY KEY, user_id uuid, usage_count integer DEFAULT 0,
  updated_at timestamptz, position integer, is_favorite boolean DEFAULT false
);
CREATE TABLE public.user_category_preferences (
  user_id uuid, system_category_id uuid, usage_count integer DEFAULT 0,
  position integer, updated_at timestamptz, is_favorite boolean DEFAULT false,
  PRIMARY KEY (user_id, system_category_id)
);
CREATE TABLE public.revenuecat_webhook_events (
  event_id text PRIMARY KEY, raw_event jsonb NOT NULL
);
CREATE TABLE public.promo_campaigns (
  id uuid PRIMARY KEY, payment_required boolean, campaign_type text,
  discount_kind text
);
CREATE TABLE public.promo_redemption_attempts (
  id uuid PRIMARY KEY, user_id uuid, code_id uuid, campaign_id uuid
);
CREATE FUNCTION public.schedule_account_deletion(uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.cancel_account_deletion(uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.get_favorite_category_ids(uuid) RETURNS jsonb
  LANGUAGE sql SECURITY DEFINER AS 'SELECT ''[]''::jsonb';
CREATE FUNCTION public.get_user_cohort(uuid) RETURNS text
  LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::text';
CREATE FUNCTION public.get_user_tier(uuid) RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER AS 'SELECT NULL::text';
CREATE FUNCTION public.increment_category_usage(uuid,uuid,uuid) RETURNS void
  LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.update_category_positions(uuid,jsonb) RETURNS void
  LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.update_favorite_categories(uuid,jsonb) RETURNS void
  LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.get_user_role_level(uuid) RETURNS integer
  LANGUAGE sql SECURITY DEFINER AS 'SELECT 0';
CREATE FUNCTION public.has_permission(uuid,text,public.admin_action) RETURNS boolean
  LANGUAGE sql SECURITY DEFINER AS 'SELECT false';
CREATE FUNCTION public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)
  RETURNS uuid LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::uuid';
CREATE FUNCTION public.confirm_current_user_promo_redemption(
  uuid,uuid,uuid,text,text,text
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{"status":"confirmed"}''::jsonb';
\i $repo/supabase/migrations/20261005002529_pvs_schema_contract.sql
\i $repo/supabase/migrations/20261007134913_harden_domani_user_activity_projection.sql
\i $repo/supabase/migrations/20261012143100_add_current_user_security_rpcs.sql
\i $repo/supabase/migrations/20261014150617_secure_private_service_surfaces.sql
\i $repo/supabase/migrations/20261014153516_restrict_internal_function_execution.sql
\i $repo/supabase/migrations/20261014155441_pin_legacy_function_search_paths.sql
\i $repo/supabase/migrations/20261014160903_bind_legacy_user_rpcs_to_caller.sql
\i $repo/supabase/migrations/20261014163750_restrict_legacy_admin_helpers.sql
\i $repo/supabase/migrations/20261015161005_restrict_legacy_admin_audit_log_writes.sql
\i $repo/supabase/migrations/20261015164631_legacy_entitlement_compatibility_bridge.sql
\i $repo/supabase/migrations/20261015165240_apply_verified_revenuecat_access.sql
\i $repo/supabase/migrations/20261015175330_claim_account_email_events.sql
DO \$\$
BEGIN
  IF public.pvs_domani_schema_contract_version() <> '20261007134913'
     OR NOT (SELECT relrowsecurity FROM pg_class
             WHERE oid = 'public.revenuecat_webhook_events'::regclass)
     OR NOT (SELECT 'security_invoker=true' = ANY(reloptions) FROM pg_class
             WHERE oid = 'public.profiles_dashboard'::regclass)
     OR has_function_privilege('authenticated', 'public.get_user_role_level(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_user_role_level(uuid)', 'EXECUTE')
     OR has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.admin_audit_log', 'INSERT')
     OR has_table_privilege('authenticated',
          'public.revenuecat_access_reconciliation_requests', 'SELECT')
     OR has_function_privilege('authenticated',
          'public.apply_verified_revenuecat_lifetime_access(uuid,timestamptz,text,uuid,uuid,uuid,timestamptz)', 'EXECUTE')
     OR has_function_privilege('authenticated',
          'public.claim_account_email_event(uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'forward chain catalog state is incorrect';
  END IF;
END;
\$\$;
SET request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
DO \$\$
BEGIN
  IF public.get_user_tier('10000000-0000-4000-8000-000000000001') <> 'trialing'
     OR NOT public.has_current_user_access() THEN
    RAISE EXCEPTION 'forward chain broke authenticated access';
  END IF;
  BEGIN
    PERFORM public.get_user_tier('10000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'cross-account tier lookup succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
\$\$;
RESET ROLE;
SET ROLE service_role;
DO \$\$
DECLARE result jsonb;
BEGIN
  result := public.list_dashboard_domani_users('{"limit":1}'::jsonb);
  IF result->>'total' <> '123' OR pg_catalog.jsonb_array_length(result->'items') <> 1 THEN
    RAISE EXCEPTION 'forward chain broke the service dashboard';
  END IF;
END;
\$\$;
RESET ROLE;
SQL
echo "DEV-1418 integrated forward chain SQL test passed"
