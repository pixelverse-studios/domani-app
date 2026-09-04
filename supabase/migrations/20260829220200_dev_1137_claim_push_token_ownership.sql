-- DEV-1137: make an Expo push token belong to at most one authenticated
-- profile, and provide a current-user-only release path for sign-out.

WITH ranked_tokens AS (
  SELECT
    id,
    pg_catalog.row_number() OVER (
      PARTITION BY expo_push_token
      ORDER BY last_active_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS token_rank
  FROM public.profiles
  WHERE expo_push_token IS NOT NULL
)
UPDATE public.profiles AS profile
SET expo_push_token = NULL
FROM ranked_tokens
WHERE profile.id = ranked_tokens.id
  AND ranked_tokens.token_rank > 1;

CREATE UNIQUE INDEX profiles_expo_push_token_unique_idx
  ON public.profiles (expo_push_token)
  WHERE expo_push_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_current_user_expo_push_token(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  normalized_token text := NULLIF(pg_catalog.btrim(p_token), '');
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF normalized_token IS NOT NULL AND pg_catalog.length(normalized_token) > 512 THEN
    RAISE EXCEPTION 'Invalid push token' USING ERRCODE = '22023';
  END IF;

  IF normalized_token IS NOT NULL THEN
    -- Serialize claims for the same opaque token so concurrent account switches
    -- deterministically leave it with the most recent authenticated claimant.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(normalized_token, 1137)
    );

    UPDATE public.profiles
    SET
      expo_push_token = NULL,
      push_token_invalid_at = NULL
    WHERE expo_push_token = normalized_token
      AND id <> authenticated_user_id;
  END IF;

  UPDATE public.profiles
  SET
    expo_push_token = normalized_token,
    push_token_invalid_at = NULL
  WHERE id = authenticated_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_current_user_expo_push_token(text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_current_user_expo_push_token(text)
TO authenticated, service_role;
