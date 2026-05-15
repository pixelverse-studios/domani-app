-- DEV-582: Simplify task RLS policies to use direct user_id checks
--
-- Removes the plan_id subquery pattern from all task policies.
-- The user_id column already exists on tasks, so these simplified
-- policies are backwards-compatible with both old and new app code.
--
-- Also drops can_add_task() and get_or_create_plan() which route
-- through the plans table and are not called from app code.
--
-- ROLLBACK:
-- To revert, re-run migrations 030 and 031 policy definitions,
-- and recreate functions from migration 032 and 001.

-- ============================================================
-- 1. Drop and recreate task RLS policies
-- ============================================================

-- Clean up legacy policy names from earlier migrations
DROP POLICY IF EXISTS "Users can read own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks in unlocked plans" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks in unlocked plans" ON public.tasks;

-- SELECT: Users can only view their own tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks"
    ON public.tasks
    FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: Users can create tasks if they own them and have an active tier
DROP POLICY IF EXISTS "Users can insert tasks with tier limit" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
CREATE POLICY "Users can insert tasks"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            public.is_beta_phase()
            OR
            public.get_user_tier(auth.uid()) IN ('trialing', 'lifetime')
        )
    );

-- UPDATE: Users can only update their own tasks
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks"
    ON public.tasks
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own tasks
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
    ON public.tasks
    FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================
-- 2. Drop plan-dependent functions
-- ============================================================

-- Revoke grants before dropping
REVOKE ALL ON FUNCTION public.can_add_task(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_or_create_plan(DATE) FROM authenticated;

-- Drop functions
DROP FUNCTION IF EXISTS public.can_add_task(UUID);
DROP FUNCTION IF EXISTS public.get_or_create_plan(DATE);
