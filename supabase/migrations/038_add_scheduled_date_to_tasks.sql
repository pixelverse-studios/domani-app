-- DEV-581: Add scheduled_date column to tasks and backfill from plans
-- This is the first step in removing the plans table. During the dual-write
-- period, both plan_id and scheduled_date exist on tasks.

-- Step 1: Add the column (nullable initially for backfill)
ALTER TABLE public.tasks ADD COLUMN scheduled_date DATE;

COMMENT ON COLUMN public.tasks.scheduled_date IS 'The date this task is scheduled for. Replaces the indirect plan_id -> plans.planned_for lookup.';

-- Step 2: Backfill from plans.planned_for
UPDATE public.tasks
SET scheduled_date = plans.planned_for
FROM public.plans
WHERE tasks.plan_id = plans.id;

-- Step 3: Set NOT NULL constraint after backfill
ALTER TABLE public.tasks ALTER COLUMN scheduled_date SET NOT NULL;

-- Step 4: Add composite index for the primary query pattern (user + date)
CREATE INDEX idx_tasks_user_scheduled_date ON public.tasks(user_id, scheduled_date);
