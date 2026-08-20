# Domani App

React Native / Expo mobile app for daily planning built around the principle "Plan tomorrow, tonight."

This file is the Codex-facing working guide for the current codebase and workflow. Prefer it over older project guidance when they conflict.

## Source Of Truth

When project documentation conflicts, use this order:

1. Current codebase
2. `docs/domani-app-guide.md`
3. Older planning or setup docs

Older docs may still reference beta-only behavior, old pricing assumptions, or retired purchase SKUs that are no longer current.

## Current Product State

- Beta development is complete.
- The team is preparing for a public paid launch.
- Current priority is paywall and monetization work, then App Store submission readiness.
- The app is no longer centered on the old limited daily-task model.

## Current Monetization Model

The current access model is implemented in `src/hooks/useSubscription.ts`.

- `pre_trial`: authenticated user has not started the free trial yet
- `trialing`: active 14-day free trial
- `lifetime`: lifetime purchase unlocked
- `expired`: trial ended without purchase
- `refunded`: lifetime purchase was refunded
- `beta`: legacy transitional state still supported in code, but not the primary product framing anymore

Current user-facing billing surfaces:

- `src/components/PreTrialScreen.tsx`
- `src/components/LockedScreen.tsx`
- `src/components/PaywallModal.tsx`
- `src/components/settings/SubscriptionSection.tsx`

RevenueCat configuration lives in `src/lib/revenuecat.ts`.

Important: the current paywall is lifetime-first with cohort-based offerings and a 14-day trial. Do not reintroduce the old free-tier task-limit assumptions unless explicitly requested.

## App Structure

Main app shell:

- `src/app/_layout.tsx`: root providers, auth cache clearing, analytics identity, Sentry identity, config bootstrap, notification handling, celebration flow, evening rollover orchestration
- `src/app/index.tsx`: initial redirect logic
- `src/app/(tabs)/_layout.tsx`: authenticated tab shell and tab visibility gating

Primary tabs:

- `src/app/(tabs)/index.tsx`: Today
- `src/app/(tabs)/planning.tsx`: Planning
- `src/app/(tabs)/feedback.tsx`: Feedback
- `src/app/(tabs)/analytics.tsx`: Progress
- `src/app/(tabs)/settings.tsx`: Settings

Supporting flows:

- `src/app/welcome.tsx`
- `src/app/login.tsx`
- `src/app/notification-setup.tsx`
- `src/app/auth/callback.tsx`
- `src/app/contact-support.tsx`

## Architecture

Core stack:

- Expo SDK 54
- React Native 0.81
- Expo Router
- React Query for server state
- Zustand for app and UI state
- Supabase for auth, database, remote config, and edge functions
- RevenueCat for purchases
- Expo Notifications for reminder scheduling
- PostHog for analytics
- Sentry for error monitoring

Key patterns used in the app:

- Query hooks under `src/hooks/` are the main data access layer
- Providers under `src/providers/` own boot-time concerns
- Zustand stores under `src/stores/` handle persisted local app state
- Theme access goes through `useAppTheme()`
- Task operations are date-based around `scheduled_date`, not plan objects

## Theme System

The app currently uses a single `sage` theme defined in `src/theme/themes.ts`.

- This is the actual source of truth for colors, gradients, spacing, radius, and themed assets
- `src/hooks/useAppTheme.ts` resolves the active theme
- `app.json` is configured for the sage icon and splash assets

Do not assume the older CSS-variable or multi-theme guidance is current. Follow the existing `themes.ts` implementation unless the task is explicitly a theme-system redesign.

## Data And Types

Supabase-generated types:

- `src/types/supabase.ts`
- `src/types/index.ts`

Regenerate after schema changes:

```bash
npx supabase gen types typescript --project-id exxnnlhxcjujxnnwwrxv > src/types/supabase.ts
```

Useful script aliases:

```bash
npm run db:types
npm run db:staging:types
```

## Environments

Current environment notes from the existing workflow:

- `.env.local` overrides `.env`
- staging is used for day-to-day development and internal testing
- production builds should use production env values only

Before changing build or release instructions, verify they still match the current EAS and Supabase setup in the repo.

## Workflow Expectations

### No Audit Logs

Do not create audit-log files for routine Codex work.

The older audit-log requirement is obsolete.

### Linear-Driven Work

The team works heavily in Linear.

- Prefer linking work to an existing Linear ticket
- If a task needs to be tracked and no ticket exists, create one or ask whether one should be created
- Keep implementation aligned to the ticket scope

### Pull Requests

Create a pull request for every meaningful change set unless the user explicitly says not to.

Default expectations:

- branch work should be reviewable
- commits should be clean and focused
- PRs should target the command-specified base branch first, then any user-specified base branch, and only fall back to `dev` when no target is specified

### Self-Documenting Code

Prefer self-documenting code and commit history over sidecar process docs.

- choose clear names
- keep functions small
- add comments only where intent is not obvious
- avoid comment noise that restates the code

## Linear Guidance

When creating or updating Linear work items, use current project context rather than the older beta framing.

Good ticket descriptions should include:

- summary
- current state
- target state
- implementation notes
- acceptance criteria

If an older ticket/project name still references beta, keep the existing Linear taxonomy unless the user asks to change it.

## Common Commands

```bash
npm start
npm run ios
npm run android
npm run typecheck
npm run lint
npm run format
npm run db:types
npm run db:push
npm run db:staging:push
npm run db:staging:types
```

The staging push uses the authenticated Supabase CLI with the staging project reference and verifies that the active `.env` block contains the staging `EXPO_PUBLIC_SUPABASE_URL`. Follow [the staging database workflow](docs/technical/staging-database-workflow.md); never place database credentials in tracked scripts.

## Build And Release Notes

When the user is preparing a build, first clarify whether it is:

- an internal / QA build using staging
- a production build for TestFlight / App Store / Play Store

Relevant version/config files:

- `app.json`
- Android native version files if native build metadata needs manual bumps

The current `app.json` app version is `1.0.36`.

## Documentation

Useful repo docs:

- `docs/domani-app-guide.md`
- `docs/FUTURE_WORK.md`
- `docs/plans/`
- `docs/technical/`
- `docs/features/`

Treat older setup docs carefully. Some still describe the previous business model.

## Practical Guidance For Codex

- Follow the current code, not stale product assumptions
- Treat billing, trial, and launch readiness as high-sensitivity areas
- Preserve the existing visual language unless the task is explicitly a redesign
- Keep changes small, typed, and production-oriented
- Prefer updating the real implementation over adding explanatory docs
