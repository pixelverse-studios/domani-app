import { Client, makeSession } from '@sentry/core'
import type { ErrorEvent } from '@sentry/react-native'
import {
  filterAnalyticsEvent,
  identityTraits,
  sanitizeErrorEvent,
  structuralProperties,
} from '../telemetryPrivacy'

const secret = 'private task notes / groceries / search / access_token=secret'
const id = 'f2815c63-f4e5-4d35-b513-ab571f345234'

describe('telemetry privacy', () => {
  it.each([false, true])(
    'preserves handled=%s for real Sentry session classification',
    (handled) => {
      const event = sanitizeErrorEvent({
        type: undefined,
        level: 'fatal',
        exception: {
          values: [
            {
              type: 'TypeError',
              value: secret,
              mechanism: {
                type: 'onerror',
                handled,
                data: { privateContent: secret },
              },
            },
          ],
        },
      })!
      const session = makeSession()
      const update = Object.getOwnPropertyDescriptor(Client.prototype, '_updateSessionFromEvent')!
        .value as (session: ReturnType<typeof makeSession>, event: ErrorEvent) => void
      update.call({ captureSession: jest.fn() }, session, event)
      expect(session.status).toBe(handled ? 'ok' : 'crashed')
      expect(JSON.stringify(event)).not.toContain(secret)
    },
  )

  it('retains existing promo, tutorial, and SDK structural fields', () => {
    const properties = {
      validation_status: 'request_failed',
      sync_status: 'missing_entitlement',
      error_code: 'NETWORK_ERROR',
      step: 'task_title',
      last_step: 'task_priority',
      source: 'promo_redemption',
      campaign_slug: 'launch',
      product_id: 'domani.lifetime',
      revenuecat_package_id: '$rc_lifetime',
      $app_version: '1.2.0',
      $app_build: '120',
      $os_name: 'iOS',
      $os_version: '18.0',
      $lib: 'posthog-react-native',
      $lib_version: '4.31.1',
      $is_identified: true,
    }
    expect(structuralProperties(properties)).toEqual(properties)
    expect(
      structuralProperties({ error_code: secret, step: secret, $app_version: secret }),
    ).toEqual({})
  })

  it('restores intended person traits without permitting them in task events', () => {
    const traits = {
      email: 'phil@example.com',
      created_at: '2026-01-01T00:00:00Z',
      auth_provider: 'apple',
    }
    expect(identityTraits({ ...traits, notes: secret })).toEqual(traits)
    expect(structuralProperties(traits)).toEqual({ auth_provider: 'apple' })
    if (typeof filterAnalyticsEvent !== 'function') throw new Error('expected one filter')
    for (const event of ['$identify', '$set']) {
      expect(filterAnalyticsEvent({ event, $set: { ...traits, token: secret } })?.$set).toEqual(
        traits,
      )
    }
  })

  it('preserves structural metrics but strips arbitrary strings, nested content and identity traits', () => {
    const result = structuralProperties({
      task_count: 3,
      has_notes: true,
      priority: 'high',
      platform: 'ios',
      constructor: secret,
      title: secret,
      notes: secret,
      checklist: [secret],
      preset: { title: secret },
      search: secret,
      token: secret,
      email: secret,
      category: secret,
      source: secret,
      task_id: secret,
    })
    expect(result).toEqual({ task_count: 3, has_notes: true, priority: 'high', platform: 'ios' })
  })

  it('sanitizes SDK-added fields and identify traits at the final analytics boundary', () => {
    expect(typeof filterAnalyticsEvent).toBe('function')
    if (typeof filterAnalyticsEvent !== 'function') throw new Error('expected one filter')
    const result = filterAnalyticsEvent({
      event: '$identify',
      properties: {
        distinct_id: id,
        token: 'public-project-key',
        $current_url: secret,
        $set: { email: secret },
        $screen_name: secret,
      },
      $set: { auth_provider: 'apple', email: secret },
      $set_once: { notes: secret },
    })
    expect(result?.properties).toEqual({ distinct_id: id, token: 'public-project-key' })
    expect(result?.$set).toEqual({ auth_provider: 'apple' })
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(filterAnalyticsEvent({ event: secret })).toBeNull()
  })

  it('retains useful crash locations without messages, breadcrumbs, requests, locals or user content', () => {
    const result = sanitizeErrorEvent({
      type: undefined,
      release: 'app@1.2',
      message: secret,
      user: { email: secret },
      extra: { notes: secret },
      breadcrumbs: [{ message: secret }],
      request: { url: secret },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: secret,
            stacktrace: {
              frames: [
                {
                  filename: `app.js?${secret}`,
                  function: 'saveTask',
                  lineno: 12,
                  vars: { task: secret },
                  context_line: secret,
                },
              ],
            },
          },
        ],
      },
    })
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(result?.exception?.values?.[0].stacktrace?.frames?.[0]).toMatchObject({
      filename: 'app.js',
      lineno: 12,
    })
  })
})
