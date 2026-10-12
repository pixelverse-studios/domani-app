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
SELECT public.increment_current_user_category_usage(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000005');
SELECT public.update_current_user_favorite_categories(
  '["00000000-0000-0000-0000-000000000003"]'::jsonb);
SELECT public.schedule_current_user_account_deletion();
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
SELECT public.cancel_current_user_account_deletion();
DO \$\$
BEGIN
  IF (SELECT deleted_at IS NOT NULL FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'deletion cancellation failed';
  END IF;
END;
\$\$;
SQL
echo "DEV-1418 compatibility SQL test passed"
