# Domani database contract tests

These SQL fixtures and test scripts moved from the PVS server repository in DEV-1417. Domani owns the database schema and its SQL tests. The feedback and users shell scripts start disposable local PostgreSQL clusters and use synthetic records only; they do not connect to staging or production. Release SQL assertions can be run against a disposable database after applying the canonical release migrations.

The shell scripts reference production-applied Domani migration versions from DEV-1415. The users test also applies the pending activity-projection source from `supabase/pending-migration-sources` to exercise its behavior before DEV-1418 rebases it. This does not make that source an executable migration. The three release race scripts require `DATABASE_URL`; point it only at a disposable local database with the release schema, never at staging or production.

`pvs_schema_contract_test.sh` validates the additive PVS startup contract migration and its service-role-only grant in a disposable local cluster.
