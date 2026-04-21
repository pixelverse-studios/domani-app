-- DEV-781: Support claim/finalize processing for RevenueCat webhook events
--
-- Adds bookkeeping fields so the webhook handler can claim an event row before
-- mutating profile state, then finalize the row after processing completes.

ALTER TABLE public.revenuecat_webhook_events
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS processing_error TEXT DEFAULT NULL;

COMMENT ON COLUMN public.revenuecat_webhook_events.processed_at IS
'Timestamp when the webhook event finished processing.';

COMMENT ON COLUMN public.revenuecat_webhook_events.processing_error IS
'Most recent processing error for the webhook event. NULL when processing completed successfully.';

GRANT UPDATE, DELETE ON public.revenuecat_webhook_events TO service_role;
