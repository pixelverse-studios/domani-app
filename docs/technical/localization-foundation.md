# Localization Foundation

Domani now has a minimal app-level localization layer for mobile UI strings.

## Current approach

- Provider: `src/providers/LocalizationProvider.tsx`
- Hook: `src/hooks/useTranslation.ts`
- Catalogs: `src/i18n/catalogs/`
- Supported locales today: `en`, `es`
- Fallback locale: `en`

## Locale resolution

The provider resolves the active locale in this order:

1. explicit in-memory override via `setLocaleOverride()`
2. device locale from `expo-localization`
3. fallback to `en`

If a locale is unsupported, Domani falls back to English rather than partially rendering unknown keys.

## Adding new strings

1. Add the English key to `src/i18n/catalogs/en.ts`
2. Add the translated value to each supported locale catalog
3. Read the string via `useTranslation()` in app code

Example:

```tsx
const { t } = useTranslation()

<Text>{t('welcome.startPlanning')}</Text>
```

## Scope boundary

This foundation ticket is intentionally small. It proves the architecture on a narrow UI surface.

Follow-on localization work should migrate additional screens by scope, not by large unreviewable sweeps.
