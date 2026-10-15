-- The legacy audit table exists in production but is absent from fresh
-- Domani replays. Remove direct client writes wherever it is present.
DO $$
BEGIN
  IF to_regclass('public.admin_audit_log') IS NULL THEN
    RETURN;
  END IF;

  REVOKE INSERT ON TABLE public.admin_audit_log FROM PUBLIC, anon, authenticated;
  DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;
  CREATE POLICY "System can insert audit logs" ON public.admin_audit_log
    FOR INSERT TO service_role WITH CHECK (true);
  GRANT INSERT ON TABLE public.admin_audit_log TO service_role;
END;
$$;
