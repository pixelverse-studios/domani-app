# System Category Localization

## Purpose

Domani's system categories are globally available, but the database model still uses fixed English names. This document defines how those categories should behave now that the app is localization-aware.

## Source Of Truth

- Database identifiers stay stable and English-backed.
- `system_categories.name` remains one of: `Work`, `Personal`, `Wellness`, `Home`.
- Reserved-name validation also remains English-backed so users cannot create custom categories that collide with those identifiers.

## Display Rules

- System category database names are not the UI display source.
- UI surfaces must map system categories to localized labels based on the active app locale.
- User-created categories are not translated; they display exactly as entered by the user.
- Fallback category presentation should also be localized (`Uncategorized` / `Sin categoría`).

## Current Implementation

- `src/constants/systemCategories.ts` owns the mapping from English-backed system identifiers to localized display labels.
- Task cards, category selectors, planning edit state, analytics legends, and favorite-category settings rows use that mapping for system-category presentation.
- Date and time formatting is handled separately through `src/i18n/date.ts`, which prefers the current device locale for Intl-based formatting.

## Guardrails

- Do not rename the database-backed system category names as part of localization work.
- Do not translate custom category names.
- When adding a new locale, update the localized system-category label map before shipping that locale.
