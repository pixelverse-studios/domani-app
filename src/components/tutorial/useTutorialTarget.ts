import { useRef, useCallback, useEffect } from 'react'
import { View, findNodeHandle, UIManager, Platform } from 'react-native'

import { useTutorialStore, TutorialStep } from '~/stores/tutorialStore'

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

  // Only measure when tutorial is active and we're on or approaching this step
  const shouldMeasure = isActive

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

  // Re-measure when this step becomes active
  useEffect(() => {
    if (isActive && currentStep === step) {
      // Small delay to ensure layout is complete
      const timer = setTimeout(measureTarget, 100)
      return () => clearTimeout(timer)
    }
  }, [isActive, currentStep, step, measureTarget])

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
