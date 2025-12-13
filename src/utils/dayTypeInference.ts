/**
 * Day Type Inference Utility
 *
 * Analyzes task categories to determine the overall "vibe" of the day.
 * Maps both system categories and custom user categories to broader themes.
 */

import type { TaskWithCategory } from '~/types'

// Theme buckets that categories map to
export type DayTheme = 'work' | 'wellness' | 'personal' | 'learning' | 'balanced'

export interface DayType {
  theme: DayTheme
  title: string
  subtitle: string
  iconName: 'Briefcase' | 'Heart' | 'Home' | 'BookOpen' | 'Scale'
  accentColor: string
}

// Keywords for mapping custom categories to themes
const THEME_KEYWORDS: Record<DayTheme, string[]> = {
  work: [
    'work',
    'job',
    'career',
    'meeting',
    'project',
    'client',
    'office',
    'business',
    'deadline',
    'presentation',
    'report',
    'email',
    'call',
    'task',
    'professional',
  ],
  wellness: [
    'health',
    'gym',
    'workout',
    'exercise',
    'wellness',
    'meditation',
    'sleep',
    'doctor',
    'fitness',
    'yoga',
    'run',
    'walk',
    'mental',
    'therapy',
    'nutrition',
    'diet',
    'hydrate',
    'rest',
    'self-care',
    'selfcare',
  ],
  personal: [
    'home',
    'family',
    'friends',
    'shopping',
    'chores',
    'errands',
    'pets',
    'cleaning',
    'cooking',
    'laundry',
    'groceries',
    'social',
    'date',
    'hobby',
    'fun',
    'relax',
    'personal',
  ],
  learning: [
    'learn',
    'study',
    'read',
    'course',
    'class',
    'skill',
    'practice',
    'book',
    'education',
    'training',
    'tutorial',
    'lecture',
    'research',
    'creative',
    'art',
    'music',
    'write',
    'language',
  ],
  balanced: [], // Fallback, no keywords
}

// System category name to theme mapping
const SYSTEM_CATEGORY_MAP: Record<string, DayTheme> = {
  Work: 'work',
  Wellness: 'wellness',
  Personal: 'personal',
  Education: 'learning',
}

// Day type definitions with personality
const DAY_TYPE_CONFIG: Record<DayTheme, Omit<DayType, 'theme'>> = {
  work: {
    title: 'Productivity Day',
    subtitle: 'Heads down, results ahead',
    iconName: 'Briefcase',
    accentColor: '#3B82F6', // blue-500
  },
  wellness: {
    title: 'Self-Care Day',
    subtitle: 'Investing in yourself',
    iconName: 'Heart',
    accentColor: '#EC4899', // pink-500
  },
  personal: {
    title: 'Life Admin Day',
    subtitle: 'Taking care of what matters',
    iconName: 'Home',
    accentColor: '#10B981', // emerald-500
  },
  learning: {
    title: 'Growth Day',
    subtitle: 'Expanding your horizons',
    iconName: 'BookOpen',
    accentColor: '#F59E0B', // amber-500
  },
  balanced: {
    title: 'Balanced Day',
    subtitle: 'A well-rounded day ahead',
    iconName: 'Scale',
    accentColor: '#a855f7', // purple-500 (matches app accent)
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
