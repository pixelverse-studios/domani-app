# Profiles Table Cleanup Plan

## Goal

Refactor `public.profiles` into a smaller identity/account root table and move feature-specific user state into purpose-built tables.

This plan is staging-first: validate the full migration path in staging, capture all required production steps, then roll the same migrations into production once the app and server paths are ready.

## Explicit Non-Scope

This cleanup does not include daily planning schema work.

Do not include or change:

- `plans`
- `plan_status`
- task `plan_id`
- old daily plan lifecycle fields
- any plan-removal epic cleanup

`DEV-187` is stale because the plans table cleanup it describes has already been superseded by later schema work. The active scope here is only `profiles` and profile-adjacent user state.

## Target Architecture

Keep `public.profiles` focused on stable identity fields:

- `id`
- `email`
- `full_name`
- `created_at`
- `updated_at`

Move operational state into tables owned by the feature area that uses it.

### `public.user_preferences`

General app preferences.

- `user_id`
- `timezone`
- `auto_sort_categories`
- `reminder_shortcuts`
- `created_at`
- `updated_at`

### `public.notification_preferences`

Planning reminder and notification setup state.

- `user_id`
- `notification_onboarding_completed`
- `planning_reminder_time`
- `planning_reminder_enabled`
- `created_at`
- `updated_at`

### `public.user_push_tokens`

Push token registration and invalidation state.

- `user_id`
- `expo_push_token`
- `push_token_invalid_at`
- `platform`
- `created_at`
- `updated_at`

### `public.user_access_state`

Trial, purchase, refund, and RevenueCat state.

- `user_id`
- `tier`
- `revenuecat_user_id`
- `signup_cohort`
- `signup_method`
- `trial_started_at`
- `trial_ends_at`
- `purchased_at`
- `refunded_at`
- `created_at`
- `updated_at`

### `public.onboarding_state`

Tutorial and app onboarding progress.

- `user_id`
- `tutorial_completed_at`
- `created_at`
- `updated_at`

### `public.user_activity`

Activity tracking.

- `user_id`
- `last_active_at`
- `created_at`
- `updated_at`

### `public.account_deletion_state`

Soft deletion and reactivation workflow state.

- `user_id`
- `deleted_at`
- `deletion_scheduled_for`
- `created_at`
- `updated_at`

## Phase 0: Production Dependency Audit

Before schema changes, confirm whether anything outside the app writes or reads profile fields:

- Supabase SQL snippets or scheduled jobs
- RevenueCat webhook expectations
- support/admin workflows
- `profiles_dashboard` or other reporting views
- Edge Functions
- local scripts
- documentation used for release/support operations

Capture before-state production notes:

- current profile columns
- row counts
- null counts for migration candidates
- RLS policies
- functions returning or mutating `public.profiles`
- views depending on profile columns

## Phase 1: Immediate Safe Cleanup

Drop only fields with no app/runtime usage:

- `profiles.avatar_url`
- `profiles.push_token_last_verified_at`, if no external notification sender writes it

Update generated types and test factories after the migration.

Staging validation:

```bash
npm run db:staging:push
npm run db:staging:types
npm run typecheck
npm run test:ci
```

Production action later:

```bash
npm run db:push
npm run db:types
```

## Phase 2: Add Normalized Tables

Add the new tables without removing old profile columns.

Backfill every new table from the current `profiles` rows. Add RLS policies equivalent to current self-profile access. Add service-role access where required by Edge Functions.

This phase must be additive only so existing app builds continue to work.

## Phase 3: Dual-Write Compatibility

Update app and server write paths to write both the old `profiles` columns and the new normalized tables.

Primary app touchpoints:

- `src/hooks/useProfile.ts`
- `src/hooks/useSubscription.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useActivityTracking.ts`
- `src/stores/tutorialStore.ts`
- `src/providers/AuthProvider.tsx`
- `src/app/notification-setup.tsx`
- `src/app/index.tsx`

Primary server/database touchpoints:

- `supabase/functions/revenuecat-webhook/index.ts`
- `ensure_profile_exists_for_auth_user`
- `ensure_current_user_profile`
- `get_user_tier`
- `get_user_cohort`
- account deletion RPCs
- profile dashboard/reporting views

Keep old profile columns populated during this phase.

## Phase 4: Switch Reads to New Tables

Replace broad `profiles.select('*')` reads with feature-specific hooks.

Expected app shape:

- `useProfile`: identity only
- `useUserPreferences`
- `useNotificationPreferences`
- `useSubscriptionState`
- `useOnboardingState`
- `useAccountDeletionState`

Where ergonomics require a combined account object, compose the smaller hooks instead of re-expanding `profiles`.

## Phase 5: Staging Destructive Rehearsal

In staging only, drop migrated columns from `profiles` after the app reads from the new tables.

Expected final drop list:

- `auto_sort_categories`
- `expo_push_token`
- `push_token_invalid_at`
- `notification_onboarding_completed`
- `planning_reminder_enabled`
- `planning_reminder_time`
- `purchased_at`
- `refunded_at`
- `reminder_shortcuts`
- `revenuecat_user_id`
- `signup_cohort`
- `signup_method`
- `tier`
- `timezone`
- `trial_ends_at`
- `trial_started_at`
- `tutorial_completed_at`
- `last_active_at`
- `deleted_at`
- `deletion_scheduled_for`

Regenerate staging types and run full QA against staging.

Staging QA checklist:

- new signup creates all normalized rows
- Google sign-in works
- Apple sign-in works
- missing-profile recovery works
- notification setup persists correctly
- planning reminder scheduling works
- app-open rollover still uses the planning reminder time
- tutorial starts and completion persists
- trial start and expiry work
- RevenueCat purchase and restore work
- RevenueCat refund webhook revokes access
- account deletion and reactivation work
- settings updates persist correctly
- TypeScript build passes
- unit test suite passes

## Phase 6: Production Rollout

Production should use an adoption window because mobile users may keep older app builds installed.

Recommended sequence:

1. Push additive normalized-table migrations.
2. Deploy dual-write app/server changes.
3. Verify old and new tables stay in sync.
4. Deploy read-switch app release.
5. Monitor for at least one release window.
6. Push destructive profile-column cleanup migration only after old-build risk is acceptable.

Production verification before destructive drop:

- all users have `user_access_state`
- all users have `user_preferences`
- all users have `notification_preferences`
- all users have `onboarding_state`
- all users have `user_activity`, or are expected to be missing until next app open
- all users with deletion state have matching `account_deletion_state`
- profile and normalized-table values match for every migrated column
- RevenueCat webhook updates normalized access state
- account deletion RPCs no longer depend on deleted profile columns

## Key Risks

Mobile version drift is the main risk. Older app builds may still read or write `profiles`, so production should not drop old columns immediately.

Subscription state is the highest-impact migration group. Move `tier`, trial fields, purchase/refund fields, `revenuecat_user_id`, and `signup_cohort` together.

RLS and database functions must be updated before dropping `profiles.tier`, because task access and subscription decisions currently depend on profile-backed functions.

## Suggested Ticket Breakdown

1. Add normalized profile-adjacent tables and backfill.
2. Dual-write app and server profile state to normalized tables.
3. Read preferences, notifications, onboarding, access, activity, and deletion state from normalized tables.
4. Move RevenueCat, account deletion, and profile recovery database functions to normalized tables.
5. Rehearse destructive profile-column drop in staging.
6. Apply production destructive cleanup after the adoption window.
7. Refresh database and support documentation after final cleanup.
