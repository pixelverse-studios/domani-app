-- Recover a delivery after a worker exits without completing its durable claim.
ALTER TABLE public.revenuecat_webhook_events
  ADD COLUMN claim_token uuid,
  ADD COLUMN claimed_at timestamptz;

CREATE FUNCTION public.claim_revenuecat_webhook_event(p_event jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_id text := p_event->>'id';
  v_claimed text;
  v_canonical jsonb;
  v_action text;
BEGIN
  IF v_id IS NULL OR v_id = '' OR p_event->>'type' IS NULL THEN
    RAISE EXCEPTION 'Invalid webhook event';
  END IF;
  INSERT INTO public.revenuecat_webhook_events (
    event_id,event_type,app_user_id,original_app_user_id,aliases,product_id,
    store,environment,event_timestamp,processed_action,raw_event,claim_token,claimed_at
  ) VALUES (
    v_id,p_event->>'type',p_event->>'app_user_id',p_event->>'original_app_user_id',
    coalesce(p_event->'aliases','[]'::jsonb),p_event->>'product_id',
    p_event->>'store',p_event->>'environment',
    CASE WHEN jsonb_typeof(p_event->'event_timestamp_ms') = 'number'
      THEN to_timestamp((p_event->>'event_timestamp_ms')::numeric / 1000) END,
    'processing',p_event,v_token,clock_timestamp()
  ) ON CONFLICT (event_id) DO UPDATE SET
    claim_token = v_token, claimed_at = clock_timestamp(),
    processed_action = 'processing', processing_error = NULL
  WHERE revenuecat_webhook_events.processed_action = 'retry_pending'
    OR (revenuecat_webhook_events.processed_action = 'processing'
      AND coalesce(revenuecat_webhook_events.claimed_at,
        revenuecat_webhook_events.created_at) < clock_timestamp() - interval '5 minutes')
  RETURNING event_id,raw_event INTO v_claimed,v_canonical;
  IF v_claimed IS NOT NULL THEN
    RETURN jsonb_build_object('status','claimed','token',v_token,'event',v_canonical);
  END IF;
  SELECT processed_action INTO v_action FROM public.revenuecat_webhook_events WHERE event_id=v_id;
  RETURN jsonb_build_object('status',CASE WHEN v_action='processing'
    THEN 'in_progress' ELSE 'already_processed' END);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_revenuecat_webhook_event(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_revenuecat_webhook_event(jsonb) TO service_role;
