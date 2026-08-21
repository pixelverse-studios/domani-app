BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(17);

SELECT security_tests.create_supabase_user('rpc_owner');
SELECT security_tests.create_supabase_user('rpc_non_owner');

SELECT security_tests.authenticate_as('rpc_owner');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.schedule_account_deletion(security_tests.user_id('rpc_owner'))$$,
  'an authenticated user can schedule their account deletion'
);

RESET ROLE;
SELECT ok(
  (
    SELECT deletion_scheduled_for IS NOT NULL
    FROM public.profiles
    WHERE id = security_tests.user_id('rpc_owner')
  ),
  'account deletion scheduling updates only the current profile'
);

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.cancel_account_deletion(security_tests.user_id('rpc_owner'))$$,
  'an authenticated user can cancel their account deletion'
);

RESET ROLE;
SELECT ok(
  (
    SELECT deleted_at IS NULL AND deletion_scheduled_for IS NULL
    FROM public.profiles
    WHERE id = security_tests.user_id('rpc_owner')
  ),
  'account deletion cancellation clears the current profile schedule'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.schedule_account_deletion(security_tests.user_id('rpc_non_owner'))$$,
  '42501',
  'Not authorized',
  'schedule_account_deletion rejects a spoofed user id'
);

SELECT throws_ok(
  $$SELECT public.cancel_account_deletion(security_tests.user_id('rpc_non_owner'))$$,
  '42501',
  'Not authorized',
  'cancel_account_deletion rejects a spoofed user id'
);

SELECT throws_ok(
  $$SELECT public.get_favorite_category_ids(security_tests.user_id('rpc_non_owner'))$$,
  '42501',
  'Not authorized',
  'get_favorite_category_ids rejects a spoofed user id'
);

SELECT throws_ok(
  $$SELECT public.get_user_cohort(security_tests.user_id('rpc_non_owner'))$$,
  '42501',
  'Not authorized',
  'get_user_cohort rejects a spoofed user id'
);

SELECT throws_ok(
  $$SELECT public.get_user_role_level(security_tests.user_id('rpc_non_owner'))$$,
  '42501',
  'Not authorized',
  'get_user_role_level rejects a spoofed user id'
);

SELECT throws_ok(
  $$
    SELECT public.has_permission(
      security_tests.user_id('rpc_non_owner'),
      '*',
      'read'::public.admin_action
    )
  $$,
  '42501',
  'Not authorized',
  'has_permission rejects a spoofed user id'
);

SELECT throws_ok(
  $$
    SELECT public.update_category_positions(
      security_tests.user_id('rpc_non_owner'),
      '[]'::jsonb
    )
  $$,
  '42501',
  'Not authorized',
  'update_category_positions rejects a spoofed user id'
);

SELECT throws_ok(
  $$
    SELECT public.update_favorite_categories(
      security_tests.user_id('rpc_non_owner'),
      '[]'::jsonb
    )
  $$,
  '42501',
  'Not authorized',
  'update_favorite_categories rejects a spoofed user id'
);

SELECT is(
  public.get_user_tier(security_tests.user_id('rpc_non_owner')),
  NULL::text,
  'get_user_tier does not disclose another user tier'
);

SELECT is(
  (public.ensure_current_user_profile()).id,
  security_tests.user_id('rpc_owner'),
  'profile recovery is bound to the authenticated user'
);

SELECT is(
  (public.mark_current_user_refund_request_pending('ios', 'security-test', NULL)).user_id,
  security_tests.user_id('rpc_owner'),
  'refund state mutation is bound to the authenticated user'
);

SELECT lives_ok(
  $$SELECT public.clear_current_user_refund_request_state()$$,
  'the authenticated user can clear their refund state'
);

RESET ROLE;
SELECT is(
  (
    SELECT count(*)
    FROM public.purchase_refund_states
    WHERE user_id = security_tests.user_id('rpc_owner')
  ),
  0::bigint,
  'refund state clearing affects the authenticated user row'
);

SELECT * FROM finish();
ROLLBACK;
