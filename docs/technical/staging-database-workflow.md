# Staging Database Workflow

All new database work is applied and verified on the Domani staging Supabase project before any production rollout.

## Environment

Keep the database password beside each environment's existing Supabase values in the ignored local `.env` file. Only the active environment block should be uncommented:

```dotenv
# Production block
# EXPO_PUBLIC_SUPABASE_URL=https://<production-ref>.supabase.co
# SUPABASE_DB_PASSWORD=<production-password>

# Staging block
EXPO_PUBLIC_SUPABASE_URL=https://ftgltnzejaxasdvfkqut.supabase.co
SUPABASE_DB_PASSWORD=<staging-password>
```

Never commit a database password. The staging push wrapper constructs the connection URL internally, refuses to run unless the active public Supabase URL identifies the Domani staging project, and does not print the password or connection URL.

## Migration order

1. Add every schema change as a versioned file in `supabase/migrations`.
2. Confirm the local environment targets staging.
3. Review the pending set without changing the database:

   ```bash
   npm run db:staging:push -- --dry-run
   ```

4. Run a fresh local migration replay when Docker or Podman is available:

   ```bash
   npm run db:reset
   ```

5. Apply the reviewed set to staging:

   ```bash
   npm run db:staging:push
   ```

6. Verify staging migration history, schema inventory, application behavior, and Supabase security/performance advisors.
7. Commit and review the migration before considering production.
8. Treat production as read-only until an explicit production-rollout approval is given. Repeat the dry run against production before any approved push.

Record resolved and intentionally accepted advisor results in the [Supabase advisor baseline](supabase-advisor-baseline.md).

## Credential rotation

If a staging database credential is exposed:

1. Remove it from tracked files.
2. Rotate the staging database password in Supabase.
3. Update only the staging block's ignored local `SUPABASE_DB_PASSWORD` value.
4. Run the staging dry run to verify the replacement.

Rotation invalidates the exposed value retained in Git history; do not rewrite shared history solely to remove an already-rotated password.
