-- DEV-781: Track RevenueCat webhook events for refund verification and idempotency
--
-- Keeps a durable audit trail of purchase/refund/recovery events received from
-- RevenueCat and gives the webhook handler a stable idempotency key via
-- RevenueCat's event.id.

CREATE TABLE IF NOT EXISTS public.revenuecat_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  app_user_id TEXT,
  original_app_user_id TEXT,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_id TEXT,
  store TEXT,
  environment TEXT,
  event_timestamp TIMESTAMPTZ,
  processed_action TEXT NOT NULL,
  raw_event JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_event_type
  ON public.revenuecat_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_app_user_id
  ON public.revenuecat_webhook_events (app_user_id);

CREATE INDEX IF NOT EXISTS idx_revenuecat_webhook_events_created_at
  ON public.revenuecat_webhook_events (created_at DESC);

COMMENT ON TABLE public.revenuecat_webhook_events IS
'Durable log of RevenueCat webhook events used for refund verification, debugging, and idempotent processing.';

COMMENT ON COLUMN public.revenuecat_webhook_events.event_id IS
'Unique RevenueCat webhook event identifier. Used as the idempotency key.';

COMMENT ON COLUMN public.revenuecat_webhook_events.processed_action IS
'How the webhook handler classified the event, for example granted_lifetime, revoked_refund, restored_refund, or ignored_unhandled.';

GRANT SELECT, INSERT ON public.revenuecat_webhook_events TO service_role;
