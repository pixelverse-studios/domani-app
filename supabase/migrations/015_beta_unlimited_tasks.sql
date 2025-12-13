-- Allow unlimited tasks for all users during beta phase
-- Beta users are promised "full Pro access" but were still hitting the 3-task limit

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can insert tasks with tier limit" ON public.tasks;

-- Create a helper function to check if app is in beta phase (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_beta_phase()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.app_config
        WHERE key = 'phase'
        AND (value->>'current') IN ('closed_beta', 'open_beta')
    );
$$;

-- Recreate the policy with beta phase check
-- During beta: ALL users have unlimited tasks
-- After beta: Only premium/lifetime users have unlimited tasks, free tier limited to 3
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
            -- Premium/Lifetime users have no limit
            public.get_user_tier(auth.uid()) IN ('premium', 'lifetime')
            OR
            -- Free tier users limited to 3 tasks per plan (only enforced post-beta)
            public.get_task_count_for_plan(plan_id) < 3
        )
    );
