-- DEV-1418 compatibility phase. Pin the legacy routines identified by the
-- prior security audit without replacing their bodies or changing EXECUTE.
-- pg_temp must be explicit and last so temporary relations cannot shadow
-- trusted public relations in SECURITY DEFINER functions.
DO $$
DECLARE
  target text;
  signature regprocedure;
  configured_path text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.cleanup_expired_sessions()',
    'public.delete_user_by_email(text)',
    'public.enforce_single_top_priority_and_sync_mit()',
    'public.get_favorite_category_ids(uuid)',
    'public.get_user_cohort(uuid)',
    'public.get_user_role_level(uuid)',
    'public.get_user_tier(uuid)',
    'public.has_permission(uuid,text,public.admin_action)',
    'public.increment_category_usage(uuid,uuid,uuid)',
    'public.is_beta_phase()',
    'public.is_email_subscribed(character varying)',
    'public.log_audit_event(uuid,public.audit_action,text,text,text,jsonb,jsonb,jsonb)',
    'public.update_app_config_updated_at()',
    'public.update_campaign_metrics(uuid)',
    'public.update_category_positions(uuid,jsonb)',
    'public.update_favorite_categories(uuid,jsonb)',
    'public.update_updated_at()',
    'public.update_updated_at_column()'
  ] LOOP
    BEGIN
      signature := to_regprocedure(target);
    EXCEPTION WHEN undefined_object THEN
      -- Older admin types were created outside the canonical app migrations.
      CONTINUE;
    END;
    IF signature IS NULL THEN
      CONTINUE;
    END IF;

    SELECT setting INTO configured_path
    FROM pg_proc AS function_catalog,
         unnest(function_catalog.proconfig) AS setting
    WHERE function_catalog.oid = signature
      AND setting LIKE 'search_path=%';

    IF configured_path IS NULL
       OR lower(replace(configured_path, ' ', '')) IN (
         'search_path=public',
         'search_path=pg_catalog,public'
       ) THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp',
        signature
      );
    END IF;
  END LOOP;
END;
$$;
