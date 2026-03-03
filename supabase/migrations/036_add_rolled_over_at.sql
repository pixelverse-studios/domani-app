ALTER TABLE tasks
ADD COLUMN rolled_over_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN tasks.rolled_over_at IS
  'Set when this task is carried forward via rollover. Filters it from active views while preserving the record for analytics.';
