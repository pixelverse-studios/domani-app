# Refund Handling

## Current Model

Domani sells a lifetime, non-renewing purchase through RevenueCat.

Current lifetime product IDs:

- `domani_lifetime`
- `domani_lifetime_early`
- `domani_lifetime_friends`

The backend source of truth for refund state is the RevenueCat webhook in
`supabase/functions/revenuecat-webhook/index.ts`.

The app also persists refund-request UI state in
`public.purchase_refund_states` so purchase-help can avoid re-offering the
same refund action when the platform has already received the request.

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
- `CANCELLATION` with `CUSTOMER_SUPPORT` for a lifetime product -> revoke access

Purchase, refund, and refund-reversal events for products outside the lifetime
SKU list are logged as `ignored_non_lifetime_product` and do not mutate profile
access.

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

## Purchase Refund State Tracking

The table `public.purchase_refund_states` stores the app-facing refund-request
state used by purchase-help.

Current meanings:

- `status = 'pending_review'`
  - the user successfully opened Apple’s refund flow from the app
  - or the current app session has a strong signal that the refund request is in flight
- `status = 'approved'`
  - the RevenueCat webhook has confirmed an App Store refund outcome and access was revoked
- `client_hint = 'duplicate_request'`
  - the app hit Apple’s “refund already requested” path and suppresses re-submission
  - this is a softer hint than an authoritative backend status

The row is cleared when:

- a valid purchase restores lifetime access
- a refund is reversed
- the user re-purchases successfully

## Purchase-Help Platform Behavior

### iOS

- paid App Store users get a native refund CTA through StoreKit / RevenueCat
- duplicate refund requests are suppressed through `purchase_refund_states`
- approved refunds transition the user into the refunded / locked state

### Android

- paid Google Play users are sent to Google Play order history / refund help
- Android refund completion still resolves through the backend webhook pipeline
- Android eligibility is only shown when RevenueCat reports the active entitlement
  store as `PLAY_STORE`
- Android refunds revoke access through `profiles`, but do not write Apple
  refund-request rows to `purchase_refund_states`

## Observability

Current observability lives in three places:

1. RevenueCat webhook logs
   - `public.revenuecat_webhook_events`
   - edge-function logs in `supabase/functions/revenuecat-webhook`
2. App-side refund state
   - `public.purchase_refund_states`
3. Client diagnostics / breadcrumbs
   - iOS purchase-help refund state transitions
   - Android purchase-help handoff breadcrumbs
   - Android monetization eligibility breadcrumbs
   - RevenueCat subscriber attribute sync logs

RevenueCat subscriber attributes now mirror a small support-facing subset of
user data:

- email
- display name
- push token when available
- `signup_cohort`
- `signup_method`
- `app_platform`
- device identifiers collected through RevenueCat where platform permissions allow

## QA Checklist

When testing refunds in staging:

1. Purchase lifetime access and verify:
   - `profiles.tier = 'lifetime'`
   - `profiles.purchased_at IS NOT NULL`
   - `profiles.refunded_at IS NULL`
   - `purchase_refund_states` has no row for the user
2. Issue a refund and verify:
   - a revenuecat webhook event row is recorded
   - `profiles.tier = 'none'`
   - `profiles.purchased_at IS NULL`
   - `profiles.refunded_at IS NOT NULL`
   - `purchase_refund_states.status = 'approved'`
   - the app resolves to `refunded`
   - locked/refunded copy is shown in app
3. Attempt restore with no active entitlement and verify:
   - access stays locked
   - restore error is shown intentionally
4. Re-purchase or reverse refund and verify:
   - `profiles.tier = 'lifetime'`
   - `profiles.refunded_at IS NULL`
   - `purchase_refund_states` row is cleared
   - the app leaves refunded state

See also:

- [`purchase-help-verification.md`](./purchase-help-verification.md)

## Notes

- Refunds should not restore trial eligibility.
- Refunded users should only regain access through a valid entitlement
  becoming active again.
