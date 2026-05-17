import {
  buildSlackMessage,
  getWebhookSecretName,
  type TeamNotificationPayload,
  validatePayload,
} from '../teamNotificationCore'

const context = {
  environment: 'test',
  timestamp: '2026-05-17T01:00:00.000Z',
}

describe('team notification core', () => {
  it('maps notification types to server-side Slack webhook secret names', () => {
    expect(getWebhookSecretName('feedback')).toBe('SLACK_SUPPORT_WEBHOOK_URL')
    expect(getWebhookSecretName('support_request')).toBe('SLACK_SUPPORT_WEBHOOK_URL')
    expect(getWebhookSecretName('new_signup')).toBe('SLACK_ACCOUNTS_WEBHOOK_URL')
  })

  it('rejects unauthenticated notifications', () => {
    const payload: Partial<TeamNotificationPayload> = {
      type: 'feedback',
      email: 'user@example.com',
      category: 'general',
      message: 'Hello',
    }

    expect(validatePayload(payload, null)).toBe('Missing authenticated user')
  })

  it('rejects spoofed notification emails', () => {
    const payload: Partial<TeamNotificationPayload> = {
      type: 'support_request',
      email: 'other@example.com',
      category: 'technical_issue',
      description: 'Need help',
    }

    expect(validatePayload(payload, { email: 'user@example.com', sub: 'user-123' })).toBe(
      'Notification email does not match authenticated user',
    )
  })

  it('accepts matching notification emails case-insensitively', () => {
    const payload: Partial<TeamNotificationPayload> = {
      type: 'new_signup',
      email: 'USER@example.com',
      name: 'User',
    }

    expect(validatePayload(payload, { email: 'user@example.com', sub: 'user-123' })).toBeNull()
  })

  it('rejects missing event-specific fields', () => {
    expect(
      validatePayload(
        {
          type: 'feedback',
          email: 'user@example.com',
          category: 'general',
        },
        { email: 'user@example.com', sub: 'user-123' },
      ),
    ).toBe('Missing feedback fields')

    expect(
      validatePayload(
        {
          type: 'support_request',
          email: 'user@example.com',
          category: 'technical_issue',
        },
        { email: 'user@example.com', sub: 'user-123' },
      ),
    ).toBe('Missing support request fields')
  })

  it('builds escaped support Slack messages with environment context', () => {
    const message = buildSlackMessage(
      {
        type: 'support_request',
        email: 'user@example.com',
        category: 'technical_issue',
        description: 'Help with <billing> & account',
        deviceMetadata: {
          platform: 'ios',
          os_version: '18.0',
          device_brand: 'Apple',
          device_model: 'iPhone',
          app_version: '1.0.0',
          app_build: '42',
          screen_width: 390,
          screen_height: 844,
        },
      },
      context,
    )

    expect(message.text).toBe('New Support Request: user@example.com')
    expect(JSON.stringify(message.blocks)).toContain('Technical Issue')
    expect(JSON.stringify(message.blocks)).toContain('Help with &lt;billing&gt; &amp; account')
    expect(JSON.stringify(message.blocks)).toContain('Domani Support | test | 2026-05-17')
  })

  it('builds signup Slack messages for the accounts channel format', () => {
    const message = buildSlackMessage(
      {
        type: 'new_signup',
        email: 'user@example.com',
        name: 'User Name',
        signupMethod: 'google',
        timezone: 'America/New_York',
      },
      context,
    )

    expect(message.text).toBe('New User Signup: user@example.com')
    expect(JSON.stringify(message.blocks)).toContain('Domani Accounts | test | 2026-05-17')
    expect(JSON.stringify(message.blocks)).toContain('America/New_York')
  })
})
