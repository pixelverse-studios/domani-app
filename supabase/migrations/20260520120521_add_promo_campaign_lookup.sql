-- DEV-847: Add promo campaign lookup and validation audit foundation.
--
-- Promo codes are app-side eligibility gates only. This schema stores campaign
-- metadata and validation attempts, but it never grants lifetime access. Store
-- confirmation through Apple/Google and RevenueCat remains authoritative.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'promo_campaign_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.promo_campaign_type AS ENUM (
      'free_lifetime',
      'percent_discount_lifetime',
      'fixed_price_lifetime'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'promo_discount_kind'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.promo_discount_kind AS ENUM (
      'free',
      'percent',
      'fixed_price'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'promo_code_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.promo_code_status AS ENUM (
      'active',
      'inactive',
      'exhausted',
      'revoked'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'promo_redemption_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.promo_redemption_status AS ENUM (
      'valid',
      'invalid',
      'inactive',
      'expired',
      'over_limit',
      'already_redeemed',
      'platform_unavailable',
      'confirmed',
      'abandoned',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.promo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  campaign_type public.promo_campaign_type NOT NULL,
  discount_kind public.promo_discount_kind NOT NULL,
  display_name TEXT NOT NULL,
  display_label TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  max_redemptions_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions_per_user > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  discount_percent INTEGER CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 100),
  price_amount NUMERIC(10, 2) CHECK (price_amount IS NULL OR price_amount >= 0),
  price_currency TEXT CHECK (price_currency IS NULL OR price_currency = UPPER(price_currency)),
  payment_required BOOLEAN NOT NULL DEFAULT TRUE,
  revenuecat_entitlement_id TEXT NOT NULL,
  revenuecat_offering_id TEXT,
  revenuecat_package_id TEXT,
  ios_is_available BOOLEAN NOT NULL DEFAULT FALSE,
  ios_product_id TEXT,
  ios_offer_identifier TEXT,
  ios_redemption_strategy TEXT,
  ios_fallback_url_template TEXT,
  android_is_available BOOLEAN NOT NULL DEFAULT FALSE,
  android_product_id TEXT,
  android_promotion_id TEXT,
  android_redemption_strategy TEXT,
  android_fallback_url_template TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_campaigns_discount_shape_check CHECK (
    (
      discount_kind = 'free'::public.promo_discount_kind
      AND campaign_type = 'free_lifetime'::public.promo_campaign_type
      AND discount_percent IS NULL
      AND price_amount IS NULL
      AND price_currency IS NULL
      AND payment_required = FALSE
    )
    OR (
      discount_kind = 'percent'::public.promo_discount_kind
      AND campaign_type = 'percent_discount_lifetime'::public.promo_campaign_type
      AND discount_percent IS NOT NULL
      AND price_amount IS NULL
      AND price_currency IS NULL
      AND payment_required = TRUE
    )
    OR (
      discount_kind = 'fixed_price'::public.promo_discount_kind
      AND campaign_type = 'fixed_price_lifetime'::public.promo_campaign_type
      AND discount_percent IS NULL
      AND price_amount IS NOT NULL
      AND price_currency IS NOT NULL
      AND payment_required = TRUE
    )
  ),
  CONSTRAINT promo_campaigns_active_window_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at
  ),
  CONSTRAINT promo_campaigns_redemption_count_check CHECK (
    max_redemptions IS NULL OR redemption_count <= max_redemptions
  ),
  CONSTRAINT promo_campaigns_ios_strategy_check CHECK (
    ios_redemption_strategy IS NULL
    OR ios_redemption_strategy IN ('offer_code_sheet', 'revenuecat_purchase_package')
  ),
  CONSTRAINT promo_campaigns_android_strategy_check CHECK (
    android_redemption_strategy IS NULL
    OR android_redemption_strategy IN ('play_promo_code_flow', 'revenuecat_purchase_package')
  )
);

COMMENT ON TABLE public.promo_campaigns IS
'Store-backed promo campaign metadata. Validation returns sanitized rows from this table, but access is granted only after RevenueCat confirms a store transaction.';

COMMENT ON COLUMN public.promo_campaigns.redemption_count IS
'Confirmed store-backed redemptions for campaign-level limit checks. Validation attempts do not increment this value.';

COMMENT ON COLUMN public.promo_campaigns.metadata IS
'Operations-only campaign metadata. Do not store raw promo code values here.';

