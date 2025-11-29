-- Migration: Add notification onboarding completed flag
-- Description: Tracks whether user has completed/dismissed notification setup onboarding
-- Date: 2025-11-28

-- ============================================================================
-- ADD COLUMN TO PROFILES TABLE
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN notification_onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN public.profiles.notification_onboarding_completed IS 'Whether user has completed or dismissed the notification setup onboarding screen';
