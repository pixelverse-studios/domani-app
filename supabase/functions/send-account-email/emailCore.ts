export type AccountEmailType = 'account_deletion' | 'account_reactivation'

export function parseAccountEmailType(body: unknown): AccountEmailType | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const type = (body as Record<string, unknown>).type
  return type === 'account_deletion' || type === 'account_reactivation' ? type : null
}

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!)
}

export function formatRecordedDeletionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('INVALID_RECORDED_DELETION_DATE')
  return `${new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)} UTC`
}

export async function sendClaimedAccountEmail(input: {
  apiKey: string
  from: string
  eventId: string
  email: string
  subject: string
  html: string
}) {
  const body = JSON.stringify({
    from: input.from,
    to: [input.email],
    subject: input.subject,
    html: input.html,
  })
  let status: number | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
          'Idempotency-Key': `account-email/${input.eventId}`,
        },
        body,
        signal: AbortSignal.timeout(8000),
      })
      status = response.status
      if (response.ok) return { sent: true, status }
      if (response.status < 500 && response.status !== 429) break
    } catch {
      status = null
    }
  }
  return { sent: false, status }
}
