import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AnalyticsProvider, useAnalytics } from '../AnalyticsProvider'
import { clearAccountAnalytics } from '~/lib/analyticsStorage'

jest.unmock('~/providers/AnalyticsProvider')
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { posthogApiKey: 'test-project-key' } },
  },
}))
let mockCleanup: (() => Promise<void>) | undefined
jest.mock('~/lib/analyticsStorage', () => ({
  analyticsStorage: {},
  clearAccountAnalytics: jest.fn(async () => {
    await mockCleanup?.()
  }),
  registerAnalyticsCleanup: (cleanup: () => Promise<void>) => {
    mockCleanup = cleanup
    return () => {
      mockCleanup = undefined
    }
  },
}))
const mockState: Record<string, unknown> = {}
const mockPosthog = {
  ready: jest.fn(async () => {}),
  flush: jest.fn(async () => {}),
  getDistinctId: jest.fn(() => mockState.distinct_id),
  getPersistedProperty: jest.fn((key: string) => mockState[key]),
  setPersistedProperty: jest.fn((key: string, value: unknown) => {
    mockState[key] = value
  }),
  identify: jest.fn((id: string) => {
    mockState.person_mode = 'identified'
    mockState.distinct_id = id
  }),
  reset: jest.fn((keep: string[]) => {
    for (const key of Object.keys(mockState)) if (!keep.includes(key)) delete mockState[key]
  }),
  capture: jest.fn(),
  screen: jest.fn(),
}
jest.mock('posthog-react-native', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  usePostHog: () => mockPosthog,
  PostHogPersistedProperty: {
    Queue: 'queue',
    PersonMode: 'person_mode',
    InstalledAppBuild: 'installed_app_build',
    InstalledAppVersion: 'installed_app_version',
    OptedOut: 'opted_out',
  },
}))
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AnalyticsProvider>{children}</AnalyticsProvider>
)

beforeEach(() => {
  jest.clearAllMocks()
  mockPosthog.ready.mockResolvedValue(undefined)
  mockPosthog.flush.mockResolvedValue(undefined)
  for (const key of Object.keys(mockState)) delete mockState[key]
  mockState.installed_app_build = '120'
})

describe('analytics identity lifecycle', () => {
  it('keeps same-account queues and sends intended identity traits', async () => {
    mockState.person_mode = 'identified'
    mockState.distinct_id = 'A'
    mockState.queue = ['pending']
    const { result } = renderHook(useAnalytics, { wrapper })
    act(() =>
      result.current.identify('A', {
        email: 'a@example.com',
        created_at: '2026-01-01T00:00:00Z',
        notes: 'private',
      }),
    )
    await waitFor(() =>
      expect(mockPosthog.identify).toHaveBeenCalledWith('A', {
        email: 'a@example.com',
        created_at: '2026-01-01T00:00:00Z',
      }),
    )
    expect(mockPosthog.reset).not.toHaveBeenCalled()
    expect(mockState.queue).toEqual(['pending'])
  })

  it('clears the persisted previous account before identifying another user', async () => {
    mockState.person_mode = 'identified'
    mockState.distinct_id = 'A'
    mockState.queue = ['A event']
    const { result } = renderHook(useAnalytics, { wrapper })
    act(() => result.current.identify('B'))
    await waitFor(() => expect(mockPosthog.identify).toHaveBeenCalledWith('B', {}))
    expect(mockPosthog.setPersistedProperty).toHaveBeenCalledWith('queue', [])
    expect(mockPosthog.reset.mock.invocationCallOrder[0]).toBeLessThan(
      mockPosthog.identify.mock.invocationCallOrder[0],
    )
    expect(mockState.installed_app_build).toBe('120')
  })

  it('preserves anonymous continuity when startup resolves to signed out', async () => {
    mockState.distinct_id = 'anonymous'
    const { result } = renderHook(useAnalytics, { wrapper })
    await act(async () => result.current.reset())
    expect(mockPosthog.reset).not.toHaveBeenCalled()
    expect(mockState.distinct_id).toBe('anonymous')
  })

  it('clears an identified account when startup resolves to signed out', async () => {
    mockState.person_mode = 'identified'
    mockState.distinct_id = 'A'
    const { result } = renderHook(useAnalytics, { wrapper })
    act(() => result.current.reset())
    await waitFor(() => expect(mockPosthog.reset).toHaveBeenCalledTimes(1))
    expect(mockState.distinct_id).toBeUndefined()
  })

  it('does not restore an old identity when logout beats SDK hydration', async () => {
    let ready!: () => void
    mockPosthog.ready.mockReturnValue(
      new Promise<void>((resolve) => {
        ready = resolve
      }),
    )
    const { result } = renderHook(useAnalytics, { wrapper })
    act(() => result.current.identify('A'))
    const cleared = clearAccountAnalytics()
    ready()
    await act(async () => {
      await cleared
    })
    expect(mockPosthog.identify).not.toHaveBeenCalled()
  })
})

it('gates captures and replacement identity until the outgoing flush settles', async () => {
  let release!: () => void
  mockPosthog.flush.mockReturnValue(
    new Promise<void>((resolve) => {
      release = resolve
    }),
  )
  mockState.person_mode = 'identified'
  mockState.distinct_id = 'A'
  const { result } = renderHook(useAnalytics, { wrapper })
  const cleared = clearAccountAnalytics()
  act(() => {
    result.current.identify('B')
    result.current.track('feedback_submitted', { category: 'bug_report' })
    result.current.screen('today')
  })
  await act(async () => {
    await Promise.resolve()
  })
  expect(mockPosthog.identify).not.toHaveBeenCalled()
  expect(mockPosthog.capture).not.toHaveBeenCalled()
  expect(mockPosthog.screen).not.toHaveBeenCalled()
  await act(async () => {
    release()
    await cleared
  })
  await waitFor(() => expect(mockPosthog.identify).toHaveBeenCalledWith('B', {}))
  act(() => result.current.track('feedback_submitted', { category: 'bug_report' }))
  expect(mockPosthog.capture).toHaveBeenCalledWith('feedback_submitted', { category: 'bug_report' })
})
