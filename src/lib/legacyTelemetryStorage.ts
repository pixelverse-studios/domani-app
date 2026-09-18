import AsyncStorage from '@react-native-async-storage/async-storage'
import { deleteAsync, documentDirectory } from 'expo-file-system/legacy'

// Earlier releases could persist unfiltered telemetry. Remove those stores after
// migration to the backup-excluded AsyncStorage adapter, or during account cleanup.
export async function clearLegacyTelemetryStorage(): Promise<void> {
  const keys = ['.posthog-rn.json', '.posthog-rn-logs.json']
  await AsyncStorage.multiRemove(keys)
  if (documentDirectory) {
    for (const key of keys) {
      await deleteAsync(`${documentDirectory}${key}`, { idempotent: true })
    }
  }
}
