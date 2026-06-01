-- Grant free lifetime promo codes entirely in app.
--
-- Gift codes should not send users to Apple/Google native promo-code entry,
-- because that forces a second code entry. Paid promo campaigns still use the
-- existing store/RevenueCat purchase paths.

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_platform TEXT,
  p_app_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_platform TEXT := LOWER(TRIM(COALESCE(p_platform, '')));
  v_code_hash TEXT := public.hash_promo_code(p_code);
  v_now TIMESTAMPTZ := NOW();
  v_campaign public.promo_campaigns;
  v_code public.promo_codes;
  v_status public.promo_redemption_status;
  v_message_key TEXT;
  v_store_action TEXT;
  v_product_id TEXT;
  v_fallback_url TEXT;
  v_attempt_id UUID := gen_random_uuid();
  v_campaign_redemptions INTEGER := 0;
  v_code_redemptions INTEGER := 0;
  v_campaign_user_redemptions INTEGER := 0;
  v_code_user_redemptions INTEGER := 0;
  v_response JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_platform NOT IN ('ios', 'android') THEN
    v_platform := NULL;
  END IF;

  IF v_code_hash IS NOT NULL THEN
    SELECT c.*
    INTO v_code
    FROM public.promo_codes c
    WHERE c.code_hash = v_code_hash;

    IF FOUND THEN
      SELECT pc.*
      INTO v_campaign
      FROM public.promo_campaigns pc
      WHERE pc.id = v_code.campaign_id;
    END IF;
  END IF;

  IF v_code_hash IS NULL OR v_code.id IS NULL OR v_campaign.id IS NULL THEN
    v_status := 'invalid'::public.promo_redemption_status;
    v_message_key := 'promo.validation.invalid';
  ELSIF v_code.assigned_user_id IS NOT NULL AND v_code.assigned_user_id <> v_user_id THEN
    v_status := 'invalid'::public.promo_redemption_status;
    v_message_key := 'promo.validation.invalid';
  ELSIF v_platform IS NULL THEN
    v_status := 'platform_unavailable'::public.promo_redemption_status;
    v_message_key := 'promo.validation.platformUnavailable';
  ELSIF v_campaign.is_active = FALSE
    OR v_code.status IN (
      'inactive'::public.promo_code_status,
      'revoked'::public.promo_code_status
    ) THEN
    v_status := 'inactive'::public.promo_redemption_status;
    v_message_key := 'promo.validation.inactive';
  ELSIF v_code.status = 'exhausted'::public.promo_code_status THEN
    v_status := 'over_limit'::public.promo_redemption_status;
    v_message_key := 'promo.validation.overLimit';
  ELSIF v_campaign.starts_at IS NOT NULL AND v_now < v_campaign.starts_at THEN
    v_status := 'inactive'::public.promo_redemption_status;
    v_message_key := 'promo.validation.inactive';
  ELSIF v_code.starts_at IS NOT NULL AND v_now < v_code.starts_at THEN
    v_status := 'inactive'::public.promo_redemption_status;
    v_message_key := 'promo.validation.inactive';
  ELSIF v_campaign.ends_at IS NOT NULL AND v_now >= v_campaign.ends_at THEN
    v_status := 'expired'::public.promo_redemption_status;
    v_message_key := 'promo.validation.expired';
  ELSIF v_code.ends_at IS NOT NULL AND v_now >= v_code.ends_at THEN
    v_status := 'expired'::public.promo_redemption_status;
    v_message_key := 'promo.validation.expired';
  ELSIF v_platform = 'ios' AND v_campaign.ios_is_available = FALSE THEN
    v_status := 'platform_unavailable'::public.promo_redemption_status;
    v_message_key := 'promo.validation.platformUnavailable';
  ELSIF v_platform = 'android' AND v_campaign.android_is_available = FALSE THEN
    v_status := 'platform_unavailable'::public.promo_redemption_status;
    v_message_key := 'promo.validation.platformUnavailable';
  ELSE
    SELECT COUNT(*)
    INTO v_campaign_redemptions
    FROM public.promo_redemption_attempts
    WHERE campaign_id = v_campaign.id
      AND status = 'confirmed'::public.promo_redemption_status;

    SELECT COUNT(*)
    INTO v_code_redemptions
    FROM public.promo_redemption_attempts
    WHERE code_id = v_code.id
      AND status = 'confirmed'::public.promo_redemption_status;

    SELECT COUNT(*)
    INTO v_campaign_user_redemptions
    FROM public.promo_redemption_attempts
    WHERE campaign_id = v_campaign.id
      AND user_id = v_user_id
      AND status = 'confirmed'::public.promo_redemption_status;

    SELECT COUNT(*)
    INTO v_code_user_redemptions
    FROM public.promo_redemption_attempts
    WHERE code_id = v_code.id
      AND user_id = v_user_id
      AND status = 'confirmed'::public.promo_redemption_status;

    IF (v_campaign.max_redemptions IS NOT NULL AND v_campaign_redemptions >= v_campaign.max_redemptions)
      OR v_code_redemptions >= v_code.max_redemptions
      OR v_campaign.redemption_count >= COALESCE(v_campaign.max_redemptions, v_campaign.redemption_count + 1)
      OR v_code.redemption_count >= v_code.max_redemptions THEN
      v_status := 'over_limit'::public.promo_redemption_status;
      v_message_key := 'promo.validation.overLimit';
    ELSIF v_campaign_user_redemptions >= v_campaign.max_redemptions_per_user
      OR v_code_user_redemptions >= v_code.max_redemptions_per_user THEN
      v_status := 'already_redeemed'::public.promo_redemption_status;
      v_message_key := 'promo.validation.alreadyRedeemed';
    ELSE
      v_status := 'valid'::public.promo_redemption_status;
      v_message_key := 'promo.validation.valid';
    END IF;
  END IF;

  IF v_status = 'valid'::public.promo_redemption_status THEN
    IF v_campaign.payment_required = FALSE THEN
      v_store_action := 'server_grant_lifetime';
      v_product_id := NULL;
      v_fallback_url := NULL;
    ELSIF v_platform = 'ios' THEN
      v_store_action := CASE v_campaign.ios_redemption_strategy
        WHEN 'offer_code_sheet' THEN 'ios_offer_code_sheet'
        WHEN 'revenuecat_purchase_package' THEN 'revenuecat_purchase_package'
        ELSE NULL
      END;
      v_product_id := v_campaign.ios_product_id;
      v_fallback_url := v_campaign.ios_fallback_url_template;
    ELSE
      v_store_action := CASE v_campaign.android_redemption_strategy
        WHEN 'play_promo_code_flow' THEN 'android_promo_code_flow'
        WHEN 'revenuecat_purchase_package' THEN 'revenuecat_purchase_package'
        ELSE NULL
      END;
      v_product_id := v_campaign.android_product_id;
      v_fallback_url := v_campaign.android_fallback_url_template;
    END IF;

    IF v_store_action IS NULL THEN
      v_status := 'platform_unavailable'::public.promo_redemption_status;
      v_message_key := 'promo.validation.platformUnavailable';
    END IF;
  END IF;

  IF v_status = 'valid'::public.promo_redemption_status THEN
    v_response := JSONB_BUILD_OBJECT(
      'status', 'valid',
      'messageKey', v_message_key,
      'campaignId', v_campaign.id,
      'campaignSlug', v_campaign.slug,
      'codeId', v_code.id,
      'redemptionAttemptId', v_attempt_id,
      'campaignType', v_campaign.campaign_type,
      'discountKind', v_campaign.discount_kind,
      'display', JSONB_BUILD_OBJECT(
        'name', v_campaign.display_name,
        'label', v_campaign.display_label,
        'discountPercent', v_campaign.discount_percent,
        'priceAmount', v_campaign.price_amount,
        'priceCurrency', v_campaign.price_currency,
        'paymentRequired', v_campaign.payment_required
      ),
      'routing', JSONB_BUILD_OBJECT(
        'platform', v_platform,
        'storeAction', v_store_action,
        'productId', v_product_id,
        'revenueCatOfferingId', v_campaign.revenuecat_offering_id,
        'revenueCatPackageId', v_campaign.revenuecat_package_id,
        'revenueCatEntitlementId', v_campaign.revenuecat_entitlement_id,
        'fallbackUrl', v_fallback_url
      )
    );
  ELSE
    v_response := JSONB_BUILD_OBJECT(
      'status', v_status,
      'messageKey', v_message_key,
      'redemptionAttemptId', v_attempt_id
    );

    IF v_campaign.id IS NOT NULL THEN
      v_response := v_response || JSONB_BUILD_OBJECT(
        'campaignId', v_campaign.id,
        'campaignSlug', v_campaign.slug,
        'campaignType', v_campaign.campaign_type
      );
    END IF;

    IF v_code.id IS NOT NULL THEN
      v_response := v_response || JSONB_BUILD_OBJECT('codeId', v_code.id);
    END IF;
  END IF;

  INSERT INTO public.promo_redemption_attempts (
    id,
    user_id,
    campaign_id,
    code_id,
    normalized_code_hash,
    platform,
    app_version,
    status,
    store_product_id,
    revenuecat_offering_id,
    revenuecat_package_id,
    fallback_url,
    response_payload,
    error_code,
    error_message
  )
  VALUES (
    v_attempt_id,
    v_user_id,
    v_campaign.id,
    v_code.id,
    v_code_hash,
    v_platform,
    p_app_version,
    v_status,
    v_product_id,
    v_campaign.revenuecat_offering_id,
    v_campaign.revenuecat_package_id,
    v_fallback_url,
    v_response,
    CASE WHEN v_status = 'valid'::public.promo_redemption_status THEN NULL ELSE v_status::TEXT END,
    CASE WHEN v_status = 'valid'::public.promo_redemption_status THEN NULL ELSE v_message_key END
  );

  RETURN v_response;
