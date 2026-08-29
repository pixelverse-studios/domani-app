BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(8);

SELECT security_tests.create_supabase_user('push_owner');
SELECT security_tests.create_supabase_user('push_next_owner');

SELECT security_tests.authenticate_as('push_owner');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.set_current_user_expo_push_token('ExponentPushToken[shared-device]')$$,
  'an authenticated user can claim a device push token'
);

RESET ROLE;
SELECT is(
  (
    SELECT expo_push_token
    FROM public.profiles
    WHERE id = security_tests.user_id('push_owner')
  ),
  'ExponentPushToken[shared-device]',
  'the first claim is stored on the authenticated profile'
);

SELECT security_tests.authenticate_as('push_next_owner');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.set_current_user_expo_push_token('ExponentPushToken[shared-device]')$$,
  'a later authenticated account can atomically reclaim the same device token'
);

RESET ROLE;
SELECT is(
  (
    SELECT expo_push_token
    FROM public.profiles
    WHERE id = security_tests.user_id('push_owner')
  ),
  NULL,
  'claiming the token clears it from the previous profile'
);

SELECT is(
  (
    SELECT expo_push_token
    FROM public.profiles
    WHERE id = security_tests.user_id('push_next_owner')
  ),
  'ExponentPushToken[shared-device]',
  'claiming the token assigns it to the current profile'
);

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.set_current_user_expo_push_token(NULL)$$,
  'the current account can release its push token before sign-out'
);

RESET ROLE;
SELECT is(
  (
    SELECT expo_push_token
    FROM public.profiles
    WHERE id = security_tests.user_id('push_next_owner')
  ),
  NULL,
  'release clears the current profile token'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT public.set_current_user_expo_push_token('ExponentPushToken[forged]')$$,
  '42501',
  'permission denied for function set_current_user_expo_push_token',
  'anonymous callers cannot claim push tokens'
);

SELECT * FROM finish();
ROLLBACK;
