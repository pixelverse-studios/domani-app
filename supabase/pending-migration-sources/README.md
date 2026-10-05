# Unapplied Domani SQL sources

These two files came from the PVS server repository during DEV-1417 ownership transfer. Neither version appears in the Domani production migration ledger. They are **reference SQL**, not executable migrations: this directory is outside `supabase/migrations` and must not be passed to `supabase db push`.

- `20260817103103_harden_release_editor_review_findings.sql` contains release editor review fixes that were never recorded under that PVS source version in the Domani ledger. Reconcile its effects with the current production schema before including them in a new forward migration.
- `20260921160406_harden_domani_user_activity_projection.sql` contains the pending user activity projection hardening. Rebase it in DEV-1418 after the canonical history is settled.

The original bytes are preserved here for review. A future migration must be created under a new version later than the production head and tested against both a fresh replay and a production-state upgrade. Do not rename these files into the executable migration directory.
