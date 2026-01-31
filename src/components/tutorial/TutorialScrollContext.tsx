import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react'
import { ScrollView } from 'react-native'

interface TutorialScrollContextType {
  scrollViewRef: React.RefObject<ScrollView | null>
  scrollToY: (y: number, animated?: boolean) => void
}

const TutorialScrollContext = createContext<TutorialScrollContextType | null>(null)

interface TutorialScrollProviderProps {
  children: ReactNode
}

/**
 * Provider that enables tutorial auto-scrolling within a ScrollView.
 * Use the returned scrollViewRef on your ScrollView component.
 *
 * Usage:
 * ```tsx
 * function MyScreen() {
 *   const { scrollViewRef } = useTutorialScroll() ?? {}
 *
 *   return (
 *     <TutorialScrollProvider>
 *       <ScrollView ref={scrollViewRef}>
 *         <TutorialTarget step="my_step">...</TutorialTarget>
 *       </ScrollView>
 *     </TutorialScrollProvider>
 *   )
 * }
 * ```
 */
export function TutorialScrollProvider({ children }: TutorialScrollProviderProps) {
  const scrollViewRef = useRef<ScrollView>(null)

  const scrollToY = useCallback((y: number, animated = true) => {
    scrollViewRef.current?.scrollTo({ y, animated })
  }, [])

  return (
    <TutorialScrollContext.Provider value={{ scrollViewRef, scrollToY }}>
      {children}
    </TutorialScrollContext.Provider>
  )
}

/**
 * Hook to access the tutorial scroll context.
 * Returns null if not within a TutorialScrollProvider.
 */
export function useTutorialScroll() {
  return useContext(TutorialScrollContext)
}
