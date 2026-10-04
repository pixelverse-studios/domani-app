# Domani App Agent Guide

Domani is a React Native / Expo app for planning tomorrow tonight. This is the repository guide for coding agents. For product facts, check the current implementation, then `docs/domani-app-guide.md`, then older planning docs. User instructions take precedence over repository guidance.

## Collaboration and scope

- When a request is too vague to determine the intended work, ask a focused question before editing. If the user asks for an explanation to choose between scopes, explain the options and wait for their choice before implementing either one.
- Keep working through the authorized scope. Do not treat an exploratory answer, a review, or a draft plan as authorization for a production pricing change or deployment.
- When something goes wrong, explain the cause and what changed to fix it, or propose a concrete fix if it remains unresolved. Skip apologies that add no useful information.
- Plan tool use and batch independent reads or checks where practical. Avoid repeated searches, unnecessary reads, and testing beyond the material risk.
- Preserve unrelated local changes. Before editing, inspect the branch and working tree; do not overwrite another person's work. Make the smallest change that solves the request, match nearby style, and remove only code made unused by that change.

## Product and architecture

- The app uses Expo SDK 54, React Native 0.81, Expo Router, TypeScript, Supabase, RevenueCat, React Query, Zustand, PostHog, and Sentry. Verify versions in `package.json` before updating build instructions.
- The current access model is a 14-day trial followed by a one-time lifetime purchase. There is no recurring paid subscription or ongoing unpaid tier. `src/hooks/useSubscription.ts` owns the access state; `src/lib/revenuecat.ts` owns purchase integration.
- Billing surfaces include `src/components/PreTrialScreen.tsx`, `src/components/LockedScreen.tsx`, `src/components/PaywallModal.tsx`, and `src/components/settings/SubscriptionSection.tsx`. Do not revive old free-tier task limits or retired purchase SKUs.
- Use query hooks in `src/hooks/` for server state, providers in `src/providers/` for app-wide concerns, and Zustand stores in `src/stores/` for local state. The active theme is `sage` in `src/theme/themes.ts`; use `useAppTheme()` for theme values.
- Task operations are date-based around `scheduled_date`, not plan objects. Check the current code before applying older architecture notes.

## Pricing and entitlement safety

- For the 1.1.4 lifetime-price cutover, follow `docs/planning/1.1.4-pricing-cutover.md` and DEV-1555. All accounts created before the cutover keep the $9.99 offer indefinitely, including accounts in the `general` cohort and accounts with expired or never-started trials. New accounts get the $34.99 offer after cutover.
- Price eligibility must come from a server-owned cutover timestamp and the authenticated account's server-owned creation time. Do not use editable profile data, `signup_cohort` alone, trial status, or a locally guessed discount as the authority.
- Select the exact verified RevenueCat offering. If eligibility or the matching product is unavailable, show price-neutral copy and disable purchase; do not silently substitute another offer. Use the store-localized product price in purchase-facing UI.
- Price eligibility never grants access. Preserve lifetime purchases, promo grants, restoration, refunds, and the existing entitlement sync. Check older supported clients and both platforms before a cutover.
- DEV-1415 migration reconciliation and coordination with DEV-1418/DEV-1419 precede production schema or pricing activation. Stage and audit the migration and cutover sequence. Do not flip `public_pricing` as part of preparatory code work.

## Environments, data, and releases

- Staging is for development and internal QA; production builds and data changes require the production environment. This working copy uses a single `.env` file that the user switches manually between staging and production. Do not edit, rename, swap, or restore it during build preparation unless the user explicitly asks. Remind the user to select and later restore the intended environment. Check the active Supabase project, RevenueCat entitlement, EAS profile, and version settings before a build or data change. Never print or copy secret values into documentation, logs, issues, or PRs.
- When a build request does not identify its target, clarify whether it is an internal/QA build or a production store build. Read `app.json`, `eas.json`, and native version files for current version numbers rather than relying on copied version notes.
- Treat `npm run db:push` and `npm run db:staging:push` as real database writes. Reconcile migration history and validate on staging before any production push. Regenerate `src/types/supabase.ts` after schema changes using the appropriate environment's type generation command.
- Do not embed database credentials in agent guidance or command examples. Review package scripts before running data commands.

## Workflow

- Keep changes small, typed, accessible, and reviewable. Prefer clear names, reusable components when they eliminate real duplication, and focused code over explanatory sidecar documents. Put project documentation in `docs/`; use commits and PRs for change history instead of routine audit logs or session recap files.
- Link implementation to an existing Linear issue when one exists. Keep its scope and acceptance criteria visible. For new issues, check the current project and team taxonomy in Linear, with summary, current and target state, implementation notes, and acceptance criteria. Do not assume old Public Beta defaults still apply.
- Create a pull request for each meaningful completed change set unless the user directs otherwise. Use the requested base branch, then the task's established base branch; only default to `dev` when neither is known. Keep commits focused and include testing and remaining risks in the PR.
- Do not turn a draft preparatory PR into a claim that its full ticket is complete. State what remains, especially for billing, migrations, and releases.

## Verification

- Run focused tests for changed behavior, then `npm run typecheck` and targeted lint or formatting checks when relevant. Use `npm test -- --runInBand <test-path>` for a focused Jest run. Broaden testing only to address a concrete regression risk or required gate.
- For purchase changes, verify the disabled and available states, localized store price, selected package, purchase, restore, and account switching as appropriate. Simulator tests do not replace iOS and Android store sandbox checks for release readiness.
- Report what changed, what was tested, and any material unverified behavior. Do not imply a production rollout occurred because code or tests passed.
