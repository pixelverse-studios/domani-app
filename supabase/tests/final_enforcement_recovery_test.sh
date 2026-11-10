#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-final-enforcement.XXXXXX")
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
CREATE SCHEMA rollout_private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
\$\$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid \$\$;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY, tier text, purchased_at timestamptz, refunded_at timestamptz,
 trial_started_at timestamptz, trial_ends_at timestamptz, is_admin boolean,
 revenuecat_user_id text, signup_cohort text, full_name text, avatar_url text,
 timezone text, planning_reminder_time time, notification_onboarding_completed boolean,
 auto_sort_categories boolean, reminder_shortcuts jsonb, tutorial_completed_at timestamptz,
 planning_reminder_enabled boolean, last_active_at timestamptz,
 planning_activated_at timestamptz, updated_at timestamptz
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_profile ON public.profiles FOR ALL TO authenticated
 USING (id=auth.uid()) WITH CHECK (id=auth.uid());
CREATE FUNCTION public.has_current_user_access() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS \$\$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND refunded_at IS NULL
  AND ((tier='lifetime' AND purchased_at IS NOT NULL)
    OR (tier='trialing' AND trial_started_at IS NOT NULL AND trial_ends_at>now())))
\$\$;
CREATE FUNCTION public.a_guard_legacy_profile_entitlements() RETURNS trigger
 LANGUAGE plpgsql AS \$\$ BEGIN RETURN NEW; END; \$\$;
CREATE TRIGGER a_guard_legacy_profile_entitlements_update BEFORE UPDATE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.a_guard_legacy_profile_entitlements();
CREATE TABLE public.tasks(id integer PRIMARY KEY,user_id uuid,title text);
CREATE TABLE public.task_time_blocks(id integer PRIMARY KEY,task_id integer REFERENCES public.tasks(id), note text);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_tasks ON public.tasks FOR ALL TO authenticated
 USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY own_blocks ON public.task_time_blocks FOR ALL TO authenticated
 USING(EXISTS(SELECT 1 FROM public.tasks WHERE tasks.id=task_id AND user_id=auth.uid()))
 WITH CHECK(EXISTS(SELECT 1 FROM public.tasks WHERE tasks.id=task_id AND user_id=auth.uid()));
GRANT SELECT,INSERT,UPDATE ON public.profiles TO authenticated;
GRANT UPDATE(tier,purchased_at,refunded_at,is_admin) ON public.profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tasks,public.task_time_blocks TO authenticated,service_role;
GRANT SELECT,UPDATE ON public.profiles TO service_role;
INSERT INTO public.profiles(id,tier,trial_started_at,trial_ends_at) VALUES
 ('10000000-0000-4000-8000-000000000001','trialing',now()-interval '20 days',now()-interval '6 days'),
 ('10000000-0000-4000-8000-000000000002','lifetime',NULL,NULL);
UPDATE public.profiles SET purchased_at=now() WHERE tier='lifetime';
INSERT INTO public.tasks VALUES (1,'10000000-0000-4000-8000-000000000001','expired task'),
 (2,'10000000-0000-4000-8000-000000000002','other task');
INSERT INTO public.task_time_blocks VALUES(1,1,'expired block');
\i $repo/supabase/pending-migration-sources/dev_1424_final_enforcement.sql
SET request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
DO \$\$
DECLARE c integer;
BEGIN
 IF (SELECT count(*) FROM public.tasks)<>1 THEN RAISE EXCEPTION 'Read-only history lost or crossed owner'; END IF;
 BEGIN
  UPDATE public.profiles SET tier='lifetime',is_admin=true WHERE id=auth.uid();
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Protected columns writable';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.profiles SET full_name='Updated' WHERE id=auth.uid();
 BEGIN
  INSERT INTO public.tasks VALUES(3,auth.uid(),'blocked');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Expired task insert accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.tasks SET title='blocked' WHERE id=1;
 GET DIAGNOSTICS c=ROW_COUNT;
 IF c<>0 THEN RAISE EXCEPTION 'Expired update accepted'; END IF;
 DELETE FROM public.tasks WHERE id=1;
 GET DIAGNOSTICS c=ROW_COUNT;
 IF c<>0 THEN RAISE EXCEPTION 'Expired delete accepted'; END IF;
 BEGIN
  INSERT INTO public.task_time_blocks VALUES(3,1,'blocked');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Expired block insert accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 UPDATE public.task_time_blocks SET note='blocked' WHERE id=1;
 GET DIAGNOSTICS c=ROW_COUNT;
 IF c<>0 THEN RAISE EXCEPTION 'Expired block update accepted'; END IF;
 DELETE FROM public.task_time_blocks WHERE id=1;
 GET DIAGNOSTICS c=ROW_COUNT;
 IF c<>0 THEN RAISE EXCEPTION 'Expired block delete accepted'; END IF;
END;
\$\$;
RESET ROLE;
SET ROLE service_role;
DO \$\$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM rollout_private.final_enforcement_window
   WHERE legacy_monitor_until >= enforced_at + interval '30 days') THEN
  RAISE EXCEPTION 'Service cannot inspect required monitoring window';
 END IF;
END;
\$\$;
UPDATE public.profiles SET tier='lifetime',purchased_at=now() WHERE id=auth.uid();
RESET ROLE;
SET ROLE authenticated;
INSERT INTO public.tasks VALUES(3,auth.uid(),'verified lifetime');
INSERT INTO public.task_time_blocks VALUES(3,3,'verified block');
DO \$\$
BEGIN
 BEGIN
  INSERT INTO public.task_time_blocks VALUES(4,2,'cross user');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Cross-user block allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END;
\$\$;
RESET ROLE;
UPDATE public.profiles SET refunded_at=now() WHERE id=auth.uid();
SET ROLE authenticated;
DO \$\$
BEGIN
 BEGIN
  INSERT INTO public.tasks VALUES(4,auth.uid(),'refunded');
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Refunded insert allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END;
\$\$;
RESET ROLE;
\i $repo/supabase/pending-migration-sources/dev_1424_secure_recovery.sql
SET ROLE authenticated;
INSERT INTO public.tasks VALUES(4,auth.uid(),'recovery');
INSERT INTO public.task_time_blocks VALUES(4,4,'recovery block');
DO \$\$
BEGIN
 BEGIN
  UPDATE public.profiles SET tier='lifetime',refunded_at=NULL WHERE id=auth.uid();
  RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Recovery reopened protected fields';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 IF has_table_privilege('authenticated','public.profiles','UPDATE')
  OR has_column_privilege('authenticated','public.profiles','tier','UPDATE')
  OR has_column_privilege('authenticated','public.profiles','is_admin','UPDATE') THEN
  RAISE EXCEPTION 'Recovery authority grants insecure';
 END IF;
END;
\$\$;
SQL
echo "Final enforcement and secure recovery test passed"
