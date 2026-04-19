-- DEV-37: Add configurable beta access settings to app_config
--
-- Keeps beta cutoff and grace window in remote config so they can be
-- updated without shipping a new app build.

INSERT INTO app_config (key, value)
VALUES (
  'beta_access',
  '{
    "legacy_beta_signup_cutoff": "2026-04-01T00:00:00Z",
    "beta_end_date": "2026-03-31T00:00:00Z",
    "grace_period_days": 14
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
