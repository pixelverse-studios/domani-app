jest.mock('~/lib/metaAppEvents', () => ({
  initializeMetaAppEvents: jest.fn(),
}))

import { Platform } from 'react-native'
import { AppEventsLogger } from 'react-native-fbsdk-next'

import { initializeMetaAppEvents } from '~/lib/metaAppEvents'
import { supabase } from '~/lib/supabase'
import {
  logMetaCompletedRegistration,
  logMetaPlanningActivated,
  logMetaPurchase,
  logMetaPurchaseRestored,
  logMetaStartTrial,
} from '../metaAcquisitionEvents'

const mockInitialize = initializeMetaAppEvents as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockLogEvent = AppEventsLogger.logEvent as jest.Mock
const mockLogPurchase = AppEventsLogger.logPurchase as jest.Mock

describe('Meta acquisition events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInitialize.mockResolvedValue(true)
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  it('maps registration, trial, and activation to sanitized events', async () => {
    await logMetaCompletedRegistration({ userId: 'user-1', method: 'apple' })
    await logMetaStartTrial({ userId: 'user-1', offer: 'default' })
    await logMetaPlanningActivated({ userId: 'user-1', scheduledFor: 'tomorrow' })

    expect(mockLogEvent).toHaveBeenNthCalledWith(
      1,
      AppEventsLogger.AppEvents.CompletedRegistration,
      {
        [AppEventsLogger.AppEventParams.RegistrationMethod]: 'apple',
        platform: Platform.OS,
      },
    )
    expect(mockLogEvent).toHaveBeenNthCalledWith(2, AppEventsLogger.AppEvents.StartTrial, {
      offer: 'default',
      platform: Platform.OS,
    })
    expect(mockLogEvent).toHaveBeenNthCalledWith(3, 'planning_activated', {
      platform: Platform.OS,
      scheduled_for: 'tomorrow',
    })

    const serializedPayloads = JSON.stringify(mockLogEvent.mock.calls)
    expect(serializedPayloads).not.toContain('user-1')
    expect(serializedPayloads).not.toContain('email')
    expect(serializedPayloads).not.toContain('title')
    expect(serializedPayloads).not.toContain('category')
  })

  it('uses logPurchase only when verified price and currency are available', async () => {
    await logMetaPurchase({
      userId: 'user-1',
      productId: 'domani_lifetime',
      purchaseDate: '2026-08-17T12:00:00.000Z',
      amount: 9.99,
      currency: 'USD',
      offer: 'default',
      store: 'APP_STORE',
    })

    expect(mockLogPurchase).toHaveBeenCalledWith(9.99, 'USD', {
      offer: 'default',
      platform: Platform.OS,
      product_id: 'domani_lifetime',
      store: 'APP_STORE',
    })
  })

  it('does not invent purchase value when RevenueCat did not provide it', async () => {
    await logMetaPurchase({
      userId: 'user-1',
      productId: 'domani_lifetime',
      purchaseDate: '2026-08-17T12:00:00.000Z',
    })

    expect(mockLogPurchase).not.toHaveBeenCalled()
    expect(mockLogEvent).toHaveBeenCalledWith(AppEventsLogger.AppEvents.Purchased, {
      platform: Platform.OS,
      product_id: 'domani_lifetime',
    })
  })

  it('logs restore as a custom event and never as Purchase', async () => {
    await logMetaPurchaseRestored({
      userId: 'user-1',
      productId: 'domani_lifetime',
      purchaseDate: '2026-08-17T12:00:00.000Z',
    })

    expect(mockLogEvent).toHaveBeenCalledWith('purchase_restored', {
      platform: Platform.OS,
      product_id: 'domani_lifetime',
    })
    expect(mockLogPurchase).not.toHaveBeenCalled()
  })

  it('does not log a duplicate claimed event', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const result = await logMetaStartTrial({ userId: 'user-1' })

    expect(result).toBe('duplicate')
    expect(mockLogEvent).not.toHaveBeenCalled()
  })

  it('does not claim or log when the SDK is not configured', async () => {
    mockInitialize.mockResolvedValue(false)

    const result = await logMetaStartTrial({ userId: 'user-1' })

    expect(result).toBe('not_configured')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockLogEvent).not.toHaveBeenCalled()
  })
})
