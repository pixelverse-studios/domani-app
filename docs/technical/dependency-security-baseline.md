# Dependency security baseline

## Scope

DEV-1139 establishes the dependency and CI release baseline for Domani 1.2. It applies non-breaking npm remediations, keeps the app on Expo SDK 54, and blocks new critical dependency findings in pull requests.

## Remediated findings

- Refreshed the lockfile with `npm audit fix` without `--force`.
- Removed all critical findings present in the initial audit, including vulnerable `shell-quote` and `tar` versions.
- Updated Expo SDK 54 packages to compatible patch releases through their existing version ranges.
- Forced the vulnerable PostCSS 8 line to a patched 8.5 release.
- Forced the legacy `brace-expansion` 1.x path used by ESLint tooling to its patched 1.1 release.
- Kept the Supabase CLI as an exact development dependency so migration replay uses the lockfile version.
- Declared Node type definitions directly instead of relying on an incidental transitive dependency.
- Updated Expo Localization to the SDK 54-compatible patch release.

## Accepted findings

The remaining npm findings are inherited from Expo SDK 54 tooling. npm's proposed remediation is Expo 57, which is a breaking native platform upgrade and is outside the 1.2 Security scope. The affected packages are build and development paths such as Metro image parsing, PostCSS integration, Expo configuration, and legacy UUID consumers; they are not used to parse untrusted content in the shipped Domani application.

Owner: Domani engineering.

Disposition: keep Expo SDK 54 patched within its supported dependency ranges for 1.2, block any new critical finding in CI, and re-audit these accepted findings during the next planned Expo SDK upgrade.

`@sentry/react-native` 7.9 remains explicitly excluded from Expo's dependency-version suggestion because it is a newer SDK 7 patch line than Expo 54's suggested 7.2 version. Downgrading it would discard later fixes without resolving an audit finding. This exception must be revisited with the next Expo SDK upgrade.

## Release gates

Every pull request targeting `main`, `dev`, `dev-*`, `dev/**`, or `epic/**` runs:

- deterministic installation with `npm ci`;
- TypeScript typecheck;
- Expo dependency compatibility validation, including explicit reviewed exclusions;
- Jest tests;
- ESLint;
- npm audit with critical severity as the blocking threshold;
- a full Supabase migration replay from an empty local database;
- pgTAP authority-boundary regression tests; and
- local database linting with errors as the blocking threshold.

GitHub Actions are pinned to immutable commit SHAs. The clean database job uses the repository's exact Supabase CLI development dependency and the GitHub runner's container runtime; it does not connect to staging or production.

## DEV-1139 verification

Verified on 2026-08-20:

- `npm ci` completed from the committed lockfile.
- The audit improved from 43 findings (including 2 critical) to 24 accepted Expo SDK 54 findings (8 high, 16 moderate, 0 critical).
- TypeScript, 181 Jest tests, and ESLint completed with no errors. ESLint continues to report 408 pre-existing warnings.
- Expo dependency compatibility passed with the reviewed Sentry exclusion.
- Production JavaScript bundles exported successfully for both iOS and Android.
- The empty-database replay is executed by GitHub Actions because the development workstation does not have Docker or Podman.
- [GitHub Actions run 32414149874](https://github.com/pixelverse-studios/domani-app/actions/runs/32414149874) replayed the complete migration chain from an empty database, passed all 10 admin-RPC authority assertions, and completed error-level linting of the `extensions` and `public` schemas with no errors.
