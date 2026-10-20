-- Recover delayed paid-promo processing using store purchase time.
-- Keep both the entitlement grant and promo confirmation atomic.
CREATE OR REPLACE FUNCTION public.confirm_promo_redemption_for_user(
  p_user_id UUID,
  p_redemption_attempt_id UUID,
  p_code_id UUID,
  p_campaign_id UUID,
  p_revenuecat_app_user_id TEXT,
  p_store_product_id TEXT,
  p_store_transaction_id TEXT,
  p_verified_purchased_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.promo_redemption_attempts;
  v_code public.promo_codes;
  v_campaign public.promo_campaigns;
  v_profile public.profiles;
  v_campaign_user_redemptions INTEGER := 0;
  v_code_user_redemptions INTEGER := 0;
  v_expected_product_id TEXT;
  v_attempt_max_age INTERVAL := INTERVAL '30 minutes';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  SELECT *
  INTO v_attempt
  FROM public.promo_redemption_attempts
  WHERE id = p_redemption_attempt_id
    AND user_id = p_user_id
    AND code_id = p_code_id
    AND campaign_id = p_campaign_id
    AND status IN ('valid'::public.promo_redemption_status, 'confirmed'::public.promo_redemption_status)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'not_found',
      'redemptionAttemptId', p_redemption_attempt_id,
      'codeId', p_code_id,
      'campaignId', p_campaign_id
    );
  END IF;

  -- Processing can be delayed indefinitely; eligibility belongs to the
  -- server-verified store purchase time, never webhook delivery or worker time.
  IF p_verified_purchased_at IS NULL
    OR p_verified_purchased_at > NOW() + INTERVAL '5 minutes'
    OR p_verified_purchased_at < v_attempt.created_at
    OR p_verified_purchased_at > v_attempt.created_at + v_attempt_max_age THEN
    RETURN JSONB_BUILD_OBJECT('status', 'purchase_outside_validation_window');
  END IF;

  IF v_attempt.status = 'confirmed'::public.promo_redemption_status THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', CASE WHEN v_attempt.store_product_id = p_store_product_id
        THEN 'already_confirmed' ELSE 'product_mismatch' END,
      'redemptionAttemptId', v_attempt.id, 'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id
    );
  END IF;

  SELECT *
  INTO v_code
  FROM public.promo_codes
  WHERE id = v_attempt.code_id
  FOR UPDATE;

  SELECT *
  INTO v_campaign
  FROM public.promo_campaigns
  WHERE id = v_attempt.campaign_id
  FOR UPDATE;

  IF v_code.id IS NULL OR v_campaign.id IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'not_found',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id
    );
  END IF;

  v_expected_product_id := CASE v_attempt.platform
    WHEN 'ios' THEN v_campaign.ios_product_id
    WHEN 'android' THEN v_campaign.android_product_id
    ELSE NULL
  END;

  IF v_expected_product_id IS NULL
    OR p_store_product_id IS NULL
    OR p_store_product_id <> v_expected_product_id THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'product_mismatch',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id,
      'expectedProductId', v_expected_product_id,
      'actualProductId', p_store_product_id
    );
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
    AND tier = 'lifetime'::public.tier
    AND purchased_at IS NOT NULL
    AND purchased_at >= p_verified_purchased_at;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'purchase_not_verified',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id
    );
  END IF;

  IF v_code.status <> 'active'::public.promo_code_status
    OR v_code.redemption_count >= v_code.max_redemptions
    OR (
      v_campaign.max_redemptions IS NOT NULL
      AND v_campaign.redemption_count >= v_campaign.max_redemptions
    ) THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'over_limit',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id
    );
  END IF;

  SELECT COUNT(*)
  INTO v_campaign_user_redemptions
  FROM public.promo_redemption_attempts
  WHERE campaign_id = v_campaign.id
    AND user_id = p_user_id
    AND status = 'confirmed'::public.promo_redemption_status;

  SELECT COUNT(*)
  INTO v_code_user_redemptions
  FROM public.promo_redemption_attempts
  WHERE code_id = v_code.id
    AND user_id = p_user_id
    AND status = 'confirmed'::public.promo_redemption_status;

  IF v_campaign_user_redemptions >= v_campaign.max_redemptions_per_user
    OR v_code_user_redemptions >= v_code.max_redemptions_per_user THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'already_redeemed',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id
    );
  END IF;

  UPDATE public.promo_redemption_attempts
  SET
    status = 'confirmed'::public.promo_redemption_status,
    confirmed_at = NOW(),
    revenuecat_app_user_id = COALESCE(p_revenuecat_app_user_id, revenuecat_app_user_id),
    store_product_id = COALESCE(p_store_product_id, store_product_id),
    store_transaction_id = COALESCE(p_store_transaction_id, store_transaction_id),
    error_code = NULL,
    error_message = NULL,
    response_payload = response_payload || JSONB_BUILD_OBJECT(
      'status', 'confirmed',
      'confirmedAt', NOW()
    )
  WHERE id = v_attempt.id
    AND status = 'valid'::public.promo_redemption_status
  RETURNING *
  INTO v_attempt;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'confirmation_race_lost',
      'redemptionAttemptId', p_redemption_attempt_id,
      'codeId', p_code_id,
      'campaignId', p_campaign_id
    );
  END IF;

  UPDATE public.promo_codes
  SET
    redemption_count = redemption_count + 1,
    status = CASE
      WHEN redemption_count + 1 >= max_redemptions THEN 'exhausted'::public.promo_code_status
      ELSE status
    END
  WHERE id = v_attempt.code_id;

  UPDATE public.promo_campaigns
  SET redemption_count = redemption_count + 1
  WHERE id = v_attempt.campaign_id;

  RETURN JSONB_BUILD_OBJECT(
    'status', 'confirmed',
    'redemptionAttemptId', v_attempt.id,
    'codeId', v_attempt.code_id,
    'campaignId', v_attempt.campaign_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_promo_redemption_for_user(
  uuid, uuid, uuid, uuid, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_promo_redemption_for_user(
  uuid, uuid, uuid, uuid, text, text, text, timestamptz
) TO service_role;

-- Preserve the existing service signature. Current verified transactions below
-- pass explicit evidence; older service callers use the recorded purchase.
CREATE OR REPLACE FUNCTION public.confirm_promo_redemption_for_user(
  p_user_id uuid, p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid,
  p_revenuecat_app_user_id text DEFAULT NULL,
  p_store_product_id text DEFAULT NULL,
  p_store_transaction_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.confirm_promo_redemption_for_user(
    p_user_id, p_redemption_attempt_id, p_code_id, p_campaign_id,
    p_revenuecat_app_user_id, p_store_product_id, p_store_transaction_id,
    (SELECT purchased_at FROM public.profiles WHERE id = p_user_id)
  );
$$;
REVOKE ALL ON FUNCTION public.confirm_promo_redemption_for_user(
  uuid, uuid, uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_promo_redemption_for_user(
  uuid, uuid, uuid, uuid, text, text, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_verified_revenuecat_lifetime_access(
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
      p_user_id::text, p_store_product_id, NULL, p_verified_purchased_at
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

CREATE OR REPLACE FUNCTION public.apply_revenuecat_webhook_transition(
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

  -- A refund reversal restores an already-confirmed purchase. Its event
  -- timestamp orders the reversal, but cannot revalidate a days-old attempt.
  IF p_redemption_attempt_id IS NOT NULL AND NOT (
    p_action = 'reversal' AND EXISTS (
      SELECT 1 FROM public.promo_redemption_attempts
      WHERE id = p_redemption_attempt_id AND user_id = p_user_id
        AND code_id = p_code_id AND campaign_id = p_campaign_id
        AND store_product_id = p_store_product_id AND status::text = 'confirmed'
    )
  ) THEN
    IF p_code_id IS NULL OR p_campaign_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Incomplete promo context';
    END IF;
    v_confirmation := public.confirm_promo_redemption_for_user(
      p_user_id, p_redemption_attempt_id, p_code_id, p_campaign_id,
      p_user_id::text, p_store_product_id, p_store_transaction_id, p_purchase_at
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
