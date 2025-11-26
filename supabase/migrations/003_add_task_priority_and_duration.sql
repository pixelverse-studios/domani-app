-- Migration: Add task priority and estimated duration
-- Description: Adds priority enum and estimated_duration_minutes to tasks table
-- Date: 2025-11-24

-- ============================================================================
-- TASK PRIORITY ENUM
-- ============================================================================

CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');

COMMENT ON TYPE task_priority IS 'Priority levels for tasks: high, medium, low';

-- ============================================================================
-- ADD COLUMNS TO TASKS TABLE
-- ============================================================================

ALTER TABLE public.tasks
    ADD COLUMN priority task_priority DEFAULT 'medium',
    ADD COLUMN estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0);

COMMENT ON COLUMN public.tasks.priority IS 'Task priority level for visual styling and sorting';
COMMENT ON COLUMN public.tasks.estimated_duration_minutes IS 'Estimated time to complete task in minutes';

-- ============================================================================
-- INDEX FOR PRIORITY QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
