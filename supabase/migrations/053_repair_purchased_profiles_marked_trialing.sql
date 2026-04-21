-- DEV-783 / subscription-state repair:
-- Users with a recorded lifetime purchase must not remain in the local
-- trialing state. This repairs rows created before the client-side guard
-- and sync fixes landed.

UPDATE public.profiles
SET
  tier = 'lifetime'::public.tier,
  trial_ends_at = NULL,
  updated_at = NOW()
WHERE purchased_at IS NOT NULL
  AND refunded_at IS NULL
  AND tier = 'trialing'::public.tier;
