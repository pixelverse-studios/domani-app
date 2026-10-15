-- Record account changes before an email can be requested. Released clients
-- still call the existing account RPCs and may send the old email body.
CREATE TABLE public.account_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('account_deletion', 'account_reactivation')),
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  deletion_scheduled_for timestamptz,
  display_name text,
  recipient_email text,
  claim_token uuid,
  claimed_at timestamptz,
  sent_at timestamptz
);
CREATE INDEX account_email_events_latest_idx
  ON public.account_email_events (user_id, occurred_at DESC, id DESC);
ALTER TABLE public.account_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_email_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.account_email_events TO service_role;

-- Cover a released client that scheduled deletion immediately before this
-- migration, then calls the email function immediately afterward.
INSERT INTO public.account_email_events (
  user_id, event_type, occurred_at, deletion_scheduled_for, display_name
)
SELECT id, 'account_deletion', deleted_at, deletion_scheduled_for, full_name
FROM public.profiles
WHERE deleted_at >= pg_catalog.now() - interval '10 minutes'
  AND deletion_scheduled_for IS NOT NULL;

-- Only the privileged account RPCs may change deletion state. A direct
-- profile update must not manufacture an email event.
CREATE FUNCTION public.a_guard_account_deletion_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.deleted_at := NULL;
      NEW.deletion_scheduled_for := NULL;
    ELSE
      NEW.deleted_at := OLD.deleted_at;
      NEW.deletion_scheduled_for := OLD.deletion_scheduled_for;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.a_guard_account_deletion_fields()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a_guard_account_deletion_fields_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.a_guard_account_deletion_fields();
CREATE TRIGGER a_guard_account_deletion_fields_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.a_guard_account_deletion_fields();

CREATE FUNCTION public.record_account_email_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND NEW.deletion_scheduled_for IS NOT NULL
     AND (OLD.deleted_at IS NULL
       OR NEW.deletion_scheduled_for IS DISTINCT FROM OLD.deletion_scheduled_for) THEN
    INSERT INTO public.account_email_events (
      user_id, event_type, deletion_scheduled_for, display_name
    ) VALUES (
      NEW.id, 'account_deletion', NEW.deletion_scheduled_for, NEW.full_name
    );
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    INSERT INTO public.account_email_events (user_id, event_type, display_name)
    VALUES (NEW.id, 'account_reactivation', NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_account_email_event()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_account_email_event
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.record_account_email_event();

CREATE FUNCTION public.claim_account_email_event(
  p_user_id uuid,
  p_event_type text,
  p_verified_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_event public.account_email_events%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_token uuid;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;
  IF p_user_id IS NULL OR p_event_type IS NULL OR p_event_type NOT IN (
    'account_deletion', 'account_reactivation'
  ) OR p_verified_email IS NULL OR pg_catalog.btrim(p_verified_email) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid email claim';
  END IF;

  -- Match the account RPC lock order so a concurrent cancellation cannot
  -- invalidate a deletion email after this claim checks the profile.
  SELECT * INTO v_profile FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('status', 'no_matching_event');
  END IF;

  SELECT * INTO v_event FROM public.account_email_events
  WHERE user_id = p_user_id
  ORDER BY occurred_at DESC, id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_event.event_type <> p_event_type THEN
    RETURN pg_catalog.jsonb_build_object('status', 'no_matching_event');
  END IF;

  IF (p_event_type = 'account_deletion' AND (
        v_profile.deleted_at IS NULL OR
        v_profile.deletion_scheduled_for IS DISTINCT FROM v_event.deletion_scheduled_for
      )) OR (p_event_type = 'account_reactivation' AND v_profile.deleted_at IS NOT NULL) THEN
    RETURN pg_catalog.jsonb_build_object('status', 'no_matching_event');
  END IF;
  IF v_event.sent_at IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object('status', 'already_sent');
  END IF;
  IF v_event.claimed_at > pg_catalog.now() - interval '2 minutes' THEN
    RETURN pg_catalog.jsonb_build_object('status', 'in_progress');
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.account_email_events SET
    claim_token = v_token,
    claimed_at = pg_catalog.now(),
    recipient_email = coalesce(recipient_email, pg_catalog.btrim(p_verified_email))
  WHERE id = v_event.id
  RETURNING * INTO v_event;
  RETURN pg_catalog.jsonb_build_object(
    'status', 'claimed', 'id', v_event.id, 'claimToken', v_token,
    'type', v_event.event_type, 'email', v_event.recipient_email,
    'name', v_event.display_name,
    'deletionScheduledFor', v_event.deletion_scheduled_for
  );
END;
$$;
REVOKE ALL ON FUNCTION public.claim_account_email_event(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_account_email_event(uuid, text, text)
  TO service_role;

CREATE FUNCTION public.finish_account_email_event(
  p_event_id uuid,
  p_claim_token uuid,
  p_sent boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;
  IF p_sent IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid email completion';
  END IF;
  UPDATE public.account_email_events SET
    sent_at = CASE WHEN p_sent THEN pg_catalog.now() ELSE sent_at END,
    claim_token = NULL,
    claimed_at = NULL
  WHERE id = p_event_id AND claim_token = p_claim_token AND sent_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_account_email_event(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_account_email_event(uuid, uuid, boolean)
  TO service_role;
