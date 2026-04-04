/**
 * Shared plan utilities for dual-write compatibility.
 * Temporary — removed entirely when DEV-587 drops the plans table.
 */

import { supabase } from '~/lib/supabase'

/**
 * Resolve or create a plan for a given date.
 * Handles race conditions where concurrent calls for the same date
 * may both attempt to INSERT (retries on unique violation).
 */
export async function getOrCreatePlanId(date: string, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('plans')
    .select('id')
    .eq('planned_for', date)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('plans')
    .insert({ planned_for: date, user_id: userId })
    .select('id')
    .single()

  // Handle race condition: another concurrent call already created this plan
  if (error?.code === '23505') {
    const { data: retry } = await supabase
      .from('plans')
      .select('id')
      .eq('planned_for', date)
      .eq('user_id', userId)
      .single()
    if (retry) return retry.id
  }

  if (error) throw error
  return created.id
}
