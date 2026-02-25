-- DEV-11: Change tier enum from 'free' | 'premium' | 'lifetime'
--                                 to 'none' | 'trialing' | 'lifetime'
--
-- The app model is now: trial → lifetime purchase or locked out.
-- There is no free tier with limited tasks.

-- Step 1: Add new enum values (safe to do directly in PostgreSQL)
ALTER TYPE public.tier ADD VALUE IF NOT EXISTS 'none';
ALTER TYPE public.tier ADD VALUE IF NOT EXISTS 'trialing';

-- Step 2: Migrate existing user data to new values
UPDATE public.profiles SET tier = 'none' WHERE tier = 'free';
UPDATE public.profiles SET tier = 'lifetime' WHERE tier = 'premium';

-- Step 3: Remove old enum values by recreating the type
-- PostgreSQL does not support dropping enum values directly;
-- we must recreate the type.

-- Change the tier column to text so we can drop the old type
ALTER TABLE public.profiles ALTER COLUMN tier TYPE text;

-- Drop the old enum type
DROP TYPE public.tier;

-- Recreate the type with only the desired values
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');

-- Convert the column back to the new enum type
ALTER TABLE public.profiles
    ALTER COLUMN tier TYPE public.tier USING tier::public.tier;

-- Update the default from 'free' to 'none'
ALTER TABLE public.profiles ALTER COLUMN tier SET DEFAULT 'none';

-- Step 4: Update the task insert RLS policy to use new tier values.
-- 'trialing' and 'lifetime' users have full access.
-- 'none' users (trial expired) are locked out at the app level;
-- the beta phase check already covers all users during beta.
DROP POLICY IF EXISTS "Users can insert tasks with tier limit" ON public.tasks;

CREATE POLICY "Users can insert tasks with tier limit"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        -- Verify user_id matches authenticated user
        user_id = auth.uid()
        AND
        -- Verify task belongs to user's plan
        plan_id IN (SELECT id FROM public.plans WHERE user_id = auth.uid())
        AND (
            -- During beta, everyone gets unlimited tasks
            public.is_beta_phase()
            OR
            -- Trialing and Lifetime users have full access
            public.get_user_tier(auth.uid()) IN ('trialing', 'lifetime')
        )
    );
