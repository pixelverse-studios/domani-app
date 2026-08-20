# Staging Database Workflow

All new database work is applied and verified on the Domani staging Supabase project before any production rollout.

## Environment

Use the existing ignored local `.env` blocks. Only the active environment block should be uncommented:

```dotenv
# Production block
# EXPO_PUBLIC_SUPABASE_URL=https://<production-ref>.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>

# Staging block
EXPO_PUBLIC_SUPABASE_URL=https://ftgltnzejaxasdvfkqut.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
```

The staging push wrapper targets staging by its project reference through the authenticated Supabase CLI. It refuses to run unless the active public Supabase URL also identifies the Domani staging project. No database password environment variable is required.

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
3. Run the project-reference staging dry run to verify CLI access.

Rotation invalidates the exposed value retained in Git history; do not rewrite shared history solely to remove an already-rotated password.
