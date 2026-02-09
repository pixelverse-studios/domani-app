import React from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Rect,
  G,
  ClipPath,
} from 'react-native-svg'
import { getTheme } from '~/theme/themes'

interface DomaniIconProps {
  size?: number
  variant?: 'full' | 'monogram' | 'wordmark'
  showBackground?: boolean
}

/**
 * Domani Brand Icon
 *
 * Design concept: The "D" as a horizon with rising sun
 * - The curved part of the D suggests a horizon/dawn
 * - The amber circle is the sun peeking over the horizon
 * - Represents the threshold between today and tomorrow
 *
 * Variants:
 * - full: Complete logo with D monogram
 * - monogram: Just the D with sun
 * - wordmark: Just "domani" text
 */
export function DomaniIcon({
  size = 100,
  variant = 'monogram',
  showBackground = true,
}: DomaniIconProps) {
  if (variant === 'monogram') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Background gradient - sage green */}
          <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={getTheme().colors.brand.primary} />
            <Stop offset="50%" stopColor={getTheme().colors.brand.dark} />
            <Stop offset="100%" stopColor={getTheme().colors.text.primary} />
          </LinearGradient>

          {/* D letter gradient - light sage/white */}
          <LinearGradient id="letterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="100%" stopColor={getTheme().colors.brand.light} />
          </LinearGradient>

          {/* Sun gradient - amber with glow */}
          <RadialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fcd34d" />
            <Stop offset="70%" stopColor="#f59e0b" />
            <Stop offset="100%" stopColor="#d97706" />
          </RadialGradient>

          {/* Sun glow */}
          <RadialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fcd34d" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#fcd34d" stopOpacity={0} />
          </RadialGradient>

          {/* Rounded rect clip for iOS-style icon */}
          <ClipPath id="iconClip">
            <Rect x="0" y="0" width="100" height="100" rx="22" ry="22" />
          </ClipPath>
        </Defs>

        {/* Background */}
        {showBackground && (
          <Rect x="0" y="0" width="100" height="100" rx="22" ry="22" fill="url(#bgGradient)" />
        )}

        {/* Stylized "D" letterform */}
        <G clipPath={showBackground ? 'url(#iconClip)' : undefined}>
          {/*
            The D is designed as a horizon symbol:
            - Vertical stem on the left
            - Curved bowl on the right suggesting the curve of the earth/horizon
            - The opening in the D faces right (towards tomorrow)
          */}
          <Path
            d="M28 22 L28 78 L48 78 C66 78 78 66 78 50 C78 34 66 22 48 22 L28 22 Z
               M38 32 L46 32 C58 32 66 40 66 50 C66 60 58 68 46 68 L38 68 L38 32 Z"
            fill="url(#letterGradient)"
            fillRule="evenodd"
          />

          {/* Sun glow effect (behind the sun) */}
          <Circle cx="72" cy="32" r="16" fill="url(#sunGlow)" />

          {/* The amber sun - positioned at upper right of D
              Represents the sun rising over the horizon (tomorrow) */}
          <Circle cx="72" cy="32" r="10" fill="url(#sunGradient)" />

          {/* Small highlight on sun for depth */}
          <Circle cx="69" cy="29" r="3" fill="#fef3c7" opacity={0.7} />
        </G>
      </Svg>
    )
  }

  // Wordmark variant
  if (variant === 'wordmark') {
    return (
      <Svg width={size * 2.8} height={size * 0.72} viewBox="0 0 280 72">
        <Defs>
          <LinearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={getTheme().colors.brand.light} />
            <Stop offset="50%" stopColor={getTheme().colors.brand.primary} />
            <Stop offset="100%" stopColor={getTheme().colors.brand.dark} />
          </LinearGradient>
        </Defs>
        {/* d */}
        <Path
          d="M0 56V16h6v14.5c2.5-3.5 6.5-5.5 11.5-5.5 9 0 15.5 7 15.5 16s-6.5 16-15.5 16c-5 0-9-2-11.5-5.5V56H0zm16.5-5c6 0 10-4.5 10-10s-4-10-10-10-10 4.5-10 10 4 10 10 10z"
          fill="url(#textGrad)"
        />
        {/* o */}
        <Path
          d="M52 41c0-9 7-16 16-16s16 7 16 16-7 16-16 16-16-7-16-16zm26 0c0-5.5-4-10-10-10s-10 4.5-10 10 4 10 10 10 10-4.5 10-10z"
          fill="url(#textGrad)"
        />
        {/* m */}
        <Path
          d="M92 56V26h6v4c2-3 5.5-5 10-5 5 0 9 2.5 11 6.5 2.5-4 7-6.5 12.5-6.5 8 0 13.5 5.5 13.5 14v17h-6V40c0-5.5-3.5-9-8.5-9-5.5 0-9.5 4-9.5 10v15h-6V40c0-5.5-3.5-9-8.5-9-5.5 0-9.5 4-9.5 10v15h-5z"
          fill="url(#textGrad)"
        />
        {/* a */}
        <Path
          d="M154 41c0-9 7-16 16-16 10 0 16.5 7.5 16.5 17v2h-27c.5 5.5 5 9.5 11 9.5 4.5 0 8-2 10-5.5l5 3c-3 5-8.5 8-15.5 8-10 0-16-7-16-18zm6-.5h21c-.5-5-4.5-9-10.5-9s-10 4-10.5 9z"
          fill="url(#textGrad)"
        />
        {/* n */}
        <Path
          d="M196 56V26h6v4.5c2.5-3.5 6.5-5.5 11.5-5.5 8.5 0 14 5.5 14 14v17h-6V40c0-6-4-9-9.5-9s-10 4-10 10v15h-6z"
          fill="url(#textGrad)"
        />
        {/* i stem */}
        <Path d="M238 56V26h6v30h-6z" fill="url(#textGrad)" />
        {/* Amber dot on the i - the "sun" accent */}
        <Circle cx="241" cy="14" r="5" fill="#f59e0b" />
      </Svg>
    )
  }

  // Full variant - monogram + wordmark (for large displays)
  return (
    <View style={styles.fullContainer}>
      <DomaniIcon size={size} variant="monogram" showBackground={showBackground} />
      <View style={{ width: size * 0.2 }} />
      <DomaniIcon size={size * 0.6} variant="wordmark" showBackground={false} />
    </View>
  )
}

const styles = StyleSheet.create({
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
})

export default DomaniIcon
