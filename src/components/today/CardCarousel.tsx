import React, { useState, useRef } from 'react'
import { View, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 40 // Account for padding

interface CardCarouselProps {
  children: React.ReactNode[]
}

export function CardCarousel({ children }: CardCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollViewRef = useRef<ScrollView>(null)

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x
    const index = Math.round(contentOffset / CARD_WIDTH)
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
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        {React.Children.map(children, (child, index) => (
          <View key={index} style={{ width: CARD_WIDTH }}>
            {child}
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View className="flex-row justify-center gap-2 mt-4">
        {React.Children.map(children, (_, index) => (
          <View
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === activeIndex ? 'bg-purple-500' : 'bg-slate-600'
            }`}
          />
        ))}
      </View>
    </View>
  )
}
