import React from 'react'
import { StyleSheet, Text as RNText, View } from 'react-native'
import { useTheme } from '~/hooks/useTheme'
import { colors } from '~/theme'

export const LegalFooter = () => {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const themeColors = {
    text: isDark ? colors.text.tertiary.dark : colors.text.tertiary.light,
    link: isDark ? colors.text.secondary.dark : colors.text.secondary.light,
  }

  return (
    <View style={styles.container}>
      <RNText style={[styles.text, { color: themeColors.text }]}>
        By continuing, you agree to our
      </RNText>
      <View style={styles.linksRow}>
        <RNText style={[styles.link, { color: themeColors.link }]}>Terms of Service</RNText>
        <RNText style={[styles.text, { color: themeColors.text }]}> and </RNText>
        <RNText style={[styles.link, { color: themeColors.link }]}>Privacy Policy</RNText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 12,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
})
