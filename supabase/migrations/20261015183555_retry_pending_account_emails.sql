-- Give a trusted worker a bounded list of current, unsent account events.
-- The existing claim function still locks and validates each event before use.
ALTER TABLE public.account_email_events
  ADD COLUMN last_retry_attempt_at timestamptz;

CREATE FUNCTION public.list_pending_account_email_events(p_limit integer DEFAULT 5)
RETURNS TABLE(user_id uuid, event_type text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Service role required';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT events.id
    FROM public.account_email_events AS events
    JOIN public.profiles AS profiles ON profiles.id = events.user_id
    WHERE events.sent_at IS NULL
      AND (events.claimed_at IS NULL
        OR events.claimed_at <= pg_catalog.now() - interval '2 minutes')
      AND NOT EXISTS (
        SELECT 1 FROM public.account_email_events AS newer
        WHERE newer.user_id = events.user_id
          AND (newer.occurred_at, newer.id) > (events.occurred_at, events.id)
      )
      AND (
        (events.event_type = 'account_deletion'
          AND profiles.deleted_at IS NOT NULL
          AND profiles.deletion_scheduled_for IS NOT DISTINCT FROM events.deletion_scheduled_for)
        OR (events.event_type = 'account_reactivation' AND profiles.deleted_at IS NULL)
      )
    ORDER BY events.last_retry_attempt_at NULLS FIRST,
      events.occurred_at, events.id
    LIMIT least(greatest(p_limit, 1), 25)
    FOR UPDATE OF events SKIP LOCKED
  )
  UPDATE public.account_email_events AS events
  SET last_retry_attempt_at = pg_catalog.now()
  FROM candidates WHERE events.id = candidates.id
  RETURNING events.user_id, events.event_type;
END;
$$;
REVOKE ALL ON FUNCTION public.list_pending_account_email_events(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_account_email_events(integer)
  TO service_role;
