-- DEV-852: Allow the app to append support-facing promo lifecycle audit events
-- to its own validation attempt without granting access or storing raw codes.

CREATE OR REPLACE FUNCTION public.update_current_user_promo_redemption_attempt(
  p_redemption_attempt_id UUID,
  p_event TEXT,
  p_status public.promo_redemption_status DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_attempt public.promo_redemption_attempts;
  v_event TEXT := LOWER(TRIM(COALESCE(p_event, '')));
  v_metadata JSONB := COALESCE(p_metadata, '{}'::jsonb);
  v_event_record JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_event NOT IN (
    'promo_applied',
    'store_handoff_started',
    'app_returned',
    'sync_succeeded',
    'sync_failed',
    'redemption_completed',
    'redemption_failed',
    'redemption_abandoned'
  ) THEN
    RAISE EXCEPTION 'Unsupported promo audit event: %', p_event;
  END IF;

  IF p_status IS NOT NULL
    AND p_status NOT IN (
      'failed'::public.promo_redemption_status,
      'abandoned'::public.promo_redemption_status
    ) THEN
    RAISE EXCEPTION 'Unsupported client-updatable promo status: %', p_status;
  END IF;

  IF v_metadata ? 'promoCode'
    OR v_metadata ? 'code'
    OR v_metadata ? 'rawCode'
    OR v_metadata ? 'normalizedCode' THEN
    RAISE EXCEPTION 'Promo audit metadata must not include raw code values';
  END IF;

  v_event_record := JSONB_BUILD_OBJECT(
    'event', v_event,
    'occurredAt', NOW(),
    'errorCode', p_error_code,
    'errorMessage', p_error_message,
    'metadata', v_metadata
  );

  UPDATE public.promo_redemption_attempts
  SET
    status = CASE
      WHEN status = 'confirmed'::public.promo_redemption_status THEN status
      ELSE COALESCE(p_status, status)
    END,
    error_code = CASE
      WHEN status = 'confirmed'::public.promo_redemption_status THEN error_code
      ELSE COALESCE(p_error_code, error_code)
    END,
    error_message = CASE
      WHEN status = 'confirmed'::public.promo_redemption_status THEN error_message
      ELSE COALESCE(p_error_message, error_message)
    END,
    response_payload = JSONB_SET(
      response_payload,
      '{auditEvents}',
      COALESCE(response_payload->'auditEvents', '[]'::jsonb) || JSONB_BUILD_ARRAY(v_event_record),
      TRUE
    )
  WHERE id = p_redemption_attempt_id
    AND user_id = v_user_id
  RETURNING *
  INTO v_attempt;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'not_found',
      'redemptionAttemptId', p_redemption_attempt_id
    );
  END IF;

  RETURN JSONB_BUILD_OBJECT(
    'status', 'updated',
    'redemptionAttemptId', v_attempt.id,
    'attemptStatus', v_attempt.status,
    'event', v_event
  );
END;
$$;

COMMENT ON FUNCTION public.update_current_user_promo_redemption_attempt(UUID, TEXT, public.promo_redemption_status, TEXT, TEXT, JSONB) IS
'App-callable support audit update for the current user''s promo attempt. Appends privacy-safe lifecycle events and may mark failed/abandoned, but never confirms access.';

REVOKE ALL ON FUNCTION public.update_current_user_promo_redemption_attempt(UUID, TEXT, public.promo_redemption_status, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_current_user_promo_redemption_attempt(UUID, TEXT, public.promo_redemption_status, TEXT, TEXT, JSONB) TO authenticated;
