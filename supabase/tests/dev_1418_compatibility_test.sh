#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1418-test.XXXXXX")
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
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
\$\$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY, tier public.tier, signup_cohort text,
  deleted_at timestamptz, deletion_scheduled_for timestamptz,
  refunded_at timestamptz, purchased_at timestamptz,
  trial_started_at timestamptz, trial_ends_at timestamptz
);
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
CREATE FUNCTION public.schedule_account_deletion(p_user_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER AS
\$\$ UPDATE public.profiles SET deleted_at = now() WHERE id = p_user_id \$\$;
CREATE FUNCTION public.cancel_account_deletion(p_user_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER AS
\$\$ UPDATE public.profiles SET deleted_at = NULL WHERE id = p_user_id \$\$;
CREATE FUNCTION public.get_favorite_category_ids(uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT '[]'::jsonb \$\$;
CREATE FUNCTION public.get_user_cohort(uuid) RETURNS text
LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT NULL::text \$\$;
CREATE FUNCTION public.get_user_tier(uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS \$\$ SELECT NULL::text \$\$;
CREATE FUNCTION public.increment_category_usage(uuid,uuid,uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT NULL::void \$\$;
CREATE FUNCTION public.update_category_positions(uuid,jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT NULL::void \$\$;
CREATE FUNCTION public.update_favorite_categories(uuid,jsonb) RETURNS void
LANGUAGE sql SECURITY DEFINER AS \$\$ SELECT NULL::void \$\$;
\i $repo/supabase/migrations/20261012143100_add_current_user_security_rpcs.sql
\i $repo/supabase/migrations/20261012143100_add_current_user_security_rpcs.sql
INSERT INTO public.profiles (id, tier, signup_cohort, trial_started_at, trial_ends_at, purchased_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'trialing', 'early', now(), now() + interval '14 days', NULL),
  ('00000000-0000-0000-0000-000000000002', 'lifetime', 'late', NULL, NULL, now());
INSERT INTO public.system_categories (id, position) VALUES
  ('00000000-0000-0000-0000-000000000003', 2);
INSERT INTO public.user_categories (id, user_id) VALUES
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002');
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
SELECT public.schedule_account_deletion('00000000-0000-0000-0000-000000000002');
RESET ROLE;
DO \$\$
BEGIN
  IF (SELECT deleted_at IS NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'legacy fixture did not reproduce cross-account write';
  END IF;
END;
\$\$;
UPDATE public.profiles SET deleted_at = NULL
WHERE id = '00000000-0000-0000-0000-000000000002';
\i $repo/supabase/migrations/20261014160903_bind_legacy_user_rpcs_to_caller.sql
\i $repo/supabase/migrations/20261014160903_bind_legacy_user_rpcs_to_caller.sql
DO \$\$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'schedule_current_user_account_deletion()',
    'cancel_current_user_account_deletion()',
    'get_current_user_favorite_category_ids()',
    'get_current_user_cohort()',
    'get_current_user_tier()',
    'has_current_user_access()',
    'increment_current_user_category_usage(uuid,uuid)',
    'update_current_user_category_positions(jsonb)',
    'update_current_user_favorite_categories(jsonb)'
  ] LOOP
    IF has_function_privilege('anon', 'public.' || target, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', 'public.' || target, 'EXECUTE') THEN
      RAISE EXCEPTION 'wrong EXECUTE grant: %', target;
    END IF;
  END LOOP;
END;
\$\$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET ROLE authenticated;
DO \$\$
BEGIN
  IF public.get_current_user_tier() <> 'trialing'
     OR public.get_current_user_cohort() <> 'early'
     OR NOT public.has_current_user_access() THEN
    RAISE EXCEPTION 'current-user reads returned wrong profile';
  END IF;
END;
\$\$;
RESET ROLE;
UPDATE public.profiles SET trial_ends_at = now() - interval '1 second'
WHERE id = '00000000-0000-0000-0000-000000000001';
DO \$\$
BEGIN
  IF public.has_current_user_access() THEN
    RAISE EXCEPTION 'expired trial retained access';
  END IF;
END;
\$\$;
SET ROLE authenticated;
SELECT public.increment_current_user_category_usage(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005');
SELECT public.update_current_user_favorite_categories(
  '["00000000-0000-0000-0000-000000000003"]'::jsonb);
SELECT public.schedule_current_user_account_deletion();
RESET ROLE;
DO \$\$
BEGIN
  IF (SELECT deleted_at IS NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001')
     OR (SELECT deleted_at IS NOT NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002')
     OR (SELECT usage_count <> 0 FROM public.user_categories WHERE id = '00000000-0000-0000-0000-000000000005')
     OR public.get_current_user_favorite_category_ids() <> '["00000000-0000-0000-0000-000000000003"]'::jsonb THEN
    RAISE EXCEPTION 'caller-bound write crossed account boundary';
  END IF;
END;
\$\$;
SET ROLE authenticated;
SELECT public.cancel_current_user_account_deletion();
RESET ROLE;
DO \$\$
BEGIN
  IF (SELECT deleted_at IS NOT NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'deletion cancellation failed';
  END IF;
END;
\$\$;
SET ROLE authenticated;
DO \$\$
DECLARE query text;
BEGIN
  FOREACH query IN ARRAY ARRAY[
    'SELECT public.schedule_account_deletion(''00000000-0000-0000-0000-000000000002'')',
    'SELECT public.cancel_account_deletion(''00000000-0000-0000-0000-000000000002'')',
    'SELECT public.get_favorite_category_ids(''00000000-0000-0000-0000-000000000002'')',
    'SELECT public.get_user_cohort(''00000000-0000-0000-0000-000000000002'')',
    'SELECT public.get_user_tier(''00000000-0000-0000-0000-000000000002'')',
    'SELECT public.increment_category_usage(''00000000-0000-0000-0000-000000000002'', NULL, ''00000000-0000-0000-0000-000000000005'')',
    'SELECT public.update_category_positions(''00000000-0000-0000-0000-000000000002'', ''[]''::jsonb)',
    'SELECT public.update_favorite_categories(''00000000-0000-0000-0000-000000000002'', ''[]''::jsonb)'
  ] LOOP
    BEGIN
      EXECUTE query;
      RAISE EXCEPTION 'cross-account legacy call succeeded: %', query;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END;
\$\$;
DO \$\$
BEGIN
  IF public.get_user_tier('00000000-0000-0000-0000-000000000001') <> 'trialing'
     OR public.get_user_cohort('00000000-0000-0000-0000-000000000001') <> 'early' THEN
    RAISE EXCEPTION 'own-profile legacy reads failed';
  END IF;
END;
\$\$;
SELECT public.schedule_account_deletion('00000000-0000-0000-0000-000000000001');
SELECT public.cancel_account_deletion('00000000-0000-0000-0000-000000000001');
SELECT public.increment_category_usage(
  '00000000-0000-0000-0000-000000000001', NULL,
  '00000000-0000-0000-0000-000000000004');
SELECT public.update_category_positions(
  '00000000-0000-0000-0000-000000000001',
  '[{"id":"00000000-0000-0000-0000-000000000004","position":7,"isSystem":false}]'::jsonb);
SELECT public.update_favorite_categories(
  '00000000-0000-0000-0000-000000000001',
  '["00000000-0000-0000-0000-000000000004"]'::jsonb);
DO \$\$
BEGIN
  IF public.get_favorite_category_ids('00000000-0000-0000-0000-000000000001')
     <> '["00000000-0000-0000-0000-000000000004"]'::jsonb THEN
    RAISE EXCEPTION 'own favorites legacy read failed';
  END IF;
END;
\$\$;
RESET ROLE;
DO \$\$
BEGIN
  IF (SELECT deleted_at IS NOT NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001')
     OR (SELECT deleted_at IS NOT NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002')
     OR (SELECT usage_count <> 1 OR position <> 7 OR NOT is_favorite
         FROM public.user_categories WHERE id = '00000000-0000-0000-0000-000000000004')
     OR (SELECT usage_count <> 0 OR position IS NOT NULL OR is_favorite
         FROM public.user_categories WHERE id = '00000000-0000-0000-0000-000000000005') THEN
    RAISE EXCEPTION 'legacy writes changed the wrong account';
  END IF;
END;
\$\$;
SET request.jwt.claim.sub = '';
SET ROLE anon;
DO \$\$
BEGIN
  BEGIN
    PERFORM public.schedule_account_deletion('00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'anonymous legacy call succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
\$\$;
RESET ROLE;
SQL
echo "DEV-1418 compatibility SQL test passed"
