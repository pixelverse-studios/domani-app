BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(17);

SELECT security_tests.create_supabase_user('owner');
SELECT security_tests.create_supabase_user('non_owner');

INSERT INTO public.tasks (id, user_id, title, position)
VALUES
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    security_tests.user_id('owner'),
    'Owner task',
    0
  ),
  (
    '20000000-0000-0000-0000-000000000002'::uuid,
    security_tests.user_id('non_owner'),
    'Non-owner task',
    0
  );

INSERT INTO public.user_categories (id, user_id, name, color, icon, position)
VALUES
  (
    '10000000-0000-0000-0000-000000000011'::uuid,
    security_tests.user_id('owner'),
    'Owner category',
    '#111111',
    'circle',
    0
  ),
  (
    '20000000-0000-0000-0000-000000000022'::uuid,
    security_tests.user_id('non_owner'),
    'Non-owner category',
    '#222222',
    'square',
    0
  );

INSERT INTO public.task_time_blocks (id, task_id, start_time, end_time)
VALUES (
  '10000000-0000-0000-0000-000000000101'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  '09:00'::time,
  '10:00'::time
);

SELECT security_tests.authenticate_as('owner');
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT id FROM public.profiles ORDER BY id$$,
  $$SELECT security_tests.user_id('owner')$$,
  'an authenticated owner sees only their profile'
);

SELECT results_eq(
  $$SELECT id FROM public.tasks ORDER BY id$$,
  $$VALUES ('10000000-0000-0000-0000-000000000001'::uuid)$$,
  'an authenticated owner sees only their task'
);

SELECT results_eq(
  $$
    UPDATE public.tasks
    SET title = 'Owner task updated'
    WHERE id = '10000000-0000-0000-0000-000000000001'::uuid
    RETURNING id
  $$,
  $$VALUES ('10000000-0000-0000-0000-000000000001'::uuid)$$,
  'an authenticated owner can update their task'
);

SELECT is_empty(
  $$
    UPDATE public.tasks
    SET title = 'Cross-user update'
    WHERE id = '20000000-0000-0000-0000-000000000002'::uuid
    RETURNING id
  $$,
  'an authenticated owner cannot update another user task'
);

SELECT is_empty(
  $$
    DELETE FROM public.tasks
    WHERE id = '20000000-0000-0000-0000-000000000002'::uuid
    RETURNING id
  $$,
  'an authenticated owner cannot delete another user task'
);

SELECT lives_ok(
  $$
    INSERT INTO public.user_categories (user_id, name, color, icon, position)
    VALUES (
      security_tests.user_id('owner'),
      'Owner-created category',
      '#333333',
      'triangle',
      1
    )
  $$,
  'an authenticated owner can insert their category'
);

SELECT is_empty(
  $$
    UPDATE public.user_categories
    SET name = 'Cross-user category update'
    WHERE id = '20000000-0000-0000-0000-000000000022'::uuid
    RETURNING id
  $$,
  'an authenticated owner cannot update another user category'
);

SELECT throws_ok(
  $$
    UPDATE public.user_categories
    SET user_id = security_tests.user_id('non_owner')
    WHERE id = '10000000-0000-0000-0000-000000000011'::uuid
  $$,
  '42501',
  'new row violates row-level security policy for table "user_categories"',
  'an authenticated owner cannot reassign their category'
);

SELECT throws_ok(
  $$
    UPDATE public.task_time_blocks
    SET task_id = '20000000-0000-0000-0000-000000000002'::uuid
    WHERE id = '10000000-0000-0000-0000-000000000101'::uuid
  $$,
  '42501',
  'new row violates row-level security policy for table "task_time_blocks"',
  'an authenticated owner cannot move a time block to another user task'
);

RESET ROLE;
SELECT security_tests.authenticate_as('non_owner');
SET LOCAL ROLE authenticated;

SELECT results_eq(
  $$SELECT id FROM public.profiles ORDER BY id$$,
  $$SELECT security_tests.user_id('non_owner')$$,
  'an authenticated non-owner sees only their profile'
);

SELECT is_empty(
  $$
    SELECT id
    FROM public.user_categories
    WHERE id = '10000000-0000-0000-0000-000000000011'::uuid
  $$,
  'an authenticated non-owner cannot read the owner category'
);

SELECT is_empty(
  $$
    UPDATE public.profiles
    SET full_name = 'Cross-user profile update'
    WHERE id = security_tests.user_id('owner')
    RETURNING id
  $$,
  'an authenticated non-owner cannot update the owner profile'
);

SELECT is_empty(
  $$
    DELETE FROM public.user_categories
    WHERE id = '10000000-0000-0000-0000-000000000011'::uuid
    RETURNING id
  $$,
  'an authenticated non-owner cannot delete the owner category'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  (SELECT count(*) FROM public.profiles),
  2::bigint,
  'service role can read both test profiles'
);

SELECT is(
  (SELECT count(*) FROM public.tasks),
  2::bigint,
  'service role can read both test tasks'
);

SELECT lives_ok(
  $$SELECT count(*) FROM public.profiles_dashboard$$,
  'service role can execute the private profiles dashboard query'
);

RESET ROLE;
SELECT security_tests.authenticate_as('owner');
SET LOCAL ROLE authenticated;

SELECT todo_start(
  'DEV-1135 makes tier and purchase state server-authoritative'
);
SELECT is_empty(
  $$
    UPDATE public.profiles
    SET
      tier = 'lifetime'::public.tier,
      purchased_at = now(),
      refunded_at = NULL,
      revenuecat_user_id = 'spoofed-client-value'
    WHERE id = security_tests.user_id('owner')
    RETURNING id
  $$,
  'an authenticated client cannot spoof entitlement state'
);
SELECT todo_end();

SELECT * FROM finish();
ROLLBACK;
