# Domani database contract tests

These SQL fixtures and test scripts moved from the PVS server repository in DEV-1417. Domani owns the database schema and its SQL tests. The feedback and users shell scripts start disposable local PostgreSQL clusters and use synthetic records only; they do not connect to staging or production. Release SQL assertions can be run against a disposable database after applying the canonical release migrations.

The shell scripts reference production-applied Domani migration versions from DEV-1415. The users test applies the executable forward activity-projection migration `20261007134913_harden_domani_user_activity_projection.sql` and checks the advanced PVS schema contract. `domani_release_contract_test.sh` replays the canonical release migrations and checks the current table/RPC security contract against a disposable local database. The transferred `dev_*` assertions and race scripts are historical fixtures; some use version/date examples that no longer satisfy the current schema. Reconcile those fixtures before adding them to CI. If running a race script directly, point `DATABASE_URL` only at a disposable local database, never at staging or production.

`pvs_schema_contract_test.sh` validates the additive PVS startup contract migration and its service-role-only grant in a disposable local cluster.

`dev_1418_compatibility_test.sh` applies the forward-only current-user RPC migration twice in a disposable local cluster, checks anonymous and authenticated EXECUTE grants, and verifies account isolation and expired-trial access.

`dev_1418_private_service_surfaces_test.sh` applies the forward-only private-surface migration twice in a disposable local cluster, checks client and service-role privileges, verifies the dashboard view uses invoker security and webhook RLS is enabled, and exercises service-role reads and writes.

`dev_1418_internal_function_grants_test.sh` applies the targeted internal-function revocation with and without an optional legacy function present, then checks that client roles cannot execute those seven routines while released-client and production-only service RPC grants remain available.

`dev_1418_search_path_test.sh` reproduces temporary-table shadowing of an unpinned privileged function, applies the forward path migration twice, and verifies that trusted public relations win while existing empty-path functions and EXECUTE grants remain unchanged.
