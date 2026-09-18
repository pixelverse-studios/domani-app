import AsyncStorage from '@react-native-async-storage/async-storage'
import { documentDirectory, getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy'
import type { PostHogCustomStorage } from 'posthog-react-native'
import { clearLegacyTelemetryStorage } from './legacyTelemetryStorage'

const STORAGE_KEY = 'domani-analytics-v1'
const SDK_STORAGE_KEY = '.posthog-rn.json'
let pending: Promise<unknown> = Promise.resolve()
let resetClient: (() => Promise<void>) | undefined

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.catch(() => undefined).then(operation)
  pending = result
  return result
}

function deviceState(raw: string | null, keepAnonymous: boolean): string {
  let content: Record<string, unknown> = {}
  try {
    content = JSON.parse(raw ?? '{}').content ?? {}
  } catch {
    // An unreadable old queue must not be replayed.
  }
  const safe: Record<string, unknown> = {}
  for (const key of ['installed_app_build', 'installed_app_version']) {
    if (typeof content[key] === 'string' && /^\d+(?:[.\-+][a-zA-Z0-9]+)*$/.test(content[key])) {
      safe[key] = content[key]
    }
  }
  if (typeof content.opted_out === 'boolean') safe.opted_out = content.opted_out
  if (
    keepAnonymous &&
    content.person_mode !== 'identified' &&
    typeof content.anonymous_id === 'string' &&
    /^[0-9a-f-]{36}$/i.test(content.anonymous_id)
  ) {
    safe.anonymous_id = content.anonymous_id
  }
  return JSON.stringify({ version: 'v1', content: safe })
}

export const analyticsStorage: PostHogCustomStorage = {
  getItem: (key) =>
    serialize(async () => {
      if (key !== SDK_STORAGE_KEY) return null
      const current = await AsyncStorage.getItem(STORAGE_KEY)
      if (current !== null) {
        // A previous launch may have migrated successfully but failed to remove the old file.
        await clearLegacyTelemetryStorage().catch(() => undefined)
        return current
      }
      let legacy = await AsyncStorage.getItem(SDK_STORAGE_KEY)
      if (!legacy && documentDirectory) {
        const path = `${documentDirectory}${SDK_STORAGE_KEY}`
        if ((await getInfoAsync(path)).exists) legacy = await readAsStringAsync(path)
      }
      // Retain installation/anonymous continuity without replaying unfiltered old events.
      const migrated = deviceState(legacy, true)
      await AsyncStorage.setItem(STORAGE_KEY, migrated)
      await clearLegacyTelemetryStorage().catch(() => undefined)
      return migrated
    }),
  setItem: (key, value) =>
    serialize(async () => {
      if (key === SDK_STORAGE_KEY) await AsyncStorage.setItem(STORAGE_KEY, value)
    }),
}

export function registerAnalyticsCleanup(cleanup: () => Promise<void>) {
  resetClient = cleanup
  return () => {
    if (resetClient === cleanup) resetClient = undefined
  }
}

export async function clearAccountAnalytics(): Promise<void> {
  await resetClient?.()
  await serialize(async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      await AsyncStorage.setItem(STORAGE_KEY, deviceState(stored, false))
    }
    await clearLegacyTelemetryStorage()
  })
}
