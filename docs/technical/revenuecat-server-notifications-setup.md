# RevenueCat Server Notifications Setup

This guide covers the external platform setup required for refund handling to work end to end:

- Apple App Store Server Notifications -> RevenueCat
- Google Play Real-time Developer Notifications -> RevenueCat
- RevenueCat webhook delivery -> Supabase
- Terms of Service refund-policy copy that must live on the website

Use this guide for `DEV-250`.

## Purpose

Domani already has app-side refund handling and a Supabase Edge Function that can process RevenueCat purchase / refund events:

- [supabase/functions/revenuecat-webhook/index.ts](/Users/phil/PVS-local/Projects/domani/domani-app/supabase/functions/revenuecat-webhook/index.ts)

But refund state remains incomplete until the upstream server notifications are configured in Apple and Google so RevenueCat receives authoritative purchase lifecycle events.

## End-To-End Flow

The intended flow is:

1. Apple App Store or Google Play emits a purchase / refund lifecycle event.
2. RevenueCat receives and interprets the platform event.
3. RevenueCat forwards the normalized webhook event to Domani's Supabase Edge Function.
4. Supabase updates `public.profiles` with the authoritative purchase or refund timestamps and access state.

Without the platform-to-RevenueCat step, refunded users may keep access longer than they should.

## Current Repo Dependencies

The repo-side pieces already exist:

- RevenueCat webhook handler:
  [supabase/functions/revenuecat-webhook/index.ts](/Users/phil/PVS-local/Projects/domani/domani-app/supabase/functions/revenuecat-webhook/index.ts)
- purchase / refund tracking migration:
  - [supabase/migrations/044_add_purchase_tracking_columns.sql](/Users/phil/PVS-local/Projects/domani/domani-app/supabase/migrations/044_add_purchase_tracking_columns.sql)

This ticket is mostly about completing the missing external configuration and documenting verification.

## Environment Inputs

Before configuring anything, confirm the active values for each environment:

- RevenueCat project
- Apple app / bundle ID
- Google Play app
- Supabase project ref
- `REVENUECAT_WEBHOOK_SECRET`
- RevenueCat webhook URL

For Domani, the RevenueCat -> Supabase webhook URL format is:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook
```

Example staging URL:

```text
https://ftgltnzejaxasdvfkqut.supabase.co/functions/v1/revenuecat-webhook
```

## Apple App Store Server Notifications

### Goal

Apple should send App Store Server Notifications V2 to RevenueCat so RevenueCat receives refund and entitlement lifecycle changes directly from Apple.

### Steps In App Store Connect

1. Open `App Store Connect -> Apps -> Domani -> App Information`.
2. Find `App Store Server Notifications`.
3. Set the server notification URL to RevenueCat:

```text
https://api.revenuecat.com/v1/subscribers/app_store/notifications
```

4. Choose **Version 2** notifications.
5. Save the configuration.

### RevenueCat Apple Configuration Check

In RevenueCat, verify the Apple app configuration includes:

- correct bundle ID
- App Store shared secret if applicable
- In-App Purchase key / StoreKit 2 configuration

Relevant existing setup doc:

- [docs/APP_STORE_CONNECT_SETUP.md](/Users/phil/PVS-local/Projects/domani/domani-app/docs/APP_STORE_CONNECT_SETUP.md)

### Apple Validation Evidence

Capture for ticket completion:

- screenshot of App Store Server Notifications V2 configuration
- screenshot of RevenueCat Apple app settings showing no configuration errors
- sandbox refund / lifecycle event visible in RevenueCat

## Google Play Real-time Developer Notifications

### Goal

Google Play should publish RTDN events to RevenueCat's Pub/Sub topic so RevenueCat can process Android refund and purchase state changes.

### Prerequisite

The RevenueCat Google service-account integration must already be configured.

Reference:

- [docs/technical/GOOGLE_PLAY_SERVICE_ACCOUNT_REVENUECAT.md](/Users/phil/PVS-local/Projects/domani/domani-app/docs/technical/GOOGLE_PLAY_SERVICE_ACCOUNT_REVENUECAT.md)

### Steps In Google Play Console

1. Open `Google Play Console -> Monetization setup`.
2. Find `Real-time developer notifications`.
3. Set the Pub/Sub topic to the RevenueCat-provided topic for the Android app.
4. Save the configuration.

### RevenueCat Google Configuration Check

In RevenueCat, verify:

- Google service-account key is accepted
- Android app and products are visible
- RTDN setup shows as healthy or configured

### Google Validation Evidence

Capture for ticket completion:

- screenshot of Play Console RTDN configuration
- screenshot of RevenueCat Android app settings showing healthy configuration
- test purchase / refund lifecycle event visible in RevenueCat

## RevenueCat -> Supabase Webhook Verification

Platform notifications into RevenueCat are only half the chain. Domani still depends on RevenueCat forwarding events into Supabase.

### Required Remote Settings

For each environment:

- RevenueCat webhook URL points to the correct Supabase project
- RevenueCat webhook Authorization header uses:

```text
Bearer <REVENUECAT_WEBHOOK_SECRET>
```

- Supabase project secret `REVENUECAT_WEBHOOK_SECRET` matches exactly

### Database Verification

After a sandbox purchase or refund, verify the affected profile directly:

```sql
select *
from public.profiles
where id = '<SUPABASE_AUTH_USER_ID>';
```

For a purchase:

- `tier = 'lifetime'`
- `public.profiles.purchased_at IS NOT NULL`
- `public.profiles.refunded_at IS NULL`

For a refund:

- `tier = 'none'`
- `public.profiles.purchased_at IS NULL`
- `public.profiles.refunded_at IS NOT NULL`

### Current Known Risk

If the target `public.profiles` row does not change after sandbox purchase / refund tests, the RevenueCat -> Supabase leg is still broken even if Apple / Google -> RevenueCat is configured.

## Terms Of Service Refund Policy Copy

This repo does not contain the live website terms page, so the final legal copy must still be applied in the website / legal system that serves:

- `https://www.domani-app.com/terms`

Recommended minimum refund language:

> Refunds: All purchases are processed through Apple App Store or Google Play Store. Refund requests must be submitted directly to Apple or Google according to their respective refund policies.

For ticket completion, capture:

- link to the updated live terms page
- screenshot or diff of the added refund-policy language

## Acceptance Checklist

- [ ] App Store Server Notifications V2 configured in App Store Connect
- [ ] RevenueCat receiving iOS lifecycle notifications
- [ ] Google Play RTDN configured
- [ ] RevenueCat receiving Android lifecycle notifications
- [ ] RevenueCat webhook forwarding into Supabase verified
- [ ] Sandbox refund event observed in RevenueCat
- [ ] Supabase profile access revoked and `refunded_at` recorded from webhook
- [ ] Refund policy added to live Terms of Service

## What This Ticket Does Not Complete Locally

This repo can document and verify the path, but it cannot by itself:

- click App Store Connect settings
- click Google Play Console settings
- upload RevenueCat dashboard credentials
- publish the website Terms of Service update

Those require browser-side work with the appropriate platform permissions.

## Official References

- RevenueCat App Store Server Notifications:
  https://www.revenuecat.com/docs/platform-resources/server-notifications/apple-server-notifications
- RevenueCat Google server notifications:
  https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications
- Apple App Store Server Notifications:
  https://developer.apple.com/documentation/appstoreservernotifications
- Google Play Real-time developer notifications:
  https://developer.android.com/google/play/billing/rtdn-reference
