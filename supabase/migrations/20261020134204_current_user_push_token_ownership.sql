-- Current clients transfer a device token atomically. Released direct profile
-- writes remain compatible until the separately gated column revocation.
CREATE FUNCTION public.claim_current_user_push_token(p_expected_user_id uuid, p_push_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authenticated user mismatch';
  END IF;
  IF p_push_token IS NULL OR length(p_push_token)>255
    OR p_push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Invalid push token';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_push_token,0));
  -- Consistent row ordering also serializes claims of different tokens whose
  -- previous/current owners overlap. Locks persist through both updates.
  PERFORM id FROM public.profiles
  WHERE id=p_expected_user_id OR expo_push_token=p_push_token ORDER BY id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_expected_user_id) THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='Profile not found';
  END IF;
  UPDATE public.profiles SET expo_push_token=NULL,push_token_invalid_at=NULL,updated_at=now()
  WHERE expo_push_token=p_push_token AND id<>p_expected_user_id;
  UPDATE public.profiles SET expo_push_token=p_push_token,push_token_invalid_at=NULL,updated_at=now()
  WHERE id=p_expected_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_current_user_push_token(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_current_user_push_token(uuid,text) TO authenticated;

CREATE FUNCTION public.unclaim_current_user_push_token(p_expected_user_id uuid, p_push_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_expected_user_id THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authenticated user mismatch';
  END IF;
  IF p_push_token IS NULL OR length(p_push_token)>255
    OR p_push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Invalid push token';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_push_token,0));
  -- A late signout on another installation cannot clear a replacement token.
  UPDATE public.profiles SET expo_push_token=NULL,push_token_invalid_at=NULL,updated_at=now()
  WHERE id=p_expected_user_id AND expo_push_token=p_push_token;
END;
$$;
REVOKE ALL ON FUNCTION public.unclaim_current_user_push_token(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.unclaim_current_user_push_token(uuid,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
