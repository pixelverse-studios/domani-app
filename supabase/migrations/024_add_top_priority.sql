-- Migration: Add TOP priority tier and move MIT logic from HIGH to TOP
-- TOP priority now represents the MIT (Most Important Task)
-- HIGH priority becomes a regular priority level (unlimited per plan)
--
-- When a task is set to TOP priority:
--   1. Any existing TOP priority task in the same plan is demoted to HIGH
--   2. is_mit is automatically set to TRUE
-- When a task is set to HIGH, MEDIUM or LOW:
--   1. is_mit is automatically set to FALSE

-- Add 'top' value to task_priority enum
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'top' BEFORE 'high';

-- Drop existing trigger first
DROP TRIGGER IF EXISTS enforce_single_high_priority_trigger ON public.tasks;

-- Drop old function
DROP FUNCTION IF EXISTS enforce_single_high_priority_and_sync_mit();

-- Create new function to enforce single TOP priority and sync is_mit
CREATE OR REPLACE FUNCTION enforce_single_top_priority_and_sync_mit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.priority = 'top' THEN
        -- Set is_mit = true for this task
        NEW.is_mit := TRUE;

        -- Demote any other TOP priority tasks in the same plan to HIGH
        -- and set their is_mit = false
        UPDATE public.tasks
        SET priority = 'high', is_mit = FALSE
        WHERE plan_id = NEW.plan_id
          AND id != NEW.id
          AND priority = 'top';
    ELSE
        -- Non-TOP priority tasks cannot be MIT
        NEW.is_mit := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger with updated name
CREATE TRIGGER enforce_single_top_priority_trigger
    BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_top_priority_and_sync_mit();

-- Migrate existing data: existing HIGH priority MIT tasks become TOP priority
-- This preserves the user's intent - their MIT should remain their MIT
UPDATE public.tasks
SET priority = 'top'
WHERE priority = 'high' AND is_mit = TRUE;

-- Ensure all non-TOP tasks have is_mit = false (cleanup)
UPDATE public.tasks
SET is_mit = FALSE
WHERE priority != 'top' AND is_mit = TRUE;

-- Update column comment
COMMENT ON COLUMN public.tasks.is_mit IS 'Most Important Task flag - automatically synced with TOP priority. TOP priority = is_mit TRUE, HIGH/MEDIUM/LOW = is_mit FALSE.';
COMMENT ON COLUMN public.tasks.priority IS 'Task priority level. TOP = Most Important Task (limit 1 per plan), HIGH/MEDIUM/LOW = regular priority levels (unlimited).';
