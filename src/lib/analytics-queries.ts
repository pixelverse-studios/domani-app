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

  // Fetch tasks with their plan dates and category info (both system and user categories)
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      completed_at,
      system_category_id,
      user_category_id,
      plan_id,
      system_categories (
        id,
        name,
        color
      ),
      user_categories (
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
 * Fetch planning streak - consecutive days the user created a plan
 *
 * Counts backwards from today, checking for plans on each date.
 * A day counts if a plan exists for that date (regardless of task completion).
 */
export async function fetchPlanningStreak(userId: string): Promise<number | null> {
  // Get today's date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch all plan dates for the user, ordered by date descending
  const { data: plans, error } = await supabase
    .from('plans')
    .select('planned_for')
    .eq('user_id', userId)
    .lte('planned_for', todayStr) // Include today and past
    .order('planned_for', { ascending: false })

  if (error || !plans) {
    return null
  }

  // Get unique dates (in case of duplicates)
  const planDates = new Set(plans.map((p) => p.planned_for))

  // Calculate streak - count consecutive days with plans
  let streak = 0
  const checkDate = new Date(today)

  while (true) {
    const checkDateStr = checkDate.toISOString().split('T')[0]

    if (planDates.has(checkDateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // Gap found - streak ends
      break
    }
  }

  return streak
}

/**
 * Fetch execution streak - consecutive days where ALL tasks were completed
 *
 * A "perfect day" is a day where the user had a plan with at least one task,
 * and ALL tasks in that plan were completed.
 *
 * Counts backwards from yesterday (today is still in progress).
 */
export async function fetchExecutionStreak(userId: string): Promise<number | null> {
  // Get today's date in user's local context (we'll use UTC for now)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch all plans with task counts for the user, ordered by date descending
  // We need: planned_for, total tasks, completed tasks
  const { data: plans, error } = await supabase
    .from('plans')
    .select(
      `
      id,
      planned_for,
      tasks (
        id,
        completed_at
      )
    `,
    )
    .eq('user_id', userId)
    .lt('planned_for', todayStr) // Only past days (today is still in progress)
    .order('planned_for', { ascending: false })

  if (error || !plans) {
    return null
  }

  // Calculate streak - count consecutive perfect days
  let streak = 0
  const expectedDate = new Date(today)
  expectedDate.setDate(expectedDate.getDate() - 1) // Start from yesterday

  for (const plan of plans) {
    const planDate = new Date(plan.planned_for)
    planDate.setHours(0, 0, 0, 0)

    // Check if this plan is for the expected date in the streak
    const expectedDateStr = expectedDate.toISOString().split('T')[0]
    if (plan.planned_for !== expectedDateStr) {
      // Gap in dates - streak is broken
      break
    }

    // Check if this was a perfect day (has tasks and all completed)
    const tasks = plan.tasks as { id: string; completed_at: string | null }[]
    if (tasks.length === 0) {
      // No tasks planned - doesn't count as perfect, but also doesn't break streak
      // Move to previous day and continue
      expectedDate.setDate(expectedDate.getDate() - 1)
      continue
    }

    const allCompleted = tasks.every((task) => task.completed_at !== null)
    if (!allCompleted) {
      // Not all tasks completed - streak broken
      break
    }

    // Perfect day! Increment streak and move to previous day
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
