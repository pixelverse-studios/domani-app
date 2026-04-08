import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

import { supabase } from '~/lib/supabase'
import { useAuth } from '~/hooks/useAuth'

const THROTTLE_MS = 60 * 60 * 1000 // 1 hour

/**
 * Tracks user activity by updating last_active_at on app open/resume.
 * Throttled to once per hour. Fire-and-forget — never blocks the user.
 */
export function useActivityTracking() {
  const { user } = useAuth()
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const lastUpdatedRef = useRef<number>(0)

  useEffect(() => {
    if (!user) return

    const updateActivity = () => {
      const now = Date.now()
      if (now - lastUpdatedRef.current < THROTTLE_MS) return
      lastUpdatedRef.current = now

      supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id)
        .then() // fire-and-forget
    }

    // Update on mount (app open)
    updateActivity()

    // Update on foreground resume
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      appStateRef.current = nextState
      if (wasBackground && nextState === 'active') {
        updateActivity()
      }
    })

    return () => subscription.remove()
  }, [user])
}
