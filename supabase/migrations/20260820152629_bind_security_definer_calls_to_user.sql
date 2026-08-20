-- Every authenticated SECURITY DEFINER routine that accepts a user id must
-- bind that id to the caller before bypassing RLS.

CREATE OR REPLACE FUNCTION public.cancel_account_deletion(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE profiles
  SET
    deleted_at = NULL,
    deletion_scheduled_for = NULL
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_favorite_category_ids(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
    SELECT jsonb_agg(category_id) INTO v_result
    FROM (
        -- System category favorites
        SELECT ucp.system_category_id as category_id
        FROM public.user_category_preferences ucp
        WHERE ucp.user_id = p_user_id AND ucp.is_favorite = true

        UNION ALL

        -- User category favorites
        SELECT uc.id as category_id
        FROM public.user_categories uc
        WHERE uc.user_id = p_user_id AND uc.is_favorite = true
    ) favorites;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_cohort(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_cohort signup_cohort;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
    SELECT signup_cohort INTO v_cohort
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN v_cohort::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role_level(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_role admin_role;
  v_level INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  -- Get user's role
  SELECT role INTO v_role
  FROM admin_users
  WHERE user_id = p_user_id AND is_active = true;

  -- Get role level
  SELECT level INTO v_level
  FROM admin_roles
  WHERE name = v_role::TEXT;

  RETURN COALESCE(v_level, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
    SELECT tier::text
    FROM public.profiles
    WHERE id = p_user_id
      AND p_user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id uuid, p_resource text, p_action admin_action)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_role admin_role;
  v_has_permission BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  -- Get user's role
  SELECT role INTO v_role
  FROM admin_users
  WHERE user_id = p_user_id AND is_active = true;

  -- Check if user has permission
  SELECT EXISTS (
    SELECT 1
    FROM admin_permissions
    WHERE role = v_role
      AND (resource = p_resource OR resource = '*')
      AND action = p_action
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_category_usage(p_user_id uuid, p_system_category_id uuid DEFAULT NULL::uuid, p_user_category_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
    -- Increment user category usage if provided
    IF p_user_category_id IS NOT NULL THEN
        UPDATE public.user_categories
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = p_user_category_id
          AND user_id = p_user_id;
    END IF;

    -- Increment or create user preference for system category if provided
    IF p_system_category_id IS NOT NULL THEN
        INSERT INTO public.user_category_preferences (user_id, system_category_id, usage_count, position)
        VALUES (
            p_user_id,
            p_system_category_id,
            1,
            (SELECT COALESCE(position, 0) FROM public.system_categories WHERE id = p_system_category_id)
        )
        ON CONFLICT (user_id, system_category_id)
        DO UPDATE SET
            usage_count = public.user_category_preferences.usage_count + 1,
            updated_at = NOW();
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_user_id uuid, p_action audit_action, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_admin_user_id UUID;
  v_audit_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  -- Get admin user id
  SELECT id INTO v_admin_user_id
  FROM admin_users
  WHERE user_id = p_user_id;

  -- Insert audit log entry
  INSERT INTO admin_audit_log (
    user_id,
    admin_user_id,
    action,
    resource_type,
    resource_id,
    description,
    old_values,
    new_values,
    metadata
  ) VALUES (
    p_user_id,
    v_admin_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_description,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.schedule_account_deletion(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE profiles
  SET
    deleted_at = NOW(),
    deletion_scheduled_for = NOW() + INTERVAL '30 days'
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_category_positions(p_user_id uuid, p_category_positions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_item JSONB;
    v_category_id UUID;
    v_position INTEGER;
    v_is_system BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
    -- p_category_positions format: [{"id": "uuid", "position": 0, "isSystem": true}, ...]
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_category_positions)
    LOOP
        v_category_id := (v_item->>'id')::UUID;
        v_position := (v_item->>'position')::INTEGER;
        v_is_system := (v_item->>'isSystem')::BOOLEAN;

        IF v_is_system THEN
            -- Update or insert user preference for system category
            INSERT INTO public.user_category_preferences (user_id, system_category_id, position)
            VALUES (p_user_id, v_category_id, v_position)
            ON CONFLICT (user_id, system_category_id)
            DO UPDATE SET
                position = v_position,
                updated_at = NOW();
        ELSE
            -- Update user category position
            UPDATE public.user_categories
            SET position = v_position,
                updated_at = NOW()
            WHERE id = v_category_id
              AND user_id = p_user_id;
        END IF;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_favorite_categories(p_user_id uuid, p_favorite_category_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_category_id UUID;
    v_total_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
    -- Validate max 4 favorites
    v_total_count := jsonb_array_length(p_favorite_category_ids);
    IF v_total_count > 4 THEN
        RAISE EXCEPTION 'Maximum 4 favorite categories allowed';
    END IF;

    -- First, unfavorite all system category preferences for this user
    UPDATE public.user_category_preferences
    SET is_favorite = false, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Unfavorite all user categories for this user
    UPDATE public.user_categories
    SET is_favorite = false, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Now mark the selected categories as favorites
    FOR v_category_id IN SELECT jsonb_array_elements_text(p_favorite_category_ids)::UUID
    LOOP
        -- Try to update user_category_preferences (system categories)
        -- Use upsert in case the preference doesn't exist yet
        INSERT INTO public.user_category_preferences (user_id, system_category_id, is_favorite, position)
        SELECT p_user_id, v_category_id, true, COALESCE(
            (SELECT position FROM public.system_categories WHERE id = v_category_id),
            0
        )
        WHERE EXISTS (SELECT 1 FROM public.system_categories WHERE id = v_category_id)
        ON CONFLICT (user_id, system_category_id)
        DO UPDATE SET is_favorite = true, updated_at = NOW();

        -- Try to update user_categories (custom categories)
        UPDATE public.user_categories
        SET is_favorite = true, updated_at = NOW()
        WHERE id = v_category_id AND user_id = p_user_id;
    END LOOP;
END;
$function$;
