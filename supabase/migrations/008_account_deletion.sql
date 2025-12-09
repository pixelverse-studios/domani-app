-- Migration: Account Deletion (Soft Delete)
-- Adds soft-delete mechanism with 30-day grace period for account reactivation

-- 1. Add deletion tracking columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ DEFAULT NULL;

-- 2. Create function to schedule account deletion
-- Sets deleted_at to now and schedules hard delete for 30 days later
CREATE OR REPLACE FUNCTION schedule_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    deleted_at = NOW(),
    deletion_scheduled_for = NOW() + INTERVAL '30 days'
  WHERE id = p_user_id;
END;
$$;

-- 3. Create function to cancel scheduled deletion
-- Clears deletion fields to reactivate account
CREATE OR REPLACE FUNCTION cancel_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    deleted_at = NULL,
    deletion_scheduled_for = NULL
  WHERE id = p_user_id;
END;
$$;

-- 4. Create function to hard delete expired accounts
-- Called by pg_cron job to permanently delete accounts past their grace period
-- Deleting from auth.users cascades to profiles and all related data
CREATE OR REPLACE FUNCTION delete_expired_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_user_ids UUID[];
BEGIN
  -- Get all users past their deletion date
  SELECT ARRAY_AGG(id) INTO expired_user_ids
  FROM profiles
  WHERE deletion_scheduled_for IS NOT NULL
    AND deletion_scheduled_for < NOW();

  -- Delete each user from auth.users (cascades to profiles)
  IF expired_user_ids IS NOT NULL THEN
    DELETE FROM auth.users
    WHERE id = ANY(expired_user_ids);
  END IF;
END;
$$;

-- 5. Schedule the cron job to run daily at 3 AM UTC
-- Note: pg_cron must be enabled in Supabase dashboard first
-- The cron job can be created via Supabase dashboard or with:
-- SELECT cron.schedule('hard-delete-expired-accounts', '0 3 * * *', 'SELECT delete_expired_accounts()');

-- 6. Add index for efficient querying of pending deletions
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
ON profiles (deletion_scheduled_for)
WHERE deletion_scheduled_for IS NOT NULL;

-- 7. Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION schedule_account_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_account_deletion(UUID) TO authenticated;

-- Note: delete_expired_accounts should only be called by cron, not by users
-- No GRANT needed for that function
