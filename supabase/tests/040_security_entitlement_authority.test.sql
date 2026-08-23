BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(25);

SELECT security_tests.create_supabase_user('entitlement_owner');
SELECT security_tests.create_supabase_user('entitlement_other');

SELECT security_tests.authenticate_as('entitlement_owner');
SET LOCAL ROLE authenticated;

SELECT is(
  public.has_current_user_access(),
  false,
  'a new pre-trial profile has no server-authorized task access'
);

SELECT throws_ok(
  $$
    UPDATE public.profiles
    SET
      tier = 'lifetime'::public.tier,
      purchased_at = now(),
      revenuecat_user_id = 'forged-client-id'
    WHERE id = security_tests.user_id('entitlement_owner')
  $$,
  '42501',
  'permission denied for table profiles',
  'an authenticated client cannot forge lifetime access or RevenueCat identity'
);

SELECT results_eq(
  $$
    UPDATE public.profiles
    SET full_name = 'Safe profile edit'
    WHERE id = security_tests.user_id('entitlement_owner')
    RETURNING full_name
  $$,
  $$VALUES ('Safe profile edit'::text)$$,
  'an authenticated client can still update an approved profile field'
);

SELECT throws_ok(
  $$
    INSERT INTO public.tasks (user_id, title, position)
    VALUES (security_tests.user_id('entitlement_owner'), 'Blocked pre-trial task', 0)
  $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'pre-trial users cannot create tasks'
);

SELECT lives_ok(
  $$SELECT public.start_current_user_trial()$$,
  'the authenticated user can atomically start their trial'
);

SELECT ok(
  (
    SELECT
      tier = 'trialing'::public.tier
      AND trial_started_at IS NOT NULL
      AND trial_ends_at = trial_started_at + interval '14 days'
    FROM public.profiles
    WHERE id = security_tests.user_id('entitlement_owner')
  ),
  'trial tier and timestamps are assigned together by the server'
);

SELECT is(
  public.has_current_user_access(),
  true,
  'a current server-managed trial grants task access'
);

SELECT lives_ok(
  $$SELECT public.start_current_user_trial()$$,
  'repeating trial start while active is idempotent'
);

SELECT lives_ok(
  $$
    INSERT INTO public.tasks (id, user_id, title, position)
    VALUES (
      '50000000-0000-0000-0000-000000000001'::uuid,
      security_tests.user_id('entitlement_owner'),
      'Active trial task',
      0
    )
  $$,
  'an active trial can create tasks normally'
);

SELECT lives_ok(
  $$
    INSERT INTO public.task_time_blocks (id, task_id, start_time, end_time)
    VALUES (
      '50000000-0000-0000-0000-000000000011'::uuid,
      '50000000-0000-0000-0000-000000000001'::uuid,
      '09:00'::time,
      '10:00'::time
    )
  $$,
  'an active trial can create task time blocks normally'
);

RESET ROLE;
UPDATE public.profiles
SET trial_ends_at = now() - interval '1 minute'
WHERE id = security_tests.user_id('entitlement_owner');
SET LOCAL ROLE authenticated;

SELECT is(
  public.has_current_user_access(),
  false,
  'an expired trial loses server-authorized task access immediately'
);

SELECT throws_ok(
  $$
    INSERT INTO public.tasks (user_id, title, position)
    VALUES (security_tests.user_id('entitlement_owner'), 'Blocked expired task', 1)
  $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'an expired trial cannot create tasks'
);

SELECT is_empty(
  $$
    UPDATE public.tasks
    SET title = 'Blocked expired update'
    WHERE id = '50000000-0000-0000-0000-000000000001'::uuid
    RETURNING id
  $$,
  'an expired trial cannot update retained tasks'
);

SELECT is_empty(
  $$
    DELETE FROM public.tasks
    WHERE id = '50000000-0000-0000-0000-000000000001'::uuid
    RETURNING id
  $$,
  'an expired trial cannot delete retained tasks'
);

SELECT is_empty(
  $$
    UPDATE public.task_time_blocks
    SET start_time = '08:00'::time
    WHERE id = '50000000-0000-0000-0000-000000000011'::uuid
    RETURNING id
  $$,
  'an expired trial cannot mutate retained task time blocks'
);

SELECT throws_ok(
  $$SELECT public.start_current_user_trial()$$,
  'P0001',
  'Trial has already been used',
  'an expired one-time trial cannot be restarted'
);

SELECT throws_ok(
  $$
    SELECT public.apply_verified_revenuecat_lifetime_access(
      security_tests.user_id('entitlement_owner'),
      now(),
      'domani_lifetime',
      NULL,
      NULL,
      NULL
    )
  $$,
  '42501',
  'permission denied for function apply_verified_revenuecat_lifetime_access',
  'authenticated clients cannot execute the verified lifetime grant operation'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$
    SELECT public.apply_verified_revenuecat_lifetime_access(
      security_tests.user_id('entitlement_owner'),
      '2026-08-20 12:00:00+00'::timestamptz,
      'domani_lifetime',
      NULL,
      NULL,
      NULL
    )
  $$,
  'the service role can apply verified RevenueCat lifetime evidence'
);

SELECT throws_ok(
  $$
    SELECT public.apply_verified_revenuecat_lifetime_access(
      security_tests.user_id('entitlement_other'),
      now(),
      'unknown_product',
      NULL,
      NULL,
      NULL
    )
  $$,
  '22023',
  'Unrecognized lifetime product',
  'the service operation rejects unrecognized products'
);

RESET ROLE;
SELECT security_tests.authenticate_as('entitlement_owner');
SET LOCAL ROLE authenticated;

SELECT is(
  public.has_current_user_access(),
  true,
  'verified unrefunded lifetime evidence grants task access'
);

SELECT ok(
  (
    SELECT
      tier = 'lifetime'::public.tier
      AND purchased_at = '2026-08-20 12:00:00+00'::timestamptz
      AND refunded_at IS NULL
      AND revenuecat_user_id = security_tests.user_id('entitlement_owner')::text
    FROM public.profiles
    WHERE id = security_tests.user_id('entitlement_owner')
  ),
  'the verified grant records only server-derived lifetime state and identity'
);

SELECT results_eq(
  $$
    UPDATE public.tasks
    SET title = 'Verified lifetime update'
    WHERE id = '50000000-0000-0000-0000-000000000001'::uuid
    RETURNING id
  $$,
  $$VALUES ('50000000-0000-0000-0000-000000000001'::uuid)$$,
  'a verified lifetime user can resume normal task writes'
);

RESET ROLE;
UPDATE public.profiles
SET refunded_at = now()
WHERE id = security_tests.user_id('entitlement_owner');
SET LOCAL ROLE authenticated;

SELECT is(
  public.has_current_user_access(),
  false,
  'a refund revokes server-authorized task access'
);

SELECT throws_ok(
  $$
    INSERT INTO public.tasks (user_id, title, position)
    VALUES (security_tests.user_id('entitlement_owner'), 'Blocked refunded task', 2)
  $$,
  '42501',
  'new row violates row-level security policy for table "tasks"',
  'a refunded user cannot create tasks'
);

RESET ROLE;
SELECT is(
  (
    SELECT tier
    FROM public.profiles
    WHERE id = security_tests.user_id('entitlement_other')
  ),
  'none'::public.tier,
  'verified access for one account does not change another account'
);

SELECT * FROM finish();
ROLLBACK;
