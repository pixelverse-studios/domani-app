# PostHog Product Analytics

## Purpose

PostHog is Domani's source for product funnel, usage, and retention reporting. RevenueCat and Supabase remain authoritative for purchase and access state. Meta reports ad delivery and Meta-attributed outcomes.

## Event Model

The acquisition funnel is:

1. `first_open`
2. `sign_in_completed`
3. `trial_started`
4. `planning_activated`
5. `lifetime_purchase_completed`

`planning_activated` is claimed only for the user's first non-tutorial task scheduled for today or tomorrow. The `profiles.planning_activated_at` column makes the event durable across devices and app reinstalls.

`trial_started` is emitted from a server-confirmed, user-scoped outbox. The database supplies the authoritative trial start time, expiry, and signup cohort. A stable event UUID plus a five-minute stale-claim window makes delivery safe across retries, reinstalls, cached sessions, and multiple devices. Direct account switches reset PostHog before the next user is identified.

General retention uses `app_opened`. Product retention uses the PostHog action `Meaningful Task Activity`, which combines:

- `task_created`
- `task_edited`
- `task_completed`
- `task_rolled_forward`

Purchase restoration and revoked access are tracked separately with `purchase_restored` and `access_revoked`; neither is counted as a new lifetime purchase.

Every new event includes platform, app version, app build, and country when available. Task titles, notes, and custom category names are not sent to PostHog.

## Dashboards

The idempotent PostHog configuration creates or updates:

- `Domani - Acquisition & Revenue`
  - Paid Acquisition Funnel
  - Acquisition Lifecycle Volume
  - Purchase and Access Outcomes
- `Domani - Retention`
  - D1, D7, and D14 general retention
  - D1, D7, and D14 product retention
- `Domani - Core Planning Loop`
  - Expanded Meaningful Task Activity
  - Real Planning Activations

Run the configuration with:

```bash
npm run posthog:configure
```

The command reads `POSTHOG_HOST`, `POSTHOG_PROJECT_ID`, and `POSTHOG_PERSONAL_API_KEY` from the environment or the local `.env`. It never prints the API key.

## v1.1.2 Trial Backfill

The trial repair script is dry-run by default. It intersects privacy-safe Supabase trial fields with identified PostHog 1.1.2 activity, rejects invalid trial windows, requires activity within 24 hours of the authoritative start, and skips users who already have `trial_started`.

```bash
npm run posthog:backfill:trials
```

Review the planned and skipped counts before applying. Apply is deliberately count-locked and requires the outbox migration to exist in the target environment:

```bash
npm run posthog:backfill:trials -- --apply --expected-count=REVIEWED_COUNT
```

The apply path verifies that the write key belongs to the PostHog project used for the dry run, then uses a deterministic event UUID and records delivery in Supabase. If an earlier run stopped after PostHog ingestion but before the delivery update, the next run reconciles the matching UUID instead of abandoning or resending it. The script reports planned, written, reconciled, and skipped counts without printing user IDs or secrets.

## Attribution Limitation

Campaign, ad-set, ad, and creative identifiers are not added speculatively. Until the app receives those identifiers through a reliable attribution or deep-link integration, PostHog product outcomes should be reported as campaign-period cohorts and compared with the pre-campaign baseline. Meta Ads Manager remains the source for spend, delivery, clicks, and Meta-attributed installs.

## Release Verification

Before relying on the dashboards:

1. Apply the `planning_activated_at` and PostHog trial outbox migrations to the target Supabase environment.
2. Install a build containing the updated analytics hooks.
3. Confirm each event once in PostHog Live Events using a test account.
4. Confirm tutorial activity does not produce `planning_activated`.
5. Confirm a second genuine task does not produce another `planning_activated`.
6. Confirm failed trials and failed purchases produce no success event.
7. Confirm restore produces `purchase_restored`, not `lifetime_purchase_completed`.
8. Confirm D1, D7, and D14 retention denominators use `trial_started` cohorts.
9. Confirm `trial_started` contains the original timestamp, distinct user ID, version, build, platform, and privacy-safe properties.
10. Switch directly from account A to account B and confirm their PostHog persons and events remain isolated.
