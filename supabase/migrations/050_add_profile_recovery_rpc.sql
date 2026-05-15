-- DEV-220: Recover missing profiles with the same initialization as signup
--
-- The client previously fell back to inserting a bare profiles row when the
-- auth.users -> profiles trigger lost a race or failed. That bypassed signup
-- initialization such as cohort assignment, trial dates, and default category
-- preferences. This migration introduces a privileged recovery path that
-- recreates the full profile state consistently and updates the auth trigger to
-- delegate to it.

CREATE OR REPLACE FUNCTION public.ensure_profile_exists_for_auth_user(p_user_id UUID)
RETURNS public.profiles AS $$
DECLARE
    v_auth_user auth.users;
    v_profile public.profiles;
    v_full_name TEXT;
    v_given_name TEXT;
    v_family_name TEXT;
    v_signup_method TEXT;
    v_signup_cohort public.signup_cohort;
    v_trial_start TIMESTAMPTZ;
    v_trial_end TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_auth_user
    FROM auth.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user % not found', p_user_id;
    END IF;

    v_signup_method := v_auth_user.raw_app_meta_data->>'provider';

    IF v_signup_method IS NULL THEN
        IF v_auth_user.raw_user_meta_data->>'iss' LIKE '%google%' THEN
            v_signup_method := 'google';
        ELSIF v_auth_user.raw_user_meta_data->>'iss' LIKE '%apple%' THEN
            v_signup_method := 'apple';
        END IF;
    END IF;

    IF COALESCE(v_auth_user.created_at, NOW()) < TIMESTAMPTZ '2026-05-16 00:00:00+00' THEN
        v_signup_cohort := 'early_adopter'::public.signup_cohort;
    ELSE
        v_signup_cohort := 'general'::public.signup_cohort;
    END IF;

    v_trial_start := NOW();
    v_trial_end := v_trial_start + INTERVAL '14 days';

    v_full_name := v_auth_user.raw_user_meta_data->>'full_name';

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := v_auth_user.raw_user_meta_data->>'name';
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_given_name := v_auth_user.raw_user_meta_data->'full_name'->>'givenName';
        v_family_name := v_auth_user.raw_user_meta_data->'full_name'->>'familyName';

        IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
            v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
        END IF;
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_given_name := v_auth_user.raw_user_meta_data->>'given_name';
        v_family_name := v_auth_user.raw_user_meta_data->>'family_name';

        IF v_given_name IS NOT NULL OR v_family_name IS NOT NULL THEN
            v_full_name := TRIM(COALESCE(v_given_name, '') || ' ' || COALESCE(v_family_name, ''));
        END IF;
    END IF;

    IF v_full_name IS NULL OR v_full_name = '' THEN
        v_full_name := SPLIT_PART(v_auth_user.email, '@', 1);
    END IF;

    IF v_full_name = '' THEN
        v_full_name := NULL;
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, signup_method, signup_cohort,
        tier, trial_started_at, trial_ends_at
    )
    VALUES (
        v_auth_user.id, v_auth_user.email, v_full_name, v_signup_method, v_signup_cohort,
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
        updated_at = NOW()
    RETURNING * INTO v_profile;

    INSERT INTO public.user_category_preferences (user_id, system_category_id, position, is_favorite)
    SELECT
        v_auth_user.id,
        sc.id,
        sc.position,
        TRUE
    FROM public.system_categories sc
    WHERE sc.is_active = TRUE
    ON CONFLICT DO NOTHING;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.ensure_profile_exists_for_auth_user(UUID) IS
'Ensures an auth user has a fully initialized profile row, including signup cohort, trial dates, and default category preferences.';

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS public.profiles AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN public.ensure_profile_exists_for_auth_user(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.ensure_current_user_profile() IS
'Repairs the authenticated user''s missing profile row using the same initialization logic as signup.';

GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user profile when a new user signs up via OAuth.
Delegates to ensure_profile_exists_for_auth_user() so trigger-based creation and manual recovery stay in sync.';
