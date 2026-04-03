import { supabase } from '~/lib/supabase'
import { getTheme } from '~/theme/themes'

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
 * Check if the user has any analytics data (any tasks)
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
  // Fetch all tasks for user with their category info (both system and user categories)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(
      `
      id,
      completed_at,
      system_category_id,
      user_category_id,
      system_categories (
        id,
        name,
        color,
        icon
      ),
      user_categories (
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
    // Type the categories correctly (they come back as objects, not arrays)
    const systemCategory = task.system_categories as {
      id: string
      name: string
      color: string
      icon: string
    } | null
    const userCategory = task.user_categories as {
      id: string
      name: string
      color: string
      icon: string
    } | null

    // Prefer system category if both exist (though that shouldn't happen)
    const category = systemCategory || userCategory

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

  // Fetch tasks with category info, filtered by scheduled_date
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      completed_at,
      scheduled_date,
      system_category_id,
      user_category_id,
      system_categories (
        id,
        name,
        color
      ),
      user_categories (
        id,
        name,
        color
      )
    `,
    )
    .eq('user_id', userId)
    .gte('scheduled_date', startDateStr)

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
    if (!task.scheduled_date) continue

    const dateStr = task.scheduled_date
    const dayData = dailyMap.get(dateStr)
    if (!dayData) continue

    // Type the categories correctly (they come back as objects, not arrays)
    const systemCategory = task.system_categories as {
      id: string
      name: string
      color: string
    } | null
    const userCategory = task.user_categories as {
      id: string
      name: string
      color: string
    } | null

    // Prefer system category if both exist (though that shouldn't happen)
    const category = systemCategory || userCategory

    const isCompleted = task.completed_at !== null

    // Use actual category or fallback to "Uncategorized"
    const categoryId = category?.id ?? 'uncategorized'
    const categoryName = category?.name ?? 'Uncategorized'
    const categoryColor = category?.color ?? getTheme().colors.brand.primary

    // Find or create category entry for this day
    let categoryEntry = dayData.categories.find((c) => c.categoryId === categoryId)
    if (!categoryEntry) {
      categoryEntry = {
        categoryId,
        categoryName,
        categoryColor,
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
 * Fetch planning streak - consecutive days the user had tasks scheduled
 *
 * Counts backwards from today, checking for tasks on each date.
 * A day counts if at least one task exists with that scheduled_date.
 */
export async function fetchPlanningStreak(userId: string): Promise<number | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch distinct scheduled_date values for the user
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('scheduled_date')
    .eq('user_id', userId)
    .not('scheduled_date', 'is', null)
    .lte('scheduled_date', todayStr)

  if (error || !tasks) {
    return null
  }

  // Get unique dates
  const taskDates = new Set(tasks.map((t) => t.scheduled_date))

  // Calculate streak - count consecutive days with tasks
  let streak = 0
  const checkDate = new Date(today)

  while (true) {
    const checkDateStr = checkDate.toISOString().split('T')[0]

    if (taskDates.has(checkDateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Fetch execution streak - consecutive days where ALL tasks were completed
 *
 * A "perfect day" is a day where the user had at least one task scheduled,
 * and ALL tasks for that date were completed.
 *
 * Counts backwards from yesterday (today is still in progress).
 */
export async function fetchExecutionStreak(userId: string): Promise<number | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch all past tasks grouped by scheduled_date
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('scheduled_date, completed_at')
    .eq('user_id', userId)
    .not('scheduled_date', 'is', null)
    .lt('scheduled_date', todayStr) // Only past days (today is still in progress)

  if (error || !tasks) {
    return null
  }

  // Group tasks by date
  const dateMap = new Map<string, { total: number; completed: number }>()
  for (const task of tasks) {
    if (!task.scheduled_date) continue
    const entry = dateMap.get(task.scheduled_date) || { total: 0, completed: 0 }
    entry.total++
    if (task.completed_at !== null) entry.completed++
    dateMap.set(task.scheduled_date, entry)
  }

  // Sort dates descending
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a))

  // Calculate streak - count consecutive perfect days
  let streak = 0
  const expectedDate = new Date(today)
  expectedDate.setDate(expectedDate.getDate() - 1) // Start from yesterday

  for (const date of sortedDates) {
    const expectedDateStr = expectedDate.toISOString().split('T')[0]

    if (date !== expectedDateStr) {
      // Gap in dates - streak is broken
      break
    }

    const entry = dateMap.get(date)!
    if (entry.total === 0) {
      // No tasks — skip but don't break
      expectedDate.setDate(expectedDate.getDate() - 1)
      continue
    }

    if (entry.completed < entry.total) {
      // Not all completed — streak broken
      break
    }

    // Perfect day!
    streak++
    expectedDate.setDate(expectedDate.getDate() - 1)
  }

  return streak
}

/**
 * Fetch MIT (Most Important Task) completion rate
 *
 * Calculates the percentage of MITs that have been completed.
 * Returns null if user has no MITs.
 */
export async function fetchMitCompletionRate(userId: string): Promise<number | null> {
  // Query all MIT tasks for the user
  const { data: mits, error } = await supabase
    .from('tasks')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('is_mit', true)

  if (error || !mits || mits.length === 0) {
    return null
  }

  const totalMits = mits.length
  const completedMits = mits.filter((t) => t.completed_at !== null).length
  const rate = Math.round((completedMits / totalMits) * 100)

  return rate
}
