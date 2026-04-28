# DEV-750 Localization Audit Notes

`DEV-750` moves the remaining high-visibility in-app marketing, settings, support, feedback, and tutorial copy into the translation catalog.

## Intentionally English-Only

- `src/components/settings/DevToolsSection.tsx`
  Developer-only tooling gated behind `__DEV__`. This is operational UI for local/test builds, not end-user product copy.

- `src/components/settings/PreferencesSection.tsx`
  Timezone rows still display English timezone labels and abbreviations from the static timezone list. This was left unchanged in `DEV-750` because the labels function more like technical identifiers than product copy, and a proper localization pass would likely require a dedicated timezone-display strategy rather than simple catalog extraction.

- Tutorial references to `"+ New"` and `"Add Task"` inside translated tutorial strings
  These phrases intentionally mirror the current control labels in the task-creation UI so the walkthrough language still matches the visible buttons. If those controls are localized later, the tutorial copy should be updated to match in the same ticket.

## Remaining Follow-Up Candidates

- Planning/today error alerts outside the settings/support/tutorial slice, such as task carry-forward and task-save failures.
- Shared fallback strings in lower-priority utility surfaces like the generic error boundary.
- Any future timezone-display localization strategy, if product wants localized city/region naming instead of stable English identifiers.
