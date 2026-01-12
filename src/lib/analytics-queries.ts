import { supabase } from '~/lib/supabase'

/**
 * Analytics Query Utilities
 *
 * This file contains shared utilities and types for analytics data fetching.
 * Individual metric queries will be added here as they are implemented:
 * - DOM-245: Completion Rate
 * - DOM-246: Planning Streak
 * - DOM-247: Execution Streak
 * - DOM-248: MIT Completion Rate
 */

export interface CategoryCompletionRate {
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  completed: number
  total: number
  rate: number
}

export interface CompletionRateData {
  overall: number
  completed: number
  total: number
  byCategory: CategoryCompletionRate[]
}

export interface AnalyticsSummary {
  completionRate: CompletionRateData | null
  planningStreak: number | null
  executionStreak: number | null
  mitCompletionRate: number | null
  hasData: boolean
}

/**
 * Check if the user has any analytics data (any completed plans or tasks)
 */
export async function checkHasAnalyticsData(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    return false
  }

  return (count ?? 0) > 0
}

/**
 * Fetch completion rate data including overall rate and per-category breakdown
 */
export async function fetchCompletionRate(userId: string): Promise<CompletionRateData | null> {
  // Fetch all tasks for user with their category info
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      completed_at,
      system_category_id,
      system_categories (
        id,
        name,
        color,
        icon
      )
    `,
    )
    .eq('user_id', userId)

  if (tasksError || !tasks || tasks.length === 0) {
    return null
  }

  // Calculate overall completion rate
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed_at !== null).length
  const overallRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate per-category rates
  const categoryMap = new Map<
    string,
    {
      categoryId: string
      categoryName: string
      categoryColor: string
      categoryIcon: string
      completed: number
      total: number
    }
  >()

  for (const task of tasks) {
    // Type the system_categories correctly (it comes back as an object, not array)
    const category = task.system_categories as {
      id: string
      name: string
      color: string
      icon: string
    } | null

    if (category) {
      const existing = categoryMap.get(category.id) || {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        categoryIcon: category.icon,
        completed: 0,
        total: 0,
      }

      existing.total++
      if (task.completed_at !== null) {
        existing.completed++
      }

      categoryMap.set(category.id, existing)
    }
  }

  // Convert map to array and calculate rates
  const byCategory: CategoryCompletionRate[] = Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      rate: cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total) // Sort by most used category first

  return {
    overall: overallRate,
    completed: completedTasks,
    total: totalTasks,
    byCategory,
  }
}

/**
 * Placeholder for planning streak query
 * Will be implemented in DOM-246
 */
export async function fetchPlanningStreak(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-246
  return null
}

/**
 * Placeholder for execution streak query
 * Will be implemented in DOM-247
 */
export async function fetchExecutionStreak(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-247
  return null
}

/**
 * Placeholder for MIT completion rate query
 * Will be implemented in DOM-248
 */
export async function fetchMitCompletionRate(_userId: string): Promise<number | null> {
  // TODO: Implement in DOM-248
  return null
}
