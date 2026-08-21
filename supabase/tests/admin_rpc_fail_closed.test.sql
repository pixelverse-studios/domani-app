BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(7);

SELECT is(
  has_function_privilege('anon', 'public.get_user_role_level(uuid)', 'EXECUTE'),
  false,
  'anon cannot execute get_user_role_level'
);
SELECT is(
  has_function_privilege('anon', 'public.has_permission(uuid,text,public.admin_action)', 'EXECUTE'),
  false,
  'anon cannot execute has_permission'
);
SELECT is(
  has_function_privilege(
    'anon',
    'public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  false,
  'anon cannot execute log_audit_event'
);
SELECT is(
  has_function_privilege('authenticated', 'public.get_user_role_level(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute get_user_role_level'
);
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.has_permission(uuid,text,public.admin_action)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot execute has_permission'
);
SELECT is(
  has_function_privilege(
    'authenticated',
    'public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  false,
  'authenticated cannot execute log_audit_event'
);
SELECT is_empty(
  $$
    SELECT procedure.oid::regprocedure::text
    FROM pg_catalog.pg_proc AS procedure
    WHERE procedure.oid IN (
      'public.get_user_role_level(uuid)'::regprocedure,
      'public.has_permission(uuid,text,public.admin_action)'::regprocedure,
      'public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)'::regprocedure
    )
      AND procedure.prosecdef
  $$,
  'unconfigured admin RPCs do not retain definer authority'
);

SELECT * FROM finish();

ROLLBACK;
