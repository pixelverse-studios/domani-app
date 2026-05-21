# Release Test Workflow

This document defines the minimum local checks for Domani PRs and 1.1 release build prep. It covers TypeScript, lint, Jest, and Maestro smoke tests. Build-specific environment verification still follows the build preparation rules in the repo instructions.

## Local Test Commands

Run these from the repository root.

| Command                       | Purpose                                                   | When to run                                                                                                                  |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`           | Validates TypeScript with `tsc --noEmit`.                 | Before every PR and before release builds.                                                                                   |
| `npm run lint`                | Runs ESLint across TypeScript and TSX files.              | Before every PR and before release builds.                                                                                   |
| `npm run test:ci`             | Runs Jest once with `--runInBand --ci`.                   | Before every PR that changes app code; before release builds.                                                                |
| `npm run e2e:maestro`         | Runs the authenticated Android Maestro smoke flow.        | Before a 1.1 release build and before PRs that affect core navigation, task creation, feedback, settings, or tutorial flows. |
| `npm run e2e:maestro:welcome` | Runs the unauthenticated welcome/auth-gated launch check. | Before release builds and when auth-gated launch behavior changes.                                                           |
| `npm run e2e:maestro:android` | Alias for the authenticated Android Maestro smoke flow.   | Use when explicitly validating the Android smoke path.                                                                       |

## Minimum Checks Before Opening A PR

Every PR should have at least:

- `npm run typecheck`
- `npm run lint`

Run `npm run test:ci` when the PR changes app behavior, hooks, stores, providers, components, Supabase-facing logic, or existing test-covered surfaces. Documentation-only PRs may skip Jest if the changed files are markdown-only.

Run Maestro before opening a PR when the PR changes any covered end-to-end path:

- welcome/auth-gated launch
- Today tab launch or empty state
- Planning tab task creation
- Feedback submission
- Settings tutorial replay
- tutorial skip behavior

If Maestro is required but cannot be run locally, state the reason in the PR body and identify who or what environment should run it before merge.

## Minimum Checks Before A 1.1 Release Build

Before creating an installable 1.1 Android or iOS build, run:

```bash
npm run typecheck
npm run lint
npm run test:ci
```

For Android release confidence, also run:

```bash
npm run e2e:maestro:welcome
npm run e2e:maestro
```

Run `npm run e2e:maestro:welcome` first because it clears app state. After that check passes, sign in with the non-production test user again, then run `npm run e2e:maestro`.

Do not treat a build as release-ready if any required check fails. Fix the failure or document the explicit release-risk decision before continuing.

## Maestro Android Setup Notes

The Maestro smoke suite requires:

- Maestro installed locally.
- An Android emulator or physical Android device connected.
- A Domani Android test build installed with app package `com.baitedz.domaniapp`.
- A non-production authenticated test user for `npm run e2e:maestro` and `npm run e2e:maestro:android`.

The authenticated flow does not automate OAuth sign-in. Sign in manually before running it. If the test user is on the free tier, confirm it has remaining daily task capacity because the flow creates one task.

See `docs/technical/maestro-e2e.md` for the current Maestro flow coverage and scope exclusions.

## EAS Workflow Status

No EAS Workflow test automation is currently configured for these checks. If an EAS Workflow is added later, update this document with:

- the trigger event or manual trigger command
- required secrets or environment names
- where to find run results
- which failures block PR merge or release builds

## GitHub Actions PR Validation

The repository has a lightweight GitHub Actions workflow at `.github/workflows/pr-validation.yml`.
It runs on pull requests targeting `dev/**` and `epic/**`, installs dependencies with `npm ci`,
and runs:

```bash
npm run typecheck
npm run test:ci
npm run lint
```

This workflow is only a PR validation gate. It does not run EAS builds, store submissions, Gradle
release builds, or Xcode archives. Manual build preparation and store release work remain separate.
