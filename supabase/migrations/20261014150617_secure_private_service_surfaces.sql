-- DEV-1418 compatibility phase. Keep private service surfaces inaccessible
-- through client roles without changing released task or profile paths.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- The dashboard joins auth.users and must use the querying service role's
-- privileges, rather than the view owner's privileges.
ALTER VIEW public.profiles_dashboard SET (security_invoker = true);
REVOKE ALL ON TABLE public.profiles_dashboard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles_dashboard TO service_role;

-- Webhook payloads include purchase data and are only used by the server.
ALTER TABLE public.revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.revenuecat_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.revenuecat_webhook_events TO service_role;
