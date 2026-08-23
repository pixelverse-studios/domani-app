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

| Environment           | Entitlement               |
| --------------------- | ------------------------- |
| Staging / internal QA | `Domani Staging Lifetime` |
| Production            | `Domani Lifetime`         |

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
- `REVENUECAT_SECRET_API_KEY` — RevenueCat secret REST API key used only by the authenticated access-sync Edge Function
- `REVENUECAT_ENTITLEMENT_ID` — `Domani Staging Lifetime` in staging and `Domani Lifetime` in production
- `APP_ENV` — explicitly `staging` or `production`
- `REVENUECAT_ALLOW_SANDBOX_EVENTS` — optional emergency override; normally unset/false, especially in production
- Supabase service-role/admin values required by the webhook runtime

Keep production and staging values separate. Do not expose secret keys in client-side environment variables.

The client never sends tier, purchase timestamp, refund state, or RevenueCat identity as verified evidence. `sync-revenuecat-access` authenticates the Supabase user, fetches that user's subscriber record directly from RevenueCat, validates the environment-specific entitlement and allowed lifetime product, and then calls a service-only atomic database operation.

Deploy both access functions per environment:

```bash
npx supabase functions deploy sync-revenuecat-access --project-ref <project-ref>
npx supabase functions deploy revenuecat-webhook --project-ref <project-ref> --no-verify-jwt
```

`sync-revenuecat-access` requires JWT verification. `revenuecat-webhook` intentionally does not use Supabase JWT verification because it authenticates RevenueCat with `REVENUECAT_WEBHOOK_SECRET`.

## Validation Checklist

- [ ] Offerings load in staging and production builds.
- [ ] Lifetime purchase grants the expected entitlement.
- [ ] Restore purchases restores lifetime access.
- [ ] Trialing users receive full app access while the trial is active.
- [ ] Refunded or revoked purchases remove access.
- [ ] Webhook events update Supabase profiles without leaking secrets in logs.
- [ ] Staging purchase and restore call `sync-revenuecat-access` successfully.
- [ ] Paid promo confirmation succeeds only after server-side RevenueCat verification.
- [ ] Production ignores RevenueCat `SANDBOX` events unless an explicit, time-bounded override is approved.
