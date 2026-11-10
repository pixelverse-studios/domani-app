-- Production retains three legacy admin helpers, but their admin lookup tables
-- are absent and no released client calls them. Keep service access while
-- removing the default client EXECUTE grants from the privileged functions.
DO $$
DECLARE
  target text;
  signature regprocedure;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.get_user_role_level(uuid)',
    'public.has_permission(uuid,text,public.admin_action)',
    'public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)'
  ] LOOP
    BEGIN
      signature := to_regprocedure(target);
    EXCEPTION WHEN undefined_object THEN
      -- Fresh replays do not create the legacy admin enum types.
      CONTINUE;
    END;
    IF signature IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      signature
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', signature);
  END LOOP;
END;
$$;
