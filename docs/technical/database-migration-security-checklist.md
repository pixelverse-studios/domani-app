# Database Migration Security Checklist

Use this checklist for every Supabase migration that adds or changes a relation,
view, function, trigger, policy, grant, or ownership boundary. The migration PR
must include the matching database regression case in `supabase/tests`.

## Before authoring

- Confirm the active branch targets staging and do not change `.env` silently.
- Reconcile local migration history with staging and production migration order.
- Classify each object as client-exposed, server-only, or internal maintenance.
- Identify the allowed roles and the source of user or service identity.
- Record backward-compatibility and rollback implications in the PR.

## Tables and relations

- Enable RLS on every table in an exposed schema, including `public`.
- Define intentional `SELECT`, `INSERT`, `UPDATE`, and `DELETE` behavior.
- Scope client policies with `TO anon` or `TO authenticated` as appropriate.
- Combine authenticated policies with an ownership predicate such as
  `(select auth.uid()) = user_id`; role membership alone is not authorization.
- Give `UPDATE` policies both `USING` and `WITH CHECK` ownership predicates.
- Add indexes for columns used by ownership and RLS predicates.
- Revoke client grants from private operational and PII tables even when RLS
  also blocks rows.
- Grant service access explicitly and only for required operations.
- Test anonymous, owner, non-owner, and service-role behavior.

## Views

- Prefer `security_invoker = true` for client-readable views on PostgreSQL 15+.
- Otherwise move the view to an unexposed schema or revoke client access.
- Verify that joins cannot bypass the underlying tables' ownership rules.
- Test both the intended service path and denied client paths.

## Functions, RPCs, and triggers

- Prefer `SECURITY INVOKER`; document why `SECURITY DEFINER` is necessary.
- Set a safe `search_path` and schema-qualify privileged object references.
- Revoke the default `PUBLIC` execute privilege from privileged functions.
- Grant execute only to the intended roles and exact signatures.
- Derive user identity from `auth.uid()` or verified server context.
- Reject caller-supplied user IDs that do not match verified identity.
- Never accept caller-supplied entitlement, admin, or service authority.
- Keep trigger and maintenance functions unavailable to client roles.
- Test legitimate calls, anonymous calls, spoofed identity, cross-user mutation,
  destructive behavior, and the intended service or cron path.

## Verification and rollout

- Run `npm run db:verify:fresh` to replay all migrations, execute pgTAP, and lint.
- Run typecheck, Jest, lint, dependency audit, and applicable native checks.
- Confirm required GitHub checks run on the PR's actual target branch.
- Apply and verify the migration on staging before any production action.
- Re-run Supabase security and performance advisors on staging.
- Record accepted warnings with an owner and rationale in Linear.
- Rehearse rollback or remote-disable behavior when the change affects 1.2 entry
  points or backward compatibility.
- Do not apply production migrations or secrets without explicit approval.
