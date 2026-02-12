/**
 * Category Icon Rendering Utility
 *
 * Centralized icon rendering for system and user categories.
 * Consolidates 4 duplicate getCategoryIcon() implementations across components.
 *
 * @module categoryIcons
 */

import React from 'react'
import { Briefcase, Heart, User, Home, Tag, Star } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'

// ============================================================================
// Types
// ============================================================================

/**
 * Category input can be an ID string, icon name, or a category object
 */
export interface CategoryInput {
  name?: string
  icon?: string
  isSystem?: boolean
}

export interface CategoryIconProps {
  /**
   * Category ID ('work', 'wellness', 'personal', 'home') or icon name ('briefcase', 'heart', etc.)
   */
  categoryId?: string

  /**
   * Category object with name/icon/isSystem fields
   */
  category?: CategoryInput | null

  /**
   * Icon color
   */
  color: string

  /**
   * Icon size in pixels
   * @default 16
   */
  size?: number

  /**
   * Stroke width for icon
   * @default undefined (uses Lucide default)
   */
  strokeWidth?: number

  /**
   * Fill color for icon (used for selection states)
   * @default 'none'
   */
  fill?: string

  /**
   * Whether the icon is in a selected state (affects fill)
   * @default false
   */
  isSelected?: boolean
}

// ============================================================================
// Icon Component Mapping
// ============================================================================

/**
 * Map of icon identifiers to Lucide React Native components
 */
const ICON_MAP: Record<string, LucideIcon> = {
  // System category IDs
  work: Briefcase,
  wellness: Heart,
  personal: User,
  home: Home,

  // Icon names (database values)
  briefcase: Briefcase,
  heart: Heart,
  user: User,
  house: Home, // Legacy, 'home' is preferred

  // Alternative names
  health: Heart,

  // Generic/fallback
  tag: Tag,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon component from category ID, icon name, or category object
 */
function getIconComponent(
  categoryId?: string,
  category?: CategoryInput | null,
): LucideIcon {
  // If category object provided
  if (category) {
    // User-created categories (non-system) always get Star icon
    if (category.isSystem === false) {
      return Star
    }

    // Try icon field first, then name
    const identifier = category.icon || category.name
    if (identifier) {
      const iconComponent = ICON_MAP[identifier.toLowerCase()]
      if (iconComponent) return iconComponent
    }

    // Fallback for system categories without match
    return Star
  }

  // If category ID string provided
  if (categoryId) {
    const iconComponent = ICON_MAP[categoryId.toLowerCase()]
    if (iconComponent) return iconComponent
  }

  // Final fallback
  return Tag
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Render a category icon with consistent styling
 *
 * Supports multiple input patterns:
 * - Direct category ID: `getCategoryIcon({ categoryId: 'work', color: '#000' })`
 * - Category object: `getCategoryIcon({ category: { name: 'Work', icon: 'briefcase' }, color: '#000' })`
 * - Selection state: `getCategoryIcon({ categoryId: 'work', color: '#000', isSelected: true, fill: '#7D9B8A' })`
 *
 * @example
 * // Basic usage
 * <View>{getCategoryIcon({ categoryId: 'work', color: theme.colors.text.primary })}</View>
 *
 * @example
 * // With category object
 * <View>{getCategoryIcon({ category: taskCategory, color: '#7D9B8A', size: 18 })}</View>
 *
 * @example
 * // With selection state
 * <View>{getCategoryIcon({
 *   categoryId: 'wellness',
 *   color: isSelected ? brandColor : defaultColor,
 *   fill: isSelected ? brandColor : 'none',
 *   isSelected: true
 * })}</View>
 */
export function getCategoryIcon({
  categoryId,
  category,
  color,
  size = 16,
  strokeWidth,
  fill = 'none',
  isSelected = false,
}: CategoryIconProps): React.ReactElement {
  const IconComponent = getIconComponent(categoryId, category)

  // Determine fill based on selection state
  const iconFill = isSelected ? (typeof fill === 'string' ? fill : color) : 'none'

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={iconFill}
    />
  )
}

/**
 * Get the Lucide icon component for a category (without rendering)
 * Useful for component maps or dynamic imports
 *
 * @example
 * const IconComponent = getCategoryIconComponent('work')
 * return <IconComponent size={20} color="#000" />
 */
export function getCategoryIconComponent(
  categoryIdOrName: string,
): LucideIcon {
  return ICON_MAP[categoryIdOrName.toLowerCase()] || Tag
}
