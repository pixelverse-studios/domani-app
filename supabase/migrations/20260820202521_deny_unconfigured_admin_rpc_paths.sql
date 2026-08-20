-- The legacy admin RPCs were created in the Supabase dashboard, but their
-- backing admin_users/admin_roles/admin_permissions tables were never present
-- in staging or production. Keep the existing signatures backward-compatible
-- while failing closed and removing invalid relation references.

CREATE OR REPLACE FUNCTION public.get_user_role_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id uuid,
  p_resource text,
  p_action public.admin_action
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id uuid,
  p_action public.audit_action,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RAISE EXCEPTION 'Administrative authorization is not configured'
    USING ERRCODE = '42501';
END;
$function$;
