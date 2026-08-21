DROP SCHEMA IF EXISTS security_tests CASCADE;
CREATE SCHEMA security_tests AUTHORIZATION postgres;

REVOKE ALL ON SCHEMA security_tests FROM PUBLIC;
GRANT USAGE ON SCHEMA security_tests TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION security_tests.user_id(user_alias text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT md5('domani-security-test:' || user_alias)::uuid;
$$;

CREATE OR REPLACE FUNCTION security_tests.create_supabase_user(user_alias text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  created_user_id uuid := security_tests.user_id(user_alias);
  created_email text := user_alias || '@security.test';
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    created_user_id,
    'authenticated',
    'authenticated',
    created_email,
    '',
    pg_catalog.now(),
    '{"provider":"google","providers":["google"]}'::jsonb,
    pg_catalog.jsonb_build_object('full_name', 'Security Test ' || user_alias),
    pg_catalog.now(),
    pg_catalog.now()
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.ensure_profile_exists_for_auth_user(created_user_id);
  RETURN created_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION security_tests.authenticate_as(user_alias text)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := security_tests.user_id(user_alias);
BEGIN
  PERFORM pg_catalog.set_config(
    'request.jwt.claim.sub',
    authenticated_user_id::text,
    true
  );
  PERFORM pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM pg_catalog.set_config(
    'request.jwt.claims',
    pg_catalog.jsonb_build_object(
      'sub', authenticated_user_id,
      'role', 'authenticated',
      'aal', 'aal1'
    )::text,
    true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION security_tests.user_id(text)
TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION security_tests.authenticate_as(text)
TO anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(1);
SELECT ok(true, 'security test helpers installed');
SELECT * FROM finish();
