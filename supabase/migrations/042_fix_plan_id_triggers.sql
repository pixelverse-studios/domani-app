-- Fix trigger functions that still reference the dropped plan_id column
--
-- These triggers were created before plan_id was removed from tasks.
-- They reference plan_id to scope MIT/top-priority uniqueness per plan,
-- but now need to use user_id + scheduled_date instead.

-- ============================================================
-- 1. Drop plan completion trigger and function (plans table no longer exists)
-- ============================================================
DROP TRIGGER IF EXISTS update_completion_on_task_change ON public.tasks;
DROP FUNCTION IF EXISTS public.update_plan_completion_rate();

-- ============================================================
-- 2. Drop old MIT triggers that use plan_id
-- ============================================================
DROP TRIGGER IF EXISTS enforce_single_mit_per_plan ON public.tasks;
DROP FUNCTION IF EXISTS public.enforce_single_mit();

DROP TRIGGER IF EXISTS ensure_single_mit_trigger ON public.tasks;
DROP FUNCTION IF EXISTS public.ensure_single_mit();

-- ============================================================
-- 3. Replace top priority function to use scheduled_date + user_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_single_top_priority_and_sync_mit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.priority = 'top' THEN
        NEW.is_mit := TRUE;

        UPDATE public.tasks
        SET priority = 'high', is_mit = FALSE
        WHERE user_id = NEW.user_id
          AND scheduled_date = NEW.scheduled_date
          AND id != NEW.id
          AND priority = 'top';
    ELSE
        NEW.is_mit := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Drop stale plan-dependent functions
-- ============================================================
DROP FUNCTION IF EXISTS public.get_remaining_task_slots(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_add_task(uuid);
DROP FUNCTION IF EXISTS public.can_add_task_to_plan(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_or_create_plan(date);
