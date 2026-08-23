export const ACCOUNT_EMAIL_TYPES = ['account_deletion', 'account_reactivation'] as const
export const MAX_ACCOUNT_EMAIL_REQUEST_BYTES = 256
export const MAX_ACCOUNT_EMAIL_NAME_LENGTH = 80

export type AccountEmailType = (typeof ACCOUNT_EMAIL_TYPES)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseAccountEmailRequest(value: unknown): { type: AccountEmailType } {
  if (!isRecord(value) || Object.keys(value).length !== 1 || typeof value.type !== 'string') {
    throw new Error('INVALID_REQUEST')
  }

  if (!ACCOUNT_EMAIL_TYPES.includes(value.type as AccountEmailType)) {
    throw new Error('INVALID_REQUEST')
  }

  return { type: value.type as AccountEmailType }
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function sanitizeAccountName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return escapeHtml(value.trim().slice(0, MAX_ACCOUNT_EMAIL_NAME_LENGTH))
}

export function formatDeletionDate(value: unknown): string {
  if (typeof value !== 'string') throw new Error('INVALID_ACCOUNT_EVENT')

  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) throw new Error('INVALID_ACCOUNT_EVENT')

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

export function buildAccountEmail(
  type: AccountEmailType,
  rawName: unknown,
  deletionScheduledFor: unknown,
): { subject: string; html: string } {
  const name = sanitizeAccountName(rawName)
  const greeting = name ? `Hi ${name},` : 'Hi,'

  if (type === 'account_deletion') {
    const deletionDate = escapeHtml(formatDeletionDate(deletionScheduledFor))
    return {
      subject: "We're sorry to see you go",
      html: `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
    <h1 style="color: #1e293b;">We're sorry to see you go</h1>
    <p style="color: #475569;">${greeting}</p>
    <p style="color: #475569;">We've received your request to delete your Domani account. Your account is scheduled for permanent deletion on <strong>${deletionDate}</strong>.</p>
    <p style="color: #475569;">Changed your mind? Sign back into Domani before ${deletionDate} to reactivate your account.</p>
    <p style="color: #475569;">After that date, your plans, tasks, and settings will be permanently removed.</p>
    <p style="color: #94a3b8; font-size: 13px;">If you didn't request account deletion, contact support immediately.</p>
  </div>
</body></html>`,
    }
  }

  return {
    subject: 'Welcome back to Domani!',
    html: `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px;">
    <h1 style="color: #1e293b;">Welcome back!</h1>
    <p style="color: #475569;">${greeting}</p>
    <p style="color: #475569;">Your Domani account has been reactivated. Your plans, tasks, and settings are right where you left them.</p>
    <p style="color: #475569;">Your scheduled account deletion has been cancelled.</p>
    <p style="color: #94a3b8; font-size: 13px;">If you didn't reactivate your account, contact support immediately.</p>
  </div>
</body></html>`,
  }
}
