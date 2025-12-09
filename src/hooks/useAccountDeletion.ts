import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase, sendAccountEmail } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'

export function useAccountDeletion() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()

  // Check if deletion is pending
  const isPendingDeletion = !!profile?.deleted_at

  // Calculate days remaining until hard delete
  const daysRemaining = (() => {
    if (!profile?.deletion_scheduled_for) return null

    const scheduledDate = new Date(profile.deletion_scheduled_for)
    const now = new Date()
    const diffTime = scheduledDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(0, diffDays)
  })()

  // Format the deletion date for display
  const formatDeletionDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const deletionDate = (() => {
    if (!profile?.deletion_scheduled_for) return null
    return formatDeletionDate(new Date(profile.deletion_scheduled_for))
  })()

  // Schedule account for deletion
  const scheduleDeletion = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.email) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('schedule_account_deletion', {
        p_user_id: user.id,
      })

      if (error) throw error

      // Calculate deletion date (30 days from now) for email
      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + 30)

      // Send deletion confirmation email (must complete before signOut invalidates token)
      await sendAccountEmail({
        type: 'account_deletion',
        email: user.email,
        name: profile?.full_name || undefined,
        deletionDate: formatDeletionDate(scheduledDate),
      })
    },
    onSuccess: async () => {
      // Sign out the user after scheduling deletion
      await signOut()
    },
  })

  // Cancel scheduled deletion (reactivate account)
  const cancelDeletion = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.email) throw new Error('Not authenticated')

      const { error } = await supabase.rpc('cancel_account_deletion', {
        p_user_id: user.id,
      })

      if (error) throw error

      // Send reactivation confirmation email
      await sendAccountEmail({
        type: 'account_reactivation',
        email: user.email,
        name: profile?.full_name || undefined,
      })
    },
    onSuccess: () => {
      // Invalidate profile to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  return {
    isPendingDeletion,
    daysRemaining,
    deletionDate,
    scheduleDeletion,
    cancelDeletion,
  }
}
