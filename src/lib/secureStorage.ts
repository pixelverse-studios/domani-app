import * as Keychain from 'react-native-keychain'

/**
 * Secure storage adapter for Supabase auth tokens.
 * Uses react-native-keychain to store credentials in the device's
 * secure enclave (iOS Keychain / Android Keystore).
 */
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key })
      if (!credentials) return null
      // Upgrade existing installations before their saved session can be reused.
      await Keychain.setGenericPassword(key, credentials.password, {
        service: key,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      })
      return credentials.password
    } catch (error) {
      console.error('[secureStorage] Error getting item:', error)
      throw error
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: key,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      })
    } catch (error) {
      console.error('[secureStorage] Error setting item:', error)
      throw error
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: key })
    } catch (error) {
      console.error('[secureStorage] Error removing item:', error)
      throw error
    }
  },
}
