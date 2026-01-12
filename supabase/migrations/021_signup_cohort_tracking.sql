-- Domani Signup Cohort Tracking Migration
-- Description: Track when and how users signed up for promotional pricing
-- Cohorts: friends_family (closed alpha), early_adopter (open beta), general (production)

-- ============================================================================
-- STEP 1: Create enum type for signup cohorts
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE signup_cohort AS ENUM (
        'friends_family',   -- Closed alpha users
        'early_adopter',    -- Open beta users
        'general'           -- Production/GA users
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE signup_cohort IS 'User signup cohort for promotional pricing: friends_family (closed alpha), early_adopter (open beta), general (production)';

-- ============================================================================
-- STEP 2: Add columns to profiles table
-- ============================================================================

-- Add signup_cohort column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signup_cohort signup_cohort;

COMMENT ON COLUMN public.profiles.signup_cohort IS 'Which cohort/phase the user signed up during. Used for promotional pricing and analytics.';

-- Add signup_method column (google or apple)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signup_method TEXT;

COMMENT ON COLUMN public.profiles.signup_method IS 'OAuth provider used at signup: google or apple';

-- Add constraint for signup_method values
DO $$ BEGIN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_signup_method_check
    CHECK (signup_method IS NULL OR signup_method IN ('google', 'apple'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- STEP 3: Backfill existing users as friends_family
-- ============================================================================

UPDATE public.profiles
SET signup_cohort = 'friends_family'
WHERE signup_cohort IS NULL;

-- ============================================================================
-- STEP 4: Update handle_new_user trigger to capture cohort and method
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
BEGIN
    -- ========================================================================
    -- Extract OAuth provider (signup method)
    -- ========================================================================

    -- Get provider from identities or metadata
    v_signup_method := NEW.raw_app_meta_data->>'provider';

    IF v_signup_method IS NULL THEN
        -- Try to detect from issuer
        IF NEW.raw_user_meta_data->>'iss' LIKE '%google%' THEN
            v_signup_method := 'google';
        ELSIF NEW.raw_user_meta_data->>'iss' LIKE '%apple%' THEN
            v_signup_method := 'apple';
        END IF;
    END IF;

    -- ========================================================================
    -- Determine signup cohort based on app phase
    -- ========================================================================

    -- Get current app phase from config
    SELECT value->>'current' INTO v_app_phase
    FROM public.app_config
    WHERE key = 'phase';

    -- Map phase to cohort (use schema-qualified type for auth trigger context)
    CASE v_app_phase
        WHEN 'closed_beta' THEN v_signup_cohort := 'friends_family'::public.signup_cohort;
        WHEN 'open_beta' THEN v_signup_cohort := 'early_adopter'::public.signup_cohort;
        WHEN 'production' THEN v_signup_cohort := 'general'::public.signup_cohort;
        ELSE v_signup_cohort := 'general'::public.signup_cohort; -- Default fallback
    END CASE;

    -- ========================================================================
    -- Extract full_name from OAuth metadata (existing logic)
    -- ========================================================================

    -- Try direct full_name field (Google often provides this)
    v_full_name := NEW.raw_user_meta_data->>'full_name';

    -- Try name field (both Google and Apple use this)
    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := NEW.raw_user_meta_data->>'name';
    END IF;

    -- Try Apple's nested full_name object
    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_given_name := NEW.raw_user_meta_data->'full_name'->>'givenName';
        v_family_name := NEW.raw_user_meta_data->'full_name'->>'familyName';

        IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
            v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
        END IF;
    END IF;

    -- Try separate given_name and family_name fields
    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_given_name := NEW.raw_user_meta_data->>'given_name';
        v_family_name := NEW.raw_user_meta_data->>'family_name';

        IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
            v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
        END IF;
    END IF;

    -- Fallback: use email prefix (everything before @)
    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := SPLIT_PART(NEW.email, '@', 1);
    END IF;

    -- Clean up empty string to NULL
    IF v_full_name = '' THEN
        v_full_name := NULL;
    END IF;

    -- ========================================================================
    -- Create user profile with cohort tracking
    -- ========================================================================

    INSERT INTO public.profiles (id, email, full_name, signup_method, signup_cohort)
    VALUES (NEW.id, NEW.email, v_full_name, v_signup_method, v_signup_cohort)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        -- Only set signup fields if they were NULL (don't overwrite existing)
        signup_method = COALESCE(public.profiles.signup_method, EXCLUDED.signup_method),
        signup_cohort = COALESCE(public.profiles.signup_cohort, EXCLUDED.signup_cohort),
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
        -- User already exists, that's fine
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user profile when a new user signs up via OAuth.
Captures signup_method (google/apple) and signup_cohort (friends_family/early_adopter/general) based on current app phase.';

-- ============================================================================
-- STEP 5: Create index for cohort queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_signup_cohort ON public.profiles(signup_cohort);

-- ============================================================================
-- STEP 6: Helper function to check user cohort (for RevenueCat pricing)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_cohort(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_cohort signup_cohort;
BEGIN
    SELECT signup_cohort INTO v_cohort
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN v_cohort::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_cohort(UUID) IS
'Returns the signup cohort for a user. Used by RevenueCat for promotional pricing.';

GRANT EXECUTE ON FUNCTION get_user_cohort(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- Check all profiles have cohort:
-- SELECT signup_cohort, COUNT(*) FROM profiles GROUP BY signup_cohort;
--
-- Check trigger captures new signups:
-- SELECT id, email, signup_method, signup_cohort, created_at
-- FROM profiles ORDER BY created_at DESC LIMIT 5;
--
