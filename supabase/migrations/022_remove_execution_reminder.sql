-- Migration: Remove global execution reminder system
-- This removes the user-level execution reminder fields in preparation for per-task reminders
-- DOM-255

-- Drop the user_overview view first (it depends on execution_reminder_time)
DROP VIEW IF EXISTS user_overview;

-- Drop the execution reminder columns from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS execution_reminder_time,
DROP COLUMN IF EXISTS last_execution_reminder_sent_at;

-- Recreate user_overview view without execution_reminder_time
CREATE OR REPLACE VIEW user_overview AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.tier,
  p.subscription_status,
  p.timezone,
  p.planning_reminder_time,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT pl.id) AS total_plans,
  COUNT(DISTINCT t.id) AS total_tasks,
  COUNT(DISTINCT CASE WHEN t.completed_at IS NOT NULL THEN t.id END) AS completed_tasks
FROM profiles p
LEFT JOIN plans pl ON p.id = pl.user_id
LEFT JOIN tasks t ON p.id = t.user_id
GROUP BY p.id;
