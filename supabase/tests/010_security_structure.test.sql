BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(23);

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
    WITH expected (
      relation_name,
      anon_privileges,
      authenticated_privileges
    ) AS (
      VALUES
        ('admin_audit_log', ARRAY[]::text[], ARRAY[]::text[]),
        ('admin_sessions', ARRAY[]::text[], ARRAY[]::text[]),
        ('app_config', ARRAY['SELECT']::text[], ARRAY['SELECT']::text[]),
        ('beta_feedback', ARRAY[]::text[], ARRAY['SELECT', 'INSERT']::text[]),
        ('campaign_recipients', ARRAY[]::text[], ARRAY[]::text[]),
        ('email_campaigns', ARRAY[]::text[], ARRAY[]::text[]),
        ('email_templates', ARRAY[]::text[], ARRAY[]::text[]),
        ('email_unsubscribes', ARRAY[]::text[], ARRAY[]::text[]),
        ('meta_app_event_claims', ARRAY[]::text[], ARRAY[]::text[]),
        ('profiles', ARRAY[]::text[], ARRAY['SELECT']::text[]),
        ('promo_campaigns', ARRAY[]::text[], ARRAY[]::text[]),
        ('promo_codes', ARRAY[]::text[], ARRAY[]::text[]),
        ('promo_redemption_attempts', ARRAY[]::text[], ARRAY[]::text[]),
        ('purchase_refund_states', ARRAY[]::text[], ARRAY['SELECT']::text[]),
        ('release_audit_events', ARRAY[]::text[], ARRAY[]::text[]),
        ('release_cache_invalidation_jobs', ARRAY[]::text[], ARRAY[]::text[]),
        ('release_conversion_runs', ARRAY[]::text[], ARRAY[]::text[]),
        ('release_notes', ARRAY[]::text[], ARRAY[]::text[]),
        ('release_prds', ARRAY[]::text[], ARRAY[]::text[]),
        ('releases', ARRAY[]::text[], ARRAY[]::text[]),
        ('revenuecat_webhook_events', ARRAY[]::text[], ARRAY[]::text[]),
        ('support_requests', ARRAY[]::text[], ARRAY['SELECT', 'INSERT']::text[]),
        ('system_categories', ARRAY['SELECT']::text[], ARRAY['SELECT']::text[]),
        ('task_time_blocks', ARRAY[]::text[], ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
        ('tasks', ARRAY[]::text[], ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
        ('user_categories', ARRAY[]::text[], ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
        ('user_category_preferences', ARRAY[]::text[], ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]),
        ('waitlist', ARRAY['INSERT']::text[], ARRAY['INSERT']::text[]),
        ('profiles_dashboard', ARRAY[]::text[], ARRAY[]::text[])
    ),
    actual AS (
      SELECT
        relation.relname AS relation_name,
        ARRAY(
          SELECT privilege_name
          FROM unnest(ARRAY[
            'SELECT',
            'INSERT',
            'UPDATE',
            'DELETE',
            'TRUNCATE',
            'REFERENCES',
            'TRIGGER'
          ]) AS privilege_name
          WHERE pg_catalog.has_table_privilege(
            'anon',
            relation.oid,
            privilege_name
          )
        ) AS anon_privileges,
        ARRAY(
          SELECT privilege_name
          FROM unnest(ARRAY[
            'SELECT',
            'INSERT',
            'UPDATE',
            'DELETE',
            'TRUNCATE',
            'REFERENCES',
            'TRIGGER'
          ]) AS privilege_name
          WHERE pg_catalog.has_table_privilege(
            'authenticated',
            relation.oid,
            privilege_name
          )
        ) AS authenticated_privileges
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relkind IN ('r', 'p', 'v', 'm')
    )
    SELECT
      COALESCE(actual.relation_name, expected.relation_name) || ':' ||
      COALESCE(actual.anon_privileges::text, '<missing>') || ':' ||
      COALESCE(expected.anon_privileges::text, '<unmapped>') || ':' ||
      COALESCE(actual.authenticated_privileges::text, '<missing>') || ':' ||
      COALESCE(expected.authenticated_privileges::text, '<unmapped>')
    FROM actual
    FULL JOIN expected USING (relation_name)
    WHERE actual.relation_name IS NULL
      OR expected.relation_name IS NULL
      OR actual.anon_privileges IS DISTINCT FROM expected.anon_privileges
      OR actual.authenticated_privileges IS DISTINCT FROM expected.authenticated_privileges
  $$,
  'every public relation matches the explicit client grant matrix'
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

SELECT is_empty(
  $$
    SELECT procedure.oid::regprocedure::text
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(procedure.proconfig, ARRAY[]::text[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  $$,
  'every public security-definer function pins its search path'
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
        ('public.apply_verified_revenuecat_lifetime_access(uuid,timestamp with time zone,text,uuid,uuid,uuid)'),
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
        ('public.cancel_current_user_account_deletion()'),
        ('public.ensure_current_user_profile()'),
        ('public.get_current_user_favorite_category_ids()'),
        ('public.get_current_user_tier()'),
        ('public.has_current_user_access()'),
        ('public.increment_current_user_category_usage(uuid,uuid)'),
        ('public.schedule_current_user_account_deletion()'),
        ('public.start_current_user_trial()'),
        ('public.update_current_user_category_positions(jsonb)'),
        ('public.update_current_user_favorite_categories(jsonb)')
    ) AS client_function(signature)
    WHERE NOT pg_catalog.has_function_privilege(
      'authenticated',
      signature,
      'EXECUTE'
    )
  $$,
  'authenticated clients retain intended current-user RPC access'
);

SELECT is_empty(
  $$
    SELECT signature
    FROM (
      VALUES
        ('public.cancel_account_deletion(uuid)'),
        ('public.get_favorite_category_ids(uuid)'),
        ('public.get_user_cohort(uuid)'),
        ('public.get_user_tier(uuid)'),
        ('public.increment_category_usage(uuid,uuid,uuid)'),
        ('public.schedule_account_deletion(uuid)'),
        ('public.update_category_positions(uuid,jsonb)'),
        ('public.update_favorite_categories(uuid,jsonb)')
    ) AS compatibility_function(signature)
    WHERE NOT pg_catalog.has_function_privilege(
      'authenticated',
      signature,
      'EXECUTE'
    )
  $$,
  'authenticated clients retain validated legacy RPC adapters'
);

SELECT is_empty(
  $$
    SELECT procedure.oid::regprocedure::text
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
      AND procedure.oid IN (
        'public.cancel_account_deletion(uuid)'::regprocedure,
        'public.get_favorite_category_ids(uuid)'::regprocedure,
        'public.get_user_cohort(uuid)'::regprocedure,
        'public.get_user_tier(uuid)'::regprocedure,
        'public.increment_category_usage(uuid,uuid,uuid)'::regprocedure,
        'public.schedule_account_deletion(uuid)'::regprocedure,
        'public.update_category_positions(uuid,jsonb)'::regprocedure,
        'public.update_favorite_categories(uuid,jsonb)'::regprocedure
      )
  $$,
  'legacy user-id adapters do not execute with definer authority'
);

SELECT is_empty(
  $$
    SELECT signature
    FROM (
      VALUES
        ('public.get_user_role_level(uuid)'),
        ('public.has_permission(uuid,text,public.admin_action)'),
        ('public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)')
    ) AS admin_function(signature)
    WHERE pg_catalog.has_function_privilege(
      'authenticated',
      signature,
      'EXECUTE'
    )
  $$,
  'authenticated clients cannot execute unconfigured admin RPCs'
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
        ('public.apply_verified_revenuecat_lifetime_access(uuid,timestamp with time zone,text,uuid,uuid,uuid)'),
        ('public.ensure_profile_exists_for_auth_user(uuid)'),
        ('public.sync_auth_user_to_profile(uuid)')
    ) AS service_function(signature)
    WHERE NOT pg_catalog.has_function_privilege(
      'service_role',
      signature,
      'EXECUTE'
    )
  $$,
  'service role retains intended maintenance and destructive entrypoints'
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
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'service role retains the RevenueCat webhook path'
);

SELECT is_empty(
  $$
    SELECT role_name || ':' || relation_name || ':' || privilege_name
    FROM unnest(ARRAY['anon', 'authenticated']) AS role_name
    CROSS JOIN unnest(ARRAY[
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

SELECT ok(
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.profiles',
    'SELECT'
  ),
  'authenticated clients retain profile reads used by the app'
);

SELECT is_empty(
  $$
    SELECT column_name
    FROM unnest(ARRAY[
      'auto_sort_categories',
      'avatar_url',
      'expo_push_token',
      'full_name',
      'last_active_at',
      'notification_onboarding_completed',
      'planning_reminder_enabled',
      'planning_reminder_time',
      'push_token_invalid_at',
      'reminder_shortcuts',
      'timezone',
      'tutorial_completed_at'
    ]) AS column_name
    WHERE EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute
      WHERE attrelid = 'public.profiles'::regclass
        AND attname = column_name
        AND NOT attisdropped
    )
      AND NOT pg_catalog.has_column_privilege(
        'authenticated',
        'public.profiles',
        column_name,
        'UPDATE'
      )
  $$,
  'authenticated clients retain update access only for intended profile fields'
);

SELECT is_empty(
  $$
    SELECT column_name
    FROM unnest(ARRAY[
      'id',
      'email',
      'tier',
      'trial_started_at',
      'trial_ends_at',
      'purchased_at',
      'refunded_at',
      'revenuecat_user_id',
      'signup_cohort',
      'signup_method',
      'deletion_scheduled_for',
      'deleted_at'
    ]) AS column_name
    WHERE pg_catalog.has_column_privilege(
      'authenticated',
      'public.profiles',
      column_name,
      'UPDATE'
    )
  $$,
  'authenticated clients cannot update server-authoritative profile fields'
);

SELECT ok(
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.user_categories',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'authenticated clients retain the category access used by the app'
);

SELECT * FROM finish();
ROLLBACK;
