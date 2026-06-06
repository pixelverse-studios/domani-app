# App Store Connect Setup

This document reflects the current Domani monetization model.

## Current Model

Domani does not use monthly or annual subscriptions. Do not create subscription groups or subscription products for the app.

The supported model is:

- 14-day trial access
- Lifetime access through non-consumable in-app purchases
- Promotional lifetime access where configured through the supported purchase or grant flow

## iOS Products

Configure lifetime products as non-consumable in-app purchases in App Store Connect, then map those products in RevenueCat.

Current production entitlement:

- `Domani Lifetime`

Current staging/internal entitlement:

- `Domani Staging Lifetime`

## Required Capabilities

- In-App Purchase capability enabled for the iOS app.
- StoreKit configuration or sandbox tester available for local purchase testing.
- Restore purchases flow available in the app.
- RevenueCat product and entitlement mapping verified before release.

## Review Notes

App Review should be told that Domani is a lifetime purchase app with trial access. Do not describe it as an ongoing unpaid plan, recurring paid plan, or task-count-limited product.

## Pre-Release Checklist

- [ ] App Store Connect products are non-consumable lifetime purchases.
- [ ] RevenueCat maps products to the correct lifetime entitlement for the target environment.
- [ ] `.env` uses the correct RevenueCat API keys and entitlement ID for the build.
- [ ] Purchase, restore, refund/revocation, and trial access states have been tested.
