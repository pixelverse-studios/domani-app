#!/usr/bin/env bash
# Use libpq PGHOST/PGUSER/PGDATABASE/PGPASSFILE; never pass a password in argv.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
: "${PGHOST:?Set PGHOST explicitly to local PostgreSQL or authorized staging}"
[[ -z ${PGHOSTADDR:-} ]] || {
  echo 'Refusing PGHOSTADDR override of the checked target' >&2; exit 1;
}
case ${PGDATABASE:-postgres} in
  *=*|postgresql:*|postgres:*)
    echo 'Use a database name, not a connection string, in PGDATABASE' >&2; exit 1 ;;
esac
case "$PGHOST" in
  localhost|127.0.0.1|::1|/tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*) ;;
  db.ftgltnzejaxasdvfkqut.supabase.co) ;;
  *.pooler.supabase.com)
    [[ ${PGUSER:-} == postgres.ftgltnzejaxasdvfkqut ]] || {
      echo 'Refusing pooler connection without the exact staging project user' >&2; exit 1;
    } ;;
  *) echo 'Refusing target outside local PostgreSQL or staging ftgltnzejaxasdvfkqut' >&2; exit 1 ;;
esac
exec "${PG_BINDIR:+$PG_BINDIR/}psql" --no-psqlrc --set=ON_ERROR_STOP=1 \
  --file="$repo/supabase/tests/dev_1422_staging_contract_test.sql"
