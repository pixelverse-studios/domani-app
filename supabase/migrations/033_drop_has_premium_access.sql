-- DEV-10: Drop has_premium_access() — stale function name from old premium tier model.
-- The function was created outside of migrations (via dashboard) and is not called
-- anywhere in the application. The new tier model uses 'none' | 'trialing' | 'lifetime'.

DROP FUNCTION IF EXISTS public.has_premium_access(uuid);
