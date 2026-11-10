# Secure migration client compatibility matrix

DEV-1422 preparation, 2026-10-20. No real-device, store, or signed QA pass is asserted here.

## Source provenance

| Client | Repository evidence | Contract reproduced | Provenance status |
| --- | --- | --- | --- |
| 1.1.1 | Exact required commit `86c091059971fe4ef7f2e1fbc43d6263c62e0b82`, `src/hooks/useSubscription.ts:1217` | Direct `profiles.update({tier:'trialing',trial_started_at,trial_ends_at}).eq('id',user.id).select().single()` | Exact source supplied by milestone; `app.json` says 1.1.1 |
| 1.1.3 | Latest release candidate `640a5daab14f81d8dacefa895f1514985776be98`, `src/hooks/useSubscription.ts:1381`; app/native versions 1.1.3, Android versionCode 126, iOS build 13 | No-argument `start_trial_with_posthog_outbox()`; returns profile JSON | Store screenshots confirm Android production 126 and uploaded iOS build 13; latest source candidate remains provisional |
| Current combined 1.1.4 | Secure implementation `a63c687a5604e304518be97fa5d3c22efe7ce438`; final candidate SHA/build must be recorded after platform and secure changes combine | `start_current_user_trial(p_expected_user_id)`; current verified RevenueCat sync and `{type}` account email | Final integrated artifact pending |

There is only a `v1.1.1` tag locally. The 1.1.3 version preparation is followed by commits `dc4b0ece` (telemetry configuration), `891fcdb0` (Android Meta initialization), and `640a5daab14f81d8dacefa895f1514985776be98` (iOS Meta automatic events), which retain 1.1.3 native version identifiers. Thus version numbers alone cannot identify the released source. Obtain the distributed iOS/Android artifact build provenance and match its source SHA before signing 1.1.3 QA. The no-argument trial RPC is verified in the candidate source; this does not prove its full device behavior matches the distributed binary.

User-supplied store screenshots received 2026-10-20 confirm iOS 1.1.3 (13), validated and uploaded September 17, 2026 at 2:40 PM (displayed timezone unspecified), and Android production 126 (1.1.3), full-rollout submission September 17 at 2:38 PM, published at 3:14 PM. The iOS screenshot is TestFlight build metadata and does not establish App Store production selection. Latest candidate `640a5daa` was committed September 17 at 11:49 AM -04:00, consistent with this release timeline if the displayed store timestamps use the same timezone. Several earlier candidates share the identifiers, so screenshots confirm artifact identifiers/timeline but do not encode the exact Git SHA.

The current secure implementation calls the expected-user wrapper and passes the installed-schema current-path contract. The legacy no-argument RPC remains available for released 1.1.3.

Released purchase synchronization (both source candidates, `useSubscription.ts` final sync helper) writes RevenueCat identity and entitlement fields directly. The bridge must accept those request shapes while retaining previous authority and queuing verified reconciliation. A successful old database update is **not** evidence of a successful purchase or of recorded lifetime access. Released account deletion uses UUID RPCs (`src/hooks/useAccountDeletion.ts`); email uses legacy `{type,email,name,deletionDate}` input through `src/lib/supabase.ts`. Current email derives the recipient and dates on the server from `{type}`.

Reproduce source inspection without checking out or changing branches:

```sh
git show 86c091059971fe4ef7f2e1fbc43d6263c62e0b82:src/hooks/useSubscription.ts
git show 640a5daab14f81d8dacefa895f1514985776be98:src/hooks/useSubscription.ts
git show 640a5daab14f81d8dacefa895f1514985776be98:android/app/build.gradle
git show 640a5daab14f81d8dacefa895f1514985776be98:ios/Domani/Info.plist
git log --all -- app.json android/app/build.gradle ios/Domani/Info.plist
git tag --list
```

## Repeatable installed-schema contract

`supabase/tests/dev_1422_staging_contract_test.sh` is an opt-in SQL harness for the fully replayed canonical schema. It refuses targets outside local PostgreSQL or staging project `ftgltnzejaxasdvfkqut`. Use libpq environment variables and a password file supplied by the operator; do not put secrets in command arguments or logs. Do not use this harness with production.

```sh
# Set PGHOST, PGPORT, PGUSER, PGDATABASE and PGPASSFILE for staging or a
# disposable local canonical replay before running. No .env switching.
bash supabase/tests/dev_1422_staging_contract_test.sh
```

It requires an administrative database connection that can insert synthetic `auth.users`, set ordinary/service roles, and create temporary tables. It uses three fresh random UUIDs and `example.invalid` emails inside one transaction. Every customer-table write is restricted to these UUIDs, and all changes roll back. Background workers cannot see uncommitted queue rows. It neither sends HTTP requests nor creates purchased store entitlements. Normal database triggers remain enabled. Success prints one final pass line; SQL errors fail the run and connection close rolls back. Do not split the SQL file across connections or replace its final rollback with commit.

Coverage:

- Exact released direct trial request, server dates and one-time analytics; legacy trial reuse/extension denial.
- No-argument released trial RPC, response shape and duplicate rejection.
- Current expected-user trial RPC, wrong-account rejection and canonical dates.
- Forged tier, purchase/refund timestamps, RevenueCat identity, trial dates and admin updates preserve authoritative fields; cross-user RLS writes and UUID RPC calls cannot affect the other fixture.
- Legacy paid attempts coalesce privately; service verified purchase succeeds for a fixture.
- Anon and authenticated roles have no table privileges on dashboard, webhook payload, reconciliation, account-email or trial outbox surfaces; service-only function grants remain explicit.
- Service dashboard view can read only the synthetic fixture filter during this test; no existing customer rows are listed.

