export type NotificationType = 'support_request' | 'feedback' | 'new_signup'

export interface DeviceMetadata {
  platform: 'ios' | 'android'
  os_version: string
  device_brand?: string | null
  device_model?: string | null
  app_version?: string | null
  app_build?: string | null
  screen_width?: number | null
  screen_height?: number | null
}

export interface SupportRequestPayload {
  type: 'support_request'
  email: string
  category: string
  description: string
  deviceMetadata?: DeviceMetadata
}

export interface FeedbackPayload {
  type: 'feedback'
  email: string
  category: string
  message: string
  deviceMetadata?: DeviceMetadata
}

export interface NewSignupPayload {
  type: 'new_signup'
  email: string
  name?: string | null
  signupMethod?: string
  timezone?: string
}

export type TeamNotificationPayload = SupportRequestPayload | FeedbackPayload | NewSignupPayload

export type SlackTextObject = {
  type: 'mrkdwn' | 'plain_text'
  text: string
  emoji?: boolean
}

export type SlackBlock =
  | {
      type: 'header'
      text: SlackTextObject
    }
  | {
      type: 'section'
      text?: SlackTextObject
      fields?: SlackTextObject[]
    }
  | {
      type: 'context'
      elements: SlackTextObject[]
    }

export interface SlackMessage {
  text: string
  blocks: SlackBlock[]
}

export interface AuthenticatedNotificationUser {
  email?: string | null
  sub?: string | null
}

export interface MessageContext {
  environment: string
  timestamp: string
}

const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  technical_issue: 'Technical Issue',
  account_help: 'Account Help',
  billing_question: 'Billing Question',
  other: 'Other',
}

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  bug_report: 'Bug Report',
  feature_idea: 'Feature Idea',
  what_i_love: 'What I Love',
  general: 'General',
}

const TYPE_CONFIG = {
  support_request: {
    title: 'New Support Request',
    categoryLabels: SUPPORT_CATEGORY_LABELS,
    contentField: 'Description',
    footer: 'Domani Support',
  },
  feedback: {
    title: 'New User Feedback',
    categoryLabels: FEEDBACK_CATEGORY_LABELS,
    contentField: 'Message',
    footer: 'Domani Feedback',
  },
} as const

export function getWebhookSecretName(type: NotificationType) {
  switch (type) {
    case 'support_request':
    case 'feedback':
      return 'SLACK_SUPPORT_WEBHOOK_URL'
    case 'new_signup':
      return 'SLACK_ACCOUNTS_WEBHOOK_URL'
  }
}

export function validatePayload(
  payload: Partial<TeamNotificationPayload>,
  authenticatedUser: AuthenticatedNotificationUser | null,
) {
  if (!authenticatedUser?.email) {
    return 'Missing authenticated user'
  }

  if (!payload.type || !['support_request', 'feedback', 'new_signup'].includes(payload.type)) {
    return 'Invalid notification type'
  }

  if (!payload.email || typeof payload.email !== 'string') {
    return 'Missing email'
  }

  if (payload.email.toLowerCase() !== authenticatedUser.email.toLowerCase()) {
    return 'Notification email does not match authenticated user'
  }

  if (payload.type === 'support_request') {
    if (!payload.category || !payload.description) {
      return 'Missing support request fields'
    }
  }

  if (payload.type === 'feedback') {
    if (!payload.category || !payload.message) {
      return 'Missing feedback fields'
    }
  }

  return null
}

function escapeSlackText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function truncateSlackText(value: string, maxLength = 2800) {
  if (value.length <= maxLength) return value
  return `${value.substring(0, maxLength - 3)}...`
}

function buildField(label: string, value: string): SlackTextObject {
  return {
    type: 'mrkdwn',
    text: `*${label}*\n${escapeSlackText(value)}`,
  }
}

function buildContext(label: string, context: MessageContext): SlackBlock {
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `${label} | ${context.environment} | ${context.timestamp}`,
      },
    ],
  }
}

function buildSignupMessage(payload: NewSignupPayload, context: MessageContext): SlackMessage {
  const fields = [buildField('Email', payload.email)]

  if (payload.name) {
    fields.push(buildField('Name', payload.name))
  }
  if (payload.signupMethod) {
    fields.push(buildField('Method', payload.signupMethod))
  }
  if (payload.timezone) {
    fields.push(buildField('Timezone', payload.timezone))
  }

  return {
    text: `New User Signup: ${payload.email}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New User Signup', emoji: true },
      },
      {
        type: 'section',
        fields,
      },
      buildContext('Domani Accounts', context),
    ],
  }
}

function buildFeedbackMessage(
  payload: SupportRequestPayload | FeedbackPayload,
  context: MessageContext,
): SlackMessage {
  const config = TYPE_CONFIG[payload.type]
  const categoryLabel = config.categoryLabels[payload.category] || payload.category
  const content = payload.type === 'support_request' ? payload.description : payload.message

  const deviceInfo = payload.deviceMetadata
  const deviceString = deviceInfo
    ? `${deviceInfo.device_brand || 'Unknown'} ${deviceInfo.device_model || 'Device'}`
    : null
  const platformString = deviceInfo
    ? `${deviceInfo.platform === 'ios' ? 'iOS' : 'Android'} ${deviceInfo.os_version}`
    : null
  const appString = deviceInfo?.app_version
    ? `v${deviceInfo.app_version}${deviceInfo.app_build ? ` (${deviceInfo.app_build})` : ''}`
    : null

  const fields = [buildField('Email', payload.email), buildField('Category', categoryLabel)]

  if (deviceString && platformString) {
    fields.push(buildField('Device', `${deviceString}\n${platformString}`))
  }
  if (appString) {
    fields.push(buildField('App', appString))
  }

  return {
    text: `${config.title}: ${payload.email}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: config.title, emoji: true },
      },
      {
        type: 'section',
        fields,
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${config.contentField}*\n${escapeSlackText(truncateSlackText(content))}`,
        },
      },
      buildContext(config.footer, context),
    ],
  }
}

export function buildSlackMessage(
  payload: TeamNotificationPayload,
  context: MessageContext,
): SlackMessage {
  return payload.type === 'new_signup'
    ? buildSignupMessage(payload, context)
    : buildFeedbackMessage(payload, context)
}
