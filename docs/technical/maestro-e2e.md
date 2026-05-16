# Maestro E2E Smoke Tests

This project keeps a small Maestro smoke suite for local release confidence before manual Android builds. The first pass is Android-only and avoids payment purchase flows.

## Prerequisites

- Maestro installed locally.
- An Android emulator or physical Android device connected with the Domani test build installed.
- App package: `com.baitedz.domaniapp`.
- For the authenticated smoke flow, the installed app must already be signed in with a test user. Domani uses OAuth-only sign-in, so the smoke flow intentionally does not automate login.

## Commands

Run the unauthenticated launch/auth-gate check:

```bash
npm run e2e:maestro:welcome
```

Run the authenticated Android smoke flow:

```bash
npm run e2e:maestro:android
```

Run all Maestro flows:

```bash
npm run e2e:maestro
```

## Flow Coverage

- App launches to the welcome/auth-gated state.
- Authenticated user reaches Today.
- User opens Planning and creates a simple task.
- User opens Feedback and submits a general feedback message.
- User opens Settings and triggers tutorial replay.
- User skips tutorial.

## Test Data Expectations

Use a non-production test user. The user should be allowed to create at least one task and submit feedback in the target environment. If the account is on the free tier, make sure it has remaining daily task capacity before running the authenticated flow.

## Out Of Scope

- OAuth login automation.
- Payment, subscription, restore, or purchase flows.
- iOS execution. The flows use stable visible text and accessibility labels where possible, so iOS can be added later if needed.
