-- Add notes field to tasks table
-- This allows users to add shopping lists, details, or any additional context to their tasks

ALTER TABLE public.tasks
ADD COLUMN notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.notes IS 'Optional notes field for additional task details like shopping lists or context';
