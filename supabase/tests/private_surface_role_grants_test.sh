#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-private-grants.XXXXXX")
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
CREATE TABLE public.waitlist(id integer PRIMARY KEY, email text);
CREATE TABLE public.email_templates(id integer PRIMARY KEY);
CREATE TABLE public.email_campaigns(id integer PRIMARY KEY);
CREATE TABLE public.campaign_recipients(id integer PRIMARY KEY);
CREATE TABLE public.email_unsubscribes(id integer PRIMARY KEY);
CREATE TABLE public.admin_sessions(id integer PRIMARY KEY);
CREATE TABLE public.admin_audit_log(id integer PRIMARY KEY);
CREATE TABLE public.account_email_events(id integer PRIMARY KEY);
CREATE TABLE public.revenuecat_access_reconciliation_requests(id integer PRIMARY KEY);
CREATE TABLE public.promo_campaigns(id integer PRIMARY KEY);
CREATE TABLE public.promo_codes(id integer PRIMARY KEY);
CREATE TABLE public.promo_redemption_attempts(id integer PRIMARY KEY);
CREATE POLICY "Enable read access for authenticated users" ON public.waitlist
 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can unsubscribe" ON public.email_unsubscribes
 FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "System can manage sessions" ON public.admin_sessions
 FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
CREATE FUNCTION public.is_email_subscribed(character varying) RETURNS boolean
 LANGUAGE sql SECURITY DEFINER AS 'SELECT true';
CREATE FUNCTION public.update_campaign_metrics(uuid) RETURNS void
 LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.start_trial_with_posthog_outbox() RETURNS text
 LANGUAGE sql SECURITY DEFINER AS 'SELECT ''trial''::text';
CREATE FUNCTION public.claim_posthog_trial_started(uuid,jsonb) RETURNS text
 LANGUAGE sql SECURITY DEFINER AS 'SELECT ''claim''::text';
CREATE FUNCTION public.schedule_account_deletion(uuid) RETURNS void
 LANGUAGE sql SECURITY DEFINER AS 'SELECT NULL::void';
CREATE FUNCTION public.get_user_tier(uuid) RETURNS text
 LANGUAGE sql SECURITY DEFINER AS 'SELECT ''none''::text';
CREATE FUNCTION public.list_public_domani_releases_v2() RETURNS text
 LANGUAGE sql AS 'SELECT ''public-feed''::text';
REVOKE ALL ON FUNCTION public.list_public_domani_releases_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_domani_releases_v2() TO service_role;
CREATE FUNCTION public.new_rollout_rpc() RETURNS void LANGUAGE sql AS 'SELECT NULL::void';
REVOKE ALL ON FUNCTION public.new_rollout_rpc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.new_rollout_rpc() TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
 GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
 GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
\i $repo/supabase/migrations/20261020132952_complete_private_surface_role_grants.sql
\i $repo/supabase/migrations/20261020132952_complete_private_surface_role_grants.sql
DO \$\$
DECLARE sig text; who text; tab text;
BEGIN
 FOREACH sig IN ARRAY ARRAY[
  'public.is_email_subscribed(character varying)', 'public.update_campaign_metrics(uuid)',
  'public.list_public_domani_releases_v2()'
 ] LOOP
  FOREACH who IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_function_privilege(who,sig,'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected % access to %',who,sig;
   END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',sig,'EXECUTE') THEN
   RAISE EXCEPTION 'Service access lost: %',sig;
  END IF;
 END LOOP;
 FOREACH sig IN ARRAY ARRAY[
  'public.start_trial_with_posthog_outbox()', 'public.claim_posthog_trial_started(uuid,jsonb)',
  'public.schedule_account_deletion(uuid)', 'public.get_user_tier(uuid)', 'public.new_rollout_rpc()'
 ] LOOP
  IF NOT has_function_privilege('authenticated',sig,'EXECUTE')
   OR has_function_privilege('anon',sig,'EXECUTE') THEN
   RAISE EXCEPTION 'Client contract grants incorrect: %',sig;
  END IF;
 END LOOP;
 FOREACH tab IN ARRAY ARRAY['waitlist','email_templates','email_campaigns','campaign_recipients',
   'email_unsubscribes','admin_sessions','admin_audit_log'] LOOP
  FOREACH who IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(who,'public.'||tab,'SELECT')
    OR has_table_privilege(who,'public.'||tab,'UPDATE')
    OR has_table_privilege(who,'public.'||tab,'DELETE')
    OR (tab <> 'waitlist' AND has_table_privilege(who,'public.'||tab,'INSERT')) THEN
    RAISE EXCEPTION 'Unexpected % access to %',who,tab;
   END IF;
  END LOOP;
 END LOOP;
END;
\$\$;
SET ROLE anon;
INSERT INTO public.waitlist VALUES(1,'test@example.invalid');
DO \$\$
BEGIN
 BEGIN
  PERFORM public.is_email_subscribed('test@example.invalid');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Anon executed private helper';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM * FROM public.waitlist;
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Anon read waitlist';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END;
\$\$;
RESET ROLE;
CREATE TABLE public.future_sensitive_object(id integer);
CREATE SEQUENCE public.future_sensitive_sequence;
CREATE FUNCTION public.future_sensitive_function() RETURNS void LANGUAGE sql AS 'SELECT NULL::void';
DO \$\$
DECLARE who text;
BEGIN
 FOREACH who IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(who,'public.future_sensitive_object','SELECT')
   OR has_sequence_privilege(who,'public.future_sensitive_sequence','USAGE')
   OR has_function_privilege(who,'public.future_sensitive_function()','EXECUTE') THEN
   RAISE EXCEPTION 'Future private objects exposed to %',who;
  END IF;
 END LOOP;
END;
\$\$;
SQL
echo "Private surface grants test passed"
