import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  analyticsStorage,
  clearAccountAnalytics,
  registerAnalyticsCleanup,
} from '../analyticsStorage'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(async () => {}),
}))

const sdkKey = '.posthog-rn.json'
const anonymousId = 'f2815c63-f4e5-4d35-b513-ab571f345234'
const state = (content: object) => JSON.stringify({ version: 'v1', content })

describe('persistent analytics storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it('retains anonymous identity, install version and sanitized queued events across reads/restarts', async () => {
    const saved = state({
      anonymous_id: anonymousId,
      installed_app_build: '120',
      installed_app_version: '1.2.0',
      queue: [{ message: { event: 'task_created', properties: { has_notes: true } } }],
    })
    await analyticsStorage.setItem(sdkKey, saved)
    expect(await analyticsStorage.getItem(sdkKey)).toBe(saved)
    expect(await AsyncStorage.getItem('domani-analytics-v1')).toBe(saved)
  })

  it('migrates install metadata and anonymous identity without replaying private legacy queues', async () => {
    await AsyncStorage.setItem(
      sdkKey,
      state({
        anonymous_id: anonymousId,
        person_mode: 'anonymous',
        installed_app_build: '119',
        installed_app_version: '1.1.1',
        queue: [{ properties: { title: 'private old task' } }],
      }),
    )
    expect(JSON.parse((await analyticsStorage.getItem(sdkKey))!).content).toEqual({
      anonymous_id: anonymousId,
      installed_app_build: '119',
      installed_app_version: '1.1.1',
    })
    expect(await AsyncStorage.getItem(sdkKey)).toBeNull()
  })

  it('clears outgoing identity and queues while retaining installation and opt-out state', async () => {
    const unregister = registerAnalyticsCleanup(async () => {
      // Simulate SDK reset writes; cleanup must drain these before reporting completion.
      await analyticsStorage.setItem(
        sdkKey,
        state({
          installed_app_version: '1.2.0',
          installed_app_build: '120',
          opted_out: true,
          distinct_id: 'old-user',
          props: { email: 'old@example.com' },
          queue: ['old-event'],
        }),
      )
    })
    await clearAccountAnalytics()
    expect(JSON.parse((await analyticsStorage.getItem(sdkKey))!).content).toEqual({
      installed_app_version: '1.2.0',
      installed_app_build: '120',
      opted_out: true,
    })
    unregister()
  })

  it('propagates SDK cleanup failures so logout can be retried', async () => {
    const unregister = registerAnalyticsCleanup(async () => {
      throw new Error('SDK unavailable')
    })
    await expect(clearAccountAnalytics()).rejects.toThrow('SDK unavailable')
    unregister()
  })
})
