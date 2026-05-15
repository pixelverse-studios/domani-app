-- DEV-587: Drop plans table, plan_id column, and clean up related objects
--
-- This is the final migration in the plans removal epic (DEV-580).
-- All app code has been migrated to use scheduled_date directly.
--
-- IMPORTANT: This migration is destructive and irreversible.
-- Ensure a database backup exists before running.
--
-- ROLLBACK: Not possible — plan data is lost after this migration.

-- ============================================================
-- 1. Drop admin views that depend on plan_id
-- ============================================================
DROP VIEW IF EXISTS public.admin_tasks_by_user CASCADE;
DROP VIEW IF EXISTS public.admin_user_task_details CASCADE;
DROP VIEW IF EXISTS public.admin_user_tasks_today CASCADE;

-- ============================================================
-- 2. Drop plan_id column from tasks
-- ============================================================
ALTER TABLE public.tasks DROP COLUMN IF EXISTS plan_id;

-- ============================================================
-- 3. Drop plans table and all dependent objects
-- ============================================================
DROP TABLE IF EXISTS public.plans CASCADE;

-- ============================================================
-- 4. Drop plan_status enum type
-- ============================================================
DROP TYPE IF EXISTS public.plan_status;

-- Note: get_user_tier() and is_beta_phase() are still used by the
-- task INSERT RLS policy (migration 040) and are NOT dropped here.
