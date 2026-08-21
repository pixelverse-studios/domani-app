-- DEV-1109: bind claims to the expected user and make interrupted SDK logging retryable.

ALTER TABLE public.meta_app_event_claims
ADD COLUMN delivered_at TIMESTAMPTZ;

-- Existing claims were created by the original at-most-once implementation.
-- Treat them as delivered so this migration cannot replay historical conversions.
UPDATE public.meta_app_event_claims
SET delivered_at = claimed_at
WHERE delivered_at IS NULL;

DROP FUNCTION public.claim_meta_app_event(TEXT);

CREATE FUNCTION public.claim_meta_app_event(
  p_user_id UUID,
  p_event_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_authenticated_user_id UUID := auth.uid();
  v_event_key TEXT := TRIM(COALESCE(p_event_key, ''));
BEGIN
  IF v_authenticated_user_id IS NULL OR p_user_id IS DISTINCT FROM v_authenticated_user_id THEN
    RAISE EXCEPTION 'Not authorized to claim Meta app event';
  END IF;

  IF CHAR_LENGTH(v_event_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid Meta app event key';
  END IF;

  IF v_event_key NOT IN ('completed_registration', 'start_trial', 'planning_activated')
    AND v_event_key NOT LIKE 'purchase:%'
    AND v_event_key NOT LIKE 'purchase_restored:%' THEN
    RAISE EXCEPTION 'Unsupported Meta app event key';
  END IF;

  INSERT INTO public.meta_app_event_claims (user_id, event_key, claimed_at, delivered_at)
  VALUES (p_user_id, v_event_key, NOW(), NULL)
  ON CONFLICT (user_id, event_key) DO UPDATE
  SET claimed_at = EXCLUDED.claimed_at
  WHERE meta_app_event_claims.delivered_at IS NULL
    AND meta_app_event_claims.claimed_at < NOW() - INTERVAL '5 minutes';

  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.complete_meta_app_event_claim(
  p_user_id UUID,
  p_event_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to complete Meta app event';
  END IF;

  UPDATE public.meta_app_event_claims
  SET delivered_at = NOW()
  WHERE user_id = p_user_id
    AND event_key = TRIM(COALESCE(p_event_key, ''))
    AND delivered_at IS NULL;

  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.release_meta_app_event_claim(
  p_user_id UUID,
  p_event_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to release Meta app event';
  END IF;

  DELETE FROM public.meta_app_event_claims
  WHERE user_id = p_user_id
    AND event_key = TRIM(COALESCE(p_event_key, ''))
    AND delivered_at IS NULL;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.claim_meta_app_event(UUID, TEXT) IS
'Claims a Meta app event for the expected authenticated user. An interrupted pending claim can be retried after five minutes.';
COMMENT ON FUNCTION public.complete_meta_app_event_claim(UUID, TEXT) IS
'Marks a claimed Meta app event as delivered by the client SDK.';
COMMENT ON FUNCTION public.release_meta_app_event_claim(UUID, TEXT) IS
'Releases a pending Meta app event after a synchronous client SDK logging failure.';

REVOKE ALL ON FUNCTION public.claim_meta_app_event(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_meta_app_event_claim(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_meta_app_event_claim(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_meta_app_event_claim(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_meta_app_event_claim(UUID, TEXT) TO authenticated;

