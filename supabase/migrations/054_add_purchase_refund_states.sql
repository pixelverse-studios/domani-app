-- DEV-783: Track current Apple refund-request state outside profiles.
--
-- This stores the app-facing refund-request state for the current user's
-- lifetime purchase so the UI can avoid presenting the native Apple refund
-- flow again once a request is already in review.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'refund_request_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.refund_request_status AS ENUM ('pending_review', 'approved');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.purchase_refund_states (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios')),
  status public.refund_request_status NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  last_source TEXT DEFAULT NULL,
  last_error TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.purchase_refund_states IS
'Current app-facing refund-request state for a user''s purchase. Used to suppress duplicate Apple refund attempts while a request is already in review.';

COMMENT ON COLUMN public.purchase_refund_states.status IS
'Current known refund-request state. pending_review means Apple has an in-flight request; approved means the refund was granted.';

CREATE INDEX IF NOT EXISTS idx_purchase_refund_states_status
  ON public.purchase_refund_states(status);

ALTER TABLE public.purchase_refund_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchase refund state"
ON public.purchase_refund_states FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER update_purchase_refund_states_updated_at
  BEFORE UPDATE ON public.purchase_refund_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
    last_error
  )
  VALUES (
    v_user_id,
    p_platform,
    'pending_review'::public.refund_request_status,
    NOW(),
    NULL,
    p_source,
    p_error
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    platform = EXCLUDED.platform,
    status = 'pending_review'::public.refund_request_status,
    requested_at = NOW(),
    resolved_at = NULL,
    last_source = EXCLUDED.last_source,
    last_error = EXCLUDED.last_error,
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.mark_current_user_refund_request_pending(TEXT, TEXT, TEXT) IS
'Marks the current authenticated user''s Apple refund request as pending review so the app can avoid offering the refund flow again.';

GRANT EXECUTE ON FUNCTION public.mark_current_user_refund_request_pending(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.clear_current_user_refund_request_state()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.purchase_refund_states
  WHERE user_id = v_user_id;
END;
$$;

COMMENT ON FUNCTION public.clear_current_user_refund_request_state() IS
'Clears the current authenticated user''s persisted refund-request state after access is restored or a new purchase is recorded.';

GRANT EXECUTE ON FUNCTION public.clear_current_user_refund_request_state() TO authenticated;

GRANT ALL ON public.purchase_refund_states TO service_role;
