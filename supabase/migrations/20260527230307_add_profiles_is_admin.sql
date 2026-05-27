ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_admin IS
'Internal admin/tester marker for operational workflows such as purchase-state resets. Do not use as a client-trusted authorization flag without server-side controls.';

CREATE OR REPLACE FUNCTION public.prevent_profile_is_admin_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'is_admin cannot be changed by client profile updates';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_profile_is_admin_client_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_profile_is_admin_client_update ON public.profiles;
CREATE TRIGGER prevent_profile_is_admin_client_update
BEFORE UPDATE OF is_admin ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_is_admin_client_update();
