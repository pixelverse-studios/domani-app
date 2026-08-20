-- DEV-1109: remove the post-SDK acknowledgement window that could duplicate
-- Meta events when a successful native log was followed by a network failure.

DROP FUNCTION public.complete_meta_app_event_claim(UUID, TEXT, UUID);

CREATE FUNCTION public.authorize_meta_app_event_dispatch(
  p_user_id UUID,
  p_event_key TEXT,
  p_claim_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to dispatch Meta app event';
  END IF;

  -- This is intentionally the terminal server transition. The client calls
  -- the native Meta logger only after this succeeds, providing at-most-once
  -- dispatch across the database/native-SDK boundary.
  UPDATE public.meta_app_event_claims
  SET delivered_at = NOW()
  WHERE user_id = p_user_id
    AND event_key = TRIM(COALESCE(p_event_key, ''))
    AND claim_token = p_claim_token
    AND delivered_at IS NULL;

  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.retry_failed_meta_app_event_dispatch(
  p_user_id UUID,
  p_event_key TEXT,
  p_claim_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to retry Meta app event';
  END IF;

  -- A synchronous native logger failure proves the event was not accepted.
  -- Make the same token-owned row immediately reclaimable.
  UPDATE public.meta_app_event_claims
  SET delivered_at = NULL,
      claimed_at = NOW() - INTERVAL '5 minutes'
  WHERE user_id = p_user_id
    AND event_key = TRIM(COALESCE(p_event_key, ''))
    AND claim_token = p_claim_token
    AND delivered_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.get_meta_app_event_claim_status(
  p_user_id UUID,
  p_event_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to inspect Meta app event';
  END IF;

  SELECT CASE WHEN delivered_at IS NULL THEN 'pending' ELSE 'delivered' END
  INTO v_status
  FROM public.meta_app_event_claims
  WHERE user_id = p_user_id
    AND event_key = TRIM(COALESCE(p_event_key, ''));

  RETURN v_status;
END;
$$;

COMMENT ON FUNCTION public.authorize_meta_app_event_dispatch(UUID, TEXT, UUID) IS
'Atomically authorizes one token-owned Meta SDK dispatch and terminally marks it delivered before the native call.';
COMMENT ON FUNCTION public.retry_failed_meta_app_event_dispatch(UUID, TEXT, UUID) IS
'Returns a token-owned event to the retry queue after a synchronous native SDK failure.';
COMMENT ON FUNCTION public.get_meta_app_event_claim_status(UUID, TEXT) IS
'Returns pending or delivered for one fixed Meta event owned by the authenticated user.';

REVOKE ALL ON FUNCTION public.authorize_meta_app_event_dispatch(UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.retry_failed_meta_app_event_dispatch(UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_meta_app_event_claim_status(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.authorize_meta_app_event_dispatch(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_meta_app_event_dispatch(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_meta_app_event_claim_status(UUID, TEXT) TO authenticated;

