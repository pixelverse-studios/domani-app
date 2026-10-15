-- DEV-1418 compatibility phase. Add caller-bound RPCs before changing any
-- released-client signatures, table grants, or task policies.
-- Adapted from DEV-1132; that branch's blanket revocations are deferred.

CREATE OR REPLACE FUNCTION public.schedule_current_user_account_deletion()
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
    deleted_at = pg_catalog.now(),
    deletion_scheduled_for = pg_catalog.now() + interval '30 days'
  WHERE id = authenticated_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;
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
  WHERE id = authenticated_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_favorite_category_ids()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(pg_catalog.jsonb_agg(favorites.category_id), '[]'::jsonb)
  FROM (
    SELECT preferences.system_category_id AS category_id
    FROM public.user_category_preferences AS preferences
    WHERE preferences.user_id = auth.uid()
      AND preferences.is_favorite = true

    UNION ALL

    SELECT categories.id AS category_id
    FROM public.user_categories AS categories
    WHERE categories.user_id = auth.uid()
      AND categories.is_favorite = true
  ) AS favorites;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_cohort()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profiles.signup_cohort::text
  FROM public.profiles AS profiles
  WHERE profiles.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_tier()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profiles.tier::text
  FROM public.profiles AS profiles
  WHERE profiles.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.increment_current_user_category_usage(
  p_system_category_id uuid DEFAULT NULL,
  p_user_category_id uuid DEFAULT NULL
)
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

  IF p_user_category_id IS NOT NULL THEN
    UPDATE public.user_categories
    SET
      usage_count = usage_count + 1,
      updated_at = pg_catalog.now()
    WHERE id = p_user_category_id
      AND user_id = authenticated_user_id;
  END IF;

  IF p_system_category_id IS NOT NULL THEN
    INSERT INTO public.user_category_preferences (
      user_id,
      system_category_id,
      usage_count,
      position
    )
    VALUES (
      authenticated_user_id,
      p_system_category_id,
      1,
      (
        SELECT COALESCE(categories.position, 0)
        FROM public.system_categories AS categories
        WHERE categories.id = p_system_category_id
      )
    )
    ON CONFLICT (user_id, system_category_id)
    DO UPDATE SET
      usage_count = public.user_category_preferences.usage_count + 1,
      updated_at = pg_catalog.now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_user_category_positions(
  p_category_positions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  item jsonb;
  category_id uuid;
  category_position integer;
  is_system boolean;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.jsonb_typeof(p_category_positions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Category positions must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_category_positions)
  LOOP
    category_id := (item->>'id')::uuid;
    category_position := (item->>'position')::integer;
    is_system := (item->>'isSystem')::boolean;

    IF is_system THEN
      INSERT INTO public.user_category_preferences (
        user_id,
        system_category_id,
        position
      )
      VALUES (
        authenticated_user_id,
        category_id,
        category_position
      )
      ON CONFLICT (user_id, system_category_id)
      DO UPDATE SET
        position = category_position,
        updated_at = pg_catalog.now();
    ELSE
      UPDATE public.user_categories
      SET
        position = category_position,
        updated_at = pg_catalog.now()
      WHERE id = category_id
        AND user_id = authenticated_user_id;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_user_favorite_categories(
  p_favorite_category_ids jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  authenticated_user_id uuid := auth.uid();
  category_id uuid;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.jsonb_typeof(p_favorite_category_ids) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Favorite category ids must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_array_length(p_favorite_category_ids) > 4 THEN
    RAISE EXCEPTION 'Maximum 4 favorite categories allowed'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.user_category_preferences
  SET
    is_favorite = false,
    updated_at = pg_catalog.now()
  WHERE user_id = authenticated_user_id;

  UPDATE public.user_categories
  SET
    is_favorite = false,
    updated_at = pg_catalog.now()
  WHERE user_id = authenticated_user_id;

  FOR category_id IN
    SELECT value::uuid
    FROM pg_catalog.jsonb_array_elements_text(p_favorite_category_ids)
  LOOP
    INSERT INTO public.user_category_preferences (
      user_id,
      system_category_id,
      is_favorite,
      position
    )
    SELECT
      authenticated_user_id,
      category_id,
      true,
      COALESCE(categories.position, 0)
    FROM public.system_categories AS categories
    WHERE categories.id = category_id
    ON CONFLICT (user_id, system_category_id)
    DO UPDATE SET
      is_favorite = true,
      updated_at = pg_catalog.now();

    UPDATE public.user_categories
    SET
      is_favorite = true,
      updated_at = pg_catalog.now()
    WHERE id = category_id
      AND user_id = authenticated_user_id;
  END LOOP;
END;
$$;

-- Add the access predicate before any task policy begins depending on it.
-- Its dates and purchase state come from the stored profile, never the call.
CREATE OR REPLACE FUNCTION public.has_current_user_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.refunded_at IS NULL
      AND (
        (
          profiles.tier = 'lifetime'::public.tier
          AND profiles.purchased_at IS NOT NULL
        )
        OR
        (
          profiles.tier = 'trialing'::public.tier
          AND profiles.trial_started_at IS NOT NULL
          AND profiles.trial_ends_at > pg_catalog.now()
        )
      )
  );
$$;

-- PostgreSQL grants EXECUTE to PUBLIC on newly created functions by default.
-- These entrypoints are only for signed-in app users.
REVOKE ALL ON FUNCTION
  public.schedule_current_user_account_deletion(),
  public.cancel_current_user_account_deletion(),
  public.get_current_user_favorite_category_ids(),
  public.get_current_user_cohort(),
  public.get_current_user_tier(),
  public.has_current_user_access(),
  public.increment_current_user_category_usage(uuid, uuid),
  public.update_current_user_category_positions(jsonb),
  public.update_current_user_favorite_categories(jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.schedule_current_user_account_deletion(),
  public.cancel_current_user_account_deletion(),
  public.get_current_user_favorite_category_ids(),
  public.get_current_user_cohort(),
  public.get_current_user_tier(),
  public.has_current_user_access(),
  public.increment_current_user_category_usage(uuid, uuid),
  public.update_current_user_category_positions(jsonb),
  public.update_current_user_favorite_categories(jsonb)
TO authenticated;

NOTIFY pgrst, 'reload schema';
