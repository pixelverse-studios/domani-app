import React from 'react'
import { StyleSheet, Text as RNText, View } from 'react-native'

import { useTheme } from '~/hooks/useTheme'

export const LegalFooter = () => {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'

  const textColor = isDark ? 'rgba(250, 245, 255, 0.4)' : 'rgba(30, 27, 75, 0.4)'
  const linkColor = isDark ? 'rgba(250, 245, 255, 0.5)' : 'rgba(30, 27, 75, 0.5)'

  return (
    <View style={styles.container}>
      <RNText style={[styles.text, { color: textColor }]}>By continuing, you agree to our</RNText>
      <View style={styles.linksRow}>
        <RNText style={[styles.link, { color: linkColor }]}>Terms of Service</RNText>
        <RNText style={[styles.text, { color: textColor }]}> and </RNText>
        <RNText style={[styles.link, { color: linkColor }]}>Privacy Policy</RNText>
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
