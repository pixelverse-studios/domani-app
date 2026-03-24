import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { format, addDays, subDays } from 'date-fns'

/**
 * Returns the current date as 'yyyy-MM-dd', refreshed when:
 * - The app returns to the foreground after being backgrounded
 * - Midnight crosses while the app is open (via a timer)
 *
 * Replaces stale `useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])` patterns
 * that never update if the app survives a midnight crossing.
 */
export function useCurrentDate() {
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  const refreshDate = useCallback(() => {
    setToday((prev) => {
      const now = format(new Date(), 'yyyy-MM-dd')
      return now !== prev ? now : prev
    })
  }, [])

  useEffect(() => {
    // Refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/)
      appStateRef.current = nextState
      if (wasBackground && nextState === 'active') {
        refreshDate()
      }
    })

    // Set a timer to refresh at midnight
    const now = new Date()
    const midnight = new Date(now)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 0, 0)
    const msUntilMidnight = midnight.getTime() - now.getTime()

    const midnightTimer = setTimeout(() => {
      refreshDate()
    }, msUntilMidnight)

    return () => {
      subscription.remove()
      clearTimeout(midnightTimer)
    }
  }, [refreshDate])

  const tomorrow = useMemo(() => format(addDays(new Date(today), 1), 'yyyy-MM-dd'), [today])
  const yesterday = useMemo(() => format(subDays(new Date(today), 1), 'yyyy-MM-dd'), [today])

  return { today, tomorrow, yesterday }
}
