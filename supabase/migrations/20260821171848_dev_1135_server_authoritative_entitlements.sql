-- DEV-1135: make trials, purchases, refunds, and RevenueCat identity
-- server-authoritative while preserving the app's normal profile-edit paths.

-- Authenticated clients no longer create profile rows or update every column.
-- Profile creation remains available through ensure_current_user_profile(), and
-- only user-editable/device-owned columns remain directly updateable.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM authenticated;

GRANT UPDATE (
  auto_sort_categories,
  avatar_url,
  expo_push_token,
  full_name,
  last_active_at,
  notification_onboarding_completed,
  planning_reminder_enabled,
  planning_reminder_time,
  push_token_invalid_at,
  reminder_shortcuts,
  timezone
) ON TABLE public.profiles TO authenticated;

-- Staging/production currently include the tutorial marker while the oldest
-- local baseline does not. Preserve that existing client write path wherever
-- the column is present without making this authority migration create it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass
      AND attname = 'tutorial_completed_at'
      AND NOT attisdropped
  ) THEN
    GRANT UPDATE (tutorial_completed_at)
    ON TABLE public.profiles TO authenticated;
  END IF;
END;
$$;

-- New and recovered profiles begin in the explicit pre-trial state. Trial
-- timestamps are assigned only by start_current_user_trial().
CREATE OR REPLACE FUNCTION public.ensure_profile_exists_for_auth_user(p_user_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_full_name text;
  v_given_name text;
  v_family_name text;
  v_signup_method text;
  v_signup_cohort public.signup_cohort;
BEGIN
  SELECT *
  INTO v_auth_user
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auth user % not found', p_user_id;
  END IF;

  v_signup_method := v_auth_user.raw_app_meta_data ->> 'provider';

  IF v_signup_method IS NULL THEN
    IF v_auth_user.raw_user_meta_data ->> 'iss' LIKE '%google%' THEN
      v_signup_method := 'google';
    ELSIF v_auth_user.raw_user_meta_data ->> 'iss' LIKE '%apple%' THEN
      v_signup_method := 'apple';
    END IF;
  END IF;

  IF coalesce(v_auth_user.created_at, pg_catalog.now())
    < timestamptz '2026-08-01 00:00:00+00' THEN
    v_signup_cohort := 'early_adopter'::public.signup_cohort;
  ELSE
    v_signup_cohort := 'general'::public.signup_cohort;
  END IF;

  v_full_name := v_auth_user.raw_user_meta_data ->> 'full_name';
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := v_auth_user.raw_user_meta_data ->> 'name';
  END IF;

  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_given_name := v_auth_user.raw_user_meta_data -> 'full_name' ->> 'givenName';
    v_family_name := v_auth_user.raw_user_meta_data -> 'full_name' ->> 'familyName';
    IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
      v_full_name := pg_catalog.btrim(
        coalesce(v_given_name, '') || ' ' ||
        coalesce(v_family_name, '')
      );
    END IF;
  END IF;

  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_given_name := v_auth_user.raw_user_meta_data ->> 'given_name';
    v_family_name := v_auth_user.raw_user_meta_data ->> 'family_name';
    IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
      v_full_name := pg_catalog.btrim(
        coalesce(v_given_name, '') || ' ' ||
        coalesce(v_family_name, '')
      );
    END IF;
  END IF;

  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := pg_catalog.split_part(v_auth_user.email, '@', 1);
  END IF;

  IF v_full_name = '' THEN
    v_full_name := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    signup_method,
    signup_cohort,
    tier,
    trial_started_at,
    trial_ends_at
  )
  VALUES (
    v_auth_user.id,
    v_auth_user.email,
    v_full_name,
    v_signup_method,
    v_signup_cohort,
    'none'::public.tier,
    NULL,
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    signup_method = coalesce(
      public.profiles.signup_method,
      EXCLUDED.signup_method
    ),
    signup_cohort = coalesce(
      public.profiles.signup_cohort,
      EXCLUDED.signup_cohort
    ),
    updated_at = pg_catalog.now()
  RETURNING * INTO v_profile;

  INSERT INTO public.user_category_preferences (
    user_id,
    system_category_id,
    position,
    is_favorite
  )
  SELECT
    v_auth_user.id,
    system_categories.id,
    system_categories.position,
    TRUE
  FROM public.system_categories
  WHERE system_categories.is_active = TRUE
  ON CONFLICT DO NOTHING;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.ensure_profile_exists_for_auth_user(uuid) IS
'Service-only profile initialization. New profiles remain pre-trial until the authenticated user explicitly starts the server-managed trial.';

REVOKE ALL ON FUNCTION public.ensure_profile_exists_for_auth_user(uuid)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists_for_auth_user(uuid)
TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.ensure_profile_exists_for_auth_user(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Creates a pre-trial profile through the shared server-only initialization path.';

REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.start_current_user_trial()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_trial_started_at timestamptz := pg_catalog.now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authenticated';
  END IF;

  PERFORM public.ensure_profile_exists_for_auth_user(v_user_id);

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_profile.tier = 'lifetime'::public.tier
    OR v_profile.purchased_at IS NOT NULL
    OR v_profile.refunded_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Trial unavailable after a purchase or refund';
  END IF;

  IF v_profile.trial_started_at IS NOT NULL THEN
    IF v_profile.tier = 'trialing'::public.tier
      AND v_profile.trial_ends_at > pg_catalog.now() THEN
      RETURN v_profile;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Trial has already been used';
  END IF;

  UPDATE public.profiles
  SET
    tier = 'trialing'::public.tier,
    trial_started_at = v_trial_started_at,
    trial_ends_at = v_trial_started_at + interval '14 days',
    updated_at = pg_catalog.now()
  WHERE id = v_user_id
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.start_current_user_trial() IS
'Atomically starts the one-time 14-day trial for auth.uid(); client timestamps and target user IDs are not accepted.';

REVOKE ALL ON FUNCTION public.start_current_user_trial()
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_current_user_trial()
TO authenticated;

CREATE OR REPLACE FUNCTION public.has_current_user_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.refunded_at IS NULL
      AND (
        (
          profiles.tier = 'lifetime'::public.tier
          AND profiles.purchased_at IS NOT NULL
        )
        OR
        (
          profiles.tier = 'trialing'::public.tier
          AND profiles.trial_started_at IS NOT NULL
          AND profiles.trial_ends_at > pg_catalog.now()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.has_current_user_access() IS
'Returns true only for an unrefunded lifetime purchase or a currently active, server-timestamped trial owned by auth.uid().';

REVOKE ALL ON FUNCTION public.has_current_user_access()
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_current_user_access()
TO authenticated, service_role;

-- Preserve the existing free-promo client contract while removing its ability
-- to confirm paid promo attempts or supply RevenueCat identity values.
ALTER FUNCTION public.confirm_current_user_promo_redemption(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
RENAME TO confirm_current_user_promo_redemption_legacy_impl;

REVOKE ALL ON FUNCTION public.confirm_current_user_promo_redemption_legacy_impl(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_current_user_promo_redemption(
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
  v_is_free_lifetime boolean := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authenticated';
  END IF;

  SELECT
    promo_campaigns.payment_required = FALSE
    AND promo_campaigns.campaign_type = 'free_lifetime'::public.promo_campaign_type
    AND promo_campaigns.discount_kind = 'free'::public.promo_discount_kind
  INTO v_is_free_lifetime
  FROM public.promo_redemption_attempts
  JOIN public.promo_campaigns
    ON promo_campaigns.id = promo_redemption_attempts.campaign_id
  WHERE promo_redemption_attempts.id = p_redemption_attempt_id
    AND promo_redemption_attempts.user_id = v_user_id
    AND promo_redemption_attempts.code_id = p_code_id
    AND promo_redemption_attempts.campaign_id = p_campaign_id;

  IF NOT coalesce(v_is_free_lifetime, FALSE) THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'server_verification_required',
      'redemptionAttemptId', p_redemption_attempt_id,
      'codeId', p_code_id,
      'campaignId', p_campaign_id
    );
  END IF;

  RETURN public.confirm_current_user_promo_redemption_legacy_impl(
    p_redemption_attempt_id,
    p_code_id,
    p_campaign_id,
    v_user_id::text,
    NULL,
    NULL
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_current_user_promo_redemption(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) IS
'Backward-compatible current-user confirmation for free lifetime promos only. Paid promo confirmation requires verified server RevenueCat evidence.';

REVOKE ALL ON FUNCTION public.confirm_current_user_promo_redemption(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_current_user_promo_redemption(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
TO authenticated;

-- The authenticated Edge Function calls this service-only operation only
-- after it fetches active entitlement evidence directly from RevenueCat.
CREATE OR REPLACE FUNCTION public.apply_verified_revenuecat_lifetime_access(
  p_user_id uuid,
  p_verified_purchased_at timestamptz,
  p_store_product_id text,
  p_redemption_attempt_id uuid DEFAULT NULL,
  p_code_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_confirmation jsonb := NULL;
  v_confirmation_status text;
  v_has_any_promo_context boolean :=
    p_redemption_attempt_id IS NOT NULL
    OR p_code_id IS NOT NULL
    OR p_campaign_id IS NOT NULL;
  v_has_complete_promo_context boolean :=
    p_redemption_attempt_id IS NOT NULL
    AND p_code_id IS NOT NULL
    AND p_campaign_id IS NOT NULL;
BEGIN
  IF p_user_id IS NULL OR p_verified_purchased_at IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Verified RevenueCat user and purchase timestamp are required';
  END IF;

  IF p_store_product_id IS NULL
    OR p_store_product_id NOT IN (
      'domani_lifetime',
      'domani_lifetime_early',
      'domani_lifetime_friends'
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Unrecognized lifetime product';
  END IF;

  IF v_has_any_promo_context AND NOT v_has_complete_promo_context THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Incomplete promo confirmation context';
  END IF;

  UPDATE public.profiles
  SET
    tier = 'lifetime'::public.tier,
    purchased_at = p_verified_purchased_at,
    refunded_at = NULL,
    trial_ends_at = NULL,
    revenuecat_user_id = p_user_id::text,
    updated_at = pg_catalog.now()
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Profile not found';
  END IF;

  IF v_has_complete_promo_context THEN
    v_confirmation := public.confirm_promo_redemption_for_user(
      p_user_id,
      p_redemption_attempt_id,
      p_code_id,
      p_campaign_id,
      p_user_id::text,
      p_store_product_id,
      NULL
    );
    v_confirmation_status := v_confirmation ->> 'status';

    IF v_confirmation_status NOT IN ('confirmed', 'already_confirmed') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'Promo confirmation failed: ' ||
          coalesce(v_confirmation_status, 'invalid_result');
    END IF;
  END IF;

  DELETE FROM public.purchase_refund_states
  WHERE user_id = p_user_id;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'synced',
    'tier', v_profile.tier,
    'purchasedAt', v_profile.purchased_at,
    'promoConfirmation', v_confirmation
  );
END;
$$;

COMMENT ON FUNCTION public.apply_verified_revenuecat_lifetime_access(
  uuid,
  timestamptz,
  text,
  uuid,
  uuid,
  uuid
) IS
'Service-only atomic lifetime grant and optional paid-promo confirmation. Inputs must come from a server-side RevenueCat lookup bound to the authenticated user.';

REVOKE ALL ON FUNCTION public.apply_verified_revenuecat_lifetime_access(
  uuid,
  timestamptz,
  text,
  uuid,
  uuid,
  uuid
)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_verified_revenuecat_lifetime_access(
  uuid,
  timestamptz,
  text,
  uuid,
  uuid,
  uuid
)
TO service_role;

-- Every mutable task path now checks fresh server state. SELECT remains
-- ownership-only so an expired user can still see their retained data after
-- restoring or purchasing access.
ALTER POLICY "Users can insert tasks" ON public.tasks
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.has_current_user_access()
);

ALTER POLICY "Users can update own tasks" ON public.tasks
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.has_current_user_access()
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.has_current_user_access()
);

ALTER POLICY "Users can delete own tasks" ON public.tasks
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.has_current_user_access()
);

ALTER POLICY "Users can create task time blocks" ON public.task_time_blocks
TO authenticated
WITH CHECK (
  public.has_current_user_access()
  AND EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY "Users can update task time blocks" ON public.task_time_blocks
TO authenticated
USING (
  public.has_current_user_access()
  AND EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.has_current_user_access()
  AND EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

ALTER POLICY "Users can delete task time blocks" ON public.task_time_blocks
TO authenticated
USING (
  public.has_current_user_access()
  AND EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE tasks.id = task_time_blocks.task_id
      AND tasks.user_id = (SELECT auth.uid())
  )
);

NOTIFY pgrst, 'reload schema';
