# Domani Design System Foundations

## Overview

The Domani app now ships with a token-driven design system that keeps parity between NativeWind styling, TypeScript constants, and runtime theming. All primitives live in `src/theme` and can be composed across screens and feature modules.

## Theme Tokens

- `src/theme/foundations/colors.ts` centralizes semantic colors for each tier along with dark/light values.
- `src/theme/foundations/spacing.ts`, `typography.ts`, and `radii.ts` provide spacing, font, and radius scales that map directly to Tailwind tokens.
- `global.css` exposes CSS variables consumed by NativeWind so `bg-surface`, `text-primary`, etc., track live theme changes.
- `tailwind.config.js` mirrors the same tokens so Tailwind/NativeWind classes reference the shared CSS variables.

## Theming Provider

- `ThemeProvider` (src/providers/ThemeProvider.tsx) reads the system appearance, merges it with the persisted `useThemeStore` state, and adds a `.dark` class to the root container.
- `useTheme` (src/hooks/useTheme.ts) exposes `mode`, `activeTheme`, and `setMode` for any component to toggle between `light`, `dark`, and `auto`.
- `metro.config.js` + `app.config.ts` set `EXPO_ROUTER_APP_ROOT=src/app`, ensuring the router loads our typed providers while sharing the same global CSS input for NativeWind.

## Base Components

Reusable primitives live under `src/components/ui/`:

- `Button` supports primary/secondary/ghost/destructive variants and sm/md/lg sizes with loading states.
- `Card`, `Badge`, `Input`, and `Text` map Tailwind utility classes to the shared tokens for consistent typography, borders, and colors.
- `src/app/index.tsx` demonstrates composing these primitives to showcase planning philosophy copy, free-tier messaging, and CTA patterns.

## Usage Guidelines

1. Import tokens via `import { colors } from '~/theme'` for custom styles or pass Tailwind classes in JSX via NativeWind.
2. Wrap screens in providers by default (already handled in `_layout.tsx`). Consume theme state with `const { setMode } = useTheme()`.
3. Extend Tailwind tokens sparingly—additions should first be defined in `src/theme/foundations` and `global.css`, then referenced in `tailwind.config.js`.
4. Build new primitives adjacent to the existing ones. Favor variants/props over duplication (e.g., `TaskCard` with `variant="mit"`).

This foundation ensures future planning, execution, billing, and auth modules all share tokens, typography, and behavior across iOS, Android, and Web builds.
