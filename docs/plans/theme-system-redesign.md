# Theme System Redesign Proposal

## Current State Analysis

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  tailwind.config.js          │  src/theme/foundations/colors.ts │
│  (NativeWind + Tailwind)     │  (JS color tokens)               │
│  - Only overrides slate-950  │  - Brand, semantic, text colors  │
│  - Uses built-in palette     │  - Light/dark variants           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  ThemeProvider + themeStore                                     │
│  - Manages light/dark/auto mode                                 │
│  - Syncs with NativeWind via useColorScheme()                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Components                                                     │
│  - Mix of Tailwind classes (dark:bg-slate-800)                  │
│  - Hardcoded hex values in style objects                        │
│  - Some import from colors.ts, many don't                       │
└─────────────────────────────────────────────────────────────────┘
```

### Where Colors Currently Live

| Location                          | What's There                 | Problem                                         |
| --------------------------------- | ---------------------------- | ----------------------------------------------- |
| `src/theme/foundations/colors.ts` | Brand, semantic, text tokens | Underutilized - many components don't import it |
| `tailwind.config.js`              | Only `slate-950` override    | Doesn't define our custom palette               |
| Components (15+ files)            | Hardcoded hex values         | No single source of truth                       |

### Examples of Scattered Colors

**Priority colors duplicated:**

```typescript
// PrioritySelector.tsx
top: '#8b5cf6', high: '#ef4444', medium: '#f97316', low: '#22c55e'

// TaskCard.tsx (same values, duplicated)
top: '#8b5cf6', high: '#ef4444', medium: '#f97316', low: '#22c55e'
```

**Dark/light values inline:**

```typescript
// TaskCard.tsx
const cardBg = isDark ? '#1e293b' : '#ffffff'

// AddTaskForm.tsx
borderColor: isDark ? '#334155' : '#e2e8f0'

// TabLayout
tabBarActiveTintColor: '#a855f7'
tabBarInactiveTintColor: isDark ? '#6b7280' : '#9ca3af'
```

---

## The Problem

1. **No single source of truth** - Colors defined in 3+ places
2. **Palette changes require hunting** - Must find/replace across many files
3. **Inconsistent patterns** - Some use Tailwind classes, some use inline styles, some import tokens
4. **Easy to introduce drift** - Developers copy hex values instead of referencing tokens
5. **Hard to redesign** - A new color palette would touch 15+ files

---

## Proposed Solution: Unified Theme System

### Single Source of Truth

Create one authoritative theme file that defines **everything**:

```
src/theme/tokens.ts (NEW - single source of truth)
    ↓
tailwind.config.js (imports tokens, extends Tailwind)
    ↓
Components (use Tailwind classes OR import tokens directly)
```

### Token Structure

```typescript
// src/theme/tokens.ts

export const tokens = {
  colors: {
    // Brand
    brand: {
      primary: '#a855f7',
      primaryLight: '#c084fc',
      primaryDark: '#7c3aed',
      gradient: {
        start: '#a855f7',
        end: '#7c3aed',
      },
    },

    // Priority (used by tasks)
    priority: {
      top: '#8b5cf6',
      high: '#ef4444',
      medium: '#f97316',
      low: '#22c55e',
    },

    // Semantic
    semantic: {
      success: '#22c55e',
      warning: '#fb923c',
      error: '#ef4444',
      info: '#3b82f6',
    },

    // Surfaces (backgrounds, cards)
    surface: {
      background: { light: '#ffffff', dark: '#0D0D0F' },
      card: { light: '#ffffff', dark: '#1e293b' },
      elevated: { light: '#f8fafc', dark: '#1e293b' },
      input: { light: '#ffffff', dark: '#1e293b' },
    },

    // Borders
    border: {
      default: { light: '#e2e8f0', dark: '#334155' },
      subtle: { light: '#f1f5f9', dark: '#1e293b' },
      focus: { light: '#a855f7', dark: '#a855f7' },
    },

    // Text
    text: {
      primary: { light: '#0f172a', dark: '#f8fafc' },
      secondary: { light: '#475569', dark: 'rgba(255,255,255,0.6)' },
      tertiary: { light: '#64748b', dark: 'rgba(255,255,255,0.4)' },
      inverse: { light: '#ffffff', dark: '#0f172a' },
    },

    // Icons
    icon: {
      default: { light: '#64748b', dark: '#94a3b8' },
      muted: { light: '#94a3b8', dark: '#64748b' },
      active: { light: '#a855f7', dark: '#a855f7' },
    },

    // Tab bar
    tab: {
      active: '#a855f7',
      inactive: { light: '#9ca3af', dark: '#6b7280' },
      background: { light: '#ffffff', dark: '#0a0a0f' },
      border: { light: '#e5e7eb', dark: '#1f2937' },
    },
  },

  // Spacing (matches Tailwind extensions)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },

  // Border radius
  radius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  // Shadows (if needed)
  shadows: {
    sm: { light: '...', dark: '...' },
    md: { light: '...', dark: '...' },
  },
}
```

### Tailwind Integration

```javascript
// tailwind.config.js
const { tokens } = require('./src/theme/tokens')

