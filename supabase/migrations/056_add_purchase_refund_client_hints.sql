-- DEV-784 follow-up:
-- Separate authoritative refund status from ambiguous client-side duplicate
-- request hints so the app can suppress repeat attempts without claiming a
-- refund is still pending review.

ALTER TABLE public.purchase_refund_states
  ALTER COLUMN status DROP NOT NULL;

ALTER TABLE public.purchase_refund_states
  ADD COLUMN IF NOT EXISTS client_hint TEXT DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_refund_states_client_hint_check'
      AND conrelid = 'public.purchase_refund_states'::regclass
  ) THEN
    ALTER TABLE public.purchase_refund_states
      ADD CONSTRAINT purchase_refund_states_client_hint_check
      CHECK (client_hint IS NULL OR client_hint = 'duplicate_request');
  END IF;
END $$;

COMMENT ON COLUMN public.purchase_refund_states.status IS
'Current known refund-request state. NULL means the app only has a soft client-side hint, not an authoritative Apple/refund outcome. pending_review means Apple has an in-flight request; approved means the refund was granted; denied means Apple did not approve the request.';

COMMENT ON COLUMN public.purchase_refund_states.client_hint IS
'Soft client-side refund hint. duplicate_request means Apple reported an existing request, but the final outcome is still ambiguous.';

CREATE OR REPLACE FUNCTION public.mark_current_user_refund_request_pending(
  p_platform TEXT DEFAULT 'ios',
  p_source TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS public.purchase_refund_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.purchase_refund_states;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_platform <> 'ios' THEN
    RAISE EXCEPTION 'Unsupported refund platform: %', p_platform;
  END IF;

  INSERT INTO public.purchase_refund_states (
    user_id,
    platform,
    status,
    requested_at,
    resolved_at,
    last_source,
    last_error,
    client_hint
  )
  VALUES (
    v_user_id,
    p_platform,
    'pending_review'::public.refund_request_status,
    NOW(),
    NULL,
    p_source,
    p_error,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    platform = EXCLUDED.platform,
    status = 'pending_review'::public.refund_request_status,
    requested_at = NOW(),
    resolved_at = NULL,
    last_source = EXCLUDED.last_source,
    last_error = EXCLUDED.last_error,
    client_hint = NULL,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_current_user_duplicate_refund_request_hint(
  p_platform TEXT DEFAULT 'ios',
  p_source TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS public.purchase_refund_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row public.purchase_refund_states;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_platform <> 'ios' THEN
    RAISE EXCEPTION 'Unsupported refund platform: %', p_platform;
  END IF;

  INSERT INTO public.purchase_refund_states (
    user_id,
    platform,
    status,
    requested_at,
    resolved_at,
    last_source,
    last_error,
    client_hint
  )
  VALUES (
    v_user_id,
    p_platform,
    NULL,
    NOW(),
    NULL,
    p_source,
    p_error,
    'duplicate_request'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    platform = EXCLUDED.platform,
    last_source = EXCLUDED.last_source,
    last_error = EXCLUDED.last_error,
    client_hint = CASE
      WHEN public.purchase_refund_states.status IS NULL THEN 'duplicate_request'
      ELSE public.purchase_refund_states.client_hint
    END,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.record_current_user_duplicate_refund_request_hint(TEXT, TEXT, TEXT) IS
'Persists a soft duplicate-request hint for the current authenticated user without overwriting authoritative refund status.';

GRANT EXECUTE ON FUNCTION public.record_current_user_duplicate_refund_request_hint(TEXT, TEXT, TEXT) TO authenticated;
