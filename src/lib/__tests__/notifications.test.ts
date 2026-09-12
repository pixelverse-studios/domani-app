jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: null,
    expoConfig: { extra: { eas: { projectId: 'test-project' } } },
  },
}))

jest.mock('~/lib/sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}))

import * as Notifications from 'expo-notifications'

import { addBreadcrumb, captureException } from '~/lib/sentry'
import { NotificationService } from '../notifications'

const mockGetExpoPushToken = Notifications.getExpoPushTokenAsync as jest.Mock
const mockAddBreadcrumb = addBreadcrumb as jest.Mock
const mockCaptureException = captureException as jest.Mock

describe('NotificationService.getExpoPushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('treats Expo push-service network failures as recoverable', async () => {
    const networkError = Object.assign(new TypeError('Network request failed'), {
      code: 'ERR_NOTIFICATIONS_NETWORK_ERROR',
    })
    mockGetExpoPushToken.mockRejectedValueOnce(networkError)

    await expect(NotificationService.getExpoPushToken()).resolves.toBeNull()

    expect(mockCaptureException).not.toHaveBeenCalled()
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      'Expo push token unavailable due to a transient network error',
      'notifications',
      {
        errorCode: 'ERR_NOTIFICATIONS_NETWORK_ERROR',
        method: 'getExpoPushToken',
      },
    )
  })

  it('continues reporting unexpected push-token failures', async () => {
    const unexpectedError = new Error('Push token configuration is invalid')
    mockGetExpoPushToken.mockRejectedValueOnce(unexpectedError)

    await expect(NotificationService.getExpoPushToken()).resolves.toBeNull()

    expect(mockCaptureException).toHaveBeenCalledWith(unexpectedError, {
      method: 'getExpoPushToken',
    })
  })
})
