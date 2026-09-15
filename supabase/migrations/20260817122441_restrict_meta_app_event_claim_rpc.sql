-- DEV-1109: Supabase may grant anon explicit function execution through
-- project-level default privileges, so revoke it in addition to PUBLIC.

REVOKE ALL ON FUNCTION public.claim_meta_app_event(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_meta_app_event(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_meta_app_event(TEXT) TO authenticated;
