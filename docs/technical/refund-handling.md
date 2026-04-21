# Refund Handling

## Current Model

Domani sells a lifetime, non-renewing purchase through RevenueCat.

The backend source of truth for refund state is the RevenueCat webhook in
`supabase/functions/revenuecat-webhook/index.ts`.

The client subscription state machine in `src/hooks/useSubscription.ts`
interprets:

- `tier = 'lifetime'` as purchased
- `refunded_at IS NOT NULL` as refunded and locked
- active RevenueCat entitlement as purchased or trialing when available

## Webhook Event Handling

The webhook currently treats these events as authoritative:

- `INITIAL_PURCHASE` -> grant lifetime access
- `NON_RENEWING_PURCHASE` -> grant lifetime access
- `REFUND` -> revoke lifetime access and mark `refunded_at`
- `REFUND_REVERSED` -> restore lifetime access and clear `refunded_at`
- `CANCELLATION` with `CUSTOMER_SUPPORT` for the lifetime product -> revoke access

For `CANCELLATION`, only refund-like reasons are treated as revocation:

- `CUSTOMER_SUPPORT`

Other cancellation events are logged and ignored.

## User Resolution

RevenueCat may send different app user identifiers across `app_user_id`,
`original_app_user_id`, and `aliases`.

The webhook resolves profiles by checking all UUID-like candidates in this order:

1. `app_user_id`
2. `original_app_user_id`
3. `aliases`

## Event Logging

The table `public.revenuecat_webhook_events` stores a durable log of processed
RevenueCat webhook events for:

- refund verification
- duplicate-event detection
- debugging staging and production payment issues

The RevenueCat `event.id` is required and is used as the idempotency key.

Each event is claimed in the log table before profile state changes are applied.
If the handler fails before completion, the claim is released so a later retry
can process the event again.

## QA Checklist

When testing refunds in staging:

1. Purchase lifetime access and verify:
   - `profiles.tier = 'lifetime'`
   - `profiles.purchased_at IS NOT NULL`
   - `profiles.refunded_at IS NULL`
2. Issue a refund and verify:
   - a revenuecat webhook event row is recorded
   - `profiles.tier = 'none'`
   - `profiles.purchased_at IS NULL`
   - `profiles.refunded_at IS NOT NULL`
   - the app resolves to `refunded`
   - locked/refunded copy is shown in app
3. Attempt restore with no active entitlement and verify:
   - access stays locked
   - restore error is shown intentionally
4. Re-purchase or reverse refund and verify:
   - `profiles.tier = 'lifetime'`
   - `profiles.refunded_at IS NULL`
   - the app leaves refunded state

## Notes

- Refunds should not restore trial eligibility.
- Refunded users should only regain access through a valid entitlement
  becoming active again.
