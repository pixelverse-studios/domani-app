-- Public pricing configuration
-- Controls the public-facing login/signup offer independently from app phase.

INSERT INTO public.app_config (key, value)
VALUES ('public_pricing', '{"tier":"early_adopter"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW();
