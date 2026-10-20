# Domani 1.1.4 secure rollout operations

This is the operational handoff for DEV-1421 through DEV-1424. The acceptance criteria captured in the internal local execution record remain binding. Preparation and synthetic SQL tests do not establish store availability, device purchase success, production health, or adoption.

## Targets and current evidence

| Target or gate | Required identity or evidence |
| --- | --- |
| Disposable staging | Supabase project `ftgltnzejaxasdvfkqut`; user authorized disposal on 2026-10-20 |
| Production | Supabase project `exxnnlhxcjujxnnwwrxv`; release writes require explicit approval |
| Production backup/PITR | Unverified; operator must inspect actual availability, retention and a usable restore point before rollout |
| Platform baseline and final candidate | DEV-1388; source/build identification and iOS/Android results required |
| Cross-version QA | DEV-1422; signed result including real-device sandbox purchase/restore on both platforms required |
| Compatibility deployment | DEV-1423; actual deployment, stores, observations and owners must be recorded |
| Final enforcement | DEV-1424; time/adoption/health gates below must pass before promotion |

Keep schema exports, logs containing identities and credentials outside the repository. Store only sanitized evidence, version lists, catalog comparison summaries and outcomes in review artifacts. Never put tokens, payloads, receipts, secret values or customer content into telemetry or this runbook.

## Rehearse staging and the production upgrade

1. Freeze the reviewed source revision, migration filenames and hashes, Edge Function revision, client commit/builds and PVS revision. Confirm no pending final-enforcement source is in `supabase/migrations`.
2. Capture the staging ledger and customer-table counts before reset. Its data is disposable. Inspect project identity from the management API before running the destructive command. The production ledger is read-only.
3. Rehearse an empty canonical replay and an isolated, schema-only actual-production fixture. Apply only the approved forward migrations to the production fixture. The production workspace excludes four replay-only shims, including `20261004000000_replay_production_catalog_baseline.sql`. No `migration repair`, `--include-all`, customer-data export or historical production migration edits belong in this rollout.
4. Compare tables, columns, generated expressions, types, constraints, policies, grants, function bodies/configuration, views, triggers and migration plan. Normalize ordering. Explain managed-extension/server-version differences explicitly. Resolve application differences before proceeding.
5. Reset only the confirmed staging project, using the pinned CLI. Check `--help` again if the pinned version changes:

   ```sh
   SUPABASE_TELEMETRY_DISABLED=1 node_modules/.bin/supabase db reset \
     --linked --project-ref ftgltnzejaxasdvfkqut --no-seed
   ```

6. Confirm the new staging ledger equals the canonical replay, customer accounts/data are empty, required system categories/configuration remain, and a second migration dry run proposes no unexpected work. Run the SQL contract suite and Supabase security/performance advisors. Exercise ordinary-role denials and service-role dashboard RPCs against the hosted target.
7. Validate server configuration names without printing values: RevenueCat server API key and staging entitlement `Domani Staging Lifetime`, webhook secret, reconciliation worker secret, Resend/from address and account-email retry secret. Verify the RevenueCat project, store environment and webhook URL belong to staging.
8. Deploy the reviewed functions only after their database contracts exist:

   ```sh
   SUPABASE_TELEMETRY_DISABLED=1 node_modules/.bin/supabase functions deploy \
     sync-revenuecat-access revenuecat-webhook reconcile-revenuecat-access send-account-email \
     --project-ref ftgltnzejaxasdvfkqut
   ```

   Use each function's checked-in JWT configuration. Do not blanket-disable JWT checks. Configure the trusted reconciliation and account-email retry schedulers; invoke each once and confirm durable completion/retry behavior before relying on a schedule. Worker configuration is unverified until its scheduler and successful invocation are recorded.
9. Run DEV-1422 against source-matched 1.1.1, 1.1.3 and the final combined 1.1.4 candidate. Cover auth/session transitions, missing profiles, trials, purchase/restore/refund/reversal, paid/free promo, delayed and duplicate delivery, account email, token ownership, feedback/support and PVS dashboards. Device purchase success and server recording success are distinct assertions.
10. Rehearse the pending enforcement and recovery sources in an isolated staging test window after compatibility QA is captured. Record task/time-block access before enforcement, protected-column denial afterward, verified server mutations, read-only history and secure recovery. Restore the approved compatibility phase before further legacy-client QA. Staging enforcement rehearsal does not authorize production enforcement.

Pause on an unexpected target, catalog difference, migration plan, advisor security error, failed role denial, unverified worker configuration or missing device result. Resolve the specific failure before resuming.

## Production compatibility release: DEV-1423

Before approval, prepare a concrete release bundle: exact forward migration plan/hash list, clean actual-production-schema rehearsal, staging QA result, Edge Function artifacts/configuration checklist, PVS dependency order, recovery rehearsal, backup/PITR evidence and named release/support/monitoring owners. Backup/PITR evidence is currently unverified.

After explicit production approval:

