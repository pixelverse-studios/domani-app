-- Remove public schema mutation rights before pinning function search paths.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- The dashboard view joins auth.users and is only intended for trusted server use.
ALTER VIEW public.profiles_dashboard SET (security_invoker = true);
REVOKE ALL ON TABLE public.profiles_dashboard FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles_dashboard TO service_role;

-- RevenueCat writes through the service-role Edge Function. Client roles do not
-- need direct table access.
ALTER TABLE public.revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.revenuecat_webhook_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.revenuecat_webhook_events TO service_role;

-- Pin every advisor-reported mutable search path. pg_catalog is searched first,
-- and untrusted roles can no longer create shadow objects in public.
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = pg_catalog, public;
ALTER FUNCTION public.delete_user_by_email(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_single_top_priority_and_sync_mit() SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_favorite_category_ids(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_user_cohort(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_user_role_level(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.get_user_tier(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.has_permission(uuid, text, public.admin_action) SET search_path = pg_catalog, public;
ALTER FUNCTION public.increment_category_usage(uuid, uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_beta_phase() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_email_subscribed(character varying) SET search_path = pg_catalog, public;
ALTER FUNCTION public.log_audit_event(
  uuid,
  public.audit_action,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_app_config_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_campaign_metrics(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_category_positions(uuid, jsonb) SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_favorite_categories(uuid, jsonb) SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;

-- SECURITY DEFINER routines must never be callable through the anonymous API.
-- Remove the implicit PUBLIC grant, then restore only the authenticated RPCs
-- intentionally used by the app or its RLS helpers.
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT proc.oid::regprocedure AS signature
    FROM pg_proc AS proc
    JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',
      target.signature
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authorize_meta_app_event_dispatch(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_meta_app_events(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_current_user_refund_request_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_current_user_promo_redemption(uuid, uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_favorite_category_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_meta_app_event_claim_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_cohort(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, public.admin_action) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_category_usage(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_beta_phase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, public.audit_action, text, text, text, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_current_user_refund_request_pending(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_current_user_duplicate_refund_request_hint(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_meta_app_event_dispatch(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_account_deletion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_category_positions(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_current_user_promo_redemption_attempt(
  uuid,
  text,
  public.promo_redemption_status,
  text,
  text,
  jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_favorite_categories(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
