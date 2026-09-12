-- DEV-1137: Bind current-user mutations to the account that initiated the
-- client operation. The existing RPCs remain available for installed-client
-- compatibility; new clients call these wrappers with the synchronously
-- captured lifecycle owner. The ownership assertion and delegated mutation
-- execute in one PostgreSQL transaction, so a replacement access token cannot
-- silently redirect account A's work to account B.

CREATE OR REPLACE FUNCTION public.ensure_expected_user_profile(
  p_expected_user_id uuid
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  RETURN public.ensure_current_user_profile();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expected_user_expo_push_token(
  p_expected_user_id uuid,
  p_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_current_user_expo_push_token(p_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expected_user_promo_redemption_attempt(
  p_expected_user_id uuid,
  p_redemption_attempt_id uuid,
  p_event text,
  p_status public.promo_redemption_status DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  RETURN public.update_current_user_promo_redemption_attempt(
    p_redemption_attempt_id,
    p_event,
    p_status,
    p_error_code,
    p_error_message,
    p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_expected_user_refund_request_pending(
  p_expected_user_id uuid,
  p_platform text DEFAULT 'ios',
  p_source text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS public.purchase_refund_states
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  RETURN public.mark_current_user_refund_request_pending(p_platform, p_source, p_error);
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_expected_user_refund_request_state(
  p_expected_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  PERFORM public.clear_current_user_refund_request_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.record_expected_user_duplicate_refund_request_hint(
  p_expected_user_id uuid,
  p_platform text DEFAULT 'ios',
  p_source text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS public.purchase_refund_states
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  RETURN public.record_current_user_duplicate_refund_request_hint(
    p_platform,
    p_source,
    p_error
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_expected_user_promo_redemption(
  p_expected_user_id uuid,
  p_redemption_attempt_id uuid,
  p_code_id uuid,
  p_campaign_id uuid,
  p_revenuecat_app_user_id text DEFAULT NULL,
  p_store_product_id text DEFAULT NULL,
  p_store_transaction_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  RETURN public.confirm_current_user_promo_redemption(
    p_redemption_attempt_id,
    p_code_id,
    p_campaign_id,
    p_revenuecat_app_user_id,
    p_store_product_id,
    p_store_transaction_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_expected_user_trial(
  p_expected_user_id uuid
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_expected_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated account changed' USING ERRCODE = '42501';
  END IF;

  RETURN public.start_current_user_trial();
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_expected_user_profile(uuid),
  public.set_expected_user_expo_push_token(uuid, text),
  public.update_expected_user_promo_redemption_attempt(
    uuid,
    uuid,
    text,
    public.promo_redemption_status,
    text,
    text,
    jsonb
  ),
  public.mark_expected_user_refund_request_pending(uuid, text, text, text),
  public.clear_expected_user_refund_request_state(uuid),
  public.record_expected_user_duplicate_refund_request_hint(uuid, text, text, text),
  public.confirm_expected_user_promo_redemption(uuid, uuid, uuid, uuid, text, text, text),
  public.start_expected_user_trial(uuid)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.ensure_expected_user_profile(uuid),
  public.set_expected_user_expo_push_token(uuid, text),
  public.update_expected_user_promo_redemption_attempt(
    uuid,
    uuid,
    text,
    public.promo_redemption_status,
    text,
    text,
    jsonb
  ),
  public.mark_expected_user_refund_request_pending(uuid, text, text, text),
  public.clear_expected_user_refund_request_state(uuid),
  public.record_expected_user_duplicate_refund_request_hint(uuid, text, text, text),
  public.confirm_expected_user_promo_redemption(uuid, uuid, uuid, uuid, text, text, text),
  public.start_expected_user_trial(uuid)
TO authenticated;

COMMENT ON FUNCTION public.ensure_expected_user_profile(uuid) IS
'Repairs a profile only when the authenticated account matches the client lifecycle owner.';
COMMENT ON FUNCTION public.set_expected_user_expo_push_token(uuid, text) IS
'Changes push-token ownership only when the authenticated account matches the client lifecycle owner.';
COMMENT ON FUNCTION public.update_expected_user_promo_redemption_attempt(
  uuid,
  uuid,
  text,
  public.promo_redemption_status,
  text,
  text,
  jsonb
) IS
'Appends promo audit data only when the authenticated account matches the client lifecycle owner.';
