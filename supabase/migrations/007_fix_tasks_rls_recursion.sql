-- Fix infinite recursion in tasks INSERT policy
-- The previous policy caused recursion by querying tasks table within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can insert tasks with tier limit" ON public.tasks;

-- Create a helper function to check task count (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_task_count_for_plan(p_plan_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COUNT(*)::integer FROM public.tasks WHERE plan_id = p_plan_id;
$$;

-- Create a helper function to get user tier (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT tier::text FROM public.profiles WHERE id = p_user_id;
$$;

-- Recreate the policy using helper functions to avoid recursion
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
            -- Premium/Lifetime users have no limit
            public.get_user_tier(auth.uid()) IN ('premium', 'lifetime')
            OR
            -- Free tier users limited to 3 tasks per plan
            public.get_task_count_for_plan(plan_id) < 3
        )
    );
