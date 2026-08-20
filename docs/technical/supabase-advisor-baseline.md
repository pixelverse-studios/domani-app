# Supabase Advisor Baseline

Owner: Backend / Security  
Milestone: 1.2 Security  
Ticket: DEV-1140

## Staging result

After the DEV-1140 migrations:

- Security advisor: no errors.
- Performance advisor: no warnings.
- Anonymous access to all `SECURITY DEFINER` functions is revoked.
- Every advisor-reported mutable function search path is pinned.
- Every advisor-reported foreign key has a covering index.
- The 25 row-level-security policies reported for per-row Auth evaluation cache their Auth helper result with a scalar subquery.

## Accepted staging notices

### RLS enabled with no policy

The following tables intentionally have RLS enabled without client policies:

- `campaign_recipients`
- `email_campaigns`
- `email_templates`
- `meta_app_event_claims`
- `promo_campaigns`
- `promo_codes`
- `promo_redemption_attempts`
- `release_audit_events`
- `release_cache_invalidation_jobs`
- `release_conversion_runs`
- `release_notes`
- `release_prds`
- `releases`
- `revenuecat_webhook_events`

Owner: Backend / Security.

Rationale: these are private service, webhook, admin, or outbox tables. Having no client policy is the intended deny-by-default posture; trusted access uses the service role or narrowly scoped `SECURITY DEFINER` routines. See the [Supabase RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

### Authenticated SECURITY DEFINER functions

Twenty-four functions remain executable by `authenticated` because they are deliberate mobile RPCs or RLS helpers.

- Functions accepting `p_user_id` bind it to `auth.uid()` before privileged work.
- Meta event functions bind the claim to `auth.uid()`, validate event keys and payloads, and enforce claim tokens.
- Current-user account, refund, profile, and promotion functions derive the user from `auth.uid()`.
- `is_beta_phase` is a read-only application-state helper.
- `validate_promo_code` is an authenticated validation endpoint with bounded inputs.

Owner: Backend / Security.

Rationale: these functions require definer rights to cross RLS only after their caller checks. Removing authenticated execution would break their intended API. Trigger, maintenance, admin, and service-only routines have been removed from the authenticated surface. See the [Supabase SECURITY DEFINER advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

### Leaked-password protection

Owner: Product / Security.

Rationale: Domani currently uses Google and Apple OAuth rather than user-managed passwords. The warning is accepted while password authentication remains disabled. Enable leaked-password protection before enabling any password-based provider. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### Unused indexes

Owner: Backend.

Rationale: staging has low traffic and recently created tables, so its index-usage statistics are not representative. Do not remove indexes from staging-only statistics. Review production usage over a representative period before removing any index. These are informational notices, not advisor warnings. See the [Supabase unused-index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Production-only extension notice

Production currently has `pg_net` installed in `public`. The installed extension reports that it is not relocatable, so moving it requires a dependency audit and a drop/recreate maintenance operation. Production remains read-only during DEV-1140; this warning is accepted until an explicitly approved production maintenance window. Staging does not currently depend on `pg_net`.

Owner: Backend / Security.

See the [Supabase extension-in-public advisor](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public).
