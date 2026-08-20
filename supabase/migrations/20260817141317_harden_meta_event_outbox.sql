-- DEV-1109: convert Meta acquisition claims into a bounded, token-owned outbox.

DROP FUNCTION public.claim_meta_app_event(UUID, TEXT);
DROP FUNCTION public.complete_meta_app_event_claim(UUID, TEXT);
DROP FUNCTION public.release_meta_app_event_claim(UUID, TEXT);

ALTER TABLE public.meta_app_event_claims
ADD COLUMN event_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
ADD COLUMN claim_token UUID;

ALTER TABLE public.meta_app_event_claims
DROP CONSTRAINT IF EXISTS meta_app_event_claims_event_key_check;

-- Domani sells lifetime access, so Purchase and Restore are one-time outcomes.
-- Collapse the legacy per-occurrence keys before enforcing the fixed allowlist.
INSERT INTO public.meta_app_event_claims (
  user_id,
  event_key,
  claimed_at,
  delivered_at,
  event_payload
)
SELECT
  user_id,
  'purchase',
  MIN(claimed_at),
  MAX(delivered_at),
  '{}'::JSONB
FROM public.meta_app_event_claims
WHERE event_key LIKE 'purchase:%'
GROUP BY user_id
ON CONFLICT (user_id, event_key) DO UPDATE
SET claimed_at = LEAST(meta_app_event_claims.claimed_at, EXCLUDED.claimed_at),
    delivered_at = COALESCE(meta_app_event_claims.delivered_at, EXCLUDED.delivered_at);

INSERT INTO public.meta_app_event_claims (
  user_id,
  event_key,
  claimed_at,
  delivered_at,
  event_payload
)
SELECT
  user_id,
  'purchase_restored',
  MIN(claimed_at),
  MAX(delivered_at),
  '{}'::JSONB
FROM public.meta_app_event_claims
WHERE event_key LIKE 'purchase_restored:%'
GROUP BY user_id
ON CONFLICT (user_id, event_key) DO UPDATE
SET claimed_at = LEAST(meta_app_event_claims.claimed_at, EXCLUDED.claimed_at),
    delivered_at = COALESCE(meta_app_event_claims.delivered_at, EXCLUDED.delivered_at);

DELETE FROM public.meta_app_event_claims
WHERE event_key LIKE 'purchase:%'
   OR event_key LIKE 'purchase_restored:%';

-- Legacy pending rows do not contain a replayable payload. Preserve the
-- existing at-most-once behavior rather than replaying incomplete data.
UPDATE public.meta_app_event_claims
SET delivered_at = claimed_at
WHERE delivered_at IS NULL;

ALTER TABLE public.meta_app_event_claims
ADD CONSTRAINT meta_app_event_claims_event_key_check CHECK (
  event_key IN (
    'completed_registration',
    'start_trial',
    'planning_activated',
    'purchase',
    'purchase_restored'
  )
),
ADD CONSTRAINT meta_app_event_claims_pending_token_check CHECK (
  delivered_at IS NOT NULL OR claim_token IS NOT NULL
);

CREATE FUNCTION public.claim_meta_app_event(
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
  ON CONFLICT (user_id, event_key) DO UPDATE
  SET claim_token = v_claim_token,
      claimed_at = NOW()
  WHERE claims.delivered_at IS NULL
    AND claims.claimed_at <= NOW() - INTERVAL '5 minutes'
  RETURNING claims.event_key, claims.event_payload, claims.claim_token;
END;
$$;

CREATE FUNCTION public.claim_pending_meta_app_events(p_user_id UUID)
RETURNS TABLE (
  event_key TEXT,
  event_payload JSONB,
  claim_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to replay Meta app events';
  END IF;

  RETURN QUERY
  WITH candidates AS MATERIALIZED (
    SELECT claims.user_id, claims.event_key
    FROM public.meta_app_event_claims AS claims
    WHERE claims.user_id = p_user_id
      AND claims.delivered_at IS NULL
      AND claims.claimed_at <= NOW() - INTERVAL '5 minutes'
    ORDER BY claims.claimed_at
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.meta_app_event_claims AS claims
  SET claim_token = gen_random_uuid(),
      claimed_at = NOW()
  FROM candidates
  WHERE claims.user_id = candidates.user_id
    AND claims.event_key = candidates.event_key
  RETURNING claims.event_key, claims.event_payload, claims.claim_token;
END;
$$;

CREATE FUNCTION public.complete_meta_app_event_claim(
  p_user_id UUID,
  p_event_key TEXT,
  p_claim_token UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to complete Meta app event';
  END IF;

  UPDATE public.meta_app_event_claims
  SET delivered_at = NOW()
  WHERE user_id = p_user_id
    AND event_key = TRIM(COALESCE(p_event_key, ''))
    AND claim_token = p_claim_token
    AND delivered_at IS NULL;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.claim_meta_app_event(UUID, TEXT, JSONB) IS
'Creates or reacquires one of five fixed Meta acquisition events and returns a token-owned delivery claim.';
COMMENT ON FUNCTION public.claim_pending_meta_app_events(UUID) IS
'Reacquires expired pending Meta event claims for replay by the authenticated app user.';
COMMENT ON FUNCTION public.complete_meta_app_event_claim(UUID, TEXT, UUID) IS
'Marks a Meta event delivered only when the caller owns the current claim token.';

REVOKE ALL ON FUNCTION public.claim_meta_app_event(UUID, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_pending_meta_app_events(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_meta_app_event_claim(UUID, TEXT, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_meta_app_events(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_meta_app_event_claim(UUID, TEXT, UUID) TO authenticated;