1. Reconfirm project `exxnnlhxcjujxnnwwrxv`, backup/restore evidence and the approved dry run. Apply only approved additive forward migrations through the production workspace. Stop if the plan changes; do not repair the ledger during rollout.
2. Deploy and smoke-test the secure RevenueCat, email and worker functions. Verify shared-secret and JWT rejection behavior, provider failure recovery, claim retries and delayed reconciliation. Preserve their previous secure artifacts as rollback candidates.
3. Confirm service-only PVS feedback, release and user-insight paths, and ordinary-role denials, before deploying the dependent PVS server revision.
4. Confirm DEV-1388 and DEV-1422 have passed for the combined candidate. The user manages the single local `.env`: manually select production values, including `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=Domani Lifetime`, before Android and iOS builds. Never swap or restore `.env` automatically. After both builds, remind the user to restore their preferred development values. Confirm build/version and environment from the resulting artifacts.
5. Publish both store artifacts only after the release approval and platform/device gates. Record actual full availability time separately for each store. A source version or uploaded artifact is not proof of availability.
6. Capture first production events with correct version/build/platform/environment. Monitor authentication, trials, purchase/restore/refund/reversal, webhook claims, reconciliation, email, task writes, notification token ownership, support/feedback, dashboards, crashes and performance. Maintain an incident/exception register with an owner and resolution deadline.
7. Keep DEV-1423 in progress through its required observation window. Keep final-enforcement SQL outside the executable chain.

Proposed intervention thresholds, which the release owner must confirm before deployment: pause on any forged authority success, cross-user mutation, secret exposure, unexplained released-client breakage or unresolved security advisor error; investigate any purchase/email queue item still pending after two scheduled worker runs or a webhook processing lease that cannot be recovered. Do not substitute these defaults for the seven-day health evidence required by DEV-1424.

## Final authority gate: DEV-1424

Every item below needs dated evidence and an owner. No automatic calendar estimate or adoption forecast satisfies a gate.

- 1.1.4 has been fully available in **both stores for at least 14 days**, measured from the later availability timestamp.
- At least **95%** of authenticated users active in the preceding **30 days** have compatible observations; **98%** is preferred. Unknown/missing/stale versions count as legacy. Capture the numerator, denominator, unknown count and query time from service-only `get_rollout_metrics()`; confirm its compatibility classification matches the actual combined secure candidate.
- **Seven consecutive days** have no unresolved webhook/reconciliation failure. Point-in-time empty counters do not prove the seven-day window.
- The reconciliation queue is empty, or every remaining exception is understood, explicitly approved and owned. No purchase is stranded behind a provider, promo, identity or lease issue.
- Trial, purchase, restore, refund, promo, deletion/reactivation, email, notifications, feedback, support and PVS production signals are healthy.
- Secure recovery has been rehearsed in staging with the exact candidate enforcement source.
- Named release, support, monitoring and incident owners accept the remaining legacy-client support boundary. A sanitized denied-write collector is operating before activation.
- A final production change approval identifies the reviewed migration revision, current gate evidence, owners and recovery artifact.

Only then create a **new forward migration** with the pinned CLI and copy/review `supabase/pending-migration-sources/dev_1424_final_enforcement.sql`. The pending source revokes client profile creation/authority updates, grants explicit preference updates, retires the legacy mutation bridge, and adds restrictive task/time-block mutation policies using `has_current_user_access()`. Existing ownership and read policies remain. Verify every current RPC, worker, webhook and dashboard path after application; rerun role tests and advisors.

The source is preparation. Neither this document nor its isolated SQL test claims the adoption or time gates have passed. Close the milestone/release only after final enforcement and its acceptance evidence pass.

## Monitoring and retention after enforcement

Monitor legacy attempts for **30 days after actual enforcement**, using `rollout_private.final_enforcement_window.legacy_monitor_until` as the recorded end. An operator can read that service-only table; ordinary roles cannot.

Protected-column permission failures occur before row triggers run. The compatibility trigger cannot count those failures after grants are revoked. Configure a trusted collector of database/API permission-denied events to emit only event class, time and a verified account identifier where necessary through service-only `record_rollout_event('legacy_request', ...)` and `record_rollout_event('rejection', ...)`. Validate a deliberate denied request produces the aggregate event. Redact statement text, profile values, access tokens, request bodies and user content. If the collector is unavailable, record the monitoring gap and stop final activation until a concrete alternative is verified.

Keep the trusted `prune_rollout_telemetry()` schedule active and verify deletion boundaries: resolved reconciliation records 30 days; failed/unresolved records until resolution up to 90 days; identifiable compatibility events and stale observations 90 days; aggregate daily metrics 12 months. Escalate and preserve a minimal owned incident record before the 90-day unresolved cap removes the queue entry. After the 30-day monitoring window, remove temporary collection only after owners review the results; retention continues.

## Secure recovery

For mobile regressions, halt store rollout or ship a corrective client. For delayed purchases, repair the secure provider/worker path and replay verified reconciliation. Edge Functions may roll back only to a known secure version; never restore body-trusting account email.

If task access enforcement causes material impact, promote `supabase/pending-migration-sources/dev_1424_secure_recovery.sql` into a **new** reviewed forward migration. It removes only the six restrictive task/time-block policies and reinstalls the secure compatibility guard as defense in depth. It preserves ownership and restricted profile-column grants; it never restores arbitrary entitlement/admin/refund writes. Reconcile affected accounts from RevenueCat server evidence. Re-enforcement requires a new reviewed forward migration that accounts for the existing enforcement-window table and renewed gate evidence.

PITR is reserved for catastrophic database failure, with a specific approved recovery point and a customer-impact plan. Do not use a database reset, history repair or historical migration edit as a production recovery shortcut.

## Repeatable local source verification

```sh
bash supabase/tests/final_enforcement_recovery_test.sh
bash supabase/tests/delayed_verified_paid_promo_test.sh
bash supabase/tests/private_surface_role_grants_test.sh
```

These scripts create and destroy their own synthetic PostgreSQL clusters. The enforcement test proves expired/refunded mutation denial, retained read-only history, active lifetime writes, ownership isolation, protected-column denial, service authority and recovery without privilege reopening. They do not establish device, provider, scheduler, production or store outcomes.