END;
$$;

COMMENT ON FUNCTION public.validate_promo_code(TEXT, TEXT, TEXT) IS
'Validates a promo code for the current authenticated user and returns app-safe campaign routing metadata. Free lifetime campaigns are confirmed in app with server_grant_lifetime.';

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
  v_code public.promo_codes;
  v_campaign public.promo_campaigns;
  v_profile public.profiles;
  v_campaign_user_redemptions INTEGER := 0;
  v_code_user_redemptions INTEGER := 0;
  v_expected_product_id TEXT;
  v_attempt_max_age INTERVAL := INTERVAL '30 minutes';
  v_is_free_lifetime BOOLEAN := FALSE;
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
    AND status = 'valid'::public.promo_redemption_status
  FOR UPDATE;

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

  IF v_attempt.created_at < NOW() - v_attempt_max_age THEN
    UPDATE public.promo_redemption_attempts
    SET
      status = 'expired'::public.promo_redemption_status,
      error_code = 'attempt_expired',
      error_message = 'promo.validation.expired',
      response_payload = response_payload || JSONB_BUILD_OBJECT(
        'status', 'expired',
        'expiredAt', NOW()
      )
    WHERE id = v_attempt.id;

    RETURN JSONB_BUILD_OBJECT(
      'status', 'expired',
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

  v_is_free_lifetime :=
    v_campaign.payment_required = FALSE
    AND v_campaign.campaign_type = 'free_lifetime'::public.promo_campaign_type
    AND v_campaign.discount_kind = 'free'::public.promo_discount_kind;

  IF NOT v_is_free_lifetime THEN
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
    AND user_id = v_user_id
    AND status = 'confirmed'::public.promo_redemption_status;

  SELECT COUNT(*)
  INTO v_code_user_redemptions
  FROM public.promo_redemption_attempts
  WHERE code_id = v_code.id
    AND user_id = v_user_id
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

  IF v_is_free_lifetime THEN
    UPDATE public.profiles
    SET
      tier = 'lifetime'::public.tier,
      purchased_at = NOW(),
      refunded_at = NULL,
      trial_ends_at = NULL,
      revenuecat_user_id = COALESCE(p_revenuecat_app_user_id, revenuecat_user_id)
    WHERE id = v_user_id;

    DELETE FROM public.purchase_refund_states
    WHERE user_id = v_user_id;
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
      'confirmedAt', NOW(),
      'confirmationSource', CASE
        WHEN v_is_free_lifetime THEN 'server_grant_lifetime'
        ELSE 'client_access_sync'
      END
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
    'campaignId', v_attempt.campaign_id,
    'confirmationSource', CASE
      WHEN v_is_free_lifetime THEN 'server_grant_lifetime'
      ELSE 'client_access_sync'
    END
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT) IS
'Confirms and consumes the current authenticated user''s validated promo redemption attempt. Free lifetime promo codes grant lifetime access directly; paid promo attempts still require verified store/RevenueCat access.';

REVOKE ALL ON FUNCTION public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_current_user_promo_redemption(UUID, UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
