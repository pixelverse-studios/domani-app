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
      return credentials ? credentials.password : null
    } catch (error) {
      console.warn('[secureStorage] Error getting item:', error)
      return null
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Keychain.setGenericPassword(key, value, { service: key })
    } catch (error) {
      console.warn('[secureStorage] Error setting item:', error)
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: key })
    } catch (error) {
      console.warn('[secureStorage] Error removing item:', error)
    }
  },
}
