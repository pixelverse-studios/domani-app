import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { supabase } from '~/lib/supabase'
import { sendTeamNotification } from '~/lib/teamNotifications'
import type { PurchaseRefundState } from '~/types'
import {
  captureAccountOperationToken,
  reconcileAccountOperation,
  requireAccountOwnedOperation,
} from '~/lib/accountLifecycleCoordinator'

interface MarkRefundPendingInput {
  platform: 'ios'
  source?: string | null
  error?: string | null
  subscriptionStatus?: string | null
}

interface RecordDuplicateRefundRequestHintInput {
  platform: 'ios'
  source?: string | null
  error?: string | null
  subscriptionStatus?: string | null
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
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const notificationEmail = profile?.email ?? user?.email ?? null

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
    mutationFn: async ({
      platform,
      source,
      error: pendingError,
      subscriptionStatus,
    }: MarkRefundPendingInput) => {
      if (!user?.id) return null
      const expectedUserId = user.id
      const expectedEmail = notificationEmail

      return requireAccountOwnedOperation(expectedUserId, async () => {
        await markCurrentUserRefundRequestPending({
          platform,
          source,
          error: pendingError,
        })

        const { data, error: selectError } = await supabase
          .from('purchase_refund_states')
          .select('*')
          .eq('user_id', expectedUserId)
          .maybeSingle()

        if (selectError) throw selectError
        const refundState = data as PurchaseRefundState | null

        if (expectedEmail) {
          sendTeamNotification({
            type: 'purchase_refund_intent',
            email: expectedEmail,
            userId: expectedUserId,
            intent: 'pending_refund_request',
            platform,
            source,
            subscriptionStatus,
            refundStatus: refundState?.status ?? null,
            clientHint: refundState?.client_hint ?? null,
            refundStateUpdatedAt: refundState?.updated_at ?? null,
          })
        }

        return refundState
      })
    },
    onMutate: () => ({ accountToken: captureAccountOperationToken(user?.id ?? null) }),
    onSuccess: (data, _variables, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return
      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        queryClient.setQueryData(['purchaseRefundState', accountToken.userId], data)
      })
    },
  })

  const recordDuplicateRequestHintMutation = useMutation({
    mutationFn: async ({
      platform,
      source,
      error: duplicateError,
      subscriptionStatus,
    }: RecordDuplicateRefundRequestHintInput) => {
      if (!user?.id) return null
      const expectedUserId = user.id
      const expectedEmail = notificationEmail

      return requireAccountOwnedOperation(expectedUserId, async () => {
        await recordCurrentUserDuplicateRefundRequestHint({
          platform,
          source,
          error: duplicateError,
        })

        const { data, error: selectError } = await supabase
          .from('purchase_refund_states')
          .select('*')
          .eq('user_id', expectedUserId)
          .maybeSingle()

        if (selectError) throw selectError
        const refundState = data as PurchaseRefundState | null

        if (expectedEmail) {
          sendTeamNotification({
            type: 'purchase_refund_intent',
            email: expectedEmail,
            userId: expectedUserId,
            intent: 'duplicate_refund_request',
            platform,
            source,
            subscriptionStatus,
            refundStatus: refundState?.status ?? null,
            clientHint: refundState?.client_hint ?? null,
            refundStateUpdatedAt: refundState?.updated_at ?? null,
          })
        }

        return refundState
      })
    },
    onMutate: () => ({ accountToken: captureAccountOperationToken(user?.id ?? null) }),
    onSuccess: (data, _variables, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return
      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        queryClient.setQueryData(['purchaseRefundState', accountToken.userId], data)
      })
    },
  })

  const clearStateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      const expectedUserId = user.id
      await requireAccountOwnedOperation(expectedUserId, () =>
        clearCurrentUserPurchaseRefundState(),
      )
    },
    onMutate: () => ({ accountToken: captureAccountOperationToken(user?.id ?? null) }),
    onSuccess: (_data, _variables, context) => {
      const accountToken = context?.accountToken
      if (!accountToken) return
      reconcileAccountOperation(accountToken, (disposition) => {
        if (disposition === 'changed') return
        queryClient.setQueryData(['purchaseRefundState', accountToken.userId], null)
      })
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
