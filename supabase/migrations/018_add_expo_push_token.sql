-- Add expo_push_token column to profiles for push notifications
-- This token is used by the send-execution-reminders Edge Function
-- to send context-aware push notifications via Expo Push API

ALTER TABLE profiles ADD COLUMN expo_push_token TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN profiles.expo_push_token IS 'Expo Push Token for sending push notifications via Expo Push API';