module.exports = {
  // ...
  theme: {
    extend: {
      colors: {
        brand: tokens.colors.brand,
        priority: tokens.colors.priority,
        // Flatten light/dark for Tailwind usage
        surface: {
          light: tokens.colors.surface.background.light,
          dark: tokens.colors.surface.background.dark,
          card: {
            light: tokens.colors.surface.card.light,
            dark: tokens.colors.surface.card.dark,
          },
        },
        // ... etc
      },
    },
  },
}
```

### Component Usage

**Option A: Tailwind classes (preferred for simple cases)**

```typescript
// Uses tokens via Tailwind config
<View className="bg-surface-light dark:bg-surface-dark border-border-default" />
<Text className="text-brand-primary" />
```

**Option B: Direct import (for dynamic/computed styles)**

```typescript
import { tokens } from '~/theme/tokens'
import { useTheme } from '~/hooks/useTheme'

const { activeTheme } = useTheme()
const isDark = activeTheme === 'dark'

// Access theme-aware values
const cardBg = tokens.colors.surface.card[isDark ? 'dark' : 'light']
const priorityColor = tokens.colors.priority[task.priority]
```

### Helper Hook (Optional)

```typescript
// src/hooks/useTokens.ts
export function useTokens() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  const mode = isDark ? 'dark' : 'light'

  return {
    colors: {
      surface: {
        background: tokens.colors.surface.background[mode],
        card: tokens.colors.surface.card[mode],
      },
      text: {
        primary: tokens.colors.text.primary[mode],
        secondary: tokens.colors.text.secondary[mode],
      },
      border: tokens.colors.border.default[mode],
      // ... flattened for easy access
    },
    // Non-theme values pass through
    priority: tokens.colors.priority,
    brand: tokens.colors.brand,
    spacing: tokens.spacing,
    radius: tokens.radius,
  }
}

// Usage in components
const { colors, priority, spacing } = useTokens()
<View style={{ backgroundColor: colors.surface.card, padding: spacing.md }} />
```

---

## Migration Path

### Phase 1: Create Token System

1. Create `src/theme/tokens.ts` with all color values
2. Update `tailwind.config.js` to import and use tokens
3. Delete old `src/theme/foundations/colors.ts`

### Phase 2: Update Components (incremental)

4. Update shared components first (Button, Card, Input, Text)
5. Update feature components (TaskCard, AddTaskForm, etc.)
6. Update layout files (TabLayout, etc.)

### Phase 3: Validation

7. Visual regression check across light/dark modes
8. Remove all hardcoded hex values (lint rule?)

---

## Benefits

| Before                             | After                         |
| ---------------------------------- | ----------------------------- |
| Change purple → update 15+ files   | Change purple → update 1 file |
| Hardcoded hex scattered everywhere | Single `tokens.ts` source     |
| Inconsistent dark/light patterns   | Consistent `[mode]` accessor  |
| Easy to use wrong shade            | IDE autocomplete from tokens  |
| No visibility into full palette    | Complete palette in one place |

---

## Considerations

**Tailwind classes vs. style objects:**

- Tailwind classes are great for static styles
- Style objects needed for dynamic values (priority colors, computed styles)
- Both can reference the same tokens

**Naming convention:**

- Keep it simple: `surface`, `text`, `border`, `brand`, `priority`
- Avoid deep nesting that makes imports verbose

**TypeScript:**

- Full type safety on token access
- Autocomplete for color names

---

## Open Questions

1. **Tailwind-first or tokens-first?** Should we push toward more Tailwind classes, or accept the mix?

2. **useTokens hook?** Helpful for components with many dynamic styles, but adds abstraction.

3. **CSS variables alternative?** NativeWind supports CSS custom properties - worth exploring?

---

_Ready for feedback_
