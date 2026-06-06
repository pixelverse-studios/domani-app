# RevenueCat Setup

This document reflects the current Domani access model.

## Current Model

Domani supports:

- 14-day trial access
- Lifetime purchase access
- Promotional lifetime access where explicitly granted

Domani does not support ongoing unpaid access or recurring paid subscription plans.

## Entitlements

Use environment-specific lifetime entitlements:

| Environment | Entitlement |
| --- | --- |
| Staging / internal QA | `Domani Staging Lifetime` |
| Production | `Domani Lifetime` |

The app reads the active entitlement from `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`.

## Products And Offerings

Configure products as lifetime purchases in the stores and map them to the matching RevenueCat entitlement for the target environment.

Expected product families include:

- General lifetime access
- Early-adopter lifetime access
- Friends and family or promotional lifetime access where supported

Do not add monthly or annual products unless the business model changes again and the code/docs are updated together.

## Required Environment Variables

Client:

- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`

Server/webhook:

- `REVENUECAT_WEBHOOK_SECRET`
- Supabase service-role/admin values required by the webhook runtime

Keep production and staging values separate. Do not expose secret keys in client-side environment variables.

## Validation Checklist

- [ ] Offerings load in staging and production builds.
- [ ] Lifetime purchase grants the expected entitlement.
- [ ] Restore purchases restores lifetime access.
- [ ] Trialing users receive full app access while the trial is active.
- [ ] Refunded or revoked purchases remove access.
- [ ] Webhook events update Supabase profiles without leaking secrets in logs.
