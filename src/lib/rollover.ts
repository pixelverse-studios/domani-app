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
import { format, parseISO, setHours, setMinutes } from 'date-fns'

import { supabase } from './supabase'
import { NotificationService } from './notifications'
import { addBreadcrumb } from './sentry'
import type { TaskWithCategory, TaskPriority } from '~/types'

/**
 * AsyncStorage key for storing the last prompted date
 */
const ROLLOVER_PROMPTED_DATE_KEY = 'rollover_prompted_date'

/**
 * AsyncStorage key for storing the last celebrated date
 */
const CELEBRATION_SHOWN_DATE_KEY = 'celebration_shown_date'

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

/**
 * Check if the user was already celebrated for completing all tasks today
 *
 * @returns Promise<boolean> - true if already celebrated today, false otherwise
 *
 * @example
 * const alreadyCelebrated = await wasCelebratedToday()
 * if (!alreadyCelebrated) {
 *   // Show celebration modal
 * }
 */
export async function wasCelebratedToday(): Promise<boolean> {
  try {
    const lastCelebrated = await AsyncStorage.getItem(CELEBRATION_SHOWN_DATE_KEY)
    const today = format(new Date(), 'yyyy-MM-dd')
    return lastCelebrated === today
  } catch (error) {
    console.error('Error checking celebration status:', error)
    // On error, assume not celebrated to avoid blocking the celebration
    return false
  }
}

/**
 * Mark the user as having been celebrated today
 *
 * Stores today's date in ISO format (yyyy-MM-dd).
 * State automatically resets at midnight when the date changes.
 *
 * @returns Promise<void>
 *
 * @example
 * // After showing celebration modal
 * await markCelebratedToday()
 */
export async function markCelebratedToday(): Promise<void> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    await AsyncStorage.setItem(CELEBRATION_SHOWN_DATE_KEY, today)
  } catch (error) {
    console.error('Error marking celebration:', error)
    // Fail silently - not critical if we can't save the state
  }
}

/**
 * Clear the celebration state (for testing/debugging)
 *
 * @returns Promise<void>
 *
 * @example
 * await clearCelebrationState()
 */
export async function clearCelebrationState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CELEBRATION_SHOWN_DATE_KEY)
  } catch (error) {
    console.error('Error clearing celebration state:', error)
  }
}

/**
 * AsyncStorage key for tracking evening rollover prompt (Flow 2)
 * Kept separate from morning rollover to allow both flows to run on the same day.
 */
const EVENING_ROLLOVER_PROMPTED_DATE_KEY = 'evening_rollover_prompted_date'

/**
 * Check if the user was already shown the evening rollover prompt today
 */
export async function wasEveningPromptedToday(): Promise<boolean> {
  try {
    const lastPrompted = await AsyncStorage.getItem(EVENING_ROLLOVER_PROMPTED_DATE_KEY)
    const today = format(new Date(), 'yyyy-MM-dd')
    return lastPrompted === today
  } catch (error) {
    console.error('Error checking evening rollover prompt status:', error)
    return false
  }
}

/**
 * Mark the user as having been shown the evening rollover prompt today
 */
export async function markEveningPromptedToday(): Promise<void> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    await AsyncStorage.setItem(EVENING_ROLLOVER_PROMPTED_DATE_KEY, today)
  } catch (error) {
    console.error('Error marking evening rollover prompt:', error)
  }
}

/**
 * Input parameters for carrying forward tasks from yesterday to today
 */
export interface CarryForwardInput {
  /** IDs of tasks to carry forward */
  selectedTaskIds: string[]
  /** ID of the plan to add tasks to (today's plan) */
  targetPlanId: string
  /** If true, the carried MIT becomes today's MIT (priority = 'top') */
  shouldMakeMIT: boolean
  /** If true, preserve original reminder times (adjusted to today) */
  keepReminderTimes: boolean
}

/**
 * Carry forward selected tasks from yesterday to today's plan
 *
 * Creates new tasks for today based on yesterday's incomplete tasks.
 * Handles MIT transfer, reminder time adjustment, and notification scheduling.
 *
 * @param input - Configuration for which tasks to carry forward and how
 * @returns Promise<TaskWithCategory[]> - Array of newly created tasks
 * @throws Error if user not authenticated or database operation fails
 *
 * @example
 * const createdTasks = await carryForwardTasks({
 *   selectedTaskIds: ['task-id-1', 'task-id-2'],
 *   targetPlanId: 'today-plan-id',
 *   shouldMakeMIT: true,
 *   keepReminderTimes: true,
 * })
 */
