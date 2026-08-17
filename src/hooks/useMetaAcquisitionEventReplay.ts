import { useEffect } from 'react'
import { AppState } from 'react-native'

import { useAuth } from '~/hooks/useAuth'
import {
  META_EVENT_REPLAY_INTERVAL_MS,
  replayPendingMetaAppEvents,
} from '~/lib/metaAcquisitionEvents'

export function useMetaAcquisitionEventReplay() {
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    const replay = () => {
      void replayPendingMetaAppEvents(userId).catch((error) => {
        console.warn('[Meta App Events] Failed to drain pending events', error)
      })
    }

    replay()
    const interval = setInterval(replay, META_EVENT_REPLAY_INTERVAL_MS)
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') replay()
    })

    return () => {
      clearInterval(interval)
      appStateSubscription.remove()
    }
  }, [userId])
}
