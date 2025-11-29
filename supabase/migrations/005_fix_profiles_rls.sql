-- Migration: Fix profiles table RLS and trigger
-- Description: Fixes RLS policy violation when creating user profiles
-- Issue: Trigger was inserting into 'users' table instead of 'profiles'
--        and profiles table was missing INSERT policy
-- Date: 2025-11-28

-- ============================================================================
-- BACKGROUND
-- ============================================================================
-- The database has a 'profiles' table (not 'users'), but the original trigger
-- from migration 002 was inserting into 'public.users'. This caused two issues:
--
-- 1. The trigger wasn't creating profiles (wrong table name)
-- 2. The profiles table had no INSERT policy, so client fallback failed
-- 3. OAuth sign-in resulted in RLS policy violation error
--
-- This migration:
-- - Adds INSERT policy for profiles table (allows users to create own profile)
-- - Updates the trigger to use the correct table name (profiles)
-- - Ensures both trigger and client-side fallback work correctly

-- ============================================================================
-- 1. ADD INSERT POLICY FOR PROFILES TABLE
-- ============================================================================

-- Drop old policy if exists (from migration 001 that used 'users' table)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new INSERT policy for profiles table
-- This allows authenticated users to insert their own profile row
-- Required for client-side fallback when trigger fails
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users can insert own profile" ON public.profiles IS
'Allows users to create their own profile row. Required for OAuth sign-in when trigger fails or for client-side profile creation.';

-- ============================================================================
-- 2. FIX THE TRIGGER FUNCTION TO USE 'profiles' TABLE
-- ============================================================================

-- Drop existing trigger first (before dropping function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with correct table name
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

    -- Step 1: Create the user profile in PROFILES table (not users!)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, v_full_name)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, that's fine
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the auth signup
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS
'Trigger function that creates a user profile in the profiles table when a new user signs up via OAuth (Google/Apple)';

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 3. UPDATE THE MANUAL SYNC FUNCTION (for existing auth users)
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS sync_auth_user_to_profile(UUID);

-- Recreate with correct table name
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_auth_user RECORD;
    v_full_name TEXT;
    v_given_name TEXT;
    v_family_name TEXT;
BEGIN
    -- Get the auth user
    SELECT * INTO v_auth_user FROM auth.users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Auth user % not found', p_user_id;
        RETURN FALSE;
    END IF;

    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE NOTICE 'Profile already exists for user %', p_user_id;
        RETURN TRUE;
    END IF;

    -- Extract full_name using same logic as trigger
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

    -- Insert user profile into PROFILES table
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (p_user_id, v_auth_user.email, v_full_name);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_auth_user_to_profile(UUID) IS
'Manually sync an existing auth user to create their profile. Use for users created before trigger was set up or when trigger failed.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_auth_user_to_profile(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION & TESTING
-- ============================================================================

-- After running this migration, test with:
--
-- 1. Check that the INSERT policy exists:
--    SELECT schemaname, tablename, policyname, cmd, qual, with_check
--    FROM pg_policies
--    WHERE tablename = 'profiles' AND cmd = 'INSERT';
--
-- 2. Check trigger exists and is active:
--    SELECT tgname, tgrelid::regclass, proname, tgenabled
--    FROM pg_trigger t
--    JOIN pg_proc p ON t.tgfoid = p.oid
--    WHERE tgrelid = 'auth.users'::regclass
--    AND tgname = 'on_auth_user_created';
--
-- 3. Test OAuth sign-in with Google or Apple and verify profile is created
--
-- 4. For existing auth users without profiles, run:
--    SELECT sync_auth_user_to_profile('user-uuid-here');
