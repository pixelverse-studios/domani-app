-- DEV-1109: disambiguate the fixed-key upsert from the function's output column.

CREATE OR REPLACE FUNCTION public.claim_meta_app_event(
  p_user_id UUID,
  p_event_key TEXT,
  p_event_payload JSONB
)
RETURNS TABLE (
  event_key TEXT,
  event_payload JSONB,
  claim_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_authenticated_user_id UUID := auth.uid();
  v_event_key TEXT := TRIM(COALESCE(p_event_key, ''));
  v_event_payload JSONB := COALESCE(p_event_payload, '{}'::JSONB);
  v_claim_token UUID := gen_random_uuid();
BEGIN
  IF v_authenticated_user_id IS NULL OR p_user_id IS DISTINCT FROM v_authenticated_user_id THEN
    RAISE EXCEPTION 'Not authorized to claim Meta app event';
  END IF;

  IF v_event_key NOT IN (
    'completed_registration',
    'start_trial',
    'planning_activated',
    'purchase',
    'purchase_restored'
  ) THEN
    RAISE EXCEPTION 'Unsupported Meta app event key';
  END IF;

  IF JSONB_TYPEOF(v_event_payload) <> 'object'
    OR NOT (v_event_payload ? 'platform')
    OR JSONB_TYPEOF(v_event_payload->'platform') <> 'string'
    OR v_event_payload->>'platform' NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'Invalid Meta app event payload';
  END IF;

  IF v_event_key = 'completed_registration' THEN
    IF (v_event_payload - ARRAY['platform', 'method']) <> '{}'::JSONB
      OR NOT (v_event_payload ? 'method')
      OR JSONB_TYPEOF(v_event_payload->'method') <> 'string'
      OR v_event_payload->>'method' NOT IN ('google', 'apple') THEN
      RAISE EXCEPTION 'Invalid registration event payload';
    END IF;
  ELSIF v_event_key = 'start_trial' THEN
    IF (v_event_payload - ARRAY['platform', 'offer']) <> '{}'::JSONB
      OR (
        v_event_payload ? 'offer'
        AND (
          JSONB_TYPEOF(v_event_payload->'offer') <> 'string'
          OR CHAR_LENGTH(v_event_payload->>'offer') NOT BETWEEN 1 AND 100
        )
      ) THEN
      RAISE EXCEPTION 'Invalid trial event payload';
    END IF;
  ELSIF v_event_key = 'planning_activated' THEN
    IF (v_event_payload - ARRAY['platform', 'scheduled_for']) <> '{}'::JSONB
      OR NOT (v_event_payload ? 'scheduled_for')
      OR JSONB_TYPEOF(v_event_payload->'scheduled_for') <> 'string'
      OR v_event_payload->>'scheduled_for' NOT IN ('today', 'tomorrow') THEN
      RAISE EXCEPTION 'Invalid planning event payload';
    END IF;
  ELSE
    IF (v_event_payload - ARRAY[
      'platform',
      'product_id',
      'offer',
      'store',
      'amount',
      'currency'
    ]) <> '{}'::JSONB
      OR NOT (v_event_payload ? 'product_id')
      OR JSONB_TYPEOF(v_event_payload->'product_id') <> 'string'
      OR CHAR_LENGTH(v_event_payload->>'product_id') NOT BETWEEN 1 AND 100
      OR v_event_payload->>'product_id' !~ '^[A-Za-z0-9._-]+$'
      OR (
        v_event_payload ? 'offer'
        AND (
          JSONB_TYPEOF(v_event_payload->'offer') <> 'string'
          OR CHAR_LENGTH(v_event_payload->>'offer') NOT BETWEEN 1 AND 100
        )
      )
      OR (
        v_event_payload ? 'store'
        AND (
          JSONB_TYPEOF(v_event_payload->'store') <> 'string'
          OR CHAR_LENGTH(v_event_payload->>'store') NOT BETWEEN 1 AND 100
        )
      )
      OR ((v_event_payload ? 'amount') <> (v_event_payload ? 'currency'))
      OR (
        v_event_key = 'purchase_restored'
        AND (v_event_payload ? 'amount' OR v_event_payload ? 'currency')
      )
      OR (
        v_event_payload ? 'amount'
        AND (
          JSONB_TYPEOF(v_event_payload->'amount') <> 'number'
          OR (v_event_payload->>'amount')::NUMERIC NOT BETWEEN 0 AND 1000000
        )
      )
      OR (
        v_event_payload ? 'currency'
        AND (
          JSONB_TYPEOF(v_event_payload->'currency') <> 'string'
          OR v_event_payload->>'currency' !~ '^[A-Z]{3}$'
        )
      ) THEN
      RAISE EXCEPTION 'Invalid purchase event payload';
    END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.meta_app_event_claims AS claims (
    user_id,
    event_key,
    event_payload,
    claim_token,
    claimed_at,
    delivered_at
  )
  VALUES (
    p_user_id,
    v_event_key,
    v_event_payload,
    v_claim_token,
    NOW(),
    NULL
  )
  ON CONFLICT ON CONSTRAINT meta_app_event_claims_pkey DO UPDATE
  SET claim_token = v_claim_token,
      claimed_at = NOW()
  WHERE claims.delivered_at IS NULL
    AND claims.claimed_at <= NOW() - INTERVAL '5 minutes'
  RETURNING claims.event_key, claims.event_payload, claims.claim_token;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_meta_app_event(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(UUID, TEXT, JSONB) TO authenticated;
