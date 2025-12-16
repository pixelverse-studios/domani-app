import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  priority?: 'default' | 'normal' | 'high'
}

interface PushResult {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

async function sendExpoPushNotification(message: ExpoPushMessage): Promise<PushResult> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
  const result = await response.json()
  // Expo returns { data: { ... } } for single messages
  return result.data || result
}

/**
 * Get today's date string (YYYY-MM-DD) for a given timezone
 */
function getTodayForTimezone(timezone: string | null): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now) // Returns 'YYYY-MM-DD'
}

/**
 * Get current time string (HH:MM:00) for a given timezone
 */
function getCurrentTimeForTimezone(timezone: string | null): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const hour = parts.find((p) => p.type === 'hour')?.value || '00'
  const minute = parts.find((p) => p.type === 'minute')?.value || '00'
  return `${hour}:${minute}:00`
}

interface ProcessResult {
  userId: string
  sent?: boolean
  skipped?: boolean
  reason?: string
  taskCount?: number
  pushResult?: PushResult
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    console.log('[send-execution-reminders] Starting execution reminder check...')

    // Get all users with execution reminders enabled and push tokens registered
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, timezone, execution_reminder_time')
      .not('execution_reminder_time', 'is', null)
      .not('expo_push_token', 'is', null)

    if (usersError) {
      console.error('[send-execution-reminders] Error fetching users:', usersError)
      throw usersError
    }

    console.log(
      `[send-execution-reminders] Found ${users?.length || 0} users with execution reminders enabled`,
    )

    const results: ProcessResult[] = []

    for (const user of users || []) {
      // Check if current time matches user's reminder time (in their timezone)
      const currentTime = getCurrentTimeForTimezone(user.timezone)

      // Only process if times match (comparing HH:MM, ignoring seconds)
      const userTime = user.execution_reminder_time?.substring(0, 5)
      const checkTime = currentTime.substring(0, 5)

      if (checkTime !== userTime) {
        // Time doesn't match, skip silently (this is expected for most users)
        continue
      }

      console.log(
        `[send-execution-reminders] Processing user ${user.id} - time matches ${userTime}`,
      )

      // Get today's date in user's timezone
      const today = getTodayForTimezone(user.timezone)

      // Get user's plan for today
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('planned_for', today)
        .maybeSingle()

      if (planError) {
        console.error(
          `[send-execution-reminders] Error fetching plan for user ${user.id}:`,
          planError,
        )
        results.push({ userId: user.id, skipped: true, reason: 'plan_error' })
        continue
      }

      if (!plan) {
        console.log(`[send-execution-reminders] User ${user.id} has no plan for today`)
        results.push({ userId: user.id, skipped: true, reason: 'no_plan' })
        continue
      }

      // Count incomplete tasks
      const { count, error: countError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', plan.id)
        .is('completed_at', null)

      if (countError) {
        console.error(
          `[send-execution-reminders] Error counting tasks for user ${user.id}:`,
          countError,
        )
        results.push({ userId: user.id, skipped: true, reason: 'count_error' })
        continue
      }

      if (!count || count === 0) {
        console.log(`[send-execution-reminders] User ${user.id} has no incomplete tasks`)
        results.push({ userId: user.id, skipped: true, reason: 'no_tasks' })
        continue
      }

      // Build notification body with accurate count
      const body =
        count === 1
          ? '1 task planned for today. Time to shine!'
          : `${count} tasks planned for today. Time to shine!`

      console.log(
        `[send-execution-reminders] Sending notification to user ${user.id} with ${count} tasks`,
      )

      // Send push notification
      const pushResult = await sendExpoPushNotification({
        to: user.expo_push_token,
        title: 'Time to Execute',
        body,
        data: { url: '/(tabs)', type: 'execution_reminder' },
        sound: 'default',
        priority: 'high',
      })

      console.log(`[send-execution-reminders] Push result for user ${user.id}:`, pushResult)

      results.push({
        userId: user.id,
        sent: true,
        taskCount: count,
        pushResult,
      })
    }

    const sentCount = results.filter((r) => r.sent).length
    const skippedCount = results.filter((r) => r.skipped).length

    console.log(
      `[send-execution-reminders] Complete - Sent: ${sentCount}, Skipped: ${skippedCount}`,
    )

    return new Response(
      JSON.stringify({
        success: true,
        summary: { sent: sentCount, skipped: skippedCount },
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[send-execution-reminders] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})
