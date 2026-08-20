BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(10);

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
  true,
  'authenticated retains the existing get_user_role_level contract'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

SELECT is(
  public.get_user_role_level('11111111-1111-1111-1111-111111111111'::uuid),
  0,
  'an authenticated caller receives no administrative role level'
);
SELECT is(
  public.has_permission(
    '11111111-1111-1111-1111-111111111111'::uuid,
    '*',
    'read'::public.admin_action
  ),
  false,
  'an authenticated caller receives no administrative permission'
);
SELECT throws_ok(
  $$SELECT public.get_user_role_level('22222222-2222-2222-2222-222222222222'::uuid)$$,
  '42501',
  'Not authorized',
  'get_user_role_level rejects a spoofed user id'
);
SELECT throws_ok(
  $$SELECT public.has_permission(
    '22222222-2222-2222-2222-222222222222'::uuid,
    '*',
    'read'::public.admin_action
  )$$,
  '42501',
  'Not authorized',
  'has_permission rejects a spoofed user id'
);
SELECT throws_ok(
  $$SELECT public.log_audit_event(
    '11111111-1111-1111-1111-111111111111'::uuid,
    'read'::public.audit_action,
    'test'
  )$$,
  '42501',
  'Administrative authorization is not configured',
  'log_audit_event fails closed without an administrative backend'
);
SELECT throws_ok(
  $$SELECT public.log_audit_event(
    '22222222-2222-2222-2222-222222222222'::uuid,
    'read'::public.audit_action,
    'test'
  )$$,
  '42501',
  'Not authorized',
  'log_audit_event rejects a spoofed user id first'
);

SELECT * FROM finish();

ROLLBACK;
