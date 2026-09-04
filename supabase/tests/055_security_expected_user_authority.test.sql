BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(10);

SELECT security_tests.create_supabase_user('expected_owner');
SELECT security_tests.create_supabase_user('expected_other');
SELECT security_tests.authenticate_as('expected_owner');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.ensure_expected_user_profile(security_tests.user_id('expected_owner'))$$,
  'expected-user profile repair accepts the authenticated lifecycle owner'
);
SELECT lives_ok(
  $$SELECT public.set_expected_user_expo_push_token(
    security_tests.user_id('expected_owner'),
    'ExponentPushToken[expected-owner]'
  )$$,
  'expected-user push ownership accepts the authenticated lifecycle owner'
);

SELECT throws_ok(
  $$SELECT public.ensure_expected_user_profile(security_tests.user_id('expected_other'))$$,
  '42501',
  'Authenticated account changed',
  'profile repair rejects a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.set_expected_user_expo_push_token(
    security_tests.user_id('expected_other'),
    'ExponentPushToken[wrong-owner]'
  )$$,
  '42501',
  'Authenticated account changed',
  'push ownership rejects a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.update_expected_user_promo_redemption_attempt(
    security_tests.user_id('expected_other'),
    '10000000-0000-0000-0000-000000000001'::uuid,
    'sync_failed',
    'failed'::public.promo_redemption_status,
    NULL,
    NULL,
    '{}'::jsonb
  )$$,
  '42501',
  'Authenticated account changed',
  'promo audit rejects a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.mark_expected_user_refund_request_pending(
    security_tests.user_id('expected_other'),
    'ios',
    'settings',
    NULL
  )$$,
  '42501',
  'Authenticated account changed',
  'refund creation rejects a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.clear_expected_user_refund_request_state(
    security_tests.user_id('expected_other')
  )$$,
  '42501',
  'Authenticated account changed',
  'refund clearing rejects a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.record_expected_user_duplicate_refund_request_hint(
    security_tests.user_id('expected_other'),
    'ios',
    'settings',
    NULL
  )$$,
  '42501',
  'Authenticated account changed',
  'refund hints reject a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.confirm_expected_user_promo_redemption(
    security_tests.user_id('expected_other'),
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    NULL,
    NULL,
    NULL
  )$$,
  '42501',
  'Authenticated account changed',
  'promo confirmation rejects a replacement account token'
);
SELECT throws_ok(
  $$SELECT public.start_expected_user_trial(security_tests.user_id('expected_other'))$$,
  '42501',
  'Authenticated account changed',
  'trial start rejects a replacement account token'
);

SELECT * FROM finish();
ROLLBACK;
