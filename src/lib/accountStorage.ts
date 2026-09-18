import { clearLegacyTelemetryStorage } from './legacyTelemetryStorage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  captureAccountOperationToken,
  isAccountOperationTokenCurrent,
} from './accountLifecycleCoordinator'

const ACCOUNT_KEYS = [
  'rollover_prompted_date',
  'celebration_shown_date',
  'evening_rollover_prompted_date',
  'domani_name_prompt_dismissed',
] as const

type AccountKey = (typeof ACCOUNT_KEYS)[number]
let writes: Promise<void> = Promise.resolve()

function enqueue(operation: () => Promise<void>): Promise<void> {
  const pending = writes.catch(() => undefined).then(operation)
  writes = pending
  return pending
}

export const accountStorage = {
  getItem: (key: AccountKey, userId?: string | null): Promise<string | null> =>
    userId ? AsyncStorage.getItem(`${key}:${userId}`) : Promise.resolve(null),
  setItem: (key: AccountKey, userId: string | null | undefined, value: string): Promise<void> => {
    const token = captureAccountOperationToken(userId ?? null)
    return enqueue(async () => {
      if (userId && isAccountOperationTokenCurrent(token)) {
        await AsyncStorage.setItem(`${key}:${userId}`, value)
      }
    })
  },
  removeItem: (key: AccountKey, userId?: string | null): Promise<void> =>
    enqueue(async () => {
      if (userId) await AsyncStorage.removeItem(`${key}:${userId}`)
    }),
}

// Called inside the account transition, after account work is drained and before
// sign-out/replacement commits. Queued writes cannot recreate outgoing data.
export function clearAccountStorage(userId: string | null): Promise<void> {
  return enqueue(async () => {
    await clearLegacyTelemetryStorage()
    await AsyncStorage.multiRemove([
      ...ACCOUNT_KEYS,
      ...(userId ? ACCOUNT_KEYS.map((key) => `${key}:${userId}`) : []),
    ])
  })
}
