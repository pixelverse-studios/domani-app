#!/usr/bin/env bash
# Replay only the release-owned migrations into a disposable local cluster.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
pg_bin=${PG_BINDIR:-$(pg_config --bindir)}
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/domani-release-test.XXXXXX")
cleanup() {
  "$pg_bin/pg_ctl" -D "$fixture_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$fixture_dir"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$fixture_dir/data" -U postgres -A trust --no-locale >/dev/null
"$pg_bin/pg_ctl" -D "$fixture_dir/data" -l "$fixture_dir/postgres.log" -o "-k $fixture_dir -h ''" start >/dev/null
export DATABASE_URL="postgresql:///postgres?host=$fixture_dir&user=postgres"
"$pg_bin/psql" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE EXTENSION pgcrypto;
SQL

for migration in \
  20260813170108_create_domani_release_schema.sql \
  20260813170124_dev_1007_public_release_feed_rpc.sql \
  20260813170129_dev_1008_import_markdown_rpc.sql \
  20260813170133_dev_1009_convert_markdown_rpc.sql \
  20260813170138_dev_1042_admin_release_management.sql \
  20260813180041_enforce_semantic_release_versions.sql \
  20260813180047_refresh_semantic_release_rpcs.sql \
  20260813203538_add_restricted_release_overview.sql \
  20260815021015_allow_release_version_updates.sql \
  20260815142149_default_release_highlights_public.sql \
  20260816121511_simplify_release_visibility_control.sql \
  20260816173143_simplify_release_editor_workflow.sql \
  20260816191821_harden_simplified_release_editor.sql \
  20260817163924_preserve_existing_historical_release_timing.sql; do
  "$pg_bin/psql" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$repo/supabase/migrations/$migration"
done
"$pg_bin/psql" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$repo/supabase/tests/domani_release_contract_assertions.sql" >/dev/null
echo "Release SQL contract tests passed"
