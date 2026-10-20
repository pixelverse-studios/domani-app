#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-1416-telemetry.XXXXXX")
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
\$\$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid \$\$;
GRANT USAGE ON SCHEMA auth TO anon,authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY,last_sign_in_at timestamptz);
CREATE TYPE public.tier AS ENUM ('none','trialing','lifetime');
CREATE TABLE public.profiles(id uuid PRIMARY KEY,deleted_at timestamptz,last_active_at timestamptz,
  tier public.tier DEFAULT 'none',purchased_at timestamptz,refunded_at timestamptz,
  revenuecat_user_id text,trial_started_at timestamptz,trial_ends_at timestamptz,is_admin boolean DEFAULT false);
CREATE TABLE public.revenuecat_access_reconciliation_requests(user_id uuid PRIMARY KEY,
  requested_at timestamptz DEFAULT now(),reconciled_at timestamptz);
CREATE TABLE public.revenuecat_webhook_events(processing_error text,processed_at timestamptz,created_at timestamptz DEFAULT now());
CREATE FUNCTION public.start_trial_with_posthog_outbox() RETURNS jsonb LANGUAGE plpgsql
SECURITY DEFINER SET search_path='' AS
\$\$ BEGIN
UPDATE public.profiles SET tier='trialing',trial_started_at=now(),trial_ends_at=now()+interval '14 days' WHERE id=auth.uid();
RETURN jsonb_build_object('id',auth.uid()); END \$\$;
CREATE FUNCTION public.cancel_current_user_account_deletion() RETURNS void LANGUAGE sql AS
\$\$ UPDATE public.profiles SET deleted_at=NULL WHERE id=auth.uid() \$\$;
\i $repo/supabase/migrations/20261020132515_rollout_telemetry_and_version_gate.sql
\i $repo/supabase/tests/dev_1416_rollout_telemetry_assertions.sql
SQL
