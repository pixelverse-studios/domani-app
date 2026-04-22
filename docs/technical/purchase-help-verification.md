# Purchase Help Verification

This guide covers the staging verification flow for Domani's purchase-help
experience across iOS and Android.

It is intended for product, engineering, and QA checks after purchase-help
changes land.

## Scope

Verify:

- purchase-help entry points
- platform-specific refund/help actions
- refund-state transitions
- backend webhook behavior
- observability / breadcrumb coverage

Do not use this guide for:

- App Store / Play Console submission steps
- generic onboarding QA unrelated to purchase-help

## Shared Preconditions

Before testing:

1. Use the staging build and staging Supabase environment.
2. Confirm the user has a valid `profiles` row.
3. Confirm the user is in the intended starting state:
   - fresh / no purchase
   - lifetime purchased
   - refunded
4. Use the correct platform test account:
   - iOS: sandbox Apple account
   - Android: internal Play testing account

## Entry Point Checks

Verify that purchase-help is reachable only from the intended paid/refunded
states.

### Settings

- `lifetime` should show the integrated purchase-help action in the plan card
- `refunded` should show refunded-state support / repurchase actions
- trial-only / unpaid states should not show refund help as if they already paid

### Locked / Refunded Screens

- refunded users should get purchase-help or repurchase actions
- trial-expired unpaid users should not be routed into refund-specific flows

### Paywall Support Fallback

- purchase/billing support fallback should route into the shared purchase-help
  path where appropriate

## iOS Verification

### Starting From A Paid Lifetime User

1. Log in with a staging iPhone user that has an active App Store-backed
   lifetime entitlement.
2. Open `Settings` -> `Purchase Help`.
3. Verify:
   - purchase-help opens
   - `Request Refund` is shown
   - support fallback is shown
4. Tap `Request Refund`.
5. Verify one of these outcomes:
   - Apple refund sheet opens
   - if the refund already exists, the app transitions into the
     `existing request` / `in review` state

### Post-Request State

After a refund request is submitted:

- the app should not keep offering the refund CTA immediately
- purchase-help should show the submitted / in-review state
- `purchase_refund_states` should reflect either:
  - `status = 'pending_review'`, or
  - `client_hint = 'duplicate_request'`

### Approved Refund

When the RevenueCat webhook processes the approved refund:

- `profiles.tier = 'none'`
- `profiles.refunded_at IS NOT NULL`
- `purchase_refund_states.status = 'approved'`
- the user becomes locked / refunded in app
- purchase-help should show the refunded-state messaging rather than a live
  refund CTA

### Restore / Repurchase After Refund

After a refund reversal or valid re-purchase:

- `profiles.tier = 'lifetime'`
- `profiles.refunded_at IS NULL`
- `purchase_refund_states` row is cleared
- the user leaves the refunded state in app

## Android Verification

### Starting From A Paid Google Play User

1. Log in with a staging Android user that has an active Google Play-backed
   entitlement.
2. Open `Settings` -> `Purchase Help`.
3. Verify:
   - Google Play purchase-help copy is shown
   - primary CTA opens Google Play order history / refund help
   - support fallback is shown

### Store Eligibility Guard

Android should only show the Google Play refund/help CTA when RevenueCat reports
the active entitlement store as `PLAY_STORE`.

Check these cases:

- Android user with real Play entitlement -> CTA shown
- Android user with iOS / App Store purchase or fallback lifetime state only ->
  CTA not shown, support-first messaging shown instead

### Refunded Android State

For a refunded Android user:

- purchase-help should not pretend there is a live Google Play refund action
- the primary action should be re-purchase
- support fallback should still be available

## Backend Verification

For all refund/recovery tests, confirm the backend path:

### RevenueCat Webhook

Inspect `public.revenuecat_webhook_events`:

- each webhook should have a durable `event_id`
- `processed_action` should match the expected outcome
- duplicate deliveries should not apply the state change twice

### Profiles

Inspect `public.profiles`:

- purchase grants set:
  - `tier = 'lifetime'`
  - `purchased_at IS NOT NULL`
  - `refunded_at IS NULL`
- refunds set:
  - `tier = 'none'`
  - `purchased_at IS NULL`
  - `refunded_at IS NOT NULL`

### Purchase Refund State

Inspect `public.purchase_refund_states`:

- successful iOS refund request -> `pending_review`
- duplicate-request suppression -> `client_hint = 'duplicate_request'`
- approved refund from webhook -> `status = 'approved'`
- restore / re-purchase / refund reversal -> row cleared

## Observability Checks

### Sentry / Breadcrumbs

Confirm the client emits useful breadcrumbs around:

- Android purchase-help opened
- Android monetization state resolution
- Android external billing handoff attempt
- Android external billing handoff success/failure
- Android support fallback opened

### RevenueCat Logs / Dashboard

Confirm:

- active entitlement store matches the platform expectation
- subscriber attributes are present where available:
  - email
  - display name
  - push token
  - `signup_cohort`
  - `signup_method`
  - `app_platform`

## Suggested Test Matrix

Use at least these user states:

1. fresh unpaid user
2. lifetime iOS user
3. lifetime Android user
4. refunded user
5. restored / re-purchased user

## Known Platform Differences

### iOS

- refund request is initiated from inside the app
- Apple decides the refund result asynchronously

### Android

- Domani sends the user to Google Play refund/help rather than opening a native
  in-app refund sheet
- final access state still depends on the backend refund pipeline