export async function carryForwardTasks(
  input: CarryForwardInput
): Promise<TaskWithCategory[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // FIX 1: CRITICAL - Verify user owns the target plan
  const { data: targetPlan, error: planError } = await supabase
    .from('plans')
    .select('user_id')
    .eq('id', input.targetPlanId)
    .single()

  if (planError || !targetPlan) {
    throw new Error('Unauthorized: Target plan does not belong to user')
  }
  if (targetPlan.user_id !== user.id) {
    throw new Error('Unauthorized: Target plan does not belong to user')
  }

  // FIX 2: CRITICAL - Add explicit user_id check to source tasks query
  // Fetch original tasks with all data including category relations
  const { data: selectedTasks, error: fetchError } = await supabase
    .from('tasks')
    .select(
      `
      *,
      system_category:system_categories(*),
      user_category:user_categories(*)
    `
    )
    .in('id', input.selectedTaskIds)
    .eq('user_id', user.id)

  if (fetchError) throw fetchError
  if (!selectedTasks || selectedTasks.length === 0) {
    return []
  }

  const createdTasks: TaskWithCategory[] = []
  const scheduledNotifications: string[] = []
  const now = new Date()

  try {
    // Create each task in the target plan
    for (const originalTask of selectedTasks) {
      // Determine priority for MIT handling
      // If shouldMakeMIT is true AND this was the MIT, set priority='top'
      // DB trigger will auto-set is_mit=true and demote other TOP tasks
      let newPriority: TaskPriority = (originalTask.priority ?? 'medium') as TaskPriority
      if (input.shouldMakeMIT && originalTask.is_mit) {
        newPriority = 'top'
      }

      // Calculate reminder time if keeping times
      let newReminderAt: string | null = null
      if (input.keepReminderTimes && originalTask.reminder_at) {
        const originalReminder = parseISO(originalTask.reminder_at)
        // Create new reminder for today at the same time
        const nextOccurrence = setMinutes(
          setHours(now, originalReminder.getHours()),
          originalReminder.getMinutes()
        )

        // Only use if future (don't schedule reminders in the past)
        if (nextOccurrence > now) {
          newReminderAt = nextOccurrence.toISOString()
        }
      }

      // Create new task in target plan
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          plan_id: input.targetPlanId,
          user_id: user.id,
          title: originalTask.title,
          description: originalTask.description,
          system_category_id: originalTask.system_category_id,
          user_category_id: originalTask.user_category_id,
          priority: newPriority,
          estimated_duration_minutes: originalTask.estimated_duration_minutes,
          notes: originalTask.notes,
          reminder_at: newReminderAt,
          // Do NOT set: is_mit (auto-set by trigger), completed_at, notification_id
        })
        .select(
          `
          *,
          system_category:system_categories(*),
          user_category:user_categories(*)
        `
        )
        .single()

      // FIX 3: IMPORTANT - Check for FREE_TIER_LIMIT error
      if (createError) {
        // Check if this is a free tier limit error
        if (
          (createError as any).code === '23514' ||
          createError.message.includes('task limit')
        ) {
          throw new Error('FREE_TIER_LIMIT')
        }
        throw createError
      }

      const taskWithCategory = newTask as TaskWithCategory
      // FIX 4: IMPORTANT - Track task immediately after successful insert
      createdTasks.push(taskWithCategory)

      // Schedule notification if reminder is set
      if (taskWithCategory.reminder_at) {
        const notificationId = await NotificationService.scheduleTaskReminder({
          id: taskWithCategory.id,
          title: taskWithCategory.title,
          is_mit: taskWithCategory.is_mit,
          reminder_at: taskWithCategory.reminder_at,
        })

        if (notificationId) {
          scheduledNotifications.push(notificationId)
          // FIX 5: IMPORTANT - Check for errors when updating notification_id
          // Update task with notification ID
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ notification_id: notificationId })
            .eq('id', taskWithCategory.id)
          // Only update local object if update succeeded
          if (!updateError) {
            taskWithCategory.notification_id = notificationId
          }
        }
      }
    }

    // Log success breadcrumb for Sentry
    addBreadcrumb('Tasks carried forward', 'rollover', {
      taskCount: createdTasks.length,
      mitCarried: createdTasks.some((t) => t.is_mit),
      keepReminders: input.keepReminderTimes,
    })

    return createdTasks
  } catch (error) {
    // All-or-nothing rollback: Delete all created tasks
    console.error('[carryForwardTasks] Error occurred, rolling back:', error)

    for (const task of createdTasks) {
      try {
        await supabase.from('tasks').delete().eq('id', task.id)
      } catch (deleteError) {
        console.error(`[carryForwardTasks] Rollback failed for task ${task.id}:`, deleteError)
      }
    }

    // Cancel all scheduled notifications
    for (const notificationId of scheduledNotifications) {
      try {
        await NotificationService.cancelTaskReminder(notificationId)
      } catch (cancelError) {
        console.error(
          `[carryForwardTasks] Failed to cancel notification ${notificationId}:`,
          cancelError
        )
      }
    }

    throw error
  }
}
