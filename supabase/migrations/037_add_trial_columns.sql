-- DEV-249: Add trial tracking columns and auto-start trial on signup
--
-- Adds trial_started_at and trial_ends_at to profiles for app-managed
-- 14-day free trial (Apple doesn't support trials for lifetime purchases).
-- Updates handle_new_user() to automatically start the trial on signup.
--
-- NOTE: These columns already exist in production (added manually).
-- This migration formalizes them in IaC so fresh environments are consistent.

-- ============================================================================
-- STEP 1: Add trial columns to profiles (idempotent)
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.trial_started_at IS 'When the user''s 14-day free trial began. Set automatically on signup.';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'When the user''s free trial expires (trial_started_at + 14 days).';

-- ============================================================================
-- STEP 2: Update handle_new_user() to auto-start trial on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_given_name TEXT;
    v_family_name TEXT;
    v_signup_method TEXT;
    v_signup_cohort public.signup_cohort;
    v_app_phase TEXT;
    v_trial_start TIMESTAMPTZ;
    v_trial_end TIMESTAMPTZ;
BEGIN
    -- ========================================================================
    -- Extract OAuth provider (signup method)
    -- ========================================================================

    v_signup_method := NEW.raw_app_meta_data->>'provider';

    IF v_signup_method IS NULL THEN
        IF NEW.raw_user_meta_data->>'iss' LIKE '%google%' THEN
            v_signup_method := 'google';
        ELSIF NEW.raw_user_meta_data->>'iss' LIKE '%apple%' THEN
            v_signup_method := 'apple';
        END IF;
    END IF;

    -- ========================================================================
    -- Determine signup cohort based on app phase
    -- ========================================================================

    SELECT value->>'current' INTO v_app_phase
    FROM public.app_config
    WHERE key = 'phase';

    CASE v_app_phase
        WHEN 'closed_beta' THEN v_signup_cohort := 'friends_family'::public.signup_cohort;
        WHEN 'open_beta' THEN v_signup_cohort := 'early_adopter'::public.signup_cohort;
        WHEN 'production' THEN v_signup_cohort := 'general'::public.signup_cohort;
        ELSE v_signup_cohort := 'general'::public.signup_cohort;
    END CASE;

    -- ========================================================================
    -- Set up 14-day free trial
    -- ========================================================================

    v_trial_start := NOW();
    v_trial_end := v_trial_start + INTERVAL '14 days';

    -- ========================================================================
    -- Extract full_name from OAuth metadata
    -- ========================================================================

    v_full_name := NEW.raw_user_meta_data->>'full_name';

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := NEW.raw_user_meta_data->>'name';
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_given_name := NEW.raw_user_meta_data->'full_name'->>'givenName';
        v_family_name := NEW.raw_user_meta_data->'full_name'->>'familyName';

        IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
            v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
        END IF;
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_given_name := NEW.raw_user_meta_data->>'given_name';
        v_family_name := NEW.raw_user_meta_data->>'family_name';

        IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
            v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
        END IF;
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := SPLIT_PART(NEW.email, '@', 1);
    END IF;

    IF v_full_name = '' THEN
        v_full_name := NULL;
    END IF;

    -- ========================================================================
    -- Create user profile with trial and cohort tracking
    -- ========================================================================

    INSERT INTO public.profiles (
        id, email, full_name, signup_method, signup_cohort,
        tier, trial_started_at, trial_ends_at
    )
    VALUES (
        NEW.id, NEW.email, v_full_name, v_signup_method, v_signup_cohort,
        'trialing'::public.tier, v_trial_start, v_trial_end
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        signup_method = COALESCE(public.profiles.signup_method, EXCLUDED.signup_method),
        signup_cohort = COALESCE(public.profiles.signup_cohort, EXCLUDED.signup_cohort),
        -- Only set trial fields if they were NULL (don't overwrite existing trial)
        tier = CASE
            WHEN public.profiles.trial_started_at IS NULL THEN EXCLUDED.tier
            ELSE public.profiles.tier
        END,
        trial_started_at = COALESCE(public.profiles.trial_started_at, EXCLUDED.trial_started_at),
        trial_ends_at = COALESCE(public.profiles.trial_ends_at, EXCLUDED.trial_ends_at),
        updated_at = NOW();

    -- ========================================================================
    -- Create default category preferences for system categories
    -- ========================================================================

    INSERT INTO public.user_category_preferences (user_id, system_category_id, position, is_favorite)
    SELECT
        NEW.id,
        sc.id,
        sc.position,
        TRUE
    FROM public.system_categories sc
    WHERE sc.is_active = TRUE
    ON CONFLICT DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user profile when a new user signs up via OAuth.
Sets up 14-day free trial, captures signup_method and signup_cohort based on current app phase.';

-- ============================================================================
-- STEP 3: Backfill existing users who have no trial data
-- Sets trial for users who have tier=none and never had a trial.
-- Skips lifetime users (already purchased) and users who already have trial data.
-- ============================================================================

-- Existing beta users who never had a trial set: give them a trial starting now
UPDATE public.profiles
SET
    tier = 'trialing',
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '14 days'
WHERE trial_started_at IS NULL
  AND tier = 'none';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- Check trial distribution:
-- SELECT tier, COUNT(*),
--        COUNT(trial_started_at) AS has_trial,
--        COUNT(*) FILTER (WHERE trial_ends_at > NOW()) AS active_trials
-- FROM profiles GROUP BY tier;
--
-- Verify new signups get trial:
-- SELECT id, email, tier, trial_started_at, trial_ends_at
-- FROM profiles ORDER BY created_at DESC LIMIT 5;
--
