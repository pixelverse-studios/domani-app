-- Remove plan locking system
-- The locked_at column is no longer used - plans are no longer "locked"

-- STEP 1: Update RLS policies to remove locked_at checks
-- (Must be done BEFORE dropping the column)

-- Plans: Allow users to update their own plans (remove locked_at check)
DROP POLICY IF EXISTS "Users can update own unlocked plans" ON public.plans;
CREATE POLICY "Users can update own plans"
    ON public.plans
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Plans: Allow users to delete their own plans (remove locked_at check)
DROP POLICY IF EXISTS "Users can delete own unlocked plans" ON public.plans;
CREATE POLICY "Users can delete own plans"
    ON public.plans
    FOR DELETE
    USING (auth.uid() = user_id);

-- Tasks: Allow users to update their own tasks (remove locked_at check from subquery)
DROP POLICY IF EXISTS "Users can update own tasks in unlocked plans" ON public.tasks;
CREATE POLICY "Users can update own tasks"
    ON public.tasks
    FOR UPDATE
    USING (
        plan_id IN (
            SELECT id FROM public.plans
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        plan_id IN (
            SELECT id FROM public.plans
            WHERE user_id = auth.uid()
        )
    );

-- Tasks: Allow users to delete their own tasks (remove locked_at check from subquery)
DROP POLICY IF EXISTS "Users can delete own tasks in unlocked plans" ON public.tasks;
CREATE POLICY "Users can delete own tasks"
    ON public.tasks
    FOR DELETE
    USING (
        plan_id IN (
            SELECT id FROM public.plans
            WHERE user_id = auth.uid()
        )
    );

-- STEP 2: Now safe to drop the column
ALTER TABLE plans
DROP COLUMN IF EXISTS locked_at;
