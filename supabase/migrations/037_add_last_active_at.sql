-- Migration: Add last_active_at tracking to profiles
-- Description: Tracks when users actually use the app (vs. last_sign_in_at which
--              only updates on full sign-in events, not session restores)
--
-- This version number was already applied to staging and production as
-- last_active_at before dev/monetization introduced a separate 037 migration.
-- Keep 037 aligned with remote history; 043 remains as an idempotent follow-up
-- for environments that did not receive this original 037.

-- ============================================================================
-- 1. ADD last_active_at COLUMN
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.last_active_at IS
'Timestamp of last app open/resume. Updated client-side on foreground events, throttled to once per hour.';

-- ============================================================================
-- 2. ENSURE UPDATE POLICY EXISTS FOR SELF-UPDATES
-- ============================================================================
-- The app already updates profiles (timezone, push token, etc.) so an UPDATE
-- policy likely exists via dashboard. This ensures it exists explicitly.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND cmd = 'UPDATE'
        AND policyname = 'Users can update own profile'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
    END IF;
END
$$;

-- ============================================================================
-- 3. UPDATE profiles_dashboard VIEW TO INCLUDE last_active_at
-- ============================================================================

DROP VIEW IF EXISTS public.profiles_dashboard;
CREATE VIEW public.profiles_dashboard AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.signup_cohort,
  p.signup_method,
  p.timezone,
  p.created_at,
  p.deleted_at,
  p.last_active_at,
  au.last_sign_in_at
FROM public.profiles p
JOIN auth.users au ON au.id = p.id;
