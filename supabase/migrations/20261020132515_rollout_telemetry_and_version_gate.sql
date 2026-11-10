-- DEV-1416: additive monitoring only. No minimum-version enforcement is enabled.
CREATE SCHEMA rollout_private;
REVOKE ALL ON SCHEMA rollout_private FROM PUBLIC, anon, authenticated;
CREATE TABLE rollout_private.client_observations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_version text, build text, platform text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rollout_private.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('legacy_request','verified_success','webhook_success',
    'delayed_reconciliation','reconciliation_success','rejection','unresolved_failure')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON rollout_private.events (occurred_at);
CREATE TABLE rollout_private.daily_metrics (
  day date NOT NULL, event text NOT NULL, count bigint NOT NULL,
  PRIMARY KEY (day, event)
);
CREATE TABLE rollout_private.version_policy (
  platform text PRIMARY KEY CHECK (platform IN ('ios','android')),
  enabled boolean NOT NULL DEFAULT false,
  minimum_version text NOT NULL DEFAULT '1.1.4'
    CHECK (minimum_version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$'),
  store_url text,
  CHECK (NOT enabled OR store_url IS NOT NULL),
  CHECK (store_url IS NULL OR (platform='ios' AND store_url ~ '^https://apps\.apple\.com/')
    OR (platform='android' AND store_url ~ '^https://play\.google\.com/store/apps/details\?id='))
);
INSERT INTO rollout_private.version_policy(platform) VALUES ('ios'), ('android');
ALTER TABLE rollout_private.client_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollout_private.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollout_private.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollout_private.version_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA rollout_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION rollout_private.add_event(p_event text, p_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO rollout_private.events(event, user_id) VALUES (p_event, p_user_id);
  INSERT INTO rollout_private.daily_metrics(day,event,count)
  VALUES ((now() AT TIME ZONE 'UTC')::date,p_event,1)
  ON CONFLICT(day,event) DO UPDATE SET count = daily_metrics.count + 1;
END;
$$;
REVOKE ALL ON FUNCTION rollout_private.add_event(text,uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_rollout_event(p_event text, p_user_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Check the caller role before crossing into the private schema.
  IF current_setting('role') <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Service role required';
  END IF;
  PERFORM rollout_private.add_event(p_event,p_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.record_rollout_event(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rollout_event(text,uuid) TO service_role;

CREATE FUNCTION public.observe_current_user_client(p_app_version text, p_build text, p_platform text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authentication required';
  END IF;
  IF p_platform IS NULL OR p_platform NOT IN ('ios','android','web','unknown')
    OR length(p_build)>32 OR (p_build IS NOT NULL AND p_build !~ '^[A-Za-z0-9.()+_-]+$')
    OR (p_app_version IS NOT NULL AND p_app_version !~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Invalid client observation';
  END IF;
  INSERT INTO rollout_private.client_observations(user_id,app_version,build,platform)
  VALUES (auth.uid(),p_app_version,p_build,p_platform)
  ON CONFLICT(user_id) DO UPDATE SET app_version=excluded.app_version,
    build=excluded.build,platform=excluded.platform,seen_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.observe_current_user_client(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.observe_current_user_client(text,text,text) TO authenticated;

CREATE FUNCTION public.get_client_version_policy(p_platform text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT jsonb_build_object('enabled',enabled,
    'minimumVersion',minimum_version,'storeUrl',store_url)
    FROM rollout_private.version_policy WHERE platform=p_platform),
    '{"enabled":false}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.get_client_version_policy(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_version_policy(text) TO anon, authenticated;

-- Bounded self-only logger: authenticated callers can already generate these
-- events through their own profile update attempts; they cannot select accounts.
CREATE FUNCTION public.record_current_user_legacy_intent(p_rejected boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authentication required';
  END IF;
  PERFORM rollout_private.add_event('legacy_request',auth.uid());
  IF p_rejected THEN PERFORM rollout_private.add_event('rejection',auth.uid()); END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_current_user_legacy_intent(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_current_user_legacy_intent(boolean) TO authenticated;

-- Capture intent before the existing guard replaces untrusted fields.
CREATE FUNCTION rollout_private.capture_legacy_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_trial boolean;
BEGIN
  IF current_user <> 'authenticated' OR auth.uid() IS DISTINCT FROM NEW.id THEN
    RETURN NEW;
  END IF;
  IF NEW.tier IS DISTINCT FROM OLD.tier OR NEW.purchased_at IS DISTINCT FROM OLD.purchased_at
    OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
    OR NEW.revenuecat_user_id IS DISTINCT FROM OLD.revenuecat_user_id
    OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at
    OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    v_trial := OLD.tier='none' AND OLD.trial_started_at IS NULL
      AND OLD.purchased_at IS NULL AND OLD.refunded_at IS NULL AND NEW.tier='trialing';
    PERFORM public.record_current_user_legacy_intent(
      NOT v_trial OR NEW.is_admin IS DISTINCT FROM OLD.is_admin); 
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION rollout_private.capture_legacy_intent() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a_capture_rollout_legacy_intent BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION rollout_private.capture_legacy_intent();

CREATE FUNCTION public.get_rollout_metrics()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
WITH active AS (
  SELECT p.id,o.app_version,o.seen_at
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  LEFT JOIN rollout_private.client_observations o ON o.user_id=p.id
  WHERE p.deleted_at IS NULL AND (
    p.last_active_at BETWEEN now()-interval '30 days' AND now()
    OR u.last_sign_in_at BETWEEN now()-interval '30 days' AND now()
    OR o.seen_at BETWEEN now()-interval '30 days' AND now())
), counts AS (
  SELECT count(*) AS active_30d,
    count(*) FILTER (WHERE seen_at>=now()-interval '30 days' AND app_version IS NOT NULL
      AND string_to_array(app_version,'.')::int[] >= ARRAY[1,1,4]) AS compatible,
    count(*) FILTER (WHERE seen_at IS NULL OR seen_at<now()-interval '30 days'
      OR app_version IS NULL) AS unknown
  FROM active
)
SELECT jsonb_build_object('asOf',now(),'active30d',active_30d,'compatible',compatible,
  'unknownLegacy',unknown,'legacy',active_30d-compatible,
  'compatiblePercent',coalesce(round(100.0*compatible/nullif(active_30d,0),2),0),
  'unresolvedReconciliations',(SELECT count(*) FROM public.revenuecat_access_reconciliation_requests
    WHERE reconciled_at IS NULL OR requested_at>reconciled_at),
  'oldestUnresolvedAt',(SELECT min(requested_at) FROM public.revenuecat_access_reconciliation_requests
    WHERE reconciled_at IS NULL OR requested_at>reconciled_at),
  'unresolvedWebhookFailures',(SELECT count(*) FROM public.revenuecat_webhook_events
    WHERE processing_error IS NOT NULL
      OR (processed_at IS NULL AND created_at<now()-interval '5 minutes')),
  'recentEvents',coalesce((SELECT jsonb_object_agg(event,total) FROM (
    SELECT event,count(*) AS total FROM rollout_private.events
    WHERE occurred_at>=now()-interval '15 minutes' GROUP BY event) recent),'{}'::jsonb),
  'dailyEvents',coalesce((SELECT jsonb_agg(jsonb_build_object('day',day,'event',event,'count',count)
    ORDER BY day,event) FROM rollout_private.daily_metrics
    WHERE day>=(now() AT TIME ZONE 'UTC')::date-interval '12 months'),'[]'::jsonb)) FROM counts;
$$;
REVOKE ALL ON FUNCTION public.get_rollout_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rollout_metrics() TO service_role;

CREATE FUNCTION public.prune_rollout_telemetry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.revenuecat_access_reconciliation_requests
  WHERE (reconciled_at>=requested_at AND reconciled_at<now()-interval '30 days')
    OR ((reconciled_at IS NULL OR reconciled_at<requested_at)
      AND requested_at<now()-interval '90 days');
  DELETE FROM rollout_private.events WHERE occurred_at<now()-interval '90 days';
  DELETE FROM rollout_private.client_observations WHERE seen_at<now()-interval '90 days';
  DELETE FROM rollout_private.daily_metrics
    WHERE day<(now() AT TIME ZONE 'UTC')::date-interval '12 months';
END;
$$;
REVOKE ALL ON FUNCTION public.prune_rollout_telemetry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_rollout_telemetry() TO service_role;

-- A stale operation must fail after an account switch, before trial mutation.
CREATE FUNCTION public.start_current_user_trial(p_expected_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authenticated user mismatch';
  END IF;
  RETURN public.start_trial_with_posthog_outbox();
END;
$$;
REVOKE ALL ON FUNCTION public.start_current_user_trial(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_current_user_trial(uuid) TO authenticated;


-- Preserve the released no-argument RPC; new clients bind delayed prompts.
CREATE FUNCTION public.cancel_current_user_account_deletion(p_expected_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authenticated user mismatch';
  END IF;
  PERFORM public.cancel_current_user_account_deletion();
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_current_user_account_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_current_user_account_deletion(uuid) TO authenticated;
