-- Complete DEV-1132/1134 role boundaries omitted by the additive rebase.
-- Scope is the application routines observed in the production schema export;
-- preserve new rollout RPCs and production-only service APIs.
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT proc.oid::regprocedure AS signature, proc.proname
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public' AND proc.proname = ANY (ARRAY[
      'authorize_meta_app_event_dispatch',
      'cancel_account_deletion',
      'claim_meta_app_event',
      'claim_pending_meta_app_events',
      'claim_posthog_trial_started',
      'cleanup_expired_sessions',
      'clear_current_user_refund_request_state',
      'complete_posthog_trial_started',
      'confirm_current_user_promo_redemption',
      'confirm_promo_redemption_for_user',
      'delete_expired_accounts',
      'delete_user_by_email',
      'enforce_single_top_priority_and_sync_mit',
      'ensure_current_user_profile',
      'ensure_profile_exists_for_auth_user',
      'get_favorite_category_ids',
      'get_meta_app_event_claim_status',
      'get_user_cohort',
      'get_user_role_level',
      'get_user_tier',
      'handle_new_user',
      'has_permission',
      'hash_promo_code',
      'increment_category_usage',
      'is_beta_phase',
      'is_email_subscribed',
      'log_audit_event',
      'mark_current_user_refund_request_pending',
      'normalize_promo_code',
      'prepare_domani_release_fields',
      'prevent_profile_is_admin_client_update',
      'record_current_user_duplicate_refund_request_hint',
      'retry_failed_meta_app_event_dispatch',
      'schedule_account_deletion',
      'set_updated_at',
      'start_trial_with_posthog_outbox',
      'sync_auth_user_to_profile',
      'update_app_config_updated_at',
      'update_campaign_metrics',
      'update_category_positions',
      'update_current_user_promo_redemption_attempt',
      'update_favorite_categories',
      'update_updated_at',
      'update_updated_at_column',
      'validate_promo_code'
    ])
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', target.signature
    );
    IF target.proname = ANY (ARRAY[
      'authorize_meta_app_event_dispatch',
      'cancel_account_deletion',
      'claim_meta_app_event',
      'claim_pending_meta_app_events',
      'claim_posthog_trial_started',
      'clear_current_user_refund_request_state',
      'complete_posthog_trial_started',
      'confirm_current_user_promo_redemption',
      'ensure_current_user_profile',
      'get_favorite_category_ids',
      'get_meta_app_event_claim_status',
      'get_user_cohort',
      'get_user_tier',
      'increment_category_usage',
      'is_beta_phase',
      'mark_current_user_refund_request_pending',
      'record_current_user_duplicate_refund_request_hint',
      'retry_failed_meta_app_event_dispatch',
      'schedule_account_deletion',
      'start_trial_with_posthog_outbox',
      'update_category_positions',
      'update_current_user_promo_redemption_attempt',
      'update_favorite_categories',
      'validate_promo_code'
    ]) THEN
      EXECUTE pg_catalog.format('GRANT EXECUTE ON FUNCTION %s TO authenticated', target.signature);
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_email_subscribed(character varying),
  public.update_campaign_metrics(uuid) TO service_role;

-- These operational tables carry PII, campaign state or administrative data.
-- The released mobile client only needs public waitlist intake.
DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'waitlist', 'email_templates', 'email_campaigns', 'campaign_recipients',
    'email_unsubscribes', 'admin_sessions', 'admin_audit_log'
  ] LOOP
    IF pg_catalog.to_regclass('public.' || target) IS NULL THEN CONTINUE; END IF;
    EXECUTE pg_catalog.format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', target
    );
  END LOOP;
END;
$$;

GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.waitlist;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.waitlist;
CREATE POLICY "Enable insert for all users" ON public.waitlist
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can unsubscribe" ON public.email_unsubscribes;
ALTER POLICY "System can manage sessions" ON public.admin_sessions
  TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist,
  public.email_templates, public.email_campaigns, public.campaign_recipients,
  public.email_unsubscribes, public.admin_sessions TO service_role;
GRANT SELECT, INSERT ON public.admin_audit_log TO service_role;

-- Future objects must opt in to Data API access. Existing role grants above
-- and on released-client relations remain explicit and unchanged.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Supabase default service privileges differ between historical hosted and
-- fresh databases. These workers need only the explicit data operations.
REVOKE ALL ON TABLE public.account_email_events FROM service_role;
GRANT SELECT, UPDATE ON TABLE public.account_email_events TO service_role;
REVOKE ALL ON TABLE public.revenuecat_access_reconciliation_requests FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.revenuecat_access_reconciliation_requests TO service_role;
REVOKE ALL ON TABLE public.promo_campaigns, public.promo_codes,
  public.promo_redemption_attempts FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.promo_campaigns,
  public.promo_codes, public.promo_redemption_attempts TO service_role;
