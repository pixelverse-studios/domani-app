-- Extend early-adopter signup pricing through July 31, 2026.
--
-- New signups before 2026-08-01 get early_adopter pricing.
-- New signups on or after 2026-08-01 get general pricing.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_given_name TEXT;
    v_family_name TEXT;
    v_signup_method TEXT;
    v_signup_cohort public.signup_cohort;
    v_trial_start TIMESTAMPTZ;
    v_trial_end TIMESTAMPTZ;
BEGIN
    -- Extract OAuth provider (signup method)
    v_signup_method := NEW.raw_app_meta_data->>'provider';

    IF v_signup_method IS NULL THEN
        IF NEW.raw_user_meta_data->>'iss' LIKE '%google%' THEN
            v_signup_method := 'google';
        ELSIF NEW.raw_user_meta_data->>'iss' LIKE '%apple%' THEN
            v_signup_method := 'apple';
        END IF;
    END IF;

    -- Determine signup cohort based on account creation timestamp.
    IF COALESCE(NEW.created_at, NOW()) < TIMESTAMPTZ '2026-08-01 00:00:00+00' THEN
        v_signup_cohort := 'early_adopter'::public.signup_cohort;
    ELSE
        v_signup_cohort := 'general'::public.signup_cohort;
    END IF;

    v_trial_start := NOW();
    v_trial_end := v_trial_start + INTERVAL '14 days';

    -- Extract full_name from OAuth metadata
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
        tier = CASE
            WHEN public.profiles.trial_started_at IS NULL THEN EXCLUDED.tier
            ELSE public.profiles.tier
        END,
        trial_started_at = COALESCE(public.profiles.trial_started_at, EXCLUDED.trial_started_at),
        trial_ends_at = COALESCE(public.profiles.trial_ends_at, EXCLUDED.trial_ends_at),
        updated_at = NOW();

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;
COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user profile when a new user signs up via OAuth. Sets up 14-day free trial, captures signup_method, and assigns signup_cohort by account creation date: before 2026-08-01 UTC -> early_adopter, otherwise general.';
