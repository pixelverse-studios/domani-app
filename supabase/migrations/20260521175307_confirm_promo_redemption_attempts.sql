-- Confirm a validated promo redemption after RevenueCat verifies store-backed access.
--
-- Validation only proves a code is eligible. This function is called after the
-- app has confirmed an active lifetime entitlement, then atomically marks that
-- validation attempt as confirmed and consumes one redemption from the code and
-- campaign limits.

CREATE OR REPLACE FUNCTION public.confirm_current_user_promo_redemption(
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
  v_user_id UUID := auth.uid();
  v_attempt public.promo_redemption_attempts;
  v_profile public.profiles;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_attempt
  FROM public.promo_redemption_attempts
  WHERE id = p_redemption_attempt_id
    AND user_id = v_user_id
    AND code_id = p_code_id
    AND campaign_id = p_campaign_id
    AND status = 'valid'::public.promo_redemption_status;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1
      FROM public.promo_redemption_attempts
      WHERE id = p_redemption_attempt_id
        AND user_id = v_user_id
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
  WHERE id = v_user_id
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
  WHERE id = p_redemption_attempt_id
    AND user_id = v_user_id
    AND code_id = p_code_id
    AND campaign_id = p_campaign_id
    AND status = 'valid'::public.promo_redemption_status
  RETURNING *
  INTO v_attempt;

  IF FOUND THEN
    UPDATE public.promo_codes
    SET
      redemption_count = LEAST(redemption_count + 1, max_redemptions),
      status = CASE
        WHEN LEAST(redemption_count + 1, max_redemptions) >= max_redemptions THEN 'exhausted'::public.promo_code_status
        ELSE status
      END
    WHERE id = v_attempt.code_id;

    UPDATE public.promo_campaigns
    SET redemption_count = CASE
      WHEN max_redemptions IS NULL THEN redemption_count + 1
      ELSE LEAST(redemption_count + 1, max_redemptions)
    END
    WHERE id = v_attempt.campaign_id;

    RETURN JSONB_BUILD_OBJECT(
      'status', 'confirmed',
      'redemptionAttemptId', v_attempt.id,
      'codeId', v_attempt.code_id,
      'campaignId', v_attempt.campaign_id
    );
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'status', 'confirmation_race_lost',
    'redemptionAttemptId', p_redemption_attempt_id,
    'codeId', p_code_id,
    'campaignId', p_campaign_id
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT) IS
'Marks the current authenticated user''s validated promo redemption attempt as confirmed after RevenueCat verifies store-backed lifetime access.';

REVOKE ALL ON FUNCTION public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
