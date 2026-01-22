-- Add reminder fields to tasks table for per-task notifications
-- reminder_at: When the notification should fire (nullable = optional reminder)
-- notification_id: Expo notification identifier for cancellation

ALTER TABLE tasks
ADD COLUMN reminder_at timestamptz,
ADD COLUMN notification_id text;

-- Index for querying pending reminders (used on app launch to reschedule)
CREATE INDEX idx_tasks_pending_reminders
ON tasks (reminder_at)
WHERE reminder_at IS NOT NULL
  AND completed_at IS NULL;

COMMENT ON COLUMN tasks.reminder_at IS 'When the task reminder notification should fire';
COMMENT ON COLUMN tasks.notification_id IS 'Expo notification identifier for cancelling scheduled reminders';
