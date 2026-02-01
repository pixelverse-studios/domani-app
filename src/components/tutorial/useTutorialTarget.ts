import { useRef, useCallback, useEffect } from 'react'
import { View, findNodeHandle, UIManager, Platform, Dimensions } from 'react-native'

import { useTutorialStore, TutorialStep } from '~/stores/tutorialStore'
import { useTutorialScroll } from './TutorialScrollContext'

const SCREEN_HEIGHT = Dimensions.get('window').height

/**
 * Hook to register a component as a tutorial spotlight target.
 *
 * Usage:
 * ```tsx
 * const { targetRef, measureTarget } = useTutorialTarget('add_task_button')
 *
 * return (
 *   <View ref={targetRef} onLayout={measureTarget}>
 *     <TouchableOpacity>...</TouchableOpacity>
 *   </View>
 * )
 * ```
 */
export function useTutorialTarget(step: TutorialStep) {
  const targetRef = useRef<View>(null)
  const { isActive, currentStep, setTargetMeasurement } = useTutorialStore()
  const scrollContext = useTutorialScroll()

  // Only measure when tutorial is active AND this is the current step
  // This prevents premature measurements when navigating to a screen
  const shouldMeasure = isActive && currentStep === step

  const measureTarget = useCallback(() => {
    if (!shouldMeasure || !targetRef.current) return

    const node = findNodeHandle(targetRef.current)
    if (!node) return

    // Use measureInWindow to get absolute screen coordinates
    if (Platform.OS === 'ios') {
      targetRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setTargetMeasurement(step, { x, y, width, height })
        }
      })
    } else {
      // Android needs UIManager.measure for accurate coordinates
      UIManager.measure(node, (x, y, width, height, pageX, pageY) => {
        if (width > 0 && height > 0) {
          setTargetMeasurement(step, { x: pageX, y: pageY, width, height })
        }
      })
    }
  }, [shouldMeasure, step, setTargetMeasurement])

  // Scroll into view and then measure when this step becomes active
  useEffect(() => {
    if (isActive && currentStep === step && targetRef.current) {
      // First, scroll to make the target visible if we have a scroll context
      if (scrollContext) {
        // Use a longer initial delay to ensure the page is fully laid out
        // and any screen-level scroll has completed (Settings scrolls to top at 200ms)
        const initialDelay = setTimeout(() => {
          if (!targetRef.current) return

          // Measure the target's position relative to the screen
          targetRef.current.measureInWindow((x, y, width, height) => {
            if (height > 0) {
              // Calculate if scrolling is needed
              // Target should ideally be in the upper-middle portion of the screen
              // to leave room for the tooltip below
              const idealY = SCREEN_HEIGHT * 0.25 // Target should be ~25% from top
              const scrollDelta = y - idealY

              // Only scroll if the target is not already well-positioned
              // (too high near status bar or too low near bottom)
              if (y < 120 || y + height > SCREEN_HEIGHT - 150) {
                // Scroll to bring target to ideal position
                const newScrollY = Math.max(0, scrollDelta)
                scrollContext.scrollToY(newScrollY, true)

                // Re-measure after scroll animation completes
                setTimeout(measureTarget, 400)
              } else {
                // Already visible, just measure
                measureTarget()
              }
            } else {
              // No height yet, try measuring again after a delay
              setTimeout(measureTarget, 300)
            }
          })
        }, 350) // Initial delay to allow screen-level scrolling to complete

        return () => clearTimeout(initialDelay)
      } else {
        // No scroll context, just measure with a small delay
        const timer = setTimeout(measureTarget, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [isActive, currentStep, step, measureTarget, scrollContext])

  // Clear measurement when tutorial ends
  useEffect(() => {
    if (!isActive) {
      setTargetMeasurement(step, null)
    }
  }, [isActive, step, setTargetMeasurement])

  return {
    targetRef,
    measureTarget,
  }
}
