/**
 * System Category Constants
 *
 * Single source of truth for all system category definitions, types, and mappings.
 * System categories are the 4 default categories that all users receive: Work, Personal, Wellness, Home.
 *
 * @module systemCategories
 */

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * System category names as they appear in the database
 * @example 'Work' | 'Personal' | 'Wellness' | 'Home'
 */
export type SystemCategoryName = 'Work' | 'Personal' | 'Wellness' | 'Home'

/**
 * System category IDs used in forms and UI state
 * @example 'work' | 'personal' | 'wellness' | 'home'
 */
export type SystemCategoryId = 'work' | 'personal' | 'wellness' | 'home'

/**
 * System category definition with all metadata
 */
export interface SystemCategoryDefinition {
  /** Unique identifier (lowercase) */
  readonly id: SystemCategoryId
  /** Display name (capitalized) */
  readonly name: SystemCategoryName
  /** Icon identifier for Lucide React icons */
  readonly icon: string
  /** Hex color code */
  readonly color: string
  /** Display order position (0-3) */
  readonly position: number
}

// ============================================================================
// System Category Definitions
// ============================================================================

/**
 * System category definitions with all metadata
 *
 * Colors sourced from theme system (themes.ts):
 * - Work: #8B9DAF (slate blue - priority.low)
 * - Personal: #7D9B8A (sage green - brand.primary)
 * - Wellness: #D77A61 (terracotta - priority.high)
 * - Home: #E8B86D (golden amber - priority.medium)
 *
 * Icons use Lucide React naming convention (PascalCase, no hyphens)
 */
export const SYSTEM_CATEGORIES = {
  work: {
    id: 'work' as const,
    name: 'Work' as const,
    icon: 'briefcase',
    color: '#8B9DAF',
    position: 0,
  },
  personal: {
    id: 'personal' as const,
    name: 'Personal' as const,
    icon: 'user',
    color: '#7D9B8A',
    position: 2,
  },
  wellness: {
    id: 'wellness' as const,
    name: 'Wellness' as const,
    icon: 'heart',
    color: '#D77A61',
    position: 1,
  },
  home: {
    id: 'home' as const,
    name: 'Home' as const,
    icon: 'home',
    color: '#E8B86D',
    position: 3,
  },
} as const

// ============================================================================
// Reverse Mappings
// ============================================================================

/**
 * Map from database name (capitalized) to category definition
 * @example CATEGORY_BY_NAME['Work'] // { id: 'work', name: 'Work', ... }
 */
export const CATEGORY_BY_NAME: Record<
  SystemCategoryName,
  typeof SYSTEM_CATEGORIES[keyof typeof SYSTEM_CATEGORIES]
> = {
  Work: SYSTEM_CATEGORIES.work,
  Personal: SYSTEM_CATEGORIES.personal,
  Wellness: SYSTEM_CATEGORIES.wellness,
  Home: SYSTEM_CATEGORIES.home,
}

/**
 * Map from form ID (lowercase) to category definition
 * @example CATEGORY_BY_ID['work'] // { id: 'work', name: 'Work', ... }
 */
export const CATEGORY_BY_ID: Record<
  SystemCategoryId,
  typeof SYSTEM_CATEGORIES[keyof typeof SYSTEM_CATEGORIES]
> = {
  work: SYSTEM_CATEGORIES.work,
  personal: SYSTEM_CATEGORIES.personal,
  wellness: SYSTEM_CATEGORIES.wellness,
  home: SYSTEM_CATEGORIES.home,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get category definition by form ID
 * @param id - Category form ID (lowercase)
 * @returns Category definition or undefined if not found
 * @example getCategoryById('work') // { id: 'work', name: 'Work', ... }
 */
export function getCategoryById(
  id: SystemCategoryId,
): SystemCategoryDefinition | undefined {
  return CATEGORY_BY_ID[id]
}

/**
 * Get category definition by database name
 * @param name - Category database name (capitalized)
 * @returns Category definition or undefined if not found
 * @example getCategoryByName('Work') // { id: 'work', name: 'Work', ... }
 */
export function getCategoryByName(
  name: SystemCategoryName,
): SystemCategoryDefinition | undefined {
  return CATEGORY_BY_NAME[name]
}

/**
 * Get all system category definitions as an array, sorted by position
 * @returns Array of all system categories
 * @example getAllSystemCategories() // [{ id: 'work', ... }, { id: 'wellness', ... }, ...]
 */
export function getAllSystemCategories(): SystemCategoryDefinition[] {
  return Object.values(SYSTEM_CATEGORIES).sort((a, b) => a.position - b.position)
}

/**
 * Check if a given string is a valid system category name
 * @param name - String to check
 * @returns True if the name matches a system category
 * @example isSystemCategoryName('Work') // true
 * @example isSystemCategoryName('Custom') // false
 */
export function isSystemCategoryName(name: string): name is SystemCategoryName {
  return name in CATEGORY_BY_NAME
}

/**
 * Check if a given string is a valid system category ID
 * @param id - String to check
 * @returns True if the ID matches a system category
 * @example isSystemCategoryId('work') // true
 * @example isSystemCategoryId('custom') // false
 */
export function isSystemCategoryId(id: string): id is SystemCategoryId {
  return id in CATEGORY_BY_ID
}

// ============================================================================
// Theme Configuration for Day Type Inference
// ============================================================================

/**
 * Day theme types used for inferring the overall "vibe" of a day
 * Based on task categories and keywords
 *
 * @note 'learning' theme uses Home category colors since Home replaced Education category
 */
export type DayTheme = 'work' | 'wellness' | 'personal' | 'learning' | 'balanced'

/**
 * Keywords for mapping custom user categories to day themes
 * Used by day type inference to categorize tasks when they don't have system categories
 *
 * @example A custom category named "gym session" would match wellness theme
 * @example A custom category named "read book" would match learning theme
 */
export const THEME_KEYWORDS: Record<DayTheme, string[]> = {
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
  balanced: [], // Fallback theme with no specific keywords
}

/**
 * Theme color mappings derived from system categories
 * Maps day themes to their associated colors from system categories
 *
 * @note 'learning' theme uses Home category color (#E8B86D) since Home replaced the old Education category
 * @note 'balanced' theme uses the dynamic brand.primary color from the theme system
 */
export const THEME_COLORS: Record<DayTheme, string> = {
  work: SYSTEM_CATEGORIES.work.color, // #8B9DAF - Muted blue-gray
  wellness: SYSTEM_CATEGORIES.wellness.color, // #D77A61 - Terracotta
  personal: SYSTEM_CATEGORIES.personal.color, // #7D9B8A - Sage green
  learning: SYSTEM_CATEGORIES.home.color, // #E8B86D - Warm amber (Home replaced Education)
  balanced: SYSTEM_CATEGORIES.personal.color, // #7D9B8A - Default to sage (overridden dynamically)
}
