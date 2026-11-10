#!/usr/bin/env bash
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-push-ownership.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
psql=("$pg_bin/psql" -X -h "$fixture_dir" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${psql[@]}" <<SQL
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
\$\$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid \$\$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,expo_push_token text,push_token_invalid_at timestamptz,updated_at timestamptz);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_select ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
GRANT SELECT ON public.profiles TO authenticated;
INSERT INTO public.profiles(id,expo_push_token,push_token_invalid_at) VALUES
('00000000-0000-0000-0000-000000000001',NULL,NULL),
('00000000-0000-0000-0000-000000000002','ExponentPushToken[device]',now());
\i $repo/supabase/migrations/20261020134204_current_user_push_token_ownership.sql
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
SELECT public.claim_current_user_push_token('00000000-0000-0000-0000-000000000001','ExponentPushToken[device]');
DO \$\$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE expo_push_token='ExponentPushToken[device]' AND push_token_invalid_at IS NULL) THEN
 RAISE EXCEPTION 'Device claim missing or invalid flag not cleared'; END IF;
 BEGIN
 PERFORM public.claim_current_user_push_token('00000000-0000-0000-0000-000000000002','ExponentPushToken[device]');
 RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Stale account claim accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 UPDATE public.profiles SET expo_push_token='forged';
 RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Direct final-phase token update accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
 PERFORM public.claim_current_user_push_token('00000000-0000-0000-0000-000000000001','raw arbitrary data');
 RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Malformed device token accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END \$\$;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
SELECT public.claim_current_user_push_token('00000000-0000-0000-0000-000000000002','ExponentPushToken[device]');
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
SELECT public.unclaim_current_user_push_token('00000000-0000-0000-0000-000000000001','ExponentPushToken[device]');
DO \$\$ BEGIN
 BEGIN
 PERFORM public.unclaim_current_user_push_token('00000000-0000-0000-0000-000000000002','ExponentPushToken[device]');
 RAISE EXCEPTION USING ERRCODE='XX000', MESSAGE='Cross-user unclaim accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END \$\$;
RESET ROLE;
DO \$\$ BEGIN
 IF (SELECT count(*) FROM public.profiles WHERE expo_push_token='ExponentPushToken[device]')<>1
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000002' AND expo_push_token='ExponentPushToken[device]') THEN
 RAISE EXCEPTION 'Transfer retained old owner or late unclaim cleared new owner'; END IF;
 IF has_function_privilege('anon','public.claim_current_user_push_token(uuid,text)','EXECUTE')
 OR has_function_privilege('anon','public.unclaim_current_user_push_token(uuid,text)','EXECUTE') THEN
 RAISE EXCEPTION 'Anonymous device claim available'; END IF;
END \$\$;
SQL
# Two authenticated accounts claiming one token can never commit duplicate owners.
"${psql[@]}" <<'SQL' &
BEGIN;
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
SELECT public.claim_current_user_push_token('00000000-0000-0000-0000-000000000001','ExponentPushToken[device]');
SELECT pg_sleep(0.3);
COMMIT;
SQL
first_pid=$!
"${psql[@]}" <<'SQL' &
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
SELECT public.claim_current_user_push_token('00000000-0000-0000-0000-000000000002','ExponentPushToken[device]');
SQL
second_pid=$!
wait "$first_pid"
wait "$second_pid"
"${psql[@]}" <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles WHERE expo_push_token='ExponentPushToken[device]')<>1 THEN
 RAISE EXCEPTION 'Racing claims committed duplicate device owners'; END IF;
END $$;
SQL
echo 'Current push token ownership tests passed'
