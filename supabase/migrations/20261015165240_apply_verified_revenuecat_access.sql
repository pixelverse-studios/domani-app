-- DEV-1420: only the server's RevenueCat lookup may apply paid lifetime access.
CREATE FUNCTION public.apply_verified_revenuecat_lifetime_access(
  p_user_id uuid,
  p_verified_purchased_at timestamptz,
  p_store_product_id text,
  p_redemption_attempt_id uuid DEFAULT NULL,
  p_code_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_request_seen_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_was_lifetime boolean;
  v_confirmation jsonb;
  v_status text;
  v_any_promo boolean := p_redemption_attempt_id IS NOT NULL
    OR p_code_id IS NOT NULL OR p_campaign_id IS NOT NULL;
  v_complete_promo boolean := p_redemption_attempt_id IS NOT NULL
    AND p_code_id IS NOT NULL AND p_campaign_id IS NOT NULL;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;
  IF p_user_id IS NULL OR p_verified_purchased_at IS NULL
     OR p_verified_purchased_at > pg_catalog.now() + interval '5 minutes'
     OR p_store_product_id IS NULL
     OR p_store_product_id NOT IN (
       'domani_lifetime', 'domani_lifetime_early', 'domani_lifetime_friends'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid verified purchase';
  END IF;
  IF v_any_promo AND NOT v_complete_promo THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Incomplete promo context';
  END IF;
  IF p_store_product_id = 'domani_lifetime_friends' AND NOT v_complete_promo THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Promo context required';
  END IF;

  SELECT * INTO v_profile FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Profile not found';
  END IF;
  IF v_profile.refunded_at IS NOT NULL
     AND p_verified_purchased_at <= v_profile.refunded_at THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'stale_refund', 'accessGranted', false
    );
  END IF;
  v_was_lifetime := v_profile.tier = 'lifetime'::public.tier
    AND v_profile.refunded_at IS NULL;

  UPDATE public.profiles SET
    tier = 'lifetime'::public.tier,
    purchased_at = CASE
      WHEN v_profile.purchased_at IS NULL
        OR p_verified_purchased_at > v_profile.purchased_at
      THEN p_verified_purchased_at ELSE v_profile.purchased_at END,
    refunded_at = NULL,
    trial_ends_at = NULL,
    revenuecat_user_id = p_user_id::text,
    updated_at = pg_catalog.now()
  WHERE id = p_user_id;

  IF v_complete_promo THEN
    v_confirmation := public.confirm_promo_redemption_for_user(
      p_user_id, p_redemption_attempt_id, p_code_id, p_campaign_id,
      p_user_id::text, p_store_product_id, NULL
    );
    v_status := v_confirmation->>'status';
    IF v_status NOT IN ('confirmed', 'already_confirmed') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Promo confirmation failed';
    END IF;
  END IF;

  DELETE FROM public.purchase_refund_states WHERE user_id = p_user_id;
  UPDATE public.revenuecat_access_reconciliation_requests
  SET reconciled_at = p_request_seen_at,
      last_attempt_at = pg_catalog.now()
  WHERE user_id = p_user_id
    AND requested_at = p_request_seen_at;

  RETURN pg_catalog.jsonb_build_object(
    'status', CASE WHEN v_was_lifetime THEN 'synced'
      ELSE 'synced_new_lifetime' END,
    'accessGranted', true,
    'promoConfirmation', v_confirmation
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_verified_revenuecat_lifetime_access(
  uuid, timestamptz, text, uuid, uuid, uuid, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_revenuecat_lifetime_access(
  uuid, timestamptz, text, uuid, uuid, uuid, timestamptz
) TO service_role;

CREATE FUNCTION public.claim_pending_revenuecat_reconciliations(p_limit integer DEFAULT 10)
RETURNS TABLE(user_id uuid, requested_at timestamptz)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;

  RETURN QUERY
  WITH pending AS (
    SELECT requests.user_id
    FROM public.revenuecat_access_reconciliation_requests AS requests
    WHERE (requests.reconciled_at IS NULL
           OR requests.requested_at > requests.reconciled_at)
      AND (requests.last_attempt_at IS NULL
           OR requests.last_attempt_at <= pg_catalog.now() - interval '5 minutes')
    ORDER BY requests.requested_at, requests.user_id
    LIMIT least(greatest(p_limit, 1), 25)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.revenuecat_access_reconciliation_requests AS requests
  SET last_attempt_at = pg_catalog.now(), attempts = attempts + 1
  FROM pending WHERE requests.user_id = pending.user_id
  RETURNING requests.user_id, requests.requested_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_revenuecat_reconciliations(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_revenuecat_reconciliations(integer)
  TO service_role;

CREATE FUNCTION public.claim_current_user_revenuecat_sync(p_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_requested_at timestamptz;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;

  UPDATE public.revenuecat_access_reconciliation_requests
  SET last_attempt_at = pg_catalog.now(), attempts = attempts + 1
  WHERE user_id = p_user_id
    AND (last_attempt_at IS NULL
      OR last_attempt_at <= pg_catalog.now() - interval '10 seconds')
  RETURNING requested_at INTO v_requested_at;
  RETURN v_requested_at;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_current_user_revenuecat_sync(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_current_user_revenuecat_sync(uuid)
  TO service_role;

-- Keep the released free-promo RPC shape, but paid promo attempts must go
-- through the verified service transaction above. Client-supplied product
-- IDs and RevenueCat identity never establish a paid purchase.
ALTER FUNCTION public.confirm_current_user_promo_redemption(
  uuid, uuid, uuid, text, text, text
) RENAME TO confirm_current_user_promo_redemption_legacy_impl;

REVOKE ALL ON FUNCTION public.confirm_current_user_promo_redemption_legacy_impl(
  uuid, uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.confirm_current_user_promo_redemption(
  p_redemption_attempt_id uuid,
  p_code_id uuid,
  p_campaign_id uuid,
  p_revenuecat_app_user_id text DEFAULT NULL,
  p_store_product_id text DEFAULT NULL,
  p_store_transaction_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_free boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authenticated';
  END IF;

  SELECT campaigns.payment_required = false
    AND campaigns.campaign_type::text = 'free_lifetime'
    AND campaigns.discount_kind::text = 'free'
  INTO v_is_free
  FROM public.promo_redemption_attempts AS attempts
  JOIN public.promo_campaigns AS campaigns ON campaigns.id = attempts.campaign_id
  WHERE attempts.id = p_redemption_attempt_id
    AND attempts.user_id = v_user_id
    AND attempts.code_id = p_code_id
    AND attempts.campaign_id = p_campaign_id;

  IF NOT coalesce(v_is_free, false) THEN
    RETURN pg_catalog.jsonb_build_object('status', 'server_verification_required');
  END IF;

  RETURN public.confirm_current_user_promo_redemption_legacy_impl(
    p_redemption_attempt_id, p_code_id, p_campaign_id,
    v_user_id::text, NULL, NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_current_user_promo_redemption(
  uuid, uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_current_user_promo_redemption(
  uuid, uuid, uuid, text, text, text
) TO authenticated;

-- Serialize webhook grants/refunds with the verified sync RPC on the profile
-- row. Delayed events cannot overwrite a newer purchase or refund.
CREATE FUNCTION public.apply_revenuecat_webhook_transition(
  p_user_id uuid,
  p_action text,
  p_event_at timestamptz,
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
  v_profile public.profiles%ROWTYPE;
  v_confirmation jsonb;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;
  IF p_user_id IS NULL OR p_event_at IS NULL OR p_action IS NULL
     OR p_action NOT IN ('grant', 'reversal', 'refund') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid webhook transition';
  END IF;
  SELECT * INTO v_profile FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Profile not found';
  END IF;

  IF p_action = 'refund' THEN
    IF v_profile.refunded_at = p_event_at THEN
      RETURN pg_catalog.jsonb_build_object('status', 'already_applied');
    END IF;
    IF (v_profile.purchased_at IS NOT NULL
        AND p_event_at < v_profile.purchased_at)
       OR (v_profile.refunded_at IS NOT NULL
        AND p_event_at <= v_profile.refunded_at) THEN
      RETURN pg_catalog.jsonb_build_object('status', 'stale');
    END IF;
    UPDATE public.profiles SET tier = 'none'::public.tier,
      purchased_at = NULL, refunded_at = p_event_at,
      trial_ends_at = NULL, updated_at = pg_catalog.now()
    WHERE id = p_user_id;
    RETURN pg_catalog.jsonb_build_object('status', 'applied');
  END IF;

  IF p_purchase_at IS NULL OR p_store_product_id IS NULL
     OR p_store_product_id NOT IN (
       'domani_lifetime', 'domani_lifetime_early', 'domani_lifetime_friends'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid lifetime event';
  END IF;
  IF v_profile.refunded_at IS NOT NULL AND (
    (p_action = 'grant' AND p_purchase_at <= v_profile.refunded_at)
    OR (p_action = 'reversal' AND p_event_at <= v_profile.refunded_at)
  ) THEN
    RETURN pg_catalog.jsonb_build_object('status', 'stale');
  END IF;
  IF p_store_product_id = 'domani_lifetime_friends'
     AND p_action = 'grant'
     AND (p_redemption_attempt_id IS NULL OR p_code_id IS NULL
       OR p_campaign_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Promo context required';
  END IF;
  IF (p_redemption_attempt_id IS NOT NULL OR p_code_id IS NOT NULL
      OR p_campaign_id IS NOT NULL)
     AND (p_redemption_attempt_id IS NULL OR p_code_id IS NULL
      OR p_campaign_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Incomplete promo context';
  END IF;
  IF p_store_product_id = 'domani_lifetime_friends'
     AND p_action = 'reversal'
     AND p_redemption_attempt_id IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.promo_redemption_attempts
       WHERE user_id = p_user_id AND status::text = 'confirmed'
         AND store_product_id = p_store_product_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Confirmed promo required';
  END IF;

  UPDATE public.profiles SET tier = 'lifetime'::public.tier,
    purchased_at = CASE
      WHEN v_profile.purchased_at IS NULL OR p_purchase_at > v_profile.purchased_at
      THEN p_purchase_at ELSE v_profile.purchased_at END,
    refunded_at = NULL, trial_ends_at = NULL,
    revenuecat_user_id = p_user_id::text,
    updated_at = pg_catalog.now()
  WHERE id = p_user_id;

  IF p_redemption_attempt_id IS NOT NULL THEN
    IF p_code_id IS NULL OR p_campaign_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Incomplete promo context';
    END IF;
    v_confirmation := public.confirm_promo_redemption_for_user(
      p_user_id, p_redemption_attempt_id, p_code_id, p_campaign_id,
      p_user_id::text, p_store_product_id, p_store_transaction_id
    );
    IF v_confirmation->>'status' NOT IN ('confirmed', 'already_confirmed') THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001',
        MESSAGE = 'Promo confirmation failed';
    END IF;
  END IF;
  DELETE FROM public.purchase_refund_states WHERE user_id = p_user_id;
  RETURN pg_catalog.jsonb_build_object('status', 'applied');
END;
$$;

REVOKE ALL ON FUNCTION public.apply_revenuecat_webhook_transition(
  uuid, text, timestamptz, timestamptz, text, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_revenuecat_webhook_transition(
  uuid, text, timestamptz, timestamptz, text, uuid, uuid, uuid, text
) TO service_role;
