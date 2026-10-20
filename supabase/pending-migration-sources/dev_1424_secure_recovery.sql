-- DEV-1424 PENDING RECOVERY SOURCE. Promote as a NEW forward migration after
-- incident review; never edit applied history or regrant protected columns.
-- Recovery here relaxes only task/time-block access enforcement. Ownership,
-- server entitlement authority and profile-column restrictions remain active.
BEGIN;
DROP POLICY IF EXISTS final_access_insert ON public.tasks;
DROP POLICY IF EXISTS final_access_update ON public.tasks;
DROP POLICY IF EXISTS final_access_delete ON public.tasks;
DROP POLICY IF EXISTS final_access_insert ON public.task_time_blocks;
DROP POLICY IF EXISTS final_access_update ON public.task_time_blocks;
DROP POLICY IF EXISTS final_access_delete ON public.task_time_blocks;

-- Reinstall the secure compatibility trigger as defense in depth. It strips
-- supplied authority values, computes eligible trial dates on the server, and
-- queues paid verification; it never treats a client payload as payment proof.
-- Profile column grants remain restricted, so this does not re-enable legacy
-- entitlement updates. Any broader compatibility recovery needs a separately
-- reviewed design with a guarded server request surface, never arbitrary writes.
DROP TRIGGER IF EXISTS a_guard_legacy_profile_entitlements_insert ON public.profiles;
DROP TRIGGER IF EXISTS a_guard_legacy_profile_entitlements_update ON public.profiles;
CREATE TRIGGER a_guard_legacy_profile_entitlements_insert
  BEFORE INSERT ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.a_guard_legacy_profile_entitlements();
CREATE TRIGGER a_guard_legacy_profile_entitlements_update
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.a_guard_legacy_profile_entitlements();
NOTIFY pgrst, 'reload schema';
COMMIT;
