import React, { useState, useRef, useEffect } from 'react'
import { View, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'

import { useAppTheme } from '~/hooks/useAppTheme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface CardCarouselProps {
  children: React.ReactNode[]
}

const AUTO_SCROLL_INTERVAL = 8000
const RESUME_DELAY = 10000

export function CardCarousel({ children }: CardCarouselProps) {
  const theme = useAppTheme()
  const brandColor = theme.colors.brand.primary

  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoScrolling, setIsAutoScrolling] = useState(true)
  const scrollViewRef = useRef<ScrollView>(null)
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const childCount = React.Children.count(children)

  // Auto-scroll timer
  useEffect(() => {
    if (!isAutoScrolling || childCount <= 1) return

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % childCount
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      })
      setActiveIndex(nextIndex)
    }, AUTO_SCROLL_INTERVAL)

    return () => clearInterval(interval)
  }, [activeIndex, isAutoScrolling, childCount])

  // Cleanup resume timeout on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current)
      }
    }
  }, [])

  const handleScrollBeginDrag = () => {
    setIsAutoScrolling(false)
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current)
      resumeTimeoutRef.current = null
    }
  }

  const handleScrollEndDrag = () => {
    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true)
    }, RESUME_DELAY)
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x
    const index = Math.round(contentOffset / SCREEN_WIDTH)
    setActiveIndex(index)
  }

  return (
    <View>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {React.Children.map(children, (child, index) => (
          <View key={index} style={{ width: SCREEN_WIDTH }}>
            {child}
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View className="flex-row justify-center gap-2 mt-4">
        {React.Children.map(children, (_, index) => (
          <View
            key={index}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: index === activeIndex ? brandColor : theme.colors.border.primary,
            }}
          />
        ))}
      </View>
    </View>
  )
}
