-- DEV-784 follow-up:
-- Extend purchase_refund_states so the local migration history matches staging.
-- The current app UX does not rely on `denied`, but the staging schema already
-- includes it in the enum, so local migrations and generated types must match.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'denied'
      AND enumtypid = 'public.refund_request_status'::regtype
  ) THEN
    ALTER TYPE public.refund_request_status ADD VALUE 'denied';
  END IF;
END $$;

COMMENT ON COLUMN public.purchase_refund_states.status IS
'Current known refund-request state. pending_review means Apple has an in-flight request; approved means the refund was granted; denied means Apple did not approve the request.';
