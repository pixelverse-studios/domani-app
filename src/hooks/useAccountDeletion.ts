import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase, sendAccountEmail } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'
import { useProfile } from '~/hooks/useProfile'
import { useTranslation } from '~/hooks/useTranslation'
import { formatLocalizedDateWithOptions } from '~/i18n/date'
import { sendTeamNotification } from '~/lib/teamNotifications'

export function useAccountDeletion() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const { locale } = useTranslation()
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
    return formatLocalizedDateWithOptions(date, locale, {
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

      const { error } = await supabase.rpc('schedule_current_user_account_deletion')

      if (error) throw error

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('deletion_scheduled_for')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('[useAccountDeletion] failed to read scheduled deletion date:', profileError)
      }

      // Calculate deletion date (30 days from now) for email
      const scheduledDate =
        !profileError && updatedProfile?.deletion_scheduled_for
          ? new Date(updatedProfile.deletion_scheduled_for)
          : new Date()

      if (profileError || !updatedProfile?.deletion_scheduled_for) {
        scheduledDate.setDate(scheduledDate.getDate() + 30)
      }

      // Send deletion confirmation email (must complete before signOut invalidates token)
      await sendAccountEmail({
        type: 'account_deletion',
        email: user.email,
        name: profile?.full_name || undefined,
        deletionDate: formatDeletionDate(scheduledDate),
      })

      void sendTeamNotification({
        type: 'account_lifecycle',
        email: user.email,
        userId: user.id,
        event: 'deletion_scheduled',
        deletionScheduledFor: scheduledDate.toISOString(),
        source: 'settings',
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

      const { error } = await supabase.rpc('cancel_current_user_account_deletion')

      if (error) throw error

      // Send reactivation confirmation email
      await sendAccountEmail({
        type: 'account_reactivation',
        email: user.email,
        name: profile?.full_name || undefined,
      })

      void sendTeamNotification({
        type: 'account_lifecycle',
        email: user.email,
        userId: user.id,
        event: 'reactivated',
        deletionScheduledFor: profile?.deletion_scheduled_for ?? null,
        source: 'settings',
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
