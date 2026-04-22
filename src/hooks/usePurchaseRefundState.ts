import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '~/hooks/useAuth'
import { supabase } from '~/lib/supabase'
import type { PurchaseRefundState } from '~/types'

interface MarkRefundPendingInput {
  platform: 'ios'
  source?: string | null
  error?: string | null
}

interface RecordDuplicateRefundRequestHintInput {
  platform: 'ios'
  source?: string | null
  error?: string | null
}

export async function markCurrentUserRefundRequestPending({
  platform,
  source,
  error: pendingError,
}: MarkRefundPendingInput) {
  const { error } = await supabase.rpc('mark_current_user_refund_request_pending', {
    p_platform: platform,
    p_source: source ?? null,
    p_error: pendingError ?? null,
  })

  if (error) throw error
}

export async function clearCurrentUserPurchaseRefundState() {
  const { error } = await supabase.rpc('clear_current_user_refund_request_state')
  if (error) throw error
}

export async function recordCurrentUserDuplicateRefundRequestHint({
  platform,
  source,
  error: duplicateError,
}: RecordDuplicateRefundRequestHintInput) {
  const { error } = await supabase.rpc('record_current_user_duplicate_refund_request_hint', {
    p_platform: platform,
    p_source: source ?? null,
    p_error: duplicateError ?? null,
  })

  if (error) throw error
}

export function usePurchaseRefundState() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['purchaseRefundState', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('purchase_refund_states')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as PurchaseRefundState | null
    },
    enabled: !!user?.id,
  })

  const markPendingMutation = useMutation({
    mutationFn: async ({ platform, source, error: pendingError }: MarkRefundPendingInput) => {
      await markCurrentUserRefundRequestPending({
        platform,
        source,
        error: pendingError,
      })

      if (!user?.id) return null

      const { data, error: selectError } = await supabase
        .from('purchase_refund_states')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (selectError) throw selectError
      return data as PurchaseRefundState | null
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['purchaseRefundState', user?.id], data)
    },
  })

  const recordDuplicateRequestHintMutation = useMutation({
    mutationFn: async ({
      platform,
      source,
      error: duplicateError,
    }: RecordDuplicateRefundRequestHintInput) => {
      await recordCurrentUserDuplicateRefundRequestHint({
        platform,
        source,
        error: duplicateError,
      })

      if (!user?.id) return null

      const { data, error: selectError } = await supabase
        .from('purchase_refund_states')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (selectError) throw selectError
      return data as PurchaseRefundState | null
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['purchaseRefundState', user?.id], data)
    },
  })

  const clearStateMutation = useMutation({
    mutationFn: async () => {
      await clearCurrentUserPurchaseRefundState()
    },
    onSuccess: () => {
      queryClient.setQueryData(['purchaseRefundState', user?.id], null)
    },
  })

  return {
    ...query,
    refundState: query.data,
    markPending: markPendingMutation.mutateAsync,
    isMarkingPending: markPendingMutation.isPending,
    recordDuplicateRequestHint: recordDuplicateRequestHintMutation.mutateAsync,
    isRecordingDuplicateRequestHint: recordDuplicateRequestHintMutation.isPending,
    clearState: clearStateMutation.mutateAsync,
    isClearingState: clearStateMutation.isPending,
  }
}
