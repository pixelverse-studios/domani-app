-- A verified purchase preceding a recorded refund cannot restore access.
-- Close only the queued snapshot the worker actually inspected; a later
-- purchase or restore request can enqueue a fresh reconciliation.
CREATE FUNCTION public.resolve_stale_revenuecat_reconciliation(
  p_user_id uuid,
  p_verified_purchased_at timestamptz,
  p_request_seen_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_refunded_at timestamptz;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;
  IF p_user_id IS NULL OR p_verified_purchased_at IS NULL
     OR p_request_seen_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid reconciliation';
  END IF;

  SELECT refunded_at INTO v_refunded_at FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_refunded_at IS NULL
     OR p_verified_purchased_at > v_refunded_at THEN
    RETURN false;
  END IF;

  UPDATE public.revenuecat_access_reconciliation_requests
  SET reconciled_at = p_request_seen_at,
      last_attempt_at = pg_catalog.now()
  WHERE user_id = p_user_id AND requested_at = p_request_seen_at;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_stale_revenuecat_reconciliation(
  uuid, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_stale_revenuecat_reconciliation(
  uuid, timestamptz, timestamptz
) TO service_role;
