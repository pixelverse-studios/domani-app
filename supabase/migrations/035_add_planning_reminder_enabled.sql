-- Add planning_reminder_enabled flag to profiles
-- Controls whether the user receives the daily planning reminder push notification.
-- The planning time itself (planning_reminder_time) remains required for the evening
-- rollover on app open — this flag only gates the notification.

ALTER TABLE public.profiles
  ADD COLUMN planning_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.planning_reminder_enabled IS
  'Whether user has opted in to daily planning reminder push notifications. The planning time itself (planning_reminder_time) is always required for the evening rollover.';

-- Backfill: existing users who already have a planning time are considered opted in.
-- This is an opt-out migration — no disruption to existing users.
UPDATE public.profiles
SET planning_reminder_enabled = TRUE
WHERE planning_reminder_time IS NOT NULL;
