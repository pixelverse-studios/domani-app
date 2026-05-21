-- Remote follow-up for projects that already applied the intermediate
-- authenticated confirmation RPC. Drop that public surface and replace it with
-- the service-only confirmation function.

DROP FUNCTION IF EXISTS public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.confirm_promo_redemption_for_user(
  p_user_id UUID,
  p_redemption_attempt_id UUID,
  p_code_id UUID,
  p_campaign_id UUID,
  p_revenuecat_app_user_id TEXT DEFAULT NULL,
  p_store_product_id TEXT DEFAULT NULL,
  p_store_transaction_id TEXT DEFAULT NULL
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
    AND status = 'valid'::public.promo_redemption_status
  FOR UPDATE;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1
      FROM public.promo_redemption_attempts
      WHERE id = p_redemption_attempt_id
        AND user_id = p_user_id
        AND code_id = p_code_id
        AND campaign_id = p_campaign_id
        AND status = 'confirmed'::public.promo_redemption_status
    ) THEN
      RETURN JSONB_BUILD_OBJECT(
        'status', 'already_confirmed',
        'redemptionAttemptId', p_redemption_attempt_id,
        'codeId', p_code_id,
        'campaignId', p_campaign_id
      );
    END IF;

    RETURN JSONB_BUILD_OBJECT(
      'status', 'not_found',
      'redemptionAttemptId', p_redemption_attempt_id,
      'codeId', p_code_id,
      'campaignId', p_campaign_id
    );
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
    AND tier = 'lifetime'::public.tier
    AND purchased_at IS NOT NULL
    AND purchased_at >= v_attempt.created_at;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'purchase_not_verified',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
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

COMMENT ON FUNCTION public.confirm_promo_redemption_for_user(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT) IS
'Service-only promo confirmation used after server-side purchase evidence confirms lifetime access.';

REVOKE ALL ON FUNCTION public.confirm_promo_redemption_for_user(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_promo_redemption_for_user(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT) TO service_role;
