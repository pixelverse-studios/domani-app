/**
 * System Category Validation Utilities
 *
 * Validation functions to prevent users from creating custom categories
 * with reserved system category names.
 *
 * @module systemCategories.validation
 */

import { SYSTEM_CATEGORIES, type SystemCategoryName } from './systemCategories'

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Error code for reserved category name violations
 */
export const RESERVED_NAME_ERROR_CODE = 'RESERVED_CATEGORY_NAME'

/**
 * Get all reserved category names
 * @returns Array of reserved system category names
 * @example getReservedCategoryNames() // ['Work', 'Personal', 'Wellness', 'Home']
 */
export function getReservedCategoryNames(): SystemCategoryName[] {
  return Object.values(SYSTEM_CATEGORIES).map((cat) => cat.name)
}

/**
 * Get formatted error message for reserved name violation
 * @returns User-friendly error message listing all reserved names
 */
export function getReservedNameError(): string {
  const reserved = getReservedCategoryNames().join(', ')
  return `Cannot use reserved category name. Reserved names: ${reserved}`
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a category name is reserved (case-insensitive)
 * @param name - Category name to check
 * @returns True if the name is reserved
 * @example
 * isReservedCategoryName('Work') // true
 * isReservedCategoryName('work') // true
 * isReservedCategoryName('HOME') // true
 * isReservedCategoryName('Custom') // false
 */
export function isReservedCategoryName(name: string): boolean {
  const normalizedName = name.trim().toLowerCase()
  const reservedNames = getReservedCategoryNames().map((n) => n.toLowerCase())
  return reservedNames.includes(normalizedName)
}

/**
 * Custom error class for reserved category name violations
 * Allows distinguishing between validation errors and database errors
 */
export class ReservedCategoryNameError extends Error {
  code: string

  constructor(message?: string) {
    super(message || getReservedNameError())
    this.name = 'ReservedCategoryNameError'
    this.code = RESERVED_NAME_ERROR_CODE
  }
}

/**
 * Validate category name and throw if reserved
 * @param name - Category name to validate
 * @throws {ReservedCategoryNameError} If the name is reserved
 * @example
 * validateCategoryName('Work') // throws ReservedCategoryNameError
 * validateCategoryName('My Custom Category') // no error
 */
export function validateCategoryName(name: string): void {
  if (isReservedCategoryName(name)) {
    throw new ReservedCategoryNameError()
  }
}
