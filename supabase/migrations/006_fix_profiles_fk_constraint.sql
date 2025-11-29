-- Migration: Fix profiles foreign key constraint
-- Description: Changes profiles.id FK from public.users to auth.users
-- Issue: profiles table was created with FK to public.users, but trigger only creates profiles record
-- Error: "insert or update on table profiles violates foreign key constraint profiles_id_fkey"
-- Date: 2025-11-28

-- ============================================================================
-- BACKGROUND
-- ============================================================================
-- The profiles table was created via Supabase dashboard with:
--   profiles.id REFERENCES public.users(id)
--
-- But the handle_new_user() trigger (from migration 005) inserts directly into
-- profiles WITHOUT first creating a public.users record.
--
-- This causes FK violation when new users sign up:
--   1. Auth creates auth.users record
--   2. Trigger fires, tries to insert into profiles
--   3. FK check fails because public.users record doesn't exist
--
-- Solution: Change the FK to reference auth.users(id) directly, which DOES exist
-- when the trigger runs.

-- ============================================================================
-- 1. DROP THE INCORRECT FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Drop the constraint that references public.users
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Also drop any other potential constraint names (Supabase might use different naming)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_pkey_fkey;

-- ============================================================================
-- 2. ADD CORRECT FOREIGN KEY TO auth.users
-- ============================================================================

-- Add new FK constraint referencing auth.users directly
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. ENSURE profiles.id IS PRIMARY KEY (if not already)
-- ============================================================================

-- This should already exist, but ensure it's there
-- (Adding IF NOT EXISTS equivalent for PK)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_pkey'
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD PRIMARY KEY (id);
    END IF;
END $$;

-- ============================================================================
-- 4. CLEANUP: The public.users table is now orphaned
-- ============================================================================
-- The public.users table from migration 001 is no longer needed since:
-- - All user data is now in public.profiles
-- - plans, tasks, user_categories all reference profiles
-- - The trigger creates profiles records, not users records
--
-- We'll leave public.users in place for now to avoid breaking anything,
-- but it can be safely dropped in a future migration after confirming
-- there are no remaining references.

-- ============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================================
--
-- 1. Check FK constraint is correct:
--    SELECT
--        tc.constraint_name,
--        tc.table_name,
--        kcu.column_name,
--        ccu.table_schema AS foreign_table_schema,
--        ccu.table_name AS foreign_table_name,
--        ccu.column_name AS foreign_column_name
--    FROM information_schema.table_constraints AS tc
--    JOIN information_schema.key_column_usage AS kcu
--        ON tc.constraint_name = kcu.constraint_name
--    JOIN information_schema.constraint_column_usage AS ccu
--        ON ccu.constraint_name = tc.constraint_name
--    WHERE tc.table_name = 'profiles'
--        AND tc.constraint_type = 'FOREIGN KEY';
--
-- 2. Test signup flow - should work without FK violation
--
