-- DEV-1136: bind account email delivery to authenticated, server-recorded
-- account lifecycle events. Clients cannot choose recipients or template data.

CREATE TABLE public.account_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (
    message_type IN ('account_deletion', 'account_reactivation')
  ),
  deletion_scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text,
  CONSTRAINT account_email_events_deletion_shape_check CHECK (
    (message_type = 'account_deletion' AND deletion_scheduled_for IS NOT NULL)
    OR
    (message_type = 'account_reactivation' AND deletion_scheduled_for IS NULL)
  )
);

ALTER TABLE public.account_email_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX account_email_events_pending_idx
  ON public.account_email_events (user_id, message_type, created_at DESC)
  WHERE delivered_at IS NULL;

REVOKE ALL ON TABLE public.account_email_events
FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON TABLE public.account_email_events TO service_role;

CREATE OR REPLACE FUNCTION public.schedule_current_user_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  scheduled_for timestamptz := pg_catalog.now() + interval '30 days';
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = pg_catalog.now(),
    deletion_scheduled_for = scheduled_for
  WHERE id = authenticated_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.account_email_events (
    user_id,
    message_type,
    deletion_scheduled_for
  )
  VALUES (
    authenticated_user_id,
    'account_deletion',
    scheduled_for
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_current_user_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET
    deleted_at = NULL,
    deletion_scheduled_for = NULL
  WHERE id = authenticated_user_id
    AND deleted_at IS NOT NULL
    AND deletion_scheduled_for IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending deletion not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.account_email_events (
    user_id,
    message_type,
    deletion_scheduled_for
  )
  VALUES (
    authenticated_user_id,
    'account_reactivation',
    NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_account_email_delivery(
  p_user_id uuid,
  p_message_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  candidate public.account_email_events%ROWTYPE;
BEGIN
  IF p_user_id IS NULL
    OR p_message_type NOT IN ('account_deletion', 'account_reactivation') THEN
    RETURN pg_catalog.jsonb_build_object('status', 'not_found');
  END IF;

  SELECT events.*
  INTO candidate
  FROM public.account_email_events AS events
  WHERE events.user_id = p_user_id
    AND events.message_type = p_message_type
    AND events.claimed_at IS NULL
    AND events.delivered_at IS NULL
    AND events.created_at >= pg_catalog.now() - interval '15 minutes'
  ORDER BY events.created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('status', 'not_found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.account_email_events AS recent
    WHERE recent.user_id = p_user_id
      AND recent.message_type = p_message_type
      AND recent.id <> candidate.id
      AND (
        recent.delivered_at >= pg_catalog.now() - interval '5 minutes'
        OR recent.claimed_at >= pg_catalog.now() - interval '2 minutes'
      )
  ) THEN
    RETURN pg_catalog.jsonb_build_object('status', 'rate_limited');
  END IF;

  UPDATE public.account_email_events
  SET claimed_at = pg_catalog.now()
  WHERE id = candidate.id;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'claimed',
    'eventId', candidate.id,
    'deletionScheduledFor', candidate.deletion_scheduled_for
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_account_email_delivery(
  p_event_id uuid,
  p_provider_message_id text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.account_email_events
  SET
    delivered_at = pg_catalog.now(),
    provider_message_id = pg_catalog.left(p_provider_message_id, 255)
  WHERE id = p_event_id
    AND claimed_at IS NOT NULL
    AND delivered_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.release_account_email_delivery(
  p_event_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.account_email_events
  SET claimed_at = NULL
  WHERE id = p_event_id
    AND delivered_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.claim_account_email_delivery(uuid, text),
  public.complete_account_email_delivery(uuid, text),
  public.release_account_email_delivery(uuid)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_account_email_delivery(uuid, text),
  public.complete_account_email_delivery(uuid, text),
  public.release_account_email_delivery(uuid)
TO service_role;

COMMENT ON TABLE public.account_email_events IS
'Private account-lifecycle email outbox. Rows contain no recipient email and are inaccessible to app roles.';
COMMENT ON FUNCTION public.claim_account_email_delivery(uuid, text) IS
'Service-only atomic claim for a recent verified account lifecycle event with durable rate limiting.';

NOTIFY pgrst, 'reload schema';
