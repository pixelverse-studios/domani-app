CREATE OR REPLACE VIEW public.profiles_dashboard AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.signup_cohort,
  p.signup_method,
  p.timezone,
  p.created_at,
  p.deleted_at,
  p.last_active_at,
  au.last_sign_in_at
FROM public.profiles p
JOIN auth.users au ON au.id = p.id;