CREATE INDEX IF NOT EXISTS idx_promo_campaigns_active_window
  ON public.promo_campaigns (is_active, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_promo_campaigns_type
  ON public.promo_campaigns (campaign_type);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.promo_campaigns(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  code_lookup_hint TEXT,
  batch_slug TEXT,
  status public.promo_code_status NOT NULL DEFAULT 'active',
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_redemptions INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions > 0),
  max_redemptions_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions_per_user > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_codes_active_window_check CHECK (
    starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at
  ),
  CONSTRAINT promo_codes_redemption_count_check CHECK (
    redemption_count <= max_redemptions
  )
);

COMMENT ON TABLE public.promo_codes IS
'Hashed promo code lookup table. Raw promo code values should not be stored in app code or in this table.';

COMMENT ON COLUMN public.promo_codes.code_hash IS
'SHA-256 hash of the normalized code. The normalized or raw code is intentionally not stored.';

COMMENT ON COLUMN public.promo_codes.code_lookup_hint IS
'Optional non-secret support hint, such as the last four normalized characters or batch display label.';

CREATE INDEX IF NOT EXISTS idx_promo_codes_campaign_id
  ON public.promo_codes (campaign_id);

CREATE INDEX IF NOT EXISTS idx_promo_codes_assigned_user_id
  ON public.promo_codes (assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promo_codes_status
  ON public.promo_codes (status);

CREATE TABLE IF NOT EXISTS public.promo_redemption_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.promo_campaigns(id) ON DELETE SET NULL,
  code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  normalized_code_hash TEXT,
  platform TEXT CHECK (platform IS NULL OR platform IN ('ios', 'android')),
  app_version TEXT,
  status public.promo_redemption_status NOT NULL,
  revenuecat_app_user_id TEXT,
  store_product_id TEXT,
  store_transaction_id TEXT,
  revenuecat_offering_id TEXT,
  revenuecat_package_id TEXT,
  fallback_url TEXT,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

COMMENT ON TABLE public.promo_redemption_attempts IS
'Audit trail of promo validation and redemption lifecycle events. Store receipts remain in RevenueCat, not this table.';

COMMENT ON COLUMN public.promo_redemption_attempts.response_payload IS
'App-safe validation response snapshot. Must not contain raw promo code values.';

CREATE INDEX IF NOT EXISTS idx_promo_redemption_attempts_user_created
  ON public.promo_redemption_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promo_redemption_attempts_campaign_status
  ON public.promo_redemption_attempts (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_promo_redemption_attempts_code_status
  ON public.promo_redemption_attempts (code_id, status);

CREATE INDEX IF NOT EXISTS idx_promo_redemption_attempts_transaction_id
  ON public.promo_redemption_attempts (store_transaction_id)
  WHERE store_transaction_id IS NOT NULL;

ALTER TABLE public.promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemption_attempts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_promo_campaigns_updated_at
  BEFORE UPDATE ON public.promo_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_redemption_attempts_updated_at
  BEFORE UPDATE ON public.promo_redemption_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.normalize_promo_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(LOWER(REGEXP_REPLACE(COALESCE(p_code, ''), '[^[:alnum:]]', '', 'g')), '')
$$;

COMMENT ON FUNCTION public.normalize_promo_code(TEXT) IS
'Normalizes a user-entered promo code for hashing and lookup by removing non-alphanumeric characters and lowercasing.';

CREATE OR REPLACE FUNCTION public.hash_promo_code(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT CASE
    WHEN public.normalize_promo_code(p_code) IS NULL THEN NULL
    ELSE ENCODE(DIGEST(public.normalize_promo_code(p_code), 'sha256'), 'hex')
  END
$$;

COMMENT ON FUNCTION public.hash_promo_code(TEXT) IS
'Returns the SHA-256 hash used by promo_codes.code_hash for a normalized promo code.';

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
    IF v_platform = 'ios' THEN
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
'Validates a promo code for the current authenticated user and returns app-safe campaign routing metadata. Does not grant access or consume store-backed redemptions.';

REVOKE ALL ON TABLE public.promo_campaigns FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_redemption_attempts FROM anon, authenticated;

GRANT ALL ON public.promo_campaigns TO service_role;
GRANT ALL ON public.promo_codes TO service_role;
GRANT ALL ON public.promo_redemption_attempts TO service_role;

REVOKE ALL ON FUNCTION public.normalize_promo_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hash_promo_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_promo_code(TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_promo_code(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.hash_promo_code(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, TEXT, TEXT) TO authenticated;
