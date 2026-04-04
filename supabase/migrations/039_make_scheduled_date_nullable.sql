-- HOTFIX: Make scheduled_date nullable so existing production builds
-- (which don't set scheduled_date on insert) can still create tasks.
-- The NOT NULL constraint will be re-added after all code is migrated
-- and a new build is deployed.
ALTER TABLE public.tasks ALTER COLUMN scheduled_date DROP NOT NULL;
