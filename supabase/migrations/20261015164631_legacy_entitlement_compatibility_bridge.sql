-- DEV-1419: accept released clients' profile writes without trusting their
-- entitlement fields. The verified reconciliation worker is added separately.
CREATE TABLE public.revenuecat_access_reconciliation_requests (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reconciled_at timestamptz,
  last_attempt_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);

ALTER TABLE public.revenuecat_access_reconciliation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.revenuecat_access_reconciliation_requests
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.revenuecat_access_reconciliation_requests TO service_role;

-- Also serves as a safe, explicit retry entrypoint for updated clients.
CREATE FUNCTION public.request_current_user_revenuecat_reconciliation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authenticated';
  END IF;

  INSERT INTO public.revenuecat_access_reconciliation_requests (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO UPDATE
    SET requested_at = pg_catalog.now()
    WHERE revenuecat_access_reconciliation_requests.requested_at
      < pg_catalog.now() - interval '30 seconds';

  RETURN pg_catalog.jsonb_build_object('status', 'verification_pending');
END;
$$;

REVOKE ALL ON FUNCTION public.request_current_user_revenuecat_reconciliation()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_current_user_revenuecat_reconciliation()
  TO authenticated;

-- The trigger is invoker-owned so trusted SECURITY DEFINER trial and webhook
-- writes run as their privileged owner, while direct client writes run as
-- authenticated. The older is_admin trigger runs after this alphabetically.
CREATE FUNCTION public.a_guard_legacy_profile_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_start_trial boolean;
  v_reconcile boolean;
  v_now timestamptz;
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.id
     OR (TG_OP = 'UPDATE' AND OLD.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Profile owner mismatch';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.tier := 'none'::public.tier;
    NEW.purchased_at := NULL;
    NEW.refunded_at := NULL;
    NEW.revenuecat_user_id := NULL;
    NEW.trial_started_at := NULL;
    NEW.trial_ends_at := NULL;
    NEW.is_admin := false;
    NEW.signup_cohort := NULL;
    RETURN NEW;
  END IF;

  v_start_trial := OLD.tier = 'none'::public.tier
    AND OLD.trial_started_at IS NULL
    AND OLD.purchased_at IS NULL
    AND OLD.refunded_at IS NULL
    AND NEW.tier = 'trialing'::public.tier;

  v_reconcile := NEW.tier IS DISTINCT FROM OLD.tier
    OR NEW.purchased_at IS DISTINCT FROM OLD.purchased_at
    OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
    OR NEW.revenuecat_user_id IS DISTINCT FROM OLD.revenuecat_user_id;

  IF v_start_trial THEN
    v_now := pg_catalog.now();
    NEW.tier := 'trialing'::public.tier;
    NEW.trial_started_at := v_now;
    NEW.trial_ends_at := v_now + interval '14 days';
  ELSE
    NEW.tier := OLD.tier;
    NEW.trial_started_at := OLD.trial_started_at;
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;

  NEW.purchased_at := OLD.purchased_at;
  NEW.refunded_at := OLD.refunded_at;
  NEW.revenuecat_user_id := OLD.revenuecat_user_id;
  NEW.is_admin := OLD.is_admin;
  NEW.signup_cohort := OLD.signup_cohort;

  IF v_reconcile AND NOT v_start_trial THEN
    PERFORM public.request_current_user_revenuecat_reconciliation();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.a_guard_legacy_profile_entitlements()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER a_guard_legacy_profile_entitlements_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.a_guard_legacy_profile_entitlements();

CREATE TRIGGER a_guard_legacy_profile_entitlements_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.a_guard_legacy_profile_entitlements();

-- The 1.1.1 direct trial path predates the trial RPC's PostHog outbox write.
-- Only a persisted, server-dated trial can create this one-time event.
CREATE FUNCTION public.record_current_user_legacy_trial_start()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF v_profile.id IS NULL
     OR v_profile.tier <> 'trialing'::public.tier
     OR v_profile.trial_started_at IS NULL
     OR v_profile.trial_ends_at IS DISTINCT FROM
       v_profile.trial_started_at + interval '14 days' THEN
    RETURN;
  END IF;

  INSERT INTO public.posthog_trial_event_deliveries (
    user_id, event_timestamp, event_properties, claim_token
  ) VALUES (
    v_profile.id,
    v_profile.trial_started_at,
    pg_catalog.jsonb_build_object(
      'offer', CASE WHEN v_profile.signup_cohort = 'early_adopter'
        THEN 'early_adopter' ELSE 'general' END,
      'signup_cohort', v_profile.signup_cohort,
      'trial_expires_at', v_profile.trial_ends_at
    ),
    gen_random_uuid()
  ) ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_current_user_legacy_trial_start()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_current_user_legacy_trial_start()
  TO authenticated;

CREATE FUNCTION public.record_legacy_trial_start_after_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND OLD.trial_started_at IS NULL
     AND NEW.trial_started_at IS NOT NULL THEN
    PERFORM public.record_current_user_legacy_trial_start();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_legacy_trial_start_after_profile_update()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER record_legacy_trial_start_after_profile_update
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.record_legacy_trial_start_after_profile_update();

-- Older premium-to-lifetime conversions may lack purchased_at. Queue them
-- for server verification; their stored tier alone is not purchase evidence.
INSERT INTO public.revenuecat_access_reconciliation_requests (user_id)
SELECT id FROM public.profiles
WHERE tier = 'lifetime'::public.tier
  AND purchased_at IS NULL
  AND refunded_at IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Direct deletion has no released-client path and could reset trial history.
REVOKE DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
