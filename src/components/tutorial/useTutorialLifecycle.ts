import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { usePathname } from 'expo-router'

import { useTutorialStore } from '~/stores/tutorialStore'

/**
 * Hook to manage tutorial pause/resume based on app lifecycle and navigation.
 *
 * Call this once in a high-level component (e.g., root layout) to:
 * - Pause tutorial when app goes to background
 * - Resume/restart tutorial when app comes back to foreground
 * - Pause tutorial when user navigates away from the Planning screen
 * - Resume/restart tutorial when user returns to Planning screen
 */
export function useTutorialLifecycle() {
  const pathname = usePathname()
  const { isActive, pausedStep, hasCompletedTutorial, pauseTutorial, resumeOrRestart } =
    useTutorialStore()

  // Track previous app state to detect transitions
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  // Track if we were on the planning screen
  const wasOnPlanningRef = useRef(pathname === '/planning')

  // Listen for app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current

      // App going to background
      if (prevState === 'active' && nextAppState.match(/inactive|background/)) {
        pauseTutorial()
      }

      // App coming back to foreground
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        // Only resume if we're on the planning screen
        if (pathname === '/planning') {
          resumeOrRestart()
        }
      }

      appStateRef.current = nextAppState
    })

    return () => subscription.remove()
  }, [pauseTutorial, resumeOrRestart, pathname])

  // Listen for navigation changes
  useEffect(() => {
    const isOnPlanning = pathname === '/planning'
    const wasOnPlanning = wasOnPlanningRef.current

    // Navigated away from Planning screen while tutorial was active
    if (wasOnPlanning && !isOnPlanning && isActive) {
      pauseTutorial()
    }

    // Navigated back to Planning screen while tutorial was paused
    if (!wasOnPlanning && isOnPlanning && pausedStep && !hasCompletedTutorial) {
      resumeOrRestart()
    }

    wasOnPlanningRef.current = isOnPlanning
  }, [pathname, isActive, pausedStep, hasCompletedTutorial, pauseTutorial, resumeOrRestart])
}
