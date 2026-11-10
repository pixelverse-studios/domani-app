-- Each assertion runs against the actual new migration in an isolated fixture.
INSERT INTO auth.users(id,last_sign_in_at)
SELECT ('00000000-0000-0000-0000-00000000000'||i)::uuid,
  CASE WHEN i IN (1,2,4) THEN now() ELSE now()-interval '40 days' END
FROM generate_series(1,6) i;
INSERT INTO public.profiles(id,last_active_at)
SELECT id, CASE WHEN id::text LIKE '%3' THEN now()
  WHEN id::text LIKE '%6' THEN now()+interval '2 days' ELSE NULL END FROM auth.users;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
SELECT public.observe_current_user_client('1.1.4','114','ios');
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
SELECT public.observe_current_user_client('1.1.3','113','android');
DO $$ BEGIN
  IF has_schema_privilege(current_user,'rollout_private','USAGE')
    OR has_function_privilege(current_user,'public.get_rollout_metrics()','EXECUTE')
    OR has_function_privilege(current_user,'public.record_rollout_event(text,uuid)','EXECUTE')
    OR has_function_privilege(current_user,'public.prune_rollout_telemetry()','EXECUTE') THEN
    RAISE EXCEPTION 'Ordinary role has private/operator access';
  END IF;
  BEGIN
    PERFORM public.observe_current_user_client('1.1.4','private content @example.com','ios');
    RAISE EXCEPTION 'Observation accepted unbounded content';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.start_current_user_trial('00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Cross-user trial accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.cancel_current_user_account_deletion('00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Stale reactivation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF public.start_current_user_trial('00000000-0000-0000-0000-000000000002')->>'id'
    <> '00000000-0000-0000-0000-000000000002' THEN RAISE EXCEPTION 'Trial bound incorrectly'; END IF;
END $$;
RESET ROLE;
DO $$ DECLARE m jsonb; BEGIN
  m:=public.get_rollout_metrics();
  IF (m->>'active30d')::int<>4 OR (m->>'compatible')::int<>1
    OR (m->>'unknownLegacy')::int<>2 OR (m->>'legacy')::int<>3
    OR (m->>'compatiblePercent')::numeric<>25 THEN
    RAISE EXCEPTION 'Wrong active30d denominator: %',m;
  END IF;
  IF EXISTS(SELECT 1 FROM rollout_private.client_observations
    WHERE user_id NOT IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002')) THEN
    RAISE EXCEPTION 'Observation escaped caller ownership'; END IF;
END $$;
SET ROLE service_role;
SELECT public.record_rollout_event(event,NULL) FROM unnest(ARRAY['legacy_request','verified_success',
  'webhook_success','delayed_reconciliation','reconciliation_success','rejection','unresolved_failure']) event;
DO $$ BEGIN
  BEGIN PERFORM public.record_rollout_event('payload text',NULL);
    RAISE EXCEPTION 'Unknown metric accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
  IF jsonb_array_length(public.get_rollout_metrics()->'dailyEvents')<>7 THEN
    RAISE EXCEPTION 'Metrics did not distinguish outcomes'; END IF;
END $$;
RESET ROLE;
-- Intent is captured before the guard; no device identity or body columns exist.
GRANT UPDATE,SELECT ON public.profiles TO authenticated;
SET ROLE authenticated;
UPDATE public.profiles SET tier='lifetime'
WHERE id='00000000-0000-0000-0000-000000000002';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM rollout_private.events WHERE event='legacy_request')<>2
    OR (SELECT count(*) FROM rollout_private.events WHERE event='rejection')<>2 THEN
    RAISE EXCEPTION 'Legacy intent or rejection missing'; END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='rollout_private'
    AND column_name IN ('email','access_token','request_body','device_id','raw_event')) THEN
    RAISE EXCEPTION 'Sensitive telemetry column introduced'; END IF;
END $$;
INSERT INTO public.revenuecat_access_reconciliation_requests(user_id,requested_at,reconciled_at) VALUES
('00000000-0000-0000-0000-000000000001',now()-interval '35 days',now()-interval '31 days'),
('00000000-0000-0000-0000-000000000002',now()-interval '29 days',now()-interval '28 days'),
('00000000-0000-0000-0000-000000000003',now()-interval '91 days',NULL),
('00000000-0000-0000-0000-000000000004',now()-interval '89 days',NULL);
INSERT INTO rollout_private.events(event,occurred_at) VALUES
('legacy_request',now()-interval '91 days'),('legacy_request',now()-interval '89 days');
INSERT INTO rollout_private.daily_metrics(day,event,count) VALUES
((now()-interval '13 months')::date,'legacy_request',10),
((now()-interval '11 months')::date,'legacy_request',10);
UPDATE rollout_private.client_observations SET seen_at=now()-interval '91 days'
WHERE user_id='00000000-0000-0000-0000-000000000002';
SET ROLE service_role;
SELECT public.prune_rollout_telemetry();
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.revenuecat_access_reconciliation_requests)<>2
    OR EXISTS(SELECT 1 FROM rollout_private.events WHERE occurred_at<now()-interval '90 days')
    OR EXISTS(SELECT 1 FROM rollout_private.client_observations WHERE seen_at<now()-interval '90 days')
    OR (SELECT count(*) FROM rollout_private.daily_metrics)<>8 THEN
    RAISE EXCEPTION 'Retention boundaries violated'; END IF;
  IF (SELECT count(*) FROM rollout_private.events WHERE occurred_at<now()-interval '88 days')<>1 THEN
    RAISE EXCEPTION 'Retention pruned current records'; END IF;
  IF public.get_client_version_policy('ios')->>'enabled'<>'false' THEN
    RAISE EXCEPTION 'Gate must ship disabled'; END IF;
END $$;
UPDATE rollout_private.version_policy SET enabled=true,minimum_version='1.2.0',
  store_url='https://apps.apple.com/app/id123' WHERE platform='ios';
SET ROLE anon;
DO $$ BEGIN
  IF public.get_client_version_policy('ios')->>'minimumVersion'<>'1.2.0' THEN
    RAISE EXCEPTION 'Remote gate policy missing'; END IF;
  IF has_function_privilege(current_user,'public.observe_current_user_client(text,text,text)','EXECUTE')
    OR has_function_privilege(current_user,'public.start_current_user_trial(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous mutation allowed'; END IF;
END $$;
RESET ROLE;
