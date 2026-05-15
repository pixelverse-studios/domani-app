import React from 'react'
import { StyleSheet, Text as RNText, View, TouchableOpacity, Linking, Alert } from 'react-native'
import { useAppTheme } from '~/hooks/useAppTheme'
import { useTranslation } from '~/hooks/useTranslation'

const LEGAL_URLS = {
  termsOfService: 'https://www.domani-app.com/terms',
  privacyPolicy: 'https://www.domani-app.com/privacy',
}

export const LegalFooter = () => {
  const theme = useAppTheme()
  const { catalog, t } = useTranslation()

  const themeColors = {
    text: theme.colors.text.tertiary,
    link: theme.colors.text.secondary,
  }
  const footerParts = catalog.legal.footer

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
      } else {
        Alert.alert(t('legal.unableToOpenLinkTitle'), t('legal.unableToOpenLinkMessage'))
      }
    } catch (error) {
      console.error('Error opening URL:', error)
      Alert.alert(t('legal.unableToOpenLinkTitle'), t('legal.unableToOpenLinkMessage'))
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.linksRow}>
        {footerParts.map((part, index) => {
          if (part === '{terms}') {
            return (
              <TouchableOpacity
                key={`legal-footer-${index}`}
                onPress={() => openURL(LEGAL_URLS.termsOfService)}
                activeOpacity={0.7}
              >
                <RNText style={[styles.link, { color: themeColors.link }]}>
                  {t('legal.termsOfService')}
                </RNText>
              </TouchableOpacity>
            )
          }

          if (part === '{privacy}') {
            return (
              <TouchableOpacity
                key={`legal-footer-${index}`}
                onPress={() => openURL(LEGAL_URLS.privacyPolicy)}
                activeOpacity={0.7}
              >
                <RNText style={[styles.link, { color: themeColors.link }]}>
                  {t('legal.privacyPolicy')}
                </RNText>
              </TouchableOpacity>
            )
          }

          return (
            <RNText key={`legal-footer-${index}`} style={[styles.text, { color: themeColors.text }]}>
              {part}
            </RNText>
          )
        })}
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: {
    fontSize: 12,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
})