This tests PostgreSQL role/RLS behavior, not hosted JWT validation or PostgREST cache behavior. Run the existing focused suites for complementary behavior instead of duplicating them:

| Existing command (`bash supabase/tests/<file>`) | Distinct coverage |
| --- | --- |
| `dev_1418_compatibility_test.sh` | Legacy/current account and category RPCs, cross-account denial, expired trial |
| `dev_1418_private_service_surfaces_test.sh` / `dev_1418_internal_function_grants_test.sh` | Service dashboard/private surfaces, legacy admin and internal function restrictions |
| `dev_1419_legacy_entitlement_bridge_test.sh` | Bridge inserts, coalescing, trial analytics and service writes |
| `dev_1420_verified_access_test.sh` | Refund ordering, duplicate purchase grants, leases, paid promo failures and rollback |
| `dev_1420_account_email_test.sh` | Email event claims, recipient snapshots, provider retry, deletion/reactivation ordering |
| `dev_1418_forward_chain_test.sh` | Integrated synthetic production-head forward replay |

The existing suites create independent disposable local PostgreSQL clusters; they are not proof of a production-schema upgrade. Edge Function core/Jest suites cover malformed requests, account-email body trust, expected-user synchronization and provider failures; use the current package scripts for these gates. Installed-schema SQL does not replace Edge Function or real-device QA.

## Device QA walkthrough

Use an explicitly staging-configured build and dedicated test accounts for every row. Record app SHA, version, native build, platform/OS/device, Supabase project, RevenueCat app/environment and offering/product IDs. The user manages the single local `.env`; confirm internal staging values before both native builds, then remind them to restore their normal development values afterward. Never silently switch environment files.

Run on iOS and Android for the exact 1.1.1 source, source-matched 1.1.3 artifact, and final combined 1.1.4 candidate. For each check record pass/fail, request outcome, persisted server outcome, observed recovery, and sanitized evidence reference. Never include raw tokens, email addresses, transaction receipts, webhook bodies or customer task text in QA artifacts.

| Surface | Steps and expected result |
| --- | --- |
| Auth/profile | Fresh OAuth signup, existing login, cached session launch, missing-profile recovery; correct account owns profile and app state; repeat while switching accounts and with expired session |
| Trial | Fresh eligible account activates via its version's request shape, receives server 14-day dates; second attempt, expired trial, prior purchase and refund cannot mint a new trial |
| Purchase/cancellation | Sandbox purchase on both stores grants only after server evidence; cancelling the native sheet does not grant access; distinguish native ownership from RevenueCat lookup and database recording |
| Restore | Reinstall, restore an owned product, repeat restore, attempt restore while signed into a different Domani account; ownership remains correct and errors are recoverable |
| Delivery races | Exercise client-first, webhook-first, delayed, failed and duplicate webhook, offline reconnection, app kill after store success, provider retry; one eventual verified entitlement with no stale overwrite |
| Refund/reversal | Refund test transaction then reverse using supported sandbox mechanism or verified staging webhook fixture; authoritative state follows event order; restore of stale purchase does not clear newer refund |
| Promos | Free promo grants only from server redemption; paid promo requires matching valid attempt/code/campaign/product; cancel/retry, expire and reuse; no unverified lifetime grant |
| Deletion/email | Schedule/cancel/reactivate from each version; legacy/full and current/type-only body both send only to authenticated server recipient with canonical dates; replay, malformed type and forged recipient do not duplicate or redirect mail |
| Notifications | Register, sign out, switch accounts, reinstall and re-register; correct account owns token; revoked or stale token does not notify wrong account |
| Writes | Tasks/time blocks/categories across pre-trial, trialing, lifetime, expired, refunded and restored; document compatibility-phase behavior separately from later entitlement-enforcement policy; no cross-account writes |
| Feedback/support | Submit from each client with valid metadata, attachments if supported and retry/offline recovery; anon or forged user identity cannot read/write private records |
| PVS | Authorized service dashboard reads feedback, releases and user insights; anon/authenticated callers cannot use service tables/views/RPCs; service connection uses intended schema contract |
| Version gate | Current build records version/build/platform during ordinary authenticated activity; missing versions count as legacy; gate can prompt compatible future builds, recovers safely from unavailable/invalid configuration; released builds have no enforceable gate |

For delayed access, explicitly record the native store result, RevenueCat verification result, queue status, server profile and on-screen message. A device showing success while authoritative access remains pending is not a completed entitlement test. A timed-out verification must have a visible retry/recovery path and eventually reconcile.

## Remaining external evidence and sign-off

The platform compatibility baseline DEV-1388 and monetization/pricing/trial-review UX prerequisites must be integrated into the **same** candidate before final secure-client QA/store rollout. A database pass on the current branch cannot satisfy that dependency.

Required capabilities for a final sign-off: distributed-build/source provenance for 1.1.3; signed staging iOS and Android artifacts including the final combined candidate; real devices and Apple/Google sandbox accounts; sandbox product/offering configuration and purchase/refund control; RevenueCat server/webhook observability; controlled failure/retry injection; staging email provider and mailbox evidence; staging push delivery; authorized PVS service dashboard. Record unavailable checks as pending rather than infer them from SQL or mocked tests.

A QA owner must sign a dated result with the exact candidate SHA/builds, each platform matrix outcome, unresolved risks and a production go/no-go recommendation. Production deployment/store publication is a later authorized action. DEV-1424 additionally requires both-store availability for 14 days, at least 95% active-30-day compatible adoption (98% preferred), unknown versions counted as legacy, seven consecutive days without unresolved verification failures, an empty or owned-exception queue, healthy production signals and a rehearsed secure rollback. No milestone closure or enforcement activation follows from this document alone.
