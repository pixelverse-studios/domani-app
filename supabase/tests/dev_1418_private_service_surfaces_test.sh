#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1418-private-test.XXXXXX")
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
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, last_sign_in_at timestamptz);
CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text, full_name text);
CREATE VIEW public.profiles_dashboard AS
  SELECT p.id, p.email, p.full_name, u.last_sign_in_at
  FROM public.profiles p JOIN auth.users u ON u.id = p.id;
CREATE TABLE public.revenuecat_webhook_events (event_id text PRIMARY KEY, raw_event jsonb NOT NULL);
GRANT CREATE ON SCHEMA public TO PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles_dashboard TO PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.revenuecat_webhook_events TO PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON auth.users TO service_role;
GRANT SELECT ON public.profiles TO service_role;
\i $repo/supabase/migrations/20261014150617_secure_private_service_surfaces.sql
\i $repo/supabase/migrations/20261014150617_secure_private_service_surfaces.sql
DO \$\$
BEGIN
  IF has_schema_privilege('anon', 'public', 'CREATE')
     OR has_schema_privilege('authenticated', 'public', 'CREATE')
     OR has_table_privilege('anon', 'public.profiles_dashboard', 'SELECT')
     OR has_table_privilege('authenticated', 'public.profiles_dashboard', 'SELECT')
     OR has_table_privilege('anon', 'public.revenuecat_webhook_events', 'SELECT')
     OR has_table_privilege('authenticated', 'public.revenuecat_webhook_events', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.profiles_dashboard', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.revenuecat_webhook_events', 'SELECT, INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'private surface grants are incorrect';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.revenuecat_webhook_events'::regclass)
     OR NOT (SELECT 'security_invoker=true' = ANY(reloptions) FROM pg_class
             WHERE oid = 'public.profiles_dashboard'::regclass) THEN
    RAISE EXCEPTION 'private surface security settings are incorrect';
  END IF;
END;
\$\$;
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001', now());
INSERT INTO public.profiles VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test');
SET ROLE service_role;
SELECT id FROM public.profiles_dashboard;
INSERT INTO public.revenuecat_webhook_events VALUES ('event-1', '{}'::jsonb);
UPDATE public.revenuecat_webhook_events SET raw_event = '{"ok":true}'::jsonb WHERE event_id = 'event-1';
DELETE FROM public.revenuecat_webhook_events WHERE event_id = 'event-1';
RESET ROLE;
SQL
echo "DEV-1418 private service surfaces SQL test passed"
