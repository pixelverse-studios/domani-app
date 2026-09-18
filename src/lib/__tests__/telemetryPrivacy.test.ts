import { filterAnalyticsEvent, sanitizeErrorEvent, structuralProperties } from '../telemetryPrivacy'

const secret = 'private task notes / groceries / search / access_token=secret'
const id = 'f2815c63-f4e5-4d35-b513-ab571f345234'

describe('telemetry privacy', () => {
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
