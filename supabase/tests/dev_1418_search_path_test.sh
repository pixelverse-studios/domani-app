#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1418-path-test.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT

"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
"$pg_bin/psql" -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
CREATE ROLE authenticated;
CREATE TABLE public.lookup_value (id uuid PRIMARY KEY, tier text NOT NULL);
INSERT INTO public.lookup_value VALUES ('00000000-0000-0000-0000-000000000001', 'real');
CREATE FUNCTION public.get_user_tier(p_user_id uuid)
  RETURNS text LANGUAGE sql SECURITY DEFINER AS
  'SELECT tier FROM lookup_value WHERE id = p_user_id';
CREATE FUNCTION public.get_user_cohort(uuid)
  RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS
  'SELECT ''cohort''::text';
CREATE FUNCTION public.get_favorite_category_ids(uuid)
  RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = '' AS
  'SELECT ''safe''::text';
CREATE FUNCTION public.start_trial_with_posthog_outbox()
  RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS
  'SELECT ''{}''::jsonb';
SET ROLE authenticated;
CREATE TEMP TABLE lookup_value (id uuid PRIMARY KEY, tier text NOT NULL);
INSERT INTO lookup_value VALUES ('00000000-0000-0000-0000-000000000001', 'spoofed');
DO \$\$
BEGIN
  IF public.get_user_tier('00000000-0000-0000-0000-000000000001') <> 'spoofed' THEN
    RAISE EXCEPTION 'fixture did not reproduce temporary-table shadowing';
  END IF;
END;
\$\$;
RESET ROLE;
\i $repo/supabase/migrations/20261014155441_pin_legacy_function_search_paths.sql
\i $repo/supabase/migrations/20261014155441_pin_legacy_function_search_paths.sql
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = 'public.get_user_tier(uuid)'::regprocedure
    AND 'search_path=pg_catalog, public, pg_temp' = ANY(proconfig)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = 'public.get_user_cohort(uuid)'::regprocedure
    AND 'search_path=pg_catalog, public, pg_temp' = ANY(proconfig)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = 'public.get_favorite_category_ids(uuid)'::regprocedure
    AND 'search_path=""' = ANY(proconfig)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = 'public.start_trial_with_posthog_outbox()'::regprocedure
    AND 'search_path=""' = ANY(proconfig)
  ) OR NOT has_function_privilege('authenticated', 'public.get_user_tier(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.start_trial_with_posthog_outbox()', 'EXECUTE') THEN
    RAISE EXCEPTION 'search paths or existing grants changed incorrectly';
  END IF;
END;
\$\$;
SET ROLE authenticated;
DO \$\$
BEGIN
  IF public.get_user_tier('00000000-0000-0000-0000-000000000001') <> 'real' THEN
    RAISE EXCEPTION 'temporary relation still shadows trusted public relation';
  END IF;
END;
\$\$;
RESET ROLE;
SQL
echo "DEV-1418 search path SQL test passed"
