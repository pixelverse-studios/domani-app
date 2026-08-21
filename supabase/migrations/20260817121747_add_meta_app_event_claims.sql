-- DEV-1109: durably claim privacy-safe Meta acquisition events once per user.

CREATE TABLE public.meta_app_event_claims (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL CHECK (
    CHAR_LENGTH(event_key) BETWEEN 1 AND 200
    AND (
      event_key IN ('completed_registration', 'start_trial', 'planning_activated')
      OR event_key LIKE 'purchase:%'
      OR event_key LIKE 'purchase_restored:%'
    )
  ),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_key)
);

ALTER TABLE public.meta_app_event_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.meta_app_event_claims FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_meta_app_event(p_event_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event_key TEXT := TRIM(COALESCE(p_event_key, ''));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF CHAR_LENGTH(v_event_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid Meta app event key';
  END IF;

  IF v_event_key NOT IN ('completed_registration', 'start_trial', 'planning_activated')
    AND v_event_key NOT LIKE 'purchase:%'
    AND v_event_key NOT LIKE 'purchase_restored:%' THEN
    RAISE EXCEPTION 'Unsupported Meta app event key';
  END IF;

  INSERT INTO public.meta_app_event_claims (user_id, event_key)
  VALUES (v_user_id, v_event_key)
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.claim_meta_app_event(TEXT) IS
'Atomically claims one privacy-safe Meta app event key for the authenticated user. Returns false when already claimed.';

REVOKE ALL ON FUNCTION public.claim_meta_app_event(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(TEXT) TO authenticated;

