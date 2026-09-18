import AsyncStorage from '@react-native-async-storage/async-storage'
import { PostHog, PostHogPersistedProperty } from 'posthog-react-native'
import { analyticsStorage } from '../analyticsStorage'
import { filterAnalyticsEvent } from '../telemetryPrivacy'

jest.unmock('posthog-react-native')
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: null,
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}))

function client(build: string) {
  return new PostHog('test-project-key', {
    host: 'https://invalid.example',
    persistence: 'file',
    customStorage: analyticsStorage,
    before_send: filterAnalyticsEvent,
    flushAt: 10000,
    flushInterval: 0,
    disableRemoteConfig: true,
    preloadFeatureFlags: false,
    captureAppLifecycleEvents: true,
    customAppProperties: { $app_version: '1.2.0', $app_build: build },
  })
}

describe('PostHog persistence integration', () => {
  it('retains anonymous identity and queued events across SDK instances and preserves install/update detection', async () => {
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response('{"surveys":[]}'))
    await AsyncStorage.clear()
    const first = client('120')
    await first.ready()
    const anonymousId = first.getAnonymousId()
    first.capture('task_created', { has_notes: true, title: 'PRIVATE_TASK' })
    first.setPersistedProperty(PostHogPersistedProperty.InstalledAppBuild, '120')
    first.setPersistedProperty(PostHogPersistedProperty.InstalledAppVersion, '1.2.0')
    // Drain our adapter's pending writes before simulating a new process.
    await analyticsStorage.getItem('.posthog-rn.json')
    const second = client('121')
    await second.ready()
    expect(second.getAnonymousId()).toBe(anonymousId)
    expect(second.getPersistedProperty(PostHogPersistedProperty.InstalledAppBuild)).toBe('121')
    const queue = JSON.stringify(second.getPersistedProperty(PostHogPersistedProperty.Queue))
    expect(queue).toContain('task_created')
    expect(queue).not.toContain('PRIVATE_TASK')

    const events = second.getPersistedProperty<Array<{ message: { event: string } }>>(
      PostHogPersistedProperty.Queue,
    )!
    expect(events.filter(({ message }) => message.event === 'Application Installed')).toHaveLength(
      1,
    )
    expect(events.filter(({ message }) => message.event === 'Application Updated')).toHaveLength(1)
    await Promise.all([first.shutdown(), second.shutdown()])
    fetch.mockRestore()
  })
})
