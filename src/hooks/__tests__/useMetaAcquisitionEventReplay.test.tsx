const mockUseAuth = jest.fn()
const mockReplayPendingMetaAppEvents = jest.fn().mockResolvedValue(0)

jest.mock('~/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }))
jest.mock('~/lib/metaAcquisitionEvents', () => ({
  META_EVENT_REPLAY_INTERVAL_MS: 300_000,
  replayPendingMetaAppEvents: (...args: unknown[]) => mockReplayPendingMetaAppEvents(...args),
}))

import { act, renderHook } from '@testing-library/react-native'
import { AppState } from 'react-native'

import { useMetaAcquisitionEventReplay } from '../useMetaAcquisitionEventReplay'

describe('useMetaAcquisitionEventReplay', () => {
  let appStateListener: ((state: string) => void) | undefined
  const remove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: string) => void
      return { remove }
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('replays on authentication, interval, and foreground, then cleans up', () => {
    const { unmount } = renderHook(() => useMetaAcquisitionEventReplay())

    expect(mockReplayPendingMetaAppEvents).toHaveBeenCalledTimes(1)
    expect(mockReplayPendingMetaAppEvents).toHaveBeenLastCalledWith('user-1')

    act(() => jest.advanceTimersByTime(300_000))
    expect(mockReplayPendingMetaAppEvents).toHaveBeenCalledTimes(2)

    act(() => appStateListener?.('active'))
    expect(mockReplayPendingMetaAppEvents).toHaveBeenCalledTimes(3)

    unmount()
    expect(remove).toHaveBeenCalled()

    act(() => jest.advanceTimersByTime(300_000))
    expect(mockReplayPendingMetaAppEvents).toHaveBeenCalledTimes(3)
  })

  it('does not start replay without an authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: null })

    const { unmount } = renderHook(() => useMetaAcquisitionEventReplay())

    expect(mockReplayPendingMetaAppEvents).not.toHaveBeenCalled()
    expect(AppState.addEventListener).not.toHaveBeenCalled()

    unmount()
  })
})
