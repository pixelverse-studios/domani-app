-- DEV-2: Remove subscription fields from profiles table
-- These fields are no longer needed with the simplified trial → lifetime model.
-- The app now uses: 'none' | 'trialing' | 'lifetime' (tier column only).

-- Step 1: Drop user_overview view — it selects subscription_status
DROP VIEW IF EXISTS public.user_overview;

-- Step 2: Drop the subscription columns
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_expires_at;

-- Step 3: Drop the enum type
DROP TYPE IF EXISTS public.subscription_status_enum;

-- Step 4: Recreate user_overview without subscription_status
CREATE OR REPLACE VIEW public.user_overview AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.tier,
    p.timezone,
    p.planning_reminder_time,
    p.created_at,
    p.updated_at,
    count(DISTINCT pl.id) AS total_plans,
    count(DISTINCT t.id) AS total_tasks,
    count(DISTINCT CASE WHEN t.completed_at IS NOT NULL THEN t.id ELSE NULL::uuid END) AS completed_tasks
FROM public.profiles p
LEFT JOIN public.plans pl ON p.id = pl.user_id
LEFT JOIN public.tasks t ON p.id = t.user_id
GROUP BY p.id;
