-- DEV-1418 compatibility phase. Restrict only known maintenance, trigger,
-- administrative, and service-only entrypoints. A blanket public-function
-- revocation would break released-client and production-only RPCs.
DO $$
DECLARE
  target text;
  signature regprocedure;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'cleanup_expired_sessions()',
    'confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text)',
    'delete_expired_accounts()',
    'delete_user_by_email(text)',
    'ensure_profile_exists_for_auth_user(uuid)',
    'handle_new_user()',
    'sync_auth_user_to_profile(uuid)'
  ] LOOP
    signature := to_regprocedure('public.' || target);
    IF signature IS NOT NULL THEN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        signature
      );
      IF target = 'confirm_promo_redemption_for_user(uuid,uuid,uuid,uuid,text,text,text)' THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', signature);
      END IF;
    END IF;
  END LOOP;
END;
$$;
