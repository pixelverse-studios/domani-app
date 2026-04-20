# Market Locale Matrix

This document defines the initial market-locale layer added for Domani so the app can resolve country-specific locale tags cleanly even before every language has a full translated catalog.

## Current Catalog Coverage

Translated catalogs currently exist for:

- `en`
- `es`

All other market locales currently fall back to English copy until dedicated catalogs are added. Date and time formatting can still follow the resolved market locale where supported.

## Top-25 Market Locales

The app now recognizes these market locales as first-class supported targets:

1. `en-US`
2. `en-GB`
3. `en-CA`
4. `en-AU`
5. `en-SG`
6. `en-PH`
7. `es-ES`
8. `es-MX`
9. `es-AR`
10. `es-CO`
11. `pt-BR`
12. `pt-PT`
13. `fr-FR`
14. `fr-CA`
15. `de-DE`
16. `it-IT`
17. `nl-NL`
18. `sv-SE`
19. `pl-PL`
20. `ja-JP`
21. `ko-KR`
22. `zh-CN`
23. `zh-TW`
24. `hi-IN`
25. `id-ID`

## Resolution Rules

Device locale resolution now follows this order:

1. exact market-locale match
2. language-based fallback to the canonical market locale for that language
3. default locale fallback to `en-US`

Examples:

- `es-CL` resolves to `es-ES`
- `en-NZ` resolves to `en-US`
- `it-IT` resolves exactly to `it-IT`
- unsupported languages still resolve to `en-US`

## Important Distinction

Recognizing a market locale is not the same as shipping a fully translated language.

- Market locale support means the app can identify and persist a country-specific locale target.
- Catalog coverage means the app has translated copy for that language.

This separation lets Domani add translation catalogs incrementally without reworking locale resolution each time.
