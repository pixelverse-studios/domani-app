-- App Configuration Table
-- Stores application-wide configuration including app phase and feature flags
-- This allows dynamic control without app store updates

-- Create enum for app phases
CREATE TYPE app_phase AS ENUM ('closed_beta', 'open_beta', 'production');

-- Create app_config table
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE app_config IS 'Application-wide configuration including phase and feature flags';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_app_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_app_config_updated_at();

-- Enable RLS (read-only for all authenticated users)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read app config (including anonymous for pre-login phase display)
CREATE POLICY "Anyone can read app config"
  ON app_config
  FOR SELECT
  USING (true);

-- Only service role can modify (via Supabase dashboard or backend)
-- No INSERT/UPDATE/DELETE policies for regular users

-- Insert initial configuration
INSERT INTO app_config (key, value) VALUES
  ('phase', '{"current": "closed_beta", "show_badge": true}'::jsonb),
  ('feature_flags', '{
    "closed_beta": {
      "feedback_enabled": true,
      "analytics_enabled": false,
      "invite_required": true
    },
    "open_beta": {
      "feedback_enabled": true,
      "analytics_enabled": true,
      "invite_required": false
    },
    "production": {
      "feedback_enabled": true,
      "analytics_enabled": true,
      "invite_required": false
    }
  }'::jsonb);
