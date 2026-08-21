-- The original migration created users/categories tables before the app moved
-- to profiles and split system/user categories. They are absent from staging
-- and production, so remove them from fresh replays after all dependencies have
-- moved to the current schema.

ALTER TABLE public.tasks DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
