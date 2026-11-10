-- PostgreSQL requires a newly-added enum value to be committed before it is
-- used. Migration 024 creates the value; this separate migration performs the
-- intended data backfill in the following transaction.

UPDATE public.tasks
SET priority = 'top'
WHERE priority = 'high' AND is_mit = TRUE;

UPDATE public.tasks
SET is_mit = FALSE
WHERE priority != 'top' AND is_mit = TRUE;
