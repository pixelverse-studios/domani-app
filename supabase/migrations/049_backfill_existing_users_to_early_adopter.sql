-- DEV-38: Migrate existing users to early_adopter cohort
--
-- Preserve friends_family users, but move every other existing profile to
-- early_adopter so legacy/beta users receive the intended pricing cohort.

UPDATE public.profiles
SET
    signup_cohort = 'early_adopter'::public.signup_cohort,
    updated_at = NOW()
WHERE signup_cohort IS NULL
   OR signup_cohort != 'friends_family'::public.signup_cohort;
