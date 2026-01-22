-- Migration: Add reminder_shortcuts column to profiles
-- DOM-259: Allow users to customize quick pick times for task reminders

-- Add the reminder_shortcuts column with default values
-- Default: Morning (9 AM), Afternoon (1 PM), Evening (6 PM)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS reminder_shortcuts jsonb DEFAULT '[{"id":"morning","hour":9,"minute":0},{"id":"afternoon","hour":13,"minute":0},{"id":"evening","hour":18,"minute":0}]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.reminder_shortcuts IS 'User-customizable reminder time shortcuts (array of {id, hour, minute} objects)';
