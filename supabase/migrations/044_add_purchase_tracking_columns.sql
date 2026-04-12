-- DEV-45/DEV-46: Add purchase and refund tracking columns to profiles
--
-- These timestamps are written by the RevenueCat webhook Edge Function
-- (service_role) when INITIAL_PURCHASE or REFUND events are received.
-- They are NOT written by the client app.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.profiles.purchased_at IS
'Timestamp of lifetime purchase, set by the RevenueCat webhook handler (INITIAL_PURCHASE event). NULL if user has never purchased.';

COMMENT ON COLUMN public.profiles.refunded_at IS
'Timestamp of most recent refund, set by the RevenueCat webhook handler (REFUND event). NULL if user has never been refunded.';
