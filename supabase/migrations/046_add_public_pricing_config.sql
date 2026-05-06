-- Public pricing configuration
-- Controls the public-facing login/signup offer independently from app phase.
--
-- This migration also establishes the trial column baseline required by 047.
-- Version 037 was already used by staging and production for last_active_at, so
-- the old dev/monetization 037 trial migration cannot be safely replayed.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.trial_started_at IS
'When the user''s 14-day free trial began. Set automatically on signup/profile recovery.';

COMMENT ON COLUMN public.profiles.trial_ends_at IS
'When the user''s free trial expires.';

CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at
ON public.profiles(trial_ends_at)
WHERE trial_ends_at IS NOT NULL;

INSERT INTO public.app_config (key, value)
VALUES ('public_pricing', '{"tier":"early_adopter"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW();
