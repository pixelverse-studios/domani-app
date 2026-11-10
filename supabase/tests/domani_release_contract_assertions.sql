-- Current release schema contract required by the PVS API.
DO $$
DECLARE
  table_name text;
  function_name text;
  expected record;
  function_oid oid;
  actual_names text[];
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'releases', 'release_prds', 'release_conversion_runs',
    'release_notes', 'release_audit_events', 'release_cache_invalidation_jobs'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name
        AND c.relkind = 'r' AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'missing private release table with RLS: %', table_name;
    END IF;
    IF has_table_privilege('anon', 'public.' || table_name, 'SELECT')
       OR has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
       OR NOT has_table_privilege('service_role', 'public.' || table_name, 'SELECT') THEN
      RAISE EXCEPTION 'invalid release table grants: %', table_name;
    END IF;
  END LOOP;

  FOREACH function_name IN ARRAY ARRAY[
    'list_public_domani_releases', 'import_domani_release_markdown',
    'convert_domani_release_markdown', 'get_admin_domani_release',
    'list_admin_domani_releases', 'mutate_admin_domani_release'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
        AND has_function_privilege('service_role', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
        AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ) THEN
      RAISE EXCEPTION 'missing service-only release RPC: %', function_name;
    END IF;
  END LOOP;

  -- PostgREST resolves RPCs by both function name and named argument types.
  -- These are the release entrypoints the PVS server actually calls.
  FOR expected IN SELECT * FROM (VALUES
    (
      'public.list_public_domani_releases_v2(text,public.release_platform,integer,text,integer,integer,integer,uuid)',
      ARRAY['p_collection','p_platform','p_page_limit','p_cursor_primary','p_cursor_version_major','p_cursor_version_minor','p_cursor_version_patch','p_cursor_id']::text[]
    ),
    (
      'public.mutate_admin_domani_release_v2(text,uuid,bigint,jsonb,uuid,text,public.dashboard_role,text)',
      ARRAY['p_operation','p_release_id','p_primary_if_match','p_payload','p_actor_user_id','p_actor_email','p_actor_role','p_request_id']::text[]
    ),
    (
      'public.save_admin_domani_release_editor(uuid,bigint,jsonb,uuid,text,public.dashboard_role,text)',
      ARRAY['p_release_id','p_primary_if_match','p_payload','p_actor_user_id','p_actor_email','p_actor_role','p_request_id']::text[]
    ),
    (
      'public.set_admin_domani_release_visibility(text,uuid,bigint,jsonb,uuid,text,public.dashboard_role,text)',
      ARRAY['p_operation','p_release_id','p_primary_if_match','p_payload','p_actor_user_id','p_actor_email','p_actor_role','p_request_id']::text[]
    )
  ) AS required(signature, argument_names) LOOP
    function_oid := to_regprocedure(expected.signature);
    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'missing PVS release RPC signature: %', expected.signature;
    END IF;
    SELECT proargnames INTO actual_names FROM pg_proc WHERE oid = function_oid;
    IF actual_names[1:array_length(expected.argument_names, 1)] IS DISTINCT FROM expected.argument_names
       OR NOT has_function_privilege('service_role', function_oid, 'EXECUTE')
       OR has_function_privilege('anon', function_oid, 'EXECUTE')
       OR has_function_privilege('authenticated', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'invalid PVS release RPC arguments or grants: %', expected.signature;
    END IF;
  END LOOP;
END;
$$;

SET ROLE service_role;
SELECT count(*) FROM public.list_public_domani_releases_v2(p_collection => 'changelog');
RESET ROLE;
