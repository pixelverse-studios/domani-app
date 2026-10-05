-- Current release schema contract required by the PVS API.
DO $$
DECLARE
  table_name text;
  function_name text;
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
END;
$$;
