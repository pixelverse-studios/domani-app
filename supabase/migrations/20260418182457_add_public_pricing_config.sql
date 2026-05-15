-- Public pricing configuration compatibility migration.
--
-- Production already recorded version 20260418182457 for this app_config row
-- before the numbered 046 migration existed in dev/monetization. Keep this
-- timestamped migration in source control so production history is represented
-- locally. The statement is idempotent for staging and fresh environments.

INSERT INTO public.app_config (key, value)
VALUES ('public_pricing', '{"tier":"early_adopter"}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW();
