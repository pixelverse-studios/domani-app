-- Make new caller-bound and trigger entrypoints independent of hosted default
-- service EXECUTE grants. Verified service RPCs retain their explicit grants.
-- Data API clients and dashboard workers do not need table maintenance.
DO $$
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public."a_guard_account_deletion_fields"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."a_guard_legacy_profile_entitlements"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."cancel_current_user_account_deletion"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."cancel_current_user_account_deletion"(p_expected_user_id uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."confirm_current_user_promo_redemption"(p_redemption_attempt_id uuid, p_code_id uuid, p_campaign_id uuid, p_revenuecat_app_user_id text, p_store_product_id text, p_store_transaction_id text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."get_client_version_policy"(p_platform text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."get_current_user_cohort"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."get_current_user_favorite_category_ids"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."get_current_user_tier"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."has_current_user_access"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."increment_current_user_category_usage"(p_system_category_id uuid, p_user_category_id uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."observe_current_user_client"(p_app_version text, p_build text, p_platform text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."record_account_email_event"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."record_current_user_legacy_intent"(p_rejected boolean) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."record_current_user_legacy_trial_start"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."record_legacy_trial_start_after_profile_update"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."request_current_user_revenuecat_reconciliation"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."schedule_current_user_account_deletion"() FROM service_role;
REVOKE EXECUTE ON FUNCTION public."start_current_user_trial"(p_expected_user_id uuid) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."update_current_user_category_positions"(p_category_positions jsonb) FROM service_role;
REVOKE EXECUTE ON FUNCTION public."update_current_user_favorite_categories"(p_favorite_category_ids jsonb) FROM service_role;
