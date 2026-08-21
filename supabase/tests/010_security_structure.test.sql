BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(15);

SELECT is_empty(
  $$
    SELECT namespace.nspname || '.' || relation.relname
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND NOT relation.relrowsecurity
  $$,
  'every public table has row-level security enabled'
);

SELECT is_empty(
  $$
    SELECT procedure.oid::regprocedure::text
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(
          COALESCE(
            procedure.proacl,
            pg_catalog.acldefault('f', procedure.proowner)
          )
        ) AS privilege
        WHERE privilege.grantee = 0
          AND privilege.privilege_type = 'EXECUTE'
      )
  $$,
  'public security-definer functions do not inherit PUBLIC execute access'
);

SELECT is_empty(
  $$
    SELECT procedure.oid::regprocedure::text
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
      AND pg_catalog.has_function_privilege(
        'anon',
        procedure.oid,
        'EXECUTE'
      )
  $$,
  'anonymous clients cannot execute public security-definer functions'
);

SELECT is(
  pg_catalog.has_schema_privilege('anon', 'public', 'CREATE'),
  false,
  'anonymous clients cannot create objects in public'
);

SELECT is(
  pg_catalog.has_schema_privilege('authenticated', 'public', 'CREATE'),
  false,
  'authenticated clients cannot create objects in public'
);

SELECT is_empty(
  $$
    SELECT signature
    FROM (
      VALUES
        ('public.cleanup_expired_sessions()'),
        ('public.confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text)'),
        ('public.delete_expired_accounts()'),
        ('public.delete_user_by_email(text)'),
        ('public.ensure_profile_exists_for_auth_user(uuid)'),
        ('public.handle_new_user()'),
        ('public.sync_auth_user_to_profile(uuid)')
    ) AS service_function(signature)
    WHERE pg_catalog.has_function_privilege(
      'authenticated',
      signature,
      'EXECUTE'
    )
  $$,
  'authenticated clients cannot execute maintenance or service functions'
);

SELECT is_empty(
  $$
    SELECT signature
    FROM (
      VALUES
        ('public.cancel_account_deletion(uuid)'),
        ('public.ensure_current_user_profile()'),
        ('public.get_favorite_category_ids(uuid)'),
        ('public.schedule_account_deletion(uuid)'),
        ('public.update_category_positions(uuid,jsonb)'),
        ('public.update_favorite_categories(uuid,jsonb)')
    ) AS client_function(signature)
    WHERE NOT pg_catalog.has_function_privilege(
      'authenticated',
      signature,
      'EXECUTE'
    )
  $$,
  'authenticated clients retain intended current-user RPC access'
);

SELECT is(
  pg_catalog.has_table_privilege(
    'anon',
    'public.profiles_dashboard',
    'SELECT'
  ),
  false,
  'anonymous clients cannot read profiles_dashboard'
);

SELECT is(
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.profiles_dashboard',
    'SELECT'
  ),
  false,
  'authenticated clients cannot read profiles_dashboard'
);

SELECT is_empty(
  $$
    SELECT role_name || ':' || privilege_name
    FROM unnest(ARRAY['anon', 'authenticated']) AS role_name
    CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS privilege_name
    WHERE pg_catalog.has_table_privilege(
      role_name,
      'public.revenuecat_webhook_events',
      privilege_name
    )
  $$,
  'client roles have no direct RevenueCat webhook table privileges'
);

SELECT ok(
  pg_catalog.has_table_privilege(
    'service_role',
    'public.profiles_dashboard',
    'SELECT'
  ),
  'service role can read profiles_dashboard'
);

SELECT ok(
  pg_catalog.has_table_privilege(
    'service_role',
    'public.revenuecat_webhook_events',
    'SELECT,INSERT,UPDATE'
  ),
  'service role retains the RevenueCat webhook path'
);

SELECT is_empty(
  $$
    SELECT role_name || ':' || relation_name || ':' || privilege_name
    FROM unnest(ARRAY['anon', 'authenticated']) AS role_name
    CROSS JOIN unnest(ARRAY[
      'waitlist',
      'email_templates',
      'email_campaigns',
      'campaign_recipients',
      'email_unsubscribes',
      'admin_audit_log',
      'admin_sessions',
      'promo_campaigns',
      'promo_codes',
      'promo_redemption_attempts',
      'meta_app_event_claims'
    ]) AS relation_name
    CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS privilege_name
    WHERE pg_catalog.has_table_privilege(
      role_name,
      pg_catalog.format('public.%I', relation_name),
      privilege_name
    )
  $$,
  'client roles have no privileges on private operational tables'
);

SELECT todo_start(
  'DEV-1134 makes grants on every exposed application table explicit'
);
SELECT ok(
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.profiles',
    'SELECT,UPDATE'
  ),
  'authenticated clients retain the profile access used by the app'
);

SELECT ok(
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.user_categories',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'authenticated clients retain the category access used by the app'
);
SELECT todo_end();

SELECT * FROM finish();
ROLLBACK;
