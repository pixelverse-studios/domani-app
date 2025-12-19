-- Backfill timezone for existing users who have NULL timezone
-- Part of DOM-182: Refactor notification system to fix duplicate sends and improve reliability
--
-- This sets a reasonable default timezone (America/New_York) for users who:
-- 1. Have a NULL timezone value
-- 2. Have completed notification onboarding
--
-- Note: Users who haven't completed onboarding will have their timezone
-- detected and saved when they go through the notification setup screen.
--
-- For users who already completed onboarding with a NULL timezone,
-- America/New_York is a safe default since it's a common US timezone.
-- Users can change their timezone in Settings if needed.

UPDATE profiles
SET timezone = 'America/New_York'
WHERE timezone IS NULL
  AND notification_onboarding_completed = true;

-- Log the count of affected rows (for debugging via migration logs)
-- This is informational only and won't fail the migration
