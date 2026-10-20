import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type RolloutEvent =
  | 'verified_success'
  | 'webhook_success'
  | 'delayed_reconciliation'
  | 'reconciliation_success'
  | 'rejection'
  | 'unresolved_failure'

/** Bounded labels only. Never persist provider payloads or exception messages. */
export async function recordRolloutEvent(
  client: SupabaseClient,
  event: RolloutEvent,
  userId: string | null = null,
) {
  try {
    await client
      .rpc('record_rollout_event', { p_event: event, p_user_id: userId })
      .abortSignal(AbortSignal.timeout(1500))
  } catch {
    // Monitoring cannot change purchase, refund, or reconciliation outcomes.
  }
}
