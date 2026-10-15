# RevenueCat entitlement handoff

DEV-1419 accepts released profile write shapes while ignoring client-supplied access fields. Direct legacy trial starts get server dates. Legacy purchase and restore attempts enter `public.revenuecat_access_reconciliation_requests`; historical lifetime rows without a purchase timestamp are queued as well. A queue row is a verification request, never proof of access.

DEV-1420 adds two Edge Functions:

- `sync-revenuecat-access` requires the signed-in user's JWT. It queries RevenueCat for that user's Supabase ID with a server secret, then calls the service-only verified grant function. The current app uses this endpoint for purchase and restore sync.
- `reconcile-revenuecat-access` accepts only `Authorization: Bearer <REVENUECAT_RECONCILIATION_SECRET>`. It leases up to five queued requests, checks RevenueCat, and applies verified grants. Unverified or failed requests remain pending for retry after five minutes.

The current app retries one 429 from `sync-revenuecat-access` after 10.5 seconds. This covers a claim taken just before a completed store purchase; other verification failures still surface to the user.

DEV-1420 also secures `send-account-email`. The account RPCs now record private deletion/reactivation events. The function requires the signed-in user's JWT, claims that user's latest matching event, and derives the recipient from Supabase Auth, the name from the recorded profile, and the deletion deadline from the event. Released `{type,email,name,deletionDate}` requests remain accepted, but only `type` is used. The current app sends `{type}`. Claims block simultaneous sends, and Resend receives a stable event ID as its idempotency key for retries. Failed provider calls release the claim.

## Required configuration

Set `REVENUECAT_SECRET_API_KEY` and the environment-specific `REVENUECAT_ENTITLEMENT_ID` for both functions. Set a separate high-entropy `REVENUECAT_RECONCILIATION_SECRET` for the worker. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` at runtime. Keep all server secrets out of `EXPO_PUBLIC_*` values and logs.

`send-account-email` also requires `RESEND_API_KEY` and uses the configured `FROM_EMAIL` or its existing Domani default. It requires `verify_jwt = true` at deployment. Do not deploy the secured function before `20261015175330_claim_account_email_events.sql`; otherwise released clients can schedule an account change but cannot claim its email event.

Deploy the database migrations and both functions as one staged rollout. Configure a trusted scheduler to POST to `/functions/v1/reconcile-revenuecat-access` every minute with the reconciliation secret. Keep the scheduler disabled until the migration, function secrets, and RevenueCat product/entitlement mapping have been checked in staging. The worker reports only aggregate `claimed`, `verified`, `pending`, and `failed` counts.

## Validation before production

1. Verify a new paid purchase and a restore on iOS and Android. The profile must gain lifetime access only after the server lookup succeeds.
2. Verify a free promo still uses its existing client RPC. Verify a paid promo requires server confirmation and a failed confirmation rolls back the profile grant.
3. Send a forged direct profile update from a released client. The update may return successfully, but access fields must remain unchanged and a private reconciliation request must appear.
4. Verify duplicate and delayed webhooks and worker calls do not regrant a refunded purchase. A legitimate new purchase after a refund must use a newer verified purchase timestamp.
5. Review pending reconciliation requests and resolve any historical lifetime accounts that RevenueCat cannot verify using separate authoritative purchase evidence before final RLS enforcement.
6. Verify released and current client account deletion/reactivation emails on staging. Forged recipient, name, and deadline fields must have no effect. Duplicate requests should deliver once; a provider failure should leave the event retryable.

If email delivery fails after rollout, keep the private event records and retry or repair the authenticated handler. Do not restore the old caller-selected recipient endpoint. If purchase verification fails, leave the verified access boundary in place and repair the function or configuration before resuming rollout.

Do not enable the final profile-column revocation or task/time-block access policies until old-client adoption and this staged validation pass. No production profile backfill is performed from `tier` alone.
