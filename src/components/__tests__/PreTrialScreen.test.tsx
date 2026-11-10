import React from 'react'

import { fireEvent, renderWithProviders, screen, waitFor } from '~/test/test-utils'
import { useSubscription } from '~/hooks/useSubscription'
import { requestMetaTrackingPermission } from '~/lib/metaAppEvents'
import { PreTrialScreen } from '../PreTrialScreen'

jest.mock('~/hooks/useSubscription')
jest.mock('~/lib/metaAppEvents', () => ({
  requestMetaTrackingPermission: jest.fn(),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}))

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>
const mockRequestMetaTrackingPermission =
  requestMetaTrackingPermission as jest.MockedFunction<typeof requestMetaTrackingPermission>

function mockSubscription(startTrial: jest.Mock) {
  mockUseSubscription.mockReturnValue({
    isLoading: false,
    isStartingTrial: false,
    startTrial,
  } as unknown as ReturnType<typeof useSubscription>)
}

describe('PreTrialScreen Meta tracking consent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('requests tracking permission before starting the trial', async () => {
    const startTrial = jest.fn().mockResolvedValue(undefined)
    mockSubscription(startTrial)
    mockRequestMetaTrackingPermission.mockResolvedValue('granted')
    renderWithProviders(<PreTrialScreen />)

    fireEvent.press(screen.getByText('Start 14-Day Free Trial'))

    await waitFor(() => expect(startTrial).toHaveBeenCalledTimes(1))
    expect(mockRequestMetaTrackingPermission).toHaveBeenCalledTimes(1)
    expect(mockRequestMetaTrackingPermission.mock.invocationCallOrder[0]).toBeLessThan(
      startTrial.mock.invocationCallOrder[0],
    )
  })

  it('starts the trial when the tracking permission request fails', async () => {
    const startTrial = jest.fn().mockResolvedValue(undefined)
    mockSubscription(startTrial)
    mockRequestMetaTrackingPermission.mockRejectedValue(new Error('ATT unavailable'))
    renderWithProviders(<PreTrialScreen />)

    fireEvent.press(screen.getByText('Start 14-Day Free Trial'))

    await waitFor(() => expect(startTrial).toHaveBeenCalledTimes(1))
  })
})
