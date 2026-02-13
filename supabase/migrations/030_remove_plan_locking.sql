-- Remove plan locking system
-- The locked_at column is no longer used - plans are no longer "locked"

ALTER TABLE plans
DROP COLUMN IF EXISTS locked_at;
