# Unapplied Domani SQL sources

These two files came from the PVS server repository during DEV-1417 ownership transfer. Neither version appears in the Domani production migration ledger. They are **reference SQL**, not executable migrations: this directory is outside `supabase/migrations` and must not be passed to `supabase db push`.

- `20260817103103_harden_release_editor_review_findings.sql` contains release editor review fixes that were never recorded under that PVS source version in the Domani ledger. Reconcile its effects with the current production schema before including them in a new forward migration.
- `20260921160406_harden_domani_user_activity_projection.sql` is the original PVS source preserved for provenance. DEV-1417 rebases it as executable forward migration `20261007134913_harden_domani_user_activity_projection.sql`, after the canonical history and PVS contract marker.

The original bytes are preserved here for review. The remaining release-editor source needs a future migration under a new version later than the production head and testing against both a fresh replay and a production-state upgrade. Do not rename either source file into the executable migration directory.
