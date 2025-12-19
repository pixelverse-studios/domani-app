-- Add notification tracking columns to profiles for deduplication and token health monitoring
-- Part of DOM-182: Refactor notification system to fix duplicate sends and improve reliability

-- Track the last date an execution reminder was sent to prevent duplicate daily sends
ALTER TABLE profiles ADD COLUMN last_execution_reminder_sent_at DATE;

-- Track when a push token was marked as invalid (e.g., DeviceNotRegistered error)
-- NULL means token is valid; set timestamp means token is invalid and should be cleared
ALTER TABLE profiles ADD COLUMN push_token_invalid_at TIMESTAMPTZ;

-- Track the last successful push notification send for token health monitoring
ALTER TABLE profiles ADD COLUMN push_token_last_verified_at TIMESTAMPTZ;

-- Add documentation comments
COMMENT ON COLUMN profiles.last_execution_reminder_sent_at IS 'Last date an execution reminder was sent. Used for deduplication to ensure max one reminder per day.';
COMMENT ON COLUMN profiles.push_token_invalid_at IS 'Timestamp when push token was marked invalid (e.g., DeviceNotRegistered). NULL means valid.';
COMMENT ON COLUMN profiles.push_token_last_verified_at IS 'Timestamp of last successful push notification send. Used for token health monitoring.';

-- Create index for efficient execution reminder queries
-- This index helps the Edge Function quickly find users who:
-- 1. Have reminders enabled (execution_reminder_time NOT NULL)
-- 2. Have a valid push token (expo_push_token NOT NULL, push_token_invalid_at IS NULL)
-- 3. Haven't received a reminder today (last_execution_reminder_sent_at != CURRENT_DATE or IS NULL)
CREATE INDEX idx_profiles_execution_reminders ON profiles (
    execution_reminder_time,
    expo_push_token,
    push_token_invalid_at,
    last_execution_reminder_sent_at
) WHERE execution_reminder_time IS NOT NULL
  AND expo_push_token IS NOT NULL;
