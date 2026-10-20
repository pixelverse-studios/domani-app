-- DEV-1424 PENDING SOURCE. NEVER copy into executable history before all
-- adoption, store-availability, health and approval gates in the runbook pass.
-- Promote with `supabase migration new enforce_final_entitlement_authority`,
-- review the resulting forward migration, and rehearse that exact SQL first.
BEGIN;

-- A table UPDATE grant overrides any individual column revocations. Remove
-- both broad and previously explicit column grants before restoring preferences.
REVOKE INSERT, UPDATE ON public.profiles FROM PUBLIC, anon, authenticated;
DO $$
DECLARE col record;
BEGIN
  FOR col IN SELECT attname FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE INSERT (%I), UPDATE (%I) ON public.profiles FROM PUBLIC, anon, authenticated',
      col.attname, col.attname
    );
  END LOOP;
END;
$$;
GRANT UPDATE (
  full_name, avatar_url, timezone, planning_reminder_time,
  notification_onboarding_completed, auto_sort_categories, reminder_shortcuts,
  tutorial_completed_at, planning_reminder_enabled, last_active_at,
  planning_activated_at, updated_at
) ON public.profiles TO authenticated;

-- Current RPCs create profiles, start trials, manage deletion and claim tokens.
-- Service transactions remain the only paid entitlement and refund authority.
DROP TRIGGER IF EXISTS a_guard_legacy_profile_entitlements_insert ON public.profiles;
DROP TRIGGER IF EXISTS a_guard_legacy_profile_entitlements_update ON public.profiles;
DROP TRIGGER IF EXISTS record_legacy_trial_start_after_profile_update ON public.profiles;
-- Keep the guarded implementations (no client EXECUTE) available for secure
-- forward recovery. The ordinary explicit verification retry RPC remains used
-- by sync-revenuecat-access and must retain its authenticated grant.

-- Restrictive policies compose with existing ownership policies using AND.
-- They leave read-only history available after access expires or is refunded.
CREATE POLICY final_access_insert ON public.tasks AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_current_user_access()));
CREATE POLICY final_access_update ON public.tasks AS RESTRICTIVE
  FOR UPDATE TO authenticated USING ((SELECT public.has_current_user_access()))
  WITH CHECK ((SELECT public.has_current_user_access()));
CREATE POLICY final_access_delete ON public.tasks AS RESTRICTIVE
  FOR DELETE TO authenticated USING ((SELECT public.has_current_user_access()));
CREATE POLICY final_access_insert ON public.task_time_blocks AS RESTRICTIVE
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.has_current_user_access()));
CREATE POLICY final_access_update ON public.task_time_blocks AS RESTRICTIVE
  FOR UPDATE TO authenticated USING ((SELECT public.has_current_user_access()))
  WITH CHECK ((SELECT public.has_current_user_access()));
CREATE POLICY final_access_delete ON public.task_time_blocks AS RESTRICTIVE
  FOR DELETE TO authenticated USING ((SELECT public.has_current_user_access()));

CREATE TABLE rollout_private.final_enforcement_window (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enforced_at timestamptz NOT NULL DEFAULT now(),
  legacy_monitor_until timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
ALTER TABLE rollout_private.final_enforcement_window ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rollout_private.final_enforcement_window FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA rollout_private TO service_role;
GRANT SELECT ON rollout_private.final_enforcement_window TO service_role;
INSERT INTO rollout_private.final_enforcement_window(singleton) VALUES (true);
-- Existing prune_rollout_telemetry() owns the agreed retention: resolved queue
-- 30 days, failed/unresolved up to 90 days, identifiable events/observations
-- 90 days, aggregate daily metrics 12 months. Keep its scheduled worker active.
-- Permission-denied statements stop before BEFORE triggers. A trusted log
-- collector must emit sanitized legacy_request/rejection events through
-- record_rollout_event(), as described in the runbook, for the next 30 days.
NOTIFY pgrst, 'reload schema';
COMMIT;
