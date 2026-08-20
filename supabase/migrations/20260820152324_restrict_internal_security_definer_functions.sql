-- These routines are trigger, maintenance, admin, or service-role entrypoints.
-- Authenticated clients do not call them directly.
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_promo_redemption_for_user(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_expired_accounts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user_by_email(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists_for_auth_user(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_auth_user_to_profile(uuid) FROM authenticated;
