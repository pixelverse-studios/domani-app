import React, { useEffect, useRef } from 'react'
import { InteractionManager } from 'react-native'
import { useColorScheme as useNativeWindColorScheme } from 'nativewind'

/**
 * ThemeProvider sets NativeWind to light mode (single theme).
 * Kept as a provider for future multi-theme support.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { setColorScheme } = useNativeWindColorScheme()
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      if (isMounted.current) {
        setColorScheme('light')
      }
    })
    return () => task.cancel()
  }, [setColorScheme])

  return <>{children}</>
}
