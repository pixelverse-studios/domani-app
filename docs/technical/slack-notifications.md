# Slack Notifications

Domani routes team notifications through the `team-notification` Supabase Edge Function. The mobile app sends typed notification events to Supabase; the Edge Function chooses the Slack destination and builds the final Slack message using server-side webhook secrets.

## Channels and Secrets

The current Slack channel mapping is:

| Slack channel | Supabase secret | Current events |
| --- | --- | --- |
| `#domani-support` | `SLACK_SUPPORT_WEBHOOK_URL` | feedback, support requests |
| `#domani-accounts` | `SLACK_ACCOUNTS_WEBHOOK_URL` | new signups |
| `#domani-errors` | `SLACK_ERRORS_WEBHOOK_URL` | reserved for error alerts |
| `#domani-revenue` | `SLACK_REVENUE_WEBHOOK_URL` | purchase/refund lifecycle alerts |

Do not add Slack webhook URLs to `.env` or any `EXPO_PUBLIC_*` variable. Slack webhook URLs must stay in Supabase secrets because public Expo environment variables are bundled into the app.

## Supabase Secret Setup

Set the secrets in each Supabase project that should send Slack notifications:

```bash
supabase secrets set SLACK_SUPPORT_WEBHOOK_URL="https://hooks.slack.com/services/..."
supabase secrets set SLACK_ACCOUNTS_WEBHOOK_URL="https://hooks.slack.com/services/..."
supabase secrets set SLACK_ERRORS_WEBHOOK_URL="https://hooks.slack.com/services/..."
supabase secrets set SLACK_REVENUE_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

If staging and production share a Slack workspace, either use separate staging channels/webhooks or make sure every staging message includes an environment label. The `team-notification` function includes the current environment value from `APP_ENV` or `ENVIRONMENT` when available.

## Current App Events

Current app-originated notification events:

- `new_signup`
- `feedback`
- `support_request`

These notifications are fire-and-forget from the app. If the Edge Function or Slack is unavailable, the app logs a warning and continues the user-facing flow.

The Edge Function expects an authenticated Supabase session and rejects notification payloads whose email does not match the authenticated user's email. This prevents app clients from spoofing another user's notification identity.

## RevenueCat Events

Revenue lifecycle alerts are emitted from the `revenuecat-webhook` Supabase Edge Function after the authoritative database state transition succeeds.

Current revenue notification events:

- lifetime purchase granted
- refund/access revoked
- refund reversed/access restored
- RevenueCat event could not be matched to a Domani user
- RevenueCat webhook processing failed

Revenue alerts are best-effort. If Slack is unavailable or `SLACK_REVENUE_WEBHOOK_URL` is missing, the RevenueCat webhook logs the notification failure and preserves its existing webhook response behavior.

## Payload Format

The app sends a typed JSON payload to `team-notification`. The Edge Function builds Slack `blocks` with a plain-text fallback:

- Header: notification type
- Fields: user email, category, device/app details when available
- Body: feedback message or support description
- Context: Domani notification source, environment, and timestamp
