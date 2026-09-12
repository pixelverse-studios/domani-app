-- DEV-1378: emit one durable PostHog trial_started event per qualified trial.

CREATE TABLE public.posthog_trial_event_deliveries (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_timestamp TIMESTAMPTZ NOT NULL,
  event_properties JSONB NOT NULL,
  claim_token UUID NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT posthog_trial_event_properties_object_check
    CHECK (JSONB_TYPEOF(event_properties) = 'object')
);

ALTER TABLE public.posthog_trial_event_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.posthog_trial_event_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.posthog_trial_event_deliveries TO service_role;

CREATE FUNCTION public.enqueue_posthog_trial_started_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.trial_started_at IS NOT NULL
    AND NEW.trial_ends_at IS NOT NULL
    AND NEW.trial_ends_at > NEW.trial_started_at THEN
    INSERT INTO public.posthog_trial_event_deliveries (
      user_id,
      event_timestamp,
      event_properties,
      claim_token
    )
    VALUES (
      NEW.id,
      NEW.trial_started_at,
      JSONB_BUILD_OBJECT(
        'offer', CASE
          WHEN NEW.signup_cohort = 'early_adopter' THEN 'early_adopter'
          ELSE 'general'
        END,
        'signup_cohort', NEW.signup_cohort,
        'trial_expires_at', NEW.trial_ends_at
      ),
      gen_random_uuid()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enqueue_posthog_trial_started_after_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_posthog_trial_started_on_profile_insert();

CREATE FUNCTION public.start_trial_with_posthog_outbox()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_trial_started_at TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized to start trial';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile.id IS NULL
    OR v_profile.purchased_at IS NOT NULL
    OR v_profile.trial_started_at IS NOT NULL
    OR v_profile.tier IS DISTINCT FROM 'none'::public.tier THEN
    RAISE EXCEPTION 'Trial cannot be started from current state';
  END IF;

  UPDATE public.profiles
  SET tier = 'trialing'::public.tier,
      trial_started_at = v_trial_started_at,
      trial_ends_at = v_trial_started_at + INTERVAL '14 days',
      updated_at = NOW()
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  INSERT INTO public.posthog_trial_event_deliveries (
    user_id,
    event_timestamp,
    event_properties,
    claim_token
  )
  VALUES (
    v_profile.id,
    v_profile.trial_started_at,
    JSONB_BUILD_OBJECT(
      'offer', CASE
        WHEN v_profile.signup_cohort = 'early_adopter' THEN 'early_adopter'
        ELSE 'general'
      END,
      'signup_cohort', v_profile.signup_cohort,
      'trial_expires_at', v_profile.trial_ends_at
    ),
    gen_random_uuid()
  );

  RETURN TO_JSONB(v_profile);
END;
$$;

CREATE FUNCTION public.claim_posthog_trial_started(
  p_user_id UUID,
  p_client_properties JSONB
)
RETURNS TABLE (
  claim_token UUID,
  event_uuid UUID,
  event_timestamp TIMESTAMPTZ,
  event_properties JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_properties JSONB := COALESCE(p_client_properties, '{}'::JSONB);
  v_claim_token UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to claim PostHog trial event';
  END IF;

  IF JSONB_TYPEOF(v_properties) <> 'object'
    OR (v_properties - ARRAY['platform', 'app_version', 'app_build', 'country']) <> '{}'::JSONB
    OR NOT (v_properties ? 'platform')
    OR JSONB_TYPEOF(v_properties->'platform') <> 'string'
    OR v_properties->>'platform' NOT IN ('ios', 'android')
    OR EXISTS (
      SELECT 1
      FROM JSONB_EACH(v_properties) AS property(key, value)
      WHERE property.key IN ('app_version', 'app_build', 'country')
        AND JSONB_TYPEOF(property.value) NOT IN ('string', 'null')
    )
    OR COALESCE(CHAR_LENGTH(v_properties->>'app_version'), 0) > 50
    OR COALESCE(CHAR_LENGTH(v_properties->>'app_build'), 0) > 50
    OR COALESCE(CHAR_LENGTH(v_properties->>'country'), 0) > 10 THEN
    RAISE EXCEPTION 'Invalid PostHog trial event properties';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_profile.id IS NULL
    OR v_profile.trial_started_at IS NULL
    OR v_profile.trial_ends_at IS NULL
    OR v_profile.trial_ends_at <= v_profile.trial_started_at THEN
    RETURN;
  END IF;

  v_properties := v_properties || JSONB_BUILD_OBJECT(
    'offer', CASE
      WHEN v_profile.signup_cohort = 'early_adopter' THEN 'early_adopter'
      ELSE 'general'
    END,
    'signup_cohort', v_profile.signup_cohort,
    'trial_expires_at', v_profile.trial_ends_at
  );

  RETURN QUERY
  UPDATE public.posthog_trial_event_deliveries AS deliveries
  SET claim_token = v_claim_token,
      claimed_at = NOW(),
      event_properties = v_properties
  WHERE deliveries.user_id = p_user_id
    AND deliveries.delivered_at IS NULL
    AND deliveries.claimed_at <= NOW() - INTERVAL '5 minutes'
  RETURNING
    deliveries.claim_token,
    deliveries.event_uuid,
    deliveries.event_timestamp,
    deliveries.event_properties;
END;
$$;

CREATE FUNCTION public.complete_posthog_trial_started(
  p_user_id UUID,
  p_claim_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to complete PostHog trial event';
  END IF;

  UPDATE public.posthog_trial_event_deliveries
  SET delivered_at = NOW()
  WHERE user_id = p_user_id
    AND claim_token = p_claim_token
    AND delivered_at IS NULL;

  RETURN FOUND;
END;
$$;

COMMENT ON TABLE public.posthog_trial_event_deliveries IS
'Token-owned, user-scoped outbox guaranteeing one PostHog trial_started event per qualified trial.';
COMMENT ON FUNCTION public.enqueue_posthog_trial_started_on_profile_insert() IS
'Creates a pending PostHog trial event only for automatic trials provisioned with a new profile.';
COMMENT ON FUNCTION public.start_trial_with_posthog_outbox() IS
'Atomically starts an explicit trial and creates its pending PostHog event for the authenticated user.';
COMMENT ON FUNCTION public.claim_posthog_trial_started(UUID, JSONB) IS
'Claims a server-created trial event and returns its authoritative timestamp and privacy-safe properties.';
COMMENT ON FUNCTION public.complete_posthog_trial_started(UUID, UUID) IS
'Marks a PostHog trial event delivered only when the authenticated user owns the current claim.';

REVOKE ALL ON FUNCTION public.enqueue_posthog_trial_started_on_profile_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_trial_with_posthog_outbox() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_posthog_trial_started(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_posthog_trial_started(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_trial_with_posthog_outbox() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_posthog_trial_started(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_posthog_trial_started(UUID, UUID) TO authenticated;
