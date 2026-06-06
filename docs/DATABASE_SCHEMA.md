# Database Schema Notes

This document is a high-level orientation guide. For exact schema details, use the current Supabase migrations and generated TypeScript types in `src/types/supabase.ts`.

## Current Access Model

Domani no longer supports the old limited/unlimited tier split.

Supported access states are:

- `none`: no active app access
- `trialing`: active 14-day trial
- `lifetime`: paid or granted lifetime access
- `refunded`: lifetime access revoked after refund

Trialing and lifetime users receive the full app experience. Do not enforce task, category, or feature limits based on the removed tier model.

## Enforcement

Access enforcement should happen at the database/API boundary and be reflected in the frontend for a clear user experience.

Expected behavior:

- Inactive users cannot create or manage app data.
- Trialing users can use the full app while their trial is active.
- Lifetime users can use the full app indefinitely unless access is revoked.
- Refunded users lose lifetime access.

## Historical Migrations

Some historical migrations mention prior concepts because they record schema evolution. Those references are not current product requirements.

When making schema changes:

1. Add a new migration under `supabase/migrations/`.
2. Apply and verify against staging before production.
3. Regenerate `src/types/supabase.ts`.
4. Update this document only when durable schema guidance changes.
