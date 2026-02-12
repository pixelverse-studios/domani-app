/**
 * Day Type Inference Utility
 *
 * Analyzes task categories to determine the overall "vibe" of the day.
 * Maps both system categories and custom user categories to broader themes.
 */

import type { TaskWithCategory } from '~/types'
import { getTheme } from '~/theme/themes'
import { THEME_KEYWORDS, THEME_COLORS, type DayTheme } from '~/constants/systemCategories'

export interface DayType {
  theme: DayTheme
  title: string
  subtitle: string
  iconName: 'Briefcase' | 'Heart' | 'Home' | 'BookOpen' | 'Scale'
  accentColor: string
}

// System category name to theme mapping
const SYSTEM_CATEGORY_MAP: Record<string, DayTheme> = {
  Work: 'work',
  Wellness: 'wellness',
  Personal: 'personal',
  Home: 'personal', // Home tasks (chores, errands, household) map to personal theme
}

// Day type definitions with personality
// Colors sourced from centralized THEME_COLORS (~/constants/systemCategories.ts)
const DAY_TYPE_CONFIG: Record<DayTheme, Omit<DayType, 'theme'>> = {
  work: {
    title: 'Productivity Day',
    subtitle: 'Heads down, results ahead',
    iconName: 'Briefcase',
    accentColor: THEME_COLORS.work,
  },
  wellness: {
    title: 'Self-Care Day',
    subtitle: 'Investing in yourself',
    iconName: 'Heart',
    accentColor: THEME_COLORS.wellness,
  },
  personal: {
    title: 'Life Admin Day',
    subtitle: 'Taking care of what matters',
    iconName: 'Home',
    accentColor: THEME_COLORS.personal,
  },
  learning: {
    title: 'Growth Day',
    subtitle: 'Expanding your horizons',
    iconName: 'BookOpen',
    accentColor: THEME_COLORS.learning,
  },
  balanced: {
    title: 'Balanced Day',
    subtitle: 'A well-rounded day ahead',
    iconName: 'Scale',
    accentColor: getTheme().colors.brand.primary, // Dynamic color from theme system
  },
}

/**
 * Maps a category name to a theme using keyword matching
 */
function mapCategoryToTheme(categoryName: string): DayTheme {
  const lowerName = categoryName.toLowerCase()

  // Check each theme's keywords
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS) as [DayTheme, string[]][]) {
    if (theme === 'balanced') continue // Skip balanced, it's a fallback

    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return theme
      }
    }
  }

  // Default unknown categories to 'personal'
  return 'personal'
}

/**
 * Gets the theme for a task based on its category
 */
function getTaskTheme(task: TaskWithCategory): DayTheme {
  // Prefer system category if available
  if (task.system_category?.name) {
    const mapped = SYSTEM_CATEGORY_MAP[task.system_category.name]
    if (mapped) return mapped
  }

  // Try user category
  if (task.user_category?.name) {
    return mapCategoryToTheme(task.user_category.name)
  }

  // Fallback for uncategorized tasks
  return 'personal'
}

/**
 * Infers the day type from an array of tasks
 *
 * Rules:
 * - If one theme has >50% of tasks, that theme wins
 * - Otherwise, it's a "balanced" day
 */
export function inferDayType(tasks: TaskWithCategory[]): DayType {
  if (tasks.length === 0) {
    // Edge case: no tasks defaults to balanced
    return { theme: 'balanced', ...DAY_TYPE_CONFIG.balanced }
  }

  // Count tasks per theme
  const themeCounts: Record<DayTheme, number> = {
    work: 0,
    wellness: 0,
    personal: 0,
    learning: 0,
    balanced: 0,
  }

  for (const task of tasks) {
    const theme = getTaskTheme(task)
    themeCounts[theme]++
  }

  // Find the dominant theme (>50%)
  const threshold = tasks.length / 2
  let dominantTheme: DayTheme = 'balanced'

  for (const [theme, count] of Object.entries(themeCounts) as [DayTheme, number][]) {
    if (theme !== 'balanced' && count > threshold) {
      dominantTheme = theme
      break
    }
  }

  // If no dominant theme, check if there's a clear leader (for 2-task ties)
  if (dominantTheme === 'balanced' && tasks.length >= 2) {
    const sortedThemes = (Object.entries(themeCounts) as [DayTheme, number][])
      .filter(([theme]) => theme !== 'balanced')
      .sort((a, b) => b[1] - a[1])

    // If top theme has more than second place, use it
    if (sortedThemes.length >= 2 && sortedThemes[0][1] > sortedThemes[1][1]) {
      dominantTheme = sortedThemes[0][0]
    }
  }

  return {
    theme: dominantTheme,
    ...DAY_TYPE_CONFIG[dominantTheme],
  }
}

/**
 * Gets a breakdown of theme counts for debugging/display
 */
export function getThemeBreakdown(
  tasks: TaskWithCategory[],
): { theme: DayTheme; count: number; percentage: number }[] {
  const themeCounts: Record<DayTheme, number> = {
    work: 0,
    wellness: 0,
    personal: 0,
    learning: 0,
    balanced: 0,
  }

  for (const task of tasks) {
    const theme = getTaskTheme(task)
    themeCounts[theme]++
  }

  return (Object.entries(themeCounts) as [DayTheme, number][])
    .filter(([theme]) => theme !== 'balanced')
    .map(([theme, count]) => ({
      theme,
      count,
      percentage: tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}
