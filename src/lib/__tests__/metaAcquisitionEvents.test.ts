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
  replayPendingMetaAppEvents,
} from '../metaAcquisitionEvents'

const mockInitialize = initializeMetaAppEvents as jest.Mock
const mockRpc = supabase.rpc as unknown as jest.Mock
const mockLogEvent = AppEventsLogger.logEvent as jest.Mock
const mockLogPurchase = AppEventsLogger.logPurchase as jest.Mock

function successfulRpc(functionName: string, args?: Record<string, unknown>) {
  if (functionName === 'claim_meta_app_event') {
    return Promise.resolve({
      data: [
        {
          claim_token: `claim-${String(args?.p_event_key)}`,
          event_key: args?.p_event_key,
          event_payload: args?.p_event_payload,
        },
      ],
      error: null,
    })
  }
  if (functionName === 'claim_pending_meta_app_events') {
    return Promise.resolve({ data: [], error: null })
  }
  return Promise.resolve({ data: true, error: null })
}

describe('Meta acquisition events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInitialize.mockResolvedValue(true)
    mockRpc.mockImplementation(successfulRpc)
    mockLogEvent.mockImplementation(() => undefined)
    mockLogPurchase.mockImplementation(() => undefined)
  })

  it('maps registration, trial, and activation to sanitized fixed-key events', async () => {
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
    expect(mockRpc).toHaveBeenCalledWith('claim_meta_app_event', {
      p_event_key: 'completed_registration',
      p_event_payload: { method: 'apple', platform: Platform.OS },
      p_user_id: 'user-1',
    })
    expect(mockRpc).toHaveBeenCalledWith('complete_meta_app_event_claim', {
      p_claim_token: 'claim-completed_registration',
      p_event_key: 'completed_registration',
      p_user_id: 'user-1',
    })
  })

  it('uses one fixed Purchase key and logPurchase when value is available', async () => {
    await logMetaPurchase({
      userId: 'user-1',
      productId: 'domani_lifetime',
      amount: 9.99,
      currency: 'usd',
      offer: 'default',
      store: 'APP_STORE',
    })

    expect(mockRpc).toHaveBeenCalledWith('claim_meta_app_event', {
      p_event_key: 'purchase',
      p_event_payload: {
        amount: 9.99,
        currency: 'USD',
        offer: 'default',
        platform: Platform.OS,
        product_id: 'domani_lifetime',
        store: 'APP_STORE',
      },
      p_user_id: 'user-1',
    })
    expect(mockLogPurchase).toHaveBeenCalledWith(9.99, 'USD', {
      offer: 'default',
      platform: Platform.OS,
      product_id: 'domani_lifetime',
      store: 'APP_STORE',
    })
  })

  it('does not invent purchase value when RevenueCat did not provide it', async () => {
    await logMetaPurchase({ userId: 'user-1', productId: 'domani_lifetime' })

    expect(mockLogPurchase).not.toHaveBeenCalled()
    expect(mockLogEvent).toHaveBeenCalledWith(AppEventsLogger.AppEvents.Purchased, {
      platform: Platform.OS,
      product_id: 'domani_lifetime',
    })
  })

  it('logs restore as a fixed custom event and never as Purchase', async () => {
    await logMetaPurchaseRestored({ userId: 'user-1', productId: 'domani_lifetime' })

    expect(mockRpc).toHaveBeenCalledWith(
      'claim_meta_app_event',
      expect.objectContaining({ p_event_key: 'purchase_restored' }),
    )
    expect(mockLogEvent).toHaveBeenCalledWith('purchase_restored', {
      platform: Platform.OS,
      product_id: 'domani_lifetime',
    })
    expect(mockLogPurchase).not.toHaveBeenCalled()
  })

  it('does not log a duplicate claimed event', async () => {
    mockRpc.mockImplementation((functionName: string, args?: Record<string, unknown>) => {
      if (functionName === 'claim_meta_app_event') {
        return Promise.resolve({ data: [], error: null })
      }
      return successfulRpc(functionName, args)
    })

    const result = await logMetaStartTrial({ userId: 'user-1' })

    expect(result).toBe('duplicate')
    expect(mockLogEvent).not.toHaveBeenCalled()
  })

  it('leaves the token-owned claim pending when the SDK logger throws', async () => {
    mockLogEvent.mockImplementationOnce(() => {
      throw new Error('native logger unavailable')
    })

    const result = await logMetaStartTrial({ userId: 'user-1' })

    expect(result).toBe('error')
    expect(mockRpc).not.toHaveBeenCalledWith(
      'complete_meta_app_event_claim',
      expect.any(Object),
    )
  })

  it('leaves an enqueued event pending when completion fails so replay can recover it', async () => {
    mockRpc.mockImplementation((functionName: string, args?: Record<string, unknown>) => {
      if (functionName === 'complete_meta_app_event_claim') {
        return Promise.resolve({ data: null, error: new Error('network unavailable') })
      }
      return successfulRpc(functionName, args)
    })

    const result = await logMetaStartTrial({ userId: 'user-1' })

    expect(result).toBe('error')
    expect(mockLogEvent).toHaveBeenCalledTimes(1)
  })

  it('replays an expired pending event and completes it with the new claim token', async () => {
    mockRpc.mockImplementation((functionName: string, args?: Record<string, unknown>) => {
      if (functionName === 'claim_pending_meta_app_events') {
        return Promise.resolve({
          data: [
            {
              claim_token: 'replay-token',
              event_key: 'planning_activated',
              event_payload: { platform: Platform.OS, scheduled_for: 'today' },
            },
          ],
          error: null,
        })
      }
      return successfulRpc(functionName, args)
    })

    const delivered = await replayPendingMetaAppEvents('user-1')

    expect(delivered).toBe(1)
    expect(mockLogEvent).toHaveBeenCalledWith('planning_activated', {
      platform: Platform.OS,
      scheduled_for: 'today',
    })
    expect(mockRpc).toHaveBeenCalledWith('complete_meta_app_event_claim', {
      p_claim_token: 'replay-token',
      p_event_key: 'planning_activated',
      p_user_id: 'user-1',
    })
  })

  it('does not claim or log when the SDK is not configured', async () => {
    mockInitialize.mockResolvedValue(false)

    const result = await logMetaStartTrial({ userId: 'user-1' })

    expect(result).toBe('not_configured')
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockLogEvent).not.toHaveBeenCalled()
  })
})
