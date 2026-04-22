-- DEV-784 exploration follow-up:
-- This migration version exists in staging history because the denied refund
-- state was briefly explored. The final implementation intentionally keeps the
-- persisted refund-request model limited to:
--   - pending_review
--   - approved
--
-- We keep this no-op migration in the repo solely to preserve local/remote
-- migration history alignment for future db push operations.

DO $$
BEGIN
  -- Intentionally no-op.
  NULL;
END $$;
