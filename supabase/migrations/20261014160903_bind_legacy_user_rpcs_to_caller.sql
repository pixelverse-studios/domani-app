-- DEV-1418 compatibility phase. Keep released-client RPC names and arguments,
-- but bind their user id to the authenticated caller. The current-user RPCs
-- own the actual reads and writes so the two paths cannot drift.

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
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.get_current_user_tier();
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
  PERFORM public.update_current_user_favorite_categories(p_favorite_category_ids);
END;
$$;
