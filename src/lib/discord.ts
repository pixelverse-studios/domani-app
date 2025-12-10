/**
 * Discord Webhook Utility
 * Sends notifications to Discord when users submit support requests or feedback
 */

const DISCORD_WEBHOOK_URL = process.env.EXPO_PUBLIC_DISCORD_WEBHOOK_URL

type NotificationType = 'support_request' | 'beta_feedback'

interface SupportRequestPayload {
  type: 'support_request'
  email: string
  category: string
  description: string
}

interface BetaFeedbackPayload {
  type: 'beta_feedback'
  email: string
  category: string
  message: string
}

type WebhookPayload = SupportRequestPayload | BetaFeedbackPayload

// Discord embed colors (decimal format)
const COLORS = {
  support_request: 15548997, // Red (#ED4245)
  beta_feedback: 10181046, // Purple (#9B59B6)
} as const

// Category labels for display
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

// Emoji prefixes for visual distinction
const TYPE_CONFIG = {
  support_request: {
    emoji: '🆘',
    title: 'New Support Request',
    categoryLabels: SUPPORT_CATEGORY_LABELS,
    contentField: 'Description',
  },
  beta_feedback: {
    emoji: '💬',
    title: 'New Beta Feedback',
    categoryLabels: FEEDBACK_CATEGORY_LABELS,
    contentField: 'Message',
  },
} as const

/**
 * Send a notification to Discord webhook
 * Fails silently to not disrupt user experience
 */
export async function sendDiscordNotification(payload: WebhookPayload): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured')
    return
  }

  const config = TYPE_CONFIG[payload.type]
  const categoryLabel = config.categoryLabels[payload.category] || payload.category
  const content = payload.type === 'support_request' ? payload.description : payload.message

  const embed = {
    title: `${config.emoji} ${config.title}`,
    color: COLORS[payload.type],
    fields: [
      {
        name: '📧 Email',
        value: payload.email,
        inline: false,
      },
      {
        name: '📁 Category',
        value: categoryLabel,
        inline: false,
      },
      {
        name: `📝 ${config.contentField}`,
        value: content.length > 1024 ? content.substring(0, 1021) + '...' : content,
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: payload.type === 'support_request' ? 'Domani Support' : 'Domani Beta Feedback',
    },
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    })

    if (!response.ok) {
      console.warn('Discord webhook failed:', response.status)
    }
  } catch (error) {
    // Fail silently - don't disrupt user experience
    console.warn('Discord webhook error:', error)
  }
}
