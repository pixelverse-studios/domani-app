-- DEV-45: Grant service_role access to profiles table
--
-- The RevenueCat webhook Edge Function uses the service_role key to
-- write purchase/refund state to profiles on behalf of any user.
-- service_role bypasses RLS but still needs explicit table-level
-- GRANTs to read and write rows.

GRANT SELECT, UPDATE ON public.profiles TO service_role;
