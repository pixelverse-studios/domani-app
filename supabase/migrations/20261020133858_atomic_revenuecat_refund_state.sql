-- Keep accepted refunds and their app-facing hint in the same profile-locked
-- transaction. A later grant cannot clear the hint between these two writes.
-- Preserve the existing service transition signature for older service callers.
CREATE FUNCTION public.apply_revenuecat_webhook_transition_with_refund_state(
  p_user_id uuid,
  p_action text,
  p_event_at timestamptz,
  p_store text,
  p_event_type text,
  p_purchase_at timestamptz DEFAULT NULL,
  p_store_product_id text DEFAULT NULL,
  p_redemption_attempt_id uuid DEFAULT NULL,
  p_code_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_store_transaction_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;
  IF p_action = 'refund' AND (
    p_event_type IS NULL OR p_event_type NOT IN ('REFUND', 'CANCELLATION')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid refund event type';
  END IF;

  -- The original transition obtains FOR UPDATE on this profile; that lock is
  -- retained until this entire RPC transaction commits, including the hint.
  v_result := public.apply_revenuecat_webhook_transition(
    p_user_id, p_action, p_event_at, p_purchase_at, p_store_product_id,
    p_redemption_attempt_id, p_code_id, p_campaign_id, p_store_transaction_id
  );
  IF p_action = 'refund' AND pg_catalog.upper(p_store) IN ('APP_STORE', 'MAC_APP_STORE')
    AND v_result->>'status' IN ('applied', 'already_applied') THEN
    INSERT INTO public.purchase_refund_states (
      user_id, platform, status, client_hint, requested_at, resolved_at,
      last_source, last_error
    ) VALUES (
      p_user_id, 'ios', 'approved'::public.refund_request_status, NULL,
      p_event_at, p_event_at, 'revenuecat:' || p_event_type, NULL
    ) ON CONFLICT (user_id) DO UPDATE SET
      platform = EXCLUDED.platform, status = EXCLUDED.status,
      client_hint = NULL, requested_at = EXCLUDED.requested_at,
      resolved_at = EXCLUDED.resolved_at, last_source = EXCLUDED.last_source,
      last_error = NULL;
  END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_revenuecat_webhook_transition_with_refund_state(
  uuid, text, timestamptz, text, text, timestamptz, text, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_revenuecat_webhook_transition_with_refund_state(
  uuid, text, timestamptz, text, text, timestamptz, text, uuid, uuid, uuid, text
) TO service_role;
NOTIFY pgrst, 'reload schema';
