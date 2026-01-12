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

export interface DailyCategoryData {
  categoryId: string
  categoryName: string
  categoryColor: string
  completed: number
  incomplete: number
}

export interface DailyCompletionData {
  date: string // ISO date string
  dayLabel: string // "Mon", "Tue", etc.
  categories: DailyCategoryData[]
  totalCompleted: number
  totalIncomplete: number
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
 * Fetch daily completion data for the last N days
 * Returns completion breakdown by category for each day
 */
export async function fetchDailyCompletions(
  userId: string,
  days: number = 7,
): Promise<DailyCompletionData[]> {
  // Calculate date range (last N days including today)
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (days - 1))
  startDate.setHours(0, 0, 0, 0)

  const startDateStr = startDate.toISOString().split('T')[0]

  // Fetch tasks with their plan dates and category info
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      completed_at,
      system_category_id,
      plan_id,
      system_categories (
        id,
        name,
        color
      ),
      plans!inner (
        planned_for
      )
    `,
    )
    .eq('user_id', userId)
    .gte('plans.planned_for', startDateStr)

  if (error || !tasks) {
    return []
  }

  // Group tasks by date
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dailyMap = new Map<string, DailyCompletionData>()

  // Initialize all days in range
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    dailyMap.set(dateStr, {
      date: dateStr,
      dayLabel: dayLabels[date.getDay()],
      categories: [],
      totalCompleted: 0,
      totalIncomplete: 0,
    })
  }

  // Process tasks
  for (const task of tasks) {
    const plan = task.plans as { planned_for: string } | null
    if (!plan) continue

    const dateStr = plan.planned_for
    const dayData = dailyMap.get(dateStr)
    if (!dayData) continue

    const category = task.system_categories as {
      id: string
      name: string
      color: string
    } | null

    if (!category) continue

    const isCompleted = task.completed_at !== null

    // Find or create category entry for this day
    let categoryEntry = dayData.categories.find((c) => c.categoryId === category.id)
    if (!categoryEntry) {
      categoryEntry = {
        categoryId: category.id,
        categoryName: category.name,
        categoryColor: category.color,
        completed: 0,
        incomplete: 0,
      }
      dayData.categories.push(categoryEntry)
    }

    if (isCompleted) {
      categoryEntry.completed++
      dayData.totalCompleted++
    } else {
      categoryEntry.incomplete++
      dayData.totalIncomplete++
    }
  }

  // Convert map to sorted array (oldest to newest)
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
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
