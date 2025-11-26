-- Domani New User Trigger Migration
-- Description: Improved trigger for auto profile setup on OAuth sign-in
-- Handles: Google OAuth, Apple Sign-In metadata extraction
-- Creates: User profile + 4 default categories automatically

-- ============================================================================
-- DROP EXISTING TRIGGERS AND FUNCTIONS (for idempotency)
-- ============================================================================

-- Drop existing triggers first (before dropping functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_add_default_categories ON public.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_new_auth_user();
DROP FUNCTION IF EXISTS create_default_categories_for_user();

-- ============================================================================
-- MAIN FUNCTION: handle_new_user()
-- ============================================================================
-- This function handles everything when a new auth user signs up:
-- 1. Creates the public.users profile record
-- 2. Extracts full_name from OAuth provider metadata
-- 3. Creates 4 default categories for the user
--
-- OAuth Metadata Structure:
--
-- Google OAuth (raw_user_meta_data):
-- {
--   "iss": "https://accounts.google.com",
--   "sub": "1234567890",
--   "name": "John Doe",
--   "email": "john@gmail.com",
--   "picture": "https://...",
--   "full_name": "John Doe",        -- Sometimes present
--   "avatar_url": "https://..."
-- }
--
-- Apple Sign-In (raw_user_meta_data):
-- {
--   "iss": "https://appleid.apple.com",
--   "sub": "000000.xxxxx.0000",
--   "email": "john@privaterelay.appleid.com",
--   "name": "John Doe",             -- Only on first sign-in!
--   "full_name": {                  -- Sometimes nested object
--     "givenName": "John",
--     "familyName": "Doe"
--   }
-- }

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_given_name TEXT;
    v_family_name TEXT;
BEGIN
    -- Extract full_name from various OAuth metadata locations
    -- Priority: full_name > name > given_name + family_name > email prefix

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

    -- Step 1: Create the user profile
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, v_full_name)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();

    -- Step 2: Create default categories for the new user
    -- Only insert if user doesn't already have categories
    INSERT INTO public.categories (user_id, name, color, emoji, position, is_default)
    SELECT
        NEW.id,
        cat.name,
        cat.color,
        cat.emoji,
        cat.position,
        TRUE
    FROM (
        VALUES
            ('Work', '#3B82F6', '💼', 0),
            ('Personal', '#10B981', '🏠', 1),
            ('Health', '#EF4444', '❤️', 2),
            ('Other', '#6B7280', '📌', 3)
    ) AS cat(name, color, emoji, position)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.categories
        WHERE user_id = NEW.id AND is_default = TRUE
    );

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User or categories already exist, that's fine
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the function
COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user profile and default categories when a new user signs up via OAuth (Google/Apple)';

-- ============================================================================
-- CREATE TRIGGER ON auth.users
-- ============================================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- HELPER FUNCTION: Manually sync a user (for existing auth users without profile)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_auth_user_to_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user RECORD;
BEGIN
    -- Get the auth user
    SELECT * INTO v_auth_user FROM auth.users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Auth user % not found', p_user_id;
        RETURN FALSE;
    END IF;

    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RAISE NOTICE 'Profile already exists for user %', p_user_id;
        RETURN TRUE;
    END IF;

    -- Create profile using the same logic as handle_new_user
    -- We simulate the trigger by manually extracting metadata
    DECLARE
        v_full_name TEXT;
        v_given_name TEXT;
        v_family_name TEXT;
    BEGIN
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
            v_full_name := SPLIT_PART(v_auth_user.email, '@', 1);
        END IF;

        -- Insert user profile
        INSERT INTO public.users (id, email, full_name)
        VALUES (p_user_id, v_auth_user.email, v_full_name);

        -- Insert default categories
        INSERT INTO public.categories (user_id, name, color, emoji, position, is_default)
        VALUES
            (p_user_id, 'Work', '#3B82F6', '💼', 0, TRUE),
            (p_user_id, 'Personal', '#10B981', '🏠', 1, TRUE),
            (p_user_id, 'Health', '#EF4444', '❤️', 2, TRUE),
            (p_user_id, 'Other', '#6B7280', '📌', 3, TRUE);

        RETURN TRUE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_auth_user_to_profile(UUID) IS
'Manually sync an existing auth user to create their profile and default categories. Use for users created before trigger was set up.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_auth_user_to_profile(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERY (run manually to test)
-- ============================================================================
-- After running this migration, test with:
--
-- 1. Check trigger exists:
--    SELECT tgname, tgrelid::regclass, proname
--    FROM pg_trigger t
--    JOIN pg_proc p ON t.tgfoid = p.oid
--    WHERE tgrelid = 'auth.users'::regclass;
--
-- 2. Check function exists:
--    SELECT proname, prosrc
--    FROM pg_proc
--    WHERE proname = 'handle_new_user';
--
-- 3. Test with a Google sign-in and verify:
--    SELECT u.*,
--           (SELECT COUNT(*) FROM public.categories WHERE user_id = u.id) as category_count
--    FROM public.users u
--    ORDER BY created_at DESC
--    LIMIT 1;
--
-- 4. For existing auth users without profiles, run:
--    SELECT sync_auth_user_to_profile('user-uuid-here');
