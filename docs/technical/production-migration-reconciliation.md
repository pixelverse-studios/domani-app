# Domani migration-history reconciliation (DEV-1415)

The Domani repository owns executable migrations for the Domani database. Production's `supabase_migrations.schema_migrations` ledger is authoritative for already-applied version numbers. This reconciliation copies those SQL bodies into the repository under their **applied** versions; it does not apply SQL, call `migration repair`, or rewrite the production ledger.

## Applied SQL provenance

The following 22 versions were absent from the 1.1.3 branch. On 2026-09-28, each local SQL body was compared with `md5(statements[1])` from the production ledger. All matched. The 13 release-management files from [PR #259](https://github.com/pixelverse-studios/domani-app/pull/259) had an extra export-wrapper semicolon and newline at EOF; those wrapper bytes were removed before comparison. The other nine source files matched as-is.

| Applied version | Production SQL MD5 | Source |
| --- | --- | --- |
| `20260813170108` | `4e3e0ee16f48cdce35b5e99b8496eaa7` | PR #259 release schema |
| `20260813170124` | `55859424c6880c3c7fc5da8ddfccd44d` | PR #259 public release feed |
| `20260813170129` | `f6b9607a68daf181b72486bf1a313fa7` | PR #259 markdown import |
| `20260813170133` | `8b3dbfb902a4d437f46767cd33a57226` | PR #259 markdown conversion |
| `20260813170138` | `9bd0688b8692577b5783153899d1c682` | PR #259 admin release management |
| `20260813180041` | `9aeb505f853f7b9811289d4420b4485c` | PR #259 semantic versions |
| `20260813180047` | `4e96675eadf3d98d264523f21cc39e8a` | PR #259 semantic RPCs |
| `20260813203538` | `f603b5c19f2f8da939a0a5b1917abe99` | PR #259 release overview |
| `20260815021015` | `ba204baf7f7411c2994b0b603e544cc3` | PR #259 release updates |
| `20260815142149` | `0e96910ff12bc5ead45da5c87ac808a7` | PR #259 public highlights |
| `20260816121511` | `8749ea6998a8a0c19a660c840f598e0d` | PR #259 visibility control |
| `20260816173143` | `66886efbfee29ca7fbafded490236220` | PR #259 release editor |
| `20260816191821` | `243b97724a5dc3262e1a06e78daf5127` | PR #259 editor hardening |
| `20260817163924` | `b019946f12866a84ec375c113c2ef97c` | PVS server `20260817155000_preserve_existing_historical_release_timing.sql` |
| `20260915235746` | `7673292292210b5a0e60ab29db7c5526` | Domani `20260912195324_add_posthog_trial_event_outbox.sql` |
| `20260918031738` | `5d492d5386d935aef215402ccaa687eb` | PVS server `20260917185008_domani_feedback_dashboard_foundation.sql` |
| `20260918031747` | `317746d5ae3edde573bd74a9a202ffb8` | PVS server `20260918020000_domani_feedback_conversations.sql` |
| `20260918031755` | `643799ecffbf06ab699fe919697d89ed` | PVS server `20260918030000_domani_feedback_dispatch.sql` |
| `20260920150127` | `5b72c7b7431a8666977b1fca43ab7daf` | PVS server `20260918121352_domani_feedback_delivery_events.sql` |
| `20260920150141` | `a49228f31164aca8be8e881c0aab5be9` | PVS server `20260919142130_domani_feedback_inbound.sql` |
| `20260920191645` | `472653a08badb001d1ba8eed7bf55c16` | PVS server `20260920181147_domani_user_insights.sql` |
| `20260920191655` | `93cb1c6cea364902d73d334122027708` | PVS server `20260920190254_domani_feedback_user_filter.sql` |

The old Domani PostHog filename used its source timestamp, not the production-applied timestamp. Keeping both would make the CLI offer to replay the same DDL; only the applied-version filename remains executable. The PVS source timestamps likewise must not be used as Domani migration versions. DEV-1417 moves Domani migration ownership and SQL contract tests out of the PVS server repository.

## Legacy and fresh-replay boundaries

Numeric versions `001`–`056` are historical production entries. Some filenames/descriptions changed during early development; preserve their applied version numbers rather than shifting or repairing the ledger. Three earlier-version shims support **fresh replay**: `0035` reconstructs dashboard-created schema, `0135` restores feedback device columns already present in production, and `0245` moves the enum data backfill into a transaction after `024` adds the enum value. The historical `20260310134911` view creation also uses `CREATE OR REPLACE VIEW` because earlier migrations have already created that view. These fixes do not change production's already-applied versions. The three shim versions are not recorded in production and must not be backfilled there with `--include-all`. DEV-1417 adds the forward activity-projection fix required by the PVS contract; other pending security changes remain in DEV-1418.

## Operator procedure

The old default `db:push --linked --include-all` path and embedded staging connection string are removed. Use `npm run db:staging:dry-run` or `npm run db:production:dry-run` first. These commands require the manually selected `.env` file and Node 20.6 or newer for `--env-file`. The wrapper checks that the `.env` Supabase URL matches the named project and that `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are present. It passes an explicit project reference and `--skip-vault` to the pinned CLI; it never uses `--include-all`. For production only, it stages a temporary copy of the migrations without the three replay-only shims, then deletes that copy after the dry run or push. The staging command uses the full replayable chain after staging has been rebuilt. Never run a direct production `supabase db push` from the unfiltered migration directory.

The `:push` commands run the same dry run before applying and additionally require `DOMANI_DB_PUSH_CONFIRM=<environment>:<project-ref>`. Do not set this confirmation during DEV-1415 review. A production dry run must propose **no** already-applied version. Any unknown migration, mismatched project, or unexpected plan is a stop condition; reconcile it before a future approved deployment. Do not manually repair production history to make a diff look clean.

At the DEV-1415 review point, the production ledger had 98 versions and the DEV-1415 branch had the same 98 version numbers, with no local-only version. DEV-1417 adds forward migrations `20261005002529_pvs_schema_contract.sql` and `20261007134913_harden_domani_user_activity_projection.sql`. On DEV-1421, an explicit local dry run against a disposable ledger containing the 98 production version numbers, using the production-filtered workspace and pinned CLI 2.115.0, proposed only those two forward migrations. A credentialed dry run against production is still required. Apply both to Domani before deploying the PVS API that checks the contract.

On 2026-10-07, the previously inactive staging project was restored and its ledger read successfully. It has 103 versions: `0035`, `0245`, and 11 security migrations were absent from DEV-1417, while eight production-applied versions were absent from staging. DEV-1421 now includes `0035` and `0245` plus new replay shim `0135`, but the current staging ledger still diverges. The exact version lists and no-go result are recorded on DEV-1421. Do not push this branch to the current staging ledger; rebuild and rehearse staging under DEV-1421 first. The local CLI still lacks an access token and database password, so credentialed staging and production dry runs remain unverified.
