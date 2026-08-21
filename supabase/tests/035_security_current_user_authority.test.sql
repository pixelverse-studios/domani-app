BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(19);

SELECT security_tests.create_supabase_user('current_owner');
SELECT security_tests.create_supabase_user('current_non_owner');

INSERT INTO public.user_categories (id, user_id, name, color, icon, position)
VALUES
  (
    '30000000-0000-0000-0000-000000000031'::uuid,
    security_tests.user_id('current_owner'),
    'Current owner category',
    '#333333',
    'circle',
    0
  ),
  (
    '40000000-0000-0000-0000-000000000042'::uuid,
    security_tests.user_id('current_non_owner'),
    'Current non-owner category',
    '#444444',
    'square',
    0
  );

SELECT security_tests.authenticate_as('current_owner');
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.schedule_current_user_account_deletion()$$,
  'current-user scheduling succeeds without a caller-supplied user id'
);

RESET ROLE;
SELECT results_eq(
  $$
    SELECT id
    FROM public.profiles
    WHERE deletion_scheduled_for IS NOT NULL
    ORDER BY id
  $$,
  $$SELECT security_tests.user_id('current_owner')$$,
  'current-user scheduling changes only the authenticated profile'
);

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.cancel_current_user_account_deletion()$$,
  'current-user cancellation succeeds without a caller-supplied user id'
);

RESET ROLE;
SELECT is(
  (
    SELECT deletion_scheduled_for IS NULL AND deleted_at IS NULL
    FROM public.profiles
    WHERE id = security_tests.user_id('current_owner')
  ),
  true,
  'current-user cancellation clears only the authenticated profile schedule'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.schedule_account_deletion(security_tests.user_id('current_non_owner'))$$,
  '42501',
  'Not authorized',
  'legacy scheduling rejects a spoofed user id'
);
SELECT throws_ok(
  $$SELECT public.cancel_account_deletion(security_tests.user_id('current_non_owner'))$$,
  '42501',
  'Not authorized',
  'legacy cancellation rejects a spoofed user id'
);
SELECT lives_ok(
  $$SELECT public.schedule_account_deletion(security_tests.user_id('current_owner'))$$,
  'legacy same-user scheduling remains backward-compatible'
);
SELECT lives_ok(
  $$SELECT public.cancel_account_deletion(security_tests.user_id('current_owner'))$$,
  'legacy same-user cancellation remains backward-compatible'
);

SELECT lives_ok(
  $$
    SELECT public.update_current_user_favorite_categories(
      '["30000000-0000-0000-0000-000000000031"]'::jsonb
    )
  $$,
  'current-user favorite mutation succeeds'
);

RESET ROLE;
SELECT results_eq(
  $$
    SELECT id
    FROM public.user_categories
    WHERE is_favorite
    ORDER BY id
  $$,
  $$VALUES ('30000000-0000-0000-0000-000000000031'::uuid)$$,
  'current-user favorite mutation cannot select another user category'
);

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$
    SELECT public.update_current_user_category_positions(
      '[
        {"id":"30000000-0000-0000-0000-000000000031","position":7,"isSystem":false},
        {"id":"40000000-0000-0000-0000-000000000042","position":9,"isSystem":false}
      ]'::jsonb
    )
  $$,
  'current-user category reorder succeeds'
);

RESET ROLE;
SELECT results_eq(
  $$SELECT id, position FROM public.user_categories ORDER BY id$$,
  $$
    VALUES
      ('30000000-0000-0000-0000-000000000031'::uuid, 7),
      ('40000000-0000-0000-0000-000000000042'::uuid, 0)
  $$,
  'current-user reorder ignores another user category id'
);

SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$
    SELECT public.increment_current_user_category_usage(
      NULL,
      '30000000-0000-0000-0000-000000000031'::uuid
    )
  $$,
  'current-user usage increment accepts an owned category'
);
SELECT lives_ok(
  $$
    SELECT public.increment_current_user_category_usage(
      NULL,
      '40000000-0000-0000-0000-000000000042'::uuid
    )
  $$,
  'current-user usage increment safely ignores another user category'
);

RESET ROLE;
SELECT results_eq(
  $$SELECT id, usage_count FROM public.user_categories ORDER BY id$$,
  $$
    VALUES
      ('30000000-0000-0000-0000-000000000031'::uuid, 1),
      ('40000000-0000-0000-0000-000000000042'::uuid, 0)
  $$,
  'current-user usage mutation cannot increment another user category'
);

SET LOCAL ROLE authenticated;
SELECT is(
  public.get_current_user_tier(),
  public.get_user_tier(security_tests.user_id('current_owner')),
  'current tier and validated legacy tier paths agree'
);
SELECT is(
  public.get_current_user_cohort(),
  public.get_user_cohort(security_tests.user_id('current_owner')),
  'current cohort and validated legacy cohort paths agree'
);
SELECT is(
  public.get_current_user_favorite_category_ids(),
  public.get_favorite_category_ids(security_tests.user_id('current_owner')),
  'current favorites and validated legacy favorites paths agree'
);

SELECT throws_ok(
  $$SELECT public.get_user_cohort(security_tests.user_id('current_non_owner'))$$,
  '42501',
  'Not authorized',
  'legacy cohort lookup rejects a spoofed user id'
);

SELECT * FROM finish();
ROLLBACK;
