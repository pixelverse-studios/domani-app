# Store Metadata Localization Plan

This document defines the first-wave localized store metadata scope for Domani and clarifies how it relates to the existing app-localization work under `DEV-746`.

## Purpose

Domani now has translated in-app catalogs for the current top-25 market-locale matrix, but store metadata and creative coverage have not been explicitly scoped to match that work. This plan closes that gap so launch materials do not overstate locale readiness.

## Source Of Truth

Current app locale support is defined by:

- [docs/technical/market-locale-matrix.md](/Users/phil/PVS-local/Projects/domani/domani-app/docs/technical/market-locale-matrix.md)
- [src/i18n/index.ts](/Users/phil/PVS-local/Projects/domani/domani-app/src/i18n/index.ts)

Current store setup guidance already in the repo:

- [docs/APP_STORE_CONNECT_SETUP.md](/Users/phil/PVS-local/Projects/domani/domani-app/docs/APP_STORE_CONNECT_SETUP.md)

## First-Wave Launch Decision

### App-Supported Market Locales

The app currently recognizes these market locales as first-class supported targets:

- `en-US`
- `en-GB`
- `en-CA`
- `en-AU`
- `en-SG`
- `en-PH`
- `es-ES`
- `es-MX`
- `es-AR`
- `es-CO`
- `pt-BR`
- `pt-PT`
- `fr-FR`
- `fr-CA`
- `de-DE`
- `it-IT`
- `nl-NL`
- `sv-SE`
- `pl-PL`
- `ja-JP`
- `ko-KR`
- `zh-CN`
- `zh-TW`
- `hi-IN`
- `id-ID`

### Store Metadata Production Set

For store metadata, the first production wave should be managed at the language / canonical store-locale level rather than duplicating copy for every country variant.

Recommended first-wave localized store metadata set:

- English: `en-US`
- Spanish: `es-ES`
- Portuguese: `pt-BR`
- French: `fr-FR`
- German: `de-DE`
- Italian: `it-IT`
- Dutch: `nl-NL`
- Swedish: `sv-SE`
- Polish: `pl-PL`
- Japanese: `ja-JP`
- Korean: `ko-KR`
- Simplified Chinese: `zh-CN`
- Traditional Chinese: `zh-TW`
- Hindi: `hi-IN`
- Indonesian: `id-ID`

### Variant Reuse Rules

Country-level variants may reuse the canonical language metadata for launch:

- `en-GB`, `en-CA`, `en-AU`, `en-SG`, `en-PH` reuse English metadata
- `es-MX`, `es-AR`, `es-CO` reuse Spanish metadata
- `pt-PT` reuses Portuguese metadata
- `fr-CA` reuses French metadata

This keeps launch scope operationally manageable while staying aligned with the actual in-app translation coverage.

## Apple Metadata Surfaces

Apple store metadata should be prepared per localized App Store locale for these surfaces:

- app name
- subtitle
- privacy policy URL if locale-specific handling is needed
- promotional text
- description
- keywords
- screenshots
- app previews if used

Important distinction:

- shared app information is localized separately from version-specific product page metadata
- screenshots are localizable and should not be assumed to be complete just because text metadata exists

## Google Play Metadata Surfaces

Google Play store metadata should be prepared per localized store listing language for these surfaces:

- app name
- short description
- full description
- screenshots / preview assets

Out of scope for this ticket:

- custom store listing experiments
- per-country merchandising variants beyond the first-wave language set
- paid creative testing strategy

## Ownership Boundaries

### Owned By DEV-746 And Existing App Localization Work

- locale detection and fallback behavior
- translated in-app catalogs
- localized date / time / category rendering
- monetization, onboarding, and core app flow translation readiness

### Owned By DEV-751

- first-wave store metadata locale matrix
- Apple and Google metadata surface inventory
- launch guardrails for which locales may be claimed in store-facing copy
- handoff requirements for store listing text and locale-specific screenshot coverage

### Not Owned By DEV-751

- screenshot design production
- device mockup rendering
- App Store / Play Store creative asset export work
- ASO experimentation and screenshot ordering strategy

Those should stay aligned with broader marketing / ASO planning already documented in:

- [docs/growth-plan/aso-strategy.md](/Users/phil/PVS-local/Projects/domani/domani-app/docs/growth-plan/aso-strategy.md)
- [docs/growth-plan/marketing-brief.md](/Users/phil/PVS-local/Projects/domani/domani-app/docs/growth-plan/marketing-brief.md)

## Launch Guardrails

To avoid unsupported locale claims at launch:

- do not market a locale in the stores unless the app ships translated catalog coverage for that language or an explicitly approved English fallback
- do not localize screenshots into a language whose in-app constrained surfaces have not been QA reviewed
- do not claim country-specific nuance for reused variants like `pt-PT` or `fr-CA` unless those variants are intentionally reviewed and adjusted
- do not treat store metadata localization as complete until Apple / Google screenshot sets are either localized or explicitly approved to reuse English assets

## Required Deliverables Before Store Rollout

### Text Deliverables

For each first-wave store metadata locale:

- Apple app name
- Apple subtitle
- Apple promotional text
- Apple description
- Apple keywords
- Google Play app name
- Google Play short description
- Google Play full description

### Asset Deliverables

For each first-wave store metadata locale, decide one of:

- localized screenshot set is required
- English screenshot set is explicitly approved for reuse

If the answer is not documented, that locale should not be treated as release-ready on the stores.

## Recommended Next Steps

1. Create a store-copy worksheet for the 15 first-wave production locales.
2. Mark each locale as `text ready`, `asset ready`, or `blocked by screenshots`.
3. Create or link a separate asset-production ticket for localized screenshots and refund / purchase-help imagery.
4. Review any reused regional variants before claiming them in launch materials.

## External Product References

These official references were used to confirm current Apple and Google store metadata surfaces:

- Apple App Information reference: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Apple localize app information: https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/
- Apple platform version information: https://developer.apple.com/help/app-store-connect/reference/app-review-information
- Google Play create and set up your app: https://support.google.com/googleplay/android-developer/answer/9859152
- Google Play translate and localize your app: https://support.google.com/googleplay/android-developer/answer/9844778
