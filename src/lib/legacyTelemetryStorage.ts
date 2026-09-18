import AsyncStorage from '@react-native-async-storage/async-storage'
import { deleteAsync, documentDirectory } from 'expo-file-system/legacy'

// Earlier releases persisted PostHog identities and queued events. The SDK now
// uses memory only; discard old queues rather than ever replaying private data.
export async function clearLegacyTelemetryStorage(): Promise<void> {
  const keys = ['.posthog-rn.json', '.posthog-rn-logs.json']
  await AsyncStorage.multiRemove(keys)
  if (documentDirectory) {
    for (const key of keys) {
      await deleteAsync(`${documentDirectory}${key}`, { idempotent: true })
    }
  }
}
