# Secure rollout telemetry and future version gate

DEV-1416 adds monitoring without activating final authority enforcement. The gate ships disabled for both stores. Released 1.1.1 and 1.1.3 binaries do not contain this gate and cannot be controlled by it.

## Activity and adoption

`RolloutProvider` reports the authenticated account's native version, native build, and platform on mount and foreground, at most once per hour per mounted account. Expo Go/missing native versions report unknown rather than inventing a compatible version. The server supplies the observation timestamp and account ID; no device identifier, token, request body, or user content is collected. The Supabase project itself determines the environment. Client version reports are adoption evidence, never entitlement authority.

`get_rollout_metrics()` is executable only by service role (or a database owner). Operators use it through an authorized backend or SQL console; ordinary app users cannot read observations, events, queues, or aggregates. Its active 30 day denominator includes undeleted accounts with any recent, nonfuture `profiles.last_active_at`, auth sign-in, or version observation. This includes active legacy clients that never submit feedback/support or a version. No observation, a missing version, or an observation older than 30 days counts as unknown legacy. Valid numeric versions at least 1.1.4 count as compatible. The metric counts accounts, not installations; the most recent report represents an account with multiple devices. Client activity is evidence rather than an attestation of installed software.

A zero denominator reports 0%, so it cannot satisfy the 95% enforcement threshold. Review `active30d`, `compatible`, `legacy`, `unknownLegacy`, and `compatiblePercent` together. An operator must still independently verify both stores' availability dates, candidate QA, and production health.

## Events and alerts

Private identifiable events and nonidentifiable UTC daily counters distinguish:

| Label                    | Meaning                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `legacy_request`         | Direct authenticated entitlement/admin intent captured before the compatibility guard restores authoritative fields |
| `verified_success`       | Current-client RevenueCat verification completed with server access granted                                         |
| `webhook_success`        | Authenticated webhook completed a supported grant/refund/reversal                                                   |
| `delayed_reconciliation` | Lookup completed without usable verified access or necessary promo evidence; retry remains pending                  |
| `reconciliation_success` | Worker applied verified evidence or safely resolved a stale refunded purchase                                       |
| `rejection`              | Identity/promo rejection, blocked privileged intent, or ignored webhook outcome                                     |
| `unresolved_failure`     | Provider, database, or worker attempt failed; subsequent retry may resolve it                                       |

An ignored webhook is a rejection metric, not a purchase success. Duplicate webhook requests do not create a second success. Legacy trigger events share the profile transaction, so a transaction rolled back by another policy cannot leave an event. They do not replace Supabase API/error monitoring for rejected statements. Provider/configuration/auth failures before a trusted user or webhook is established remain in platform HTTP health signals, avoiding unauthenticated telemetry writes. Instrumentation stores bounded labels and optional account UUIDs, never provider responses or exception text. Existing provider audit storage is outside the new telemetry tables.

Daily failure counters describe failed attempts, including recovered attempts. Current queue size/oldest timestamp and stale (over five minutes)/errored webhook count describe unresolved work; do not confuse historical failures with unresolved failures. Observe the hosted Edge Function HTTP/error logs alongside these metrics. Poll at least every five minutes while rollout is active. Suggested intervention thresholds, owned by the release operator:

- Any unresolved webhook failure or oldest pending reconciliation exceeding 15 minutes: investigate immediately; halt rollout if it cannot be explained and recovered.
- Any account mismatch or forged-authority test changing authoritative state: stop rollout immediately.
- More than 5 failed verification attempts or more than 1% failure across at least 100 attempts in 15 minutes: pause rollout, inspect provider and database health, and replay work after recovery. The operator RPC returns bounded `recentEvents` counts for the trailing 15 minutes alongside daily aggregates.
- Adoption below 95%, any unknown version excluded from the denominator, or less than seven consecutive days without unresolved failures: final enforcement remains no-go. Prefer 98% adoption.

No automatic notification receiver is configured by this change. Connect the operator's authorized monitoring system before production rollout; preserve its evidence for the seven day gate. Function instrumentation is best effort with a 1.5 second timeout and cannot replace a purchase or refund result. Monitor telemetry ingestion health as well as HTTP outcomes.

## Retention

`prune_rollout_telemetry()` removes resolved queue rows after 30 days, unresolved/failed rows after 90 days, identifiable events and inactive observations after 90 days, and daily counters after 12 calendar months. Recent unresolved requests remain pending regardless of the age of an older reconciliation. Account deletion cascades observations/identifiable events; daily counts have no account IDs and remain until their aggregate retention expires.

The authenticated reconciliation worker invokes cleanup on each successful queue-claim run, even when the queue is empty. Keep the scheduled worker active. If it is paused or retired, schedule a daily service-role call to `prune_rollout_telemetry()` and verify its success separately. Removing unresolved work at 90 days requires a release/support owner to review the known exception beforehand; daily aggregate counts remain available. No new extension or unconfigured cron job is assumed.

## Remote version configuration

`get_client_version_policy(platform)` exposes only the platform's minimum version, enabled flag, and store URL. A database owner configures `rollout_private.version_policy`. Start with a verified store listing URL and a version already fully available for that platform. The schema accepts only HTTPS Apple App Store or Google Play listing URLs. For example, after approval and store verification:

```sql
UPDATE rollout_private.version_policy
SET minimum_version = '1.2.0', store_url = '<verified store listing URL>', enabled = true
WHERE platform = 'ios';
```

The placeholder must be replaced with the real listing URL; constraints reject it. Disable remotely with `enabled = false` for the affected platform. Nothing in this implementation enables either row. The client compares all three numeric components, checks on mount/foreground and on “Check again,” and displays a theme-aware update screen. It opens the validated store URL and offers retry if the store cannot open. Unknown/malformed config, missing versions, request failures, and timeout all permit normal use. No enforced policy is persisted across launches. A request already blocked on a previous successful response can recover on the next foreground/check; a network failure clears the block. This is an availability fail-safe, not a security boundary.

## Verification

Run `bash supabase/tests/dev_1416_rollout_telemetry_test.sh` for isolated SQL role/ownership, denominator, unknown-version, event-class, retention, disabled-default, remote-policy, and expected-user trial checks. The installed-schema compatibility suite verifies the actual caller-bound trial wrapper and authority boundaries. Jest covers numeric version ordering, malformed/store URL policy, fail-open network requests, current-client expected identity, normal activity, account changes, delayed webhook promo purchase timestamps, and telemetry failure isolation. Device UI/store navigation still needs iOS and Android QA with the final combined candidate.

The database functions follow the explicit grant and pinned-search-path guidance in the [Supabase database function documentation](https://supabase.com/docs/guides/database/functions). These tables live in a schema outside the Data API and have RLS enabled in addition to revoked ordinary-role privileges.
