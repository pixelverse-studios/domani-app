import { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { usePathname } from 'expo-router'

import { useTutorialStore } from '~/stores/tutorialStore'

/**
 * Tutorial can run on these screens
 */
const TUTORIAL_SCREENS = ['/', '/planning', '/settings']

/**
 * Check if a pathname is a tutorial-enabled screen
 */
function isTutorialScreen(pathname: string): boolean {
  return TUTORIAL_SCREENS.includes(pathname)
}

/**
 * Hook to manage tutorial pause/resume based on app lifecycle and navigation.
 *
 * Call this once in a high-level component (e.g., root layout) to:
 * - Pause tutorial when app goes to background
 * - Resume/restart tutorial when app comes back to foreground
 * - Pause tutorial when user navigates away from tutorial screens (Today or Planning)
 * - Resume/restart tutorial when user returns to a tutorial screen
 */
export function useTutorialLifecycle() {
  const pathname = usePathname()
  const { isActive, pausedStep, hasCompletedTutorial, pauseTutorial, resumeOrRestart } =
    useTutorialStore()

  // Track previous app state to detect transitions
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  // Track if we were on a tutorial screen
  const wasOnTutorialScreenRef = useRef(isTutorialScreen(pathname))

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
        // Only resume if we're on a tutorial screen
        if (isTutorialScreen(pathname)) {
          resumeOrRestart()
        }
      }

      appStateRef.current = nextAppState
    })

    return () => subscription.remove()
  }, [pauseTutorial, resumeOrRestart, pathname])

  // Listen for navigation changes
  useEffect(() => {
    const isOnTutorialScreen = isTutorialScreen(pathname)
    const wasOnTutorialScreen = wasOnTutorialScreenRef.current

    // Navigated away from tutorial screens while tutorial was active
    if (wasOnTutorialScreen && !isOnTutorialScreen && isActive) {
      pauseTutorial()
    }

    // Navigated back to a tutorial screen while tutorial was paused
    if (!wasOnTutorialScreen && isOnTutorialScreen && pausedStep && !hasCompletedTutorial) {
      resumeOrRestart()
    }

    wasOnTutorialScreenRef.current = isOnTutorialScreen
  }, [pathname, isActive, pausedStep, hasCompletedTutorial, pauseTutorial, resumeOrRestart])
}
