/* eslint-disable domani/no-dark-mode-patterns, domani/no-hardcoded-colors */
import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path, G, ClipPath, Defs } from 'react-native-svg'
import clsx from 'clsx'

import { useAppTheme } from '~/hooks/useAppTheme'

type SocialProvider = 'google' | 'apple'

interface SocialButtonProps {
  provider: SocialProvider
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  comingSoon?: boolean
  className?: string
}

// Google "G" logo - official colors
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Defs>
      <ClipPath id="clip">
        <Path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#clip)">
      <Path fill="#FBBC05" d="M0 37V11l17 13z" />
      <Path fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z" />
      <Path fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z" />
      <Path fill="#4285F4" d="M48 48L17 24l-4-3 35-10z" />
    </G>
  </Svg>
)

// Apple logo
const AppleIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </Svg>
)

export const SocialButton = ({
  provider,
  onPress,
  loading = false,
  disabled = false,
  comingSoon = false,
  className,
}: SocialButtonProps) => {
  const theme = useAppTheme()
  // Note: isDark kept for provider brand colors (Google/Apple guidelines), not app theme
  const isDark = false // Single light theme

  const isDisabled = disabled || comingSoon || loading

  // Provider-specific configuration
  const config = {
    google: {
      label: 'Continue with Google',
      bgLight: '#ffffff',
      bgDark: '#131314',
      textLight: '#1f1f1f',
      textDark: '#e3e3e3',
      borderLight: '#747775',
      borderDark: '#8e918f',
      icon: <GoogleIcon />,
    },
    apple: {
      label: 'Continue with Apple',
      bgLight: '#000000',
      bgDark: '#ffffff',
      textLight: '#ffffff',
      textDark: '#000000',
      borderLight: '#000000',
      borderDark: '#ffffff',
      icon: <AppleIcon color={isDark ? '#000000' : '#ffffff'} />,
    },
  }[provider]

  const backgroundColor = isDark ? config.bgDark : config.bgLight
  const textColor = isDark ? config.textDark : config.textLight
  const borderColor = isDark ? config.borderDark : config.borderLight

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={config.label}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.6 : 1,
        },
      ]}
      className={clsx('relative', className)}
    >
      {/* Coming Soon Badge */}
      {comingSoon && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SOON</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconContainer}>{config.icon}</View>
          <Text style={[styles.label, { color: textColor }]}>{config.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.25,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  badgeText: {
    color: '#1f1f1f',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
