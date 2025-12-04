import React from 'react'
import { StyleSheet, Text, TextStyle, View } from 'react-native'
import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from 'expo-linear-gradient'

interface GradientTextProps {
  children: string
  colors: readonly [string, string, ...string[]]
  style?: TextStyle
  start?: { x: number; y: number }
  end?: { x: number; y: number }
}

export const GradientText = ({
  children,
  colors,
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
}: GradientTextProps) => {
  return (
    <MaskedView
      maskElement={
        <View style={styles.maskContainer}>
          <Text style={[styles.text, style]}>{children}</Text>
        </View>
      }
    >
      <LinearGradient colors={colors} start={start} end={end}>
        <Text style={[styles.text, style, styles.invisible]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  )
}

const styles = StyleSheet.create({
  maskContainer: {
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
  },
  invisible: {
    opacity: 0,
  },
})
