/**
 * Rollover State Tracking
 *
 * Tracks when a user was last prompted for task rollover to prevent
 * multiple prompts on the same day.
 *
 * Uses local storage (AsyncStorage) for instant checks without network calls.
 * State is device-specific and resets naturally at midnight (new date string).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { format } from 'date-fns'

/**
 * AsyncStorage key for storing the last prompted date
 */
const ROLLOVER_PROMPTED_DATE_KEY = 'rollover_prompted_date'

/**
 * Check if the user was already prompted for rollover today
 *
 * @returns Promise<boolean> - true if already prompted today, false otherwise
 *
 * @example
 * const alreadyPrompted = await wasPromptedToday()
 * if (!alreadyPrompted) {
 *   // Show rollover modal
 * }
 */
export async function wasPromptedToday(): Promise<boolean> {
  try {
    const lastPrompted = await AsyncStorage.getItem(ROLLOVER_PROMPTED_DATE_KEY)
    const today = format(new Date(), 'yyyy-MM-dd')
    return lastPrompted === today
  } catch (error) {
    console.error('Error checking rollover prompt status:', error)
    // On error, assume not prompted to avoid blocking the prompt
    return false
  }
}

/**
 * Mark the user as having been prompted for rollover today
 *
 * Stores today's date in ISO format (yyyy-MM-dd).
 * State automatically resets at midnight when the date changes.
 *
 * @returns Promise<void>
 *
 * @example
 * // After showing rollover modal
 * await markPromptedToday()
 */
export async function markPromptedToday(): Promise<void> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    await AsyncStorage.setItem(ROLLOVER_PROMPTED_DATE_KEY, today)
  } catch (error) {
    console.error('Error marking rollover prompt:', error)
    // Fail silently - not critical if we can't save the state
  }
}

/**
 * Clear the rollover prompt state (for testing/debugging)
 *
 * @returns Promise<void>
 *
 * @example
 * await clearPromptState()
 */
export async function clearPromptState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ROLLOVER_PROMPTED_DATE_KEY)
  } catch (error) {
    console.error('Error clearing rollover prompt state:', error)
  }
}
