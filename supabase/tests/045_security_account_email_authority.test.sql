BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(18);

SELECT security_tests.create_supabase_user('email_owner');
SELECT security_tests.create_supabase_user('email_other');

SELECT security_tests.authenticate_as('email_owner');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.schedule_current_user_account_deletion()$$,
  'an authenticated user can schedule their own deletion email event'
);

RESET ROLE;
SELECT is(
  (
    SELECT count(*)
    FROM public.account_email_events
    WHERE user_id = security_tests.user_id('email_owner')
      AND message_type = 'account_deletion'
      AND deletion_scheduled_for IS NOT NULL
  ),
  1::bigint,
  'deletion scheduling records one server-owned email event for that user'
);

SELECT is(
  (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_email_events'
      AND column_name = 'email'
  ),
  0::bigint,
  'the private event table never stores a recipient email address'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM public.account_email_events$$,
  '42501',
  'permission denied for table account_email_events',
  'authenticated clients cannot read account email events'
);

SELECT throws_ok(
  $$SELECT public.claim_account_email_delivery(security_tests.user_id('email_owner'), 'account_deletion')$$,
  '42501',
  'permission denied for function claim_account_email_delivery',
  'authenticated clients cannot claim email deliveries'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT is(
  (
    public.claim_account_email_delivery(
      security_tests.user_id('email_owner'),
      'account_deletion'
    )
  )->>'status',
  'claimed',
  'service code can claim the verified deletion event'
);

SELECT is(
  (
    public.claim_account_email_delivery(
      security_tests.user_id('email_owner'),
      'account_deletion'
    )
  )->>'status',
  'not_found',
  'the same event cannot be claimed twice'
);

SELECT lives_ok(
  $$
    SELECT public.complete_account_email_delivery(
      (
        SELECT id
        FROM public.account_email_events
        WHERE user_id = security_tests.user_id('email_owner')
          AND message_type = 'account_deletion'
      ),
      'provider-test-id'
    )
  $$,
  'service code can complete a claimed delivery'
);

RESET ROLE;
SELECT ok(
  (
    SELECT delivered_at IS NOT NULL AND provider_message_id = 'provider-test-id'
    FROM public.account_email_events
    WHERE user_id = security_tests.user_id('email_owner')
      AND message_type = 'account_deletion'
  ),
  'delivery completion is recorded without exposing recipient PII'
);

SELECT security_tests.authenticate_as('email_owner');
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.cancel_current_user_account_deletion()$$,
  'a pending deletion can be reactivated'
);

RESET ROLE;
SELECT is(
  (
    SELECT count(*)
    FROM public.account_email_events
    WHERE user_id = security_tests.user_id('email_owner')
      AND message_type = 'account_reactivation'
      AND deletion_scheduled_for IS NULL
  ),
  1::bigint,
  'reactivation records its own server-verified email event'
);

SET LOCAL ROLE service_role;
SELECT is(
  (
    public.claim_account_email_delivery(
      security_tests.user_id('email_owner'),
      'account_reactivation'
    )
  )->>'status',
  'claimed',
  'a different verified lifecycle message can be claimed immediately'
);

RESET ROLE;
SELECT security_tests.authenticate_as('email_owner');
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.schedule_current_user_account_deletion()$$,
  'the user can schedule deletion again after reactivation'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT is(
  (
    public.claim_account_email_delivery(
      security_tests.user_id('email_owner'),
      'account_deletion'
    )
  )->>'status',
  'rate_limited',
  'repeated delivery of the same message type is durably rate-limited'
);

RESET ROLE;
SELECT security_tests.authenticate_as('email_other');
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.cancel_current_user_account_deletion()$$,
  'P0002',
  'Pending deletion not found',
  'reactivation cannot manufacture an email event without a pending deletion'
);

RESET ROLE;
SELECT is(
  (
    SELECT count(*)
    FROM public.account_email_events
    WHERE user_id = security_tests.user_id('email_other')
  ),
  0::bigint,
  'a rejected reactivation creates no email event'
);

SET LOCAL ROLE service_role;
SELECT is(
  (
    public.claim_account_email_delivery(
      security_tests.user_id('email_other'),
      'account_reactivation'
    )
  )->>'status',
  'not_found',
  'service claims disclose no account details when no verified event exists'
);

SELECT is(
  (
    public.claim_account_email_delivery(
      security_tests.user_id('email_owner'),
      'unsupported_type'
    )
  )->>'status',
  'not_found',
  'unsupported message types fail without account disclosure'
);

SELECT * FROM finish();
ROLLBACK;
