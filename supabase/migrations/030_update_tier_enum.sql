-- DEV-11: Change tier enum from 'free' | 'premium' | 'lifetime'
--                                 to 'none' | 'trialing' | 'lifetime'
--
-- The app model is now: trial → lifetime purchase or locked out.
-- There is no free tier with limited tasks.
--
-- Strategy: convert the column to text first, then drop/recreate the enum.
-- This avoids the PostgreSQL restriction that newly added enum values cannot
-- be used in the same transaction they were added in.

-- Step 1: Drop views that depend on the tier column so we can alter its type
DROP VIEW IF EXISTS public.admin_users_overview;
DROP VIEW IF EXISTS public.admin_user_task_details;
DROP VIEW IF EXISTS public.user_overview;

-- Step 2: Drop the column default (it references the enum type) and convert to text
ALTER TABLE public.profiles ALTER COLUMN tier DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN tier TYPE text;

-- Step 3: Drop the old enum type
DROP TYPE public.tier;

-- Step 4: Migrate existing data while column is plain text
UPDATE public.profiles SET tier = 'none' WHERE tier = 'free';
UPDATE public.profiles SET tier = 'lifetime' WHERE tier = 'premium';

-- Step 5: Create the new enum with only the desired values
CREATE TYPE public.tier AS ENUM ('none', 'trialing', 'lifetime');

-- Convert the column back to the new enum type
ALTER TABLE public.profiles
    ALTER COLUMN tier TYPE public.tier USING tier::public.tier;

-- Update the default from 'free' to 'none'
ALTER TABLE public.profiles ALTER COLUMN tier SET DEFAULT 'none';

-- Step 6: Recreate the views that were dropped
CREATE OR REPLACE VIEW public.admin_user_task_details AS
SELECT
    p.id AS user_id,
    p.email AS user_email,
    p.full_name,
    p.tier,
    pl.id AS plan_id,
    pl.planned_for,
    pl.status AS plan_status,
    t.id AS task_id,
    t.title AS task_title,
    t.description,
    t.notes,
    t.priority,
    t.is_mit,
    t."position",
    t.estimated_duration_minutes,
    t.completed_at,
    CASE WHEN t.completed_at IS NOT NULL THEN 'Done'::text ELSE 'Pending'::text END AS task_status,
    CASE
        WHEN t.system_category_id IS NOT NULL THEN 'system'::text
        WHEN t.user_category_id IS NOT NULL THEN 'user'::text
        ELSE 'none'::text
    END AS category_type,
    COALESCE(sc.name, uc.name) AS category_name,
    COALESCE(sc.color, uc.color) AS category_color,
    COALESCE(sc.icon, uc.icon) AS category_icon,
    t.system_category_id,
    t.user_category_id,
    t.created_at AS task_created_at,
    t.updated_at AS task_updated_at
FROM public.profiles p
LEFT JOIN public.plans pl ON pl.user_id = p.id
LEFT JOIN public.tasks t ON t.plan_id = pl.id
LEFT JOIN public.system_categories sc ON sc.id = t.system_category_id
LEFT JOIN public.user_categories uc ON uc.id = t.user_category_id
WHERE p.deleted_at IS NULL
ORDER BY p.email, pl.planned_for DESC, t."position";

CREATE OR REPLACE VIEW public.admin_users_overview AS
SELECT
    au.email,
    au.id,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(p.full_name, '(no profile)'::text) AS full_name,
    p.tier,
    (SELECT count(*) FROM public.plans WHERE plans.user_id = au.id) AS plans_count,
    (SELECT count(*) FROM public.tasks WHERE tasks.user_id = au.id) AS tasks_count,
    (SELECT count(*) FROM public.user_categories WHERE user_categories.user_id = au.id) AS custom_categories,
    (SELECT count(*) FROM public.beta_feedback WHERE beta_feedback.user_id = au.id) AS feedback_count,
    (SELECT count(*) FROM public.support_requests WHERE support_requests.user_id = au.id) AS support_count
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

CREATE OR REPLACE VIEW public.user_overview AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.tier,
    p.subscription_status,
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

-- Step 7: Update the task insert RLS policy to use new tier values.
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

-- Step 8: Update can_add_task() to use the new tier values.
-- Previously checked for 'premium', which no longer exists in the enum.
-- 'trialing' and 'lifetime' users can always add tasks.
CREATE OR REPLACE FUNCTION can_add_task(p_plan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_tier VARCHAR(20);
    v_task_count INTEGER;
    v_user_id UUID;
BEGIN
    -- Get user_id from plan
    SELECT user_id INTO v_user_id FROM public.plans WHERE id = p_plan_id;

    -- Verify requesting user owns this plan
    IF v_user_id != auth.uid() THEN
        RETURN FALSE;
    END IF;

    -- Get user tier
    SELECT tier INTO v_user_tier FROM public.users WHERE id = v_user_id;

    -- Trialing/Lifetime can always add
    IF v_user_tier IN ('trialing', 'lifetime') THEN
        RETURN TRUE;
    END IF;

    -- Count current tasks for free tier
    SELECT COUNT(*) INTO v_task_count FROM public.tasks WHERE plan_id = p_plan_id;

    RETURN v_task_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
