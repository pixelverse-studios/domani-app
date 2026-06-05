type RevenueAlertType =
  | 'purchase_granted'
  | 'refund_revoked'
  | 'refund_restored'
  | 'user_not_found'
  | 'processing_failed'

export type RevenueCatEventContext = {
  eventType: string
  eventId: string | null
  appUserId?: string | null
  productId: string | null
  entitlementIds: unknown[]
  store: string | null
  environment: string | null
  eventTimestampMs: number | null
  originalTransactionId: string | null
  transactionId: string | null
  price: number | null
  currency: string | null
  promoCode: string | null
}

export type RevenueSlackUserContext = {
  id?: string | null
  name?: string | null
  email?: string | null
}

export type RevenueSlackAlertInput = {
  alertType: RevenueAlertType
  eventContext: RevenueCatEventContext
  processedAction?: string
  userId?: string | null
  user?: RevenueSlackUserContext | null
  errorMessage?: string | null
}

type SlackTextObject = {
  type: 'mrkdwn' | 'plain_text'
  text: string
  emoji?: boolean
}

type SlackBlock =
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

export type SlackMessage = {
  text: string
  blocks: SlackBlock[]
}

const ALERT_CONFIG: Record<RevenueAlertType, { title: string; fallback: string }> = {
  purchase_granted: {
    title: 'Revenue: Lifetime Purchase Granted',
    fallback: 'Lifetime purchase granted',
  },
  refund_revoked: {
    title: 'Revenue: Access Revoked',
    fallback: 'Purchase refunded and access revoked',
  },
  refund_restored: {
    title: 'Revenue: Refund Reversed',
    fallback: 'Refund reversed and access restored',
  },
  user_not_found: {
    title: 'Revenue: User Not Found',
    fallback: 'RevenueCat event could not be matched to a Domani user',
  },
  processing_failed: {
    title: 'Revenue: Webhook Processing Failed',
    fallback: 'RevenueCat webhook processing failed',
  },
}

const SLACK_REQUEST_TIMEOUT_MS = 3000
const SLACK_SECTION_FIELD_LIMIT = 10

export function getRevenueSlackWebhookSecretName() {
  return 'SLACK_REVENUE_WEBHOOK_URL'
}

function escapeSlackText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'n/a'
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'n/a'
  return String(value)
}

function buildField(label: string, value: unknown): SlackTextObject {
  return {
    type: 'mrkdwn',
    text: `*${label}*\n${escapeSlackText(stringifyValue(value))}`,
  }
}

function getEventTimestamp(context: RevenueCatEventContext) {
  if (!context.eventTimestampMs) return 'n/a'

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(context.eventTimestampMs))
}

function getDisplayStore(store: string | null) {
  const normalizedStore = store?.toUpperCase() ?? null

  switch (normalizedStore) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
      return 'iOS'
    case 'PLAY_STORE':
    case 'GOOGLE_PLAY':
      return 'Android'
    default:
      return store
  }
}

function buildFieldSectionBlocks(fields: SlackTextObject[]): SlackBlock[] {
  const blocks: SlackBlock[] = []

  for (let index = 0; index < fields.length; index += SLACK_SECTION_FIELD_LIMIT) {
    blocks.push({
      type: 'section',
      fields: fields.slice(index, index + SLACK_SECTION_FIELD_LIMIT),
    })
  }

  return blocks
}

export function buildRevenueSlackMessage(input: RevenueSlackAlertInput): SlackMessage {
  const config = ALERT_CONFIG[input.alertType]
  const context = input.eventContext
  const user = input.user ?? null
  const fields: SlackTextObject[] = [
    buildField('User', user?.id ?? input.userId),
    buildField('Name', user?.name),
    buildField('Email', user?.email),
    buildField('Product', context.productId),
    buildField('Store', getDisplayStore(context.store)),
    buildField('Environment', context.environment),
    buildField('Promo Code', context.promoCode),
    buildField('Price', context.price),
    buildField('Currency', context.currency),
    buildField('Event Time', getEventTimestamp(context)),
  ]

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: config.title, emoji: true },
    },
    ...buildFieldSectionBlocks(fields),
  ]

  if (input.errorMessage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error*\n${escapeSlackText(input.errorMessage)}`,
      },
    })
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Domani Revenue | ${new Date().toISOString()}`,
      },
    ],
  })

  return {
    text: `${config.fallback}: ${context.eventType}`,
    blocks,
  }
}

export async function sendRevenueSlackAlert(input: RevenueSlackAlertInput) {
  const webhookSecretName = getRevenueSlackWebhookSecretName()
  const webhookUrl = Deno.env.get(webhookSecretName)

  if (!webhookUrl) {
    console.warn('[revenuecat-webhook] Slack revenue webhook URL not configured:', webhookSecretName)
    return
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SLACK_REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRevenueSlackMessage(input)),
        signal: controller.signal,
      })

      if (!response.ok) {
        console.warn('[revenuecat-webhook] Slack revenue webhook failed:', {
          eventType: input.eventContext.eventType,
          eventId: input.eventContext.eventId,
          status: response.status,
        })
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.warn('[revenuecat-webhook] Slack revenue webhook error:', error)
  }
}
