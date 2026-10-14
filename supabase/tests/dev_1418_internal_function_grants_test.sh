#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1418-grants-test.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT

"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
"$pg_bin/psql" -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE FUNCTION public.confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.delete_expired_accounts()
  RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.delete_user_by_email(text)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.ensure_profile_exists_for_auth_user(uuid)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS \$\$ BEGIN RETURN NEW; END; \$\$;
CREATE FUNCTION public.sync_auth_user_to_profile(uuid)
  RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
GRANT EXECUTE ON FUNCTION public.sync_auth_user_to_profile(uuid) TO authenticated;
CREATE FUNCTION public.start_trial_with_posthog_outbox()
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{}''::jsonb';
CREATE FUNCTION public.claim_posthog_trial_started(uuid,jsonb)
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{}''::jsonb';
CREATE FUNCTION public.list_dashboard_domani_users(jsonb)
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{}''::jsonb';
CREATE FUNCTION public.list_dashboard_domani_feedback(jsonb)
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{}''::jsonb';
CREATE FUNCTION public.get_admin_domani_release(uuid)
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS 'SELECT ''{}''::jsonb';
REVOKE EXECUTE ON FUNCTION public.start_trial_with_posthog_outbox(),
  public.claim_posthog_trial_started(uuid,jsonb),
  public.list_dashboard_domani_users(jsonb),
  public.list_dashboard_domani_feedback(jsonb),
  public.get_admin_domani_release(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_trial_with_posthog_outbox(),
  public.claim_posthog_trial_started(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_dashboard_domani_users(jsonb),
  public.list_dashboard_domani_feedback(jsonb),
  public.get_admin_domani_release(uuid) TO service_role;
\i $repo/supabase/migrations/20261014153516_restrict_internal_function_execution.sql
CREATE FUNCTION public.cleanup_expired_sessions()
  RETURNS void LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
\i $repo/supabase/migrations/20261014153516_restrict_internal_function_execution.sql
\i $repo/supabase/migrations/20261014153516_restrict_internal_function_execution.sql
DO \$\$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'cleanup_expired_sessions()',
    'confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text)',
    'delete_expired_accounts()',
    'delete_user_by_email(text)',
    'ensure_profile_exists_for_auth_user(uuid)',
    'handle_new_user()',
    'sync_auth_user_to_profile(uuid)'
  ] LOOP
    IF has_function_privilege('anon', 'public.' || target, 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.' || target, 'EXECUTE') THEN
      RAISE EXCEPTION 'internal function remains client-callable: %', target;
    END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',
       'public.confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.start_trial_with_posthog_outbox()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.claim_posthog_trial_started(uuid,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.list_dashboard_domani_users(jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.list_dashboard_domani_feedback(jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_admin_domani_release(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.start_trial_with_posthog_outbox()', 'EXECUTE') THEN
    RAISE EXCEPTION 'released-client or service function grant changed';
  END IF;
END;
\$\$;
SET ROLE authenticated;
SELECT public.start_trial_with_posthog_outbox();
RESET ROLE;
SET ROLE service_role;
SELECT public.confirm_promo_redemption_for_user(NULL,NULL,NULL,NULL,NULL,NULL,NULL);
SELECT public.list_dashboard_domani_users('{}'::jsonb);
RESET ROLE;
SQL
echo "DEV-1418 internal function grants SQL test passed"
