import React from 'react'
import { StyleSheet, Text as RNText, View, TouchableOpacity, Linking, Alert } from 'react-native'
import { useAppTheme } from '~/hooks/useAppTheme'

const LEGAL_URLS = {
  termsOfService: 'https://www.domani-app.com/terms',
  privacyPolicy: 'https://www.domani-app.com/privacy',
}

export const LegalFooter = () => {
  const theme = useAppTheme()

  const themeColors = {
    text: theme.colors.text.tertiary,
    link: theme.colors.text.secondary,
  }

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        Alert.alert('Unable to open link', 'Please try again later.')
      }
    } catch (error) {
      console.error('Error opening URL:', error)
      Alert.alert('Unable to open link', 'Please try again later.')
    }
  }

  return (
    <View style={styles.container}>
      <RNText style={[styles.text, { color: themeColors.text }]}>
        By continuing, you agree to our
      </RNText>
      <View style={styles.linksRow}>
        <TouchableOpacity onPress={() => openURL(LEGAL_URLS.termsOfService)} activeOpacity={0.7}>
          <RNText style={[styles.link, { color: themeColors.link }]}>Terms of Service</RNText>
        </TouchableOpacity>
        <RNText style={[styles.text, { color: themeColors.text }]}> and </RNText>
        <TouchableOpacity onPress={() => openURL(LEGAL_URLS.privacyPolicy)} activeOpacity={0.7}>
          <RNText style={[styles.link, { color: themeColors.link }]}>Privacy Policy</RNText>
        </TouchableOpacity>
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
