-- Migration: Enforce single HIGH priority per plan + sync with is_mit
-- HIGH priority now represents the MIT (Most Important Task)
-- When a task is set to HIGH priority:
--   1. Any existing HIGH priority task in the same plan is demoted to MEDIUM
--   2. is_mit is automatically set to TRUE
-- When a task is set to MEDIUM or LOW:
--   1. is_mit is automatically set to FALSE

-- Function to enforce single HIGH priority and sync is_mit
CREATE OR REPLACE FUNCTION enforce_single_high_priority_and_sync_mit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.priority = 'high' THEN
        -- Set is_mit = true for this task
        NEW.is_mit := TRUE;

        -- Demote any other HIGH priority tasks in the same plan to MEDIUM
        -- and set their is_mit = false
        UPDATE public.tasks
        SET priority = 'medium', is_mit = FALSE
        WHERE plan_id = NEW.plan_id
          AND id != NEW.id
          AND priority = 'high';
    ELSE
        -- Non-HIGH priority tasks cannot be MIT
        NEW.is_mit := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires on every INSERT or UPDATE to tasks
CREATE TRIGGER enforce_single_high_priority_trigger
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_high_priority_and_sync_mit();

-- Sync existing data: ensure any HIGH priority tasks have is_mit = true
-- and only one HIGH per plan exists (keep the most recent one)
DO $$
DECLARE
    plan RECORD;
    latest_high RECORD;
BEGIN
    -- For each plan that has HIGH priority tasks
    FOR plan IN
        SELECT DISTINCT plan_id
        FROM public.tasks
        WHERE priority = 'high'
    LOOP
        -- Find the most recently updated HIGH priority task
        SELECT id INTO latest_high
        FROM public.tasks
        WHERE plan_id = plan.plan_id AND priority = 'high'
        ORDER BY updated_at DESC
        LIMIT 1;

        -- Demote all other HIGH tasks in this plan to MEDIUM
        UPDATE public.tasks
        SET priority = 'medium', is_mit = FALSE
        WHERE plan_id = plan.plan_id
          AND priority = 'high'
          AND id != latest_high.id;

        -- Ensure the remaining HIGH task has is_mit = true
        UPDATE public.tasks
        SET is_mit = TRUE
        WHERE id = latest_high.id;
    END LOOP;

    -- Ensure all non-HIGH tasks have is_mit = false
    UPDATE public.tasks
    SET is_mit = FALSE
    WHERE priority != 'high' AND is_mit = TRUE;
END;
$$;

-- Add comment explaining the relationship
COMMENT ON COLUMN public.tasks.is_mit IS 'Most Important Task flag - automatically synced with HIGH priority. HIGH priority = is_mit TRUE, MEDIUM/LOW = is_mit FALSE.';
