-- The device metadata columns exist on production feedback tables, but their
-- original dashboard change is absent from the historical migration files.
-- Restore that baseline before the later dashboard views reference the columns.
-- This version is for fresh replay; established projects already have them.

ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS device_brand text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS app_build text,
  ADD COLUMN IF NOT EXISTS screen_width integer,
  ADD COLUMN IF NOT EXISTS screen_height integer;

ALTER TABLE public.beta_feedback
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS os_version text,
  ADD COLUMN IF NOT EXISTS device_brand text,
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS app_build text,
  ADD COLUMN IF NOT EXISTS screen_width integer,
  ADD COLUMN IF NOT EXISTS screen_height integer;
