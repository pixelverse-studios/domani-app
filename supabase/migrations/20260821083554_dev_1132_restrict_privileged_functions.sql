-- DEV-1132: finish the privileged-function authority model established by the
-- DEV-1140 containment pass. New app RPCs derive identity from auth.uid(); the
-- old UUID signatures remain as validated SECURITY INVOKER compatibility
-- adapters for installed clients.

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

-- Backward-compatible adapters validate the legacy user id, then delegate to
-- current-user routines. They no longer execute with definer authority.
CREATE OR REPLACE FUNCTION public.schedule_account_deletion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.schedule_current_user_account_deletion();
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.cancel_current_user_account_deletion();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_favorite_category_ids(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN public.get_current_user_favorite_category_ids();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_cohort(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN public.get_current_user_cohort();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_user_id IS NOT DISTINCT FROM auth.uid()
      THEN public.get_current_user_tier()
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.increment_category_usage(
  p_user_id uuid,
  p_system_category_id uuid DEFAULT NULL,
  p_user_category_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.increment_current_user_category_usage(
    p_system_category_id,
    p_user_category_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_category_positions(
  p_user_id uuid,
  p_category_positions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.update_current_user_category_positions(p_category_positions);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_favorite_categories(
  p_user_id uuid,
  p_favorite_category_ids jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  PERFORM public.update_current_user_favorite_categories(
    p_favorite_category_ids
  );
END;
$$;

-- The dashboard-captured admin RPCs have no configured authorization backend
-- and already fail closed. They are no longer privileged or client-executable.
ALTER FUNCTION public.get_user_role_level(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_user_role_level(uuid) SET search_path = '';
ALTER FUNCTION public.has_permission(uuid, text, public.admin_action) SECURITY INVOKER;
ALTER FUNCTION public.has_permission(uuid, text, public.admin_action) SET search_path = '';
ALTER FUNCTION public.log_audit_event(
  uuid,
  public.audit_action,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) SECURITY INVOKER;
ALTER FUNCTION public.log_audit_event(
  uuid,
  public.audit_action,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) SET search_path = '';
ALTER FUNCTION public.sync_auth_user_to_profile(uuid) SET search_path = '';

REVOKE ALL ON FUNCTION public.get_user_role_level(uuid)
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text, public.admin_action)
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.log_audit_event(
  uuid,
  public.audit_action,
  text,
  text,
  text,
  jsonb,
  jsonb,
  jsonb
) FROM PUBLIC, anon, authenticated, service_role;

-- Remove implicit client access from every remaining privileged public
-- function, then restore only the deliberate mobile/RLS entrypoints below.
DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT procedure.oid::regprocedure AS signature
    FROM pg_catalog.pg_proc AS procedure
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prosecdef
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      target.signature
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authorize_meta_app_event_dispatch(uuid, text, uuid)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(uuid, text, jsonb)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_meta_app_events(uuid)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_current_user_refund_request_state()
TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_current_user_promo_redemption(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile()
TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_meta_app_event_claim_status(uuid, text)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_beta_phase()
TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_current_user_refund_request_pending(
  text,
  text,
  text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_current_user_duplicate_refund_request_hint(
  text,
  text,
  text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_meta_app_event_dispatch(uuid, text, uuid)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_current_user_promo_redemption_attempt(
  uuid,
  text,
  public.promo_redemption_status,
  text,
  text,
  jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, text, text)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.schedule_current_user_account_deletion(),
  public.cancel_current_user_account_deletion(),
  public.get_current_user_favorite_category_ids(),
  public.get_current_user_cohort(),
  public.get_current_user_tier(),
  public.increment_current_user_category_usage(uuid, uuid),
  public.update_current_user_category_positions(jsonb),
  public.update_current_user_favorite_categories(jsonb)
TO authenticated;

-- Preserve installed-client compatibility without restoring definer authority.
REVOKE ALL ON FUNCTION public.schedule_account_deletion(uuid),
  public.cancel_account_deletion(uuid),
  public.get_favorite_category_ids(uuid),
  public.get_user_cohort(uuid),
  public.get_user_tier(uuid),
  public.increment_category_usage(uuid, uuid, uuid),
  public.update_category_positions(uuid, jsonb),
  public.update_favorite_categories(uuid, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.schedule_account_deletion(uuid),
  public.cancel_account_deletion(uuid),
  public.get_favorite_category_ids(uuid),
  public.get_user_cohort(uuid),
  public.get_user_tier(uuid),
  public.increment_category_usage(uuid, uuid, uuid),
  public.update_category_positions(uuid, jsonb),
  public.update_favorite_categories(uuid, jsonb)
TO authenticated;

-- Maintenance/destructive entrypoints are callable only by trusted service
-- code (and their postgres owner, including pg_cron jobs).
REVOKE ALL ON FUNCTION public.cleanup_expired_sessions(),
  public.confirm_promo_redemption_for_user(uuid, uuid, uuid, uuid, text, text, text),
  public.delete_expired_accounts(),
  public.delete_user_by_email(text),
  public.ensure_profile_exists_for_auth_user(uuid),
  public.handle_new_user(),
  public.sync_auth_user_to_profile(uuid)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions(),
  public.confirm_promo_redemption_for_user(uuid, uuid, uuid, uuid, text, text, text),
  public.delete_expired_accounts(),
  public.delete_user_by_email(text),
  public.ensure_profile_exists_for_auth_user(uuid),
  public.sync_auth_user_to_profile(uuid)
TO service_role;

-- Task inserts now call the current-user helper directly. The legacy helper
-- remains available only for older installed clients and prior policy text.
ALTER POLICY "Users can insert tasks" ON public.tasks
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND (
    public.is_beta_phase()
    OR public.get_current_user_tier() = ANY (ARRAY['trialing'::text, 'lifetime'::text])
  )
);

-- Supabase now treats Data API exposure as opt-in. Make that invariant
-- explicit for objects subsequently created by the postgres migration owner.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT, UPDATE ON SEQUENCES
  FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.schedule_current_user_account_deletion() IS
'Schedules deletion for auth.uid(); clients cannot select a target account.';
COMMENT ON FUNCTION public.cancel_current_user_account_deletion() IS
'Cancels deletion for auth.uid(); clients cannot select a target account.';
COMMENT ON FUNCTION public.get_current_user_tier() IS
'Returns tier for auth.uid() for RLS and current-user compatibility paths.';

NOTIFY pgrst, 'reload schema';
