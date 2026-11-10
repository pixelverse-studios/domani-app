import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  escapeEmailHtml,
  formatRecordedDeletionDate,
  parseAccountEmailType,
  sendClaimedAccountEmail,
  type AccountEmailType,
} from './emailCore.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Domani <noreply@domani.app>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ACCOUNT_EMAIL_RETRY_SECRET = Deno.env.get('ACCOUNT_EMAIL_RETRY_SECRET')

const emailTemplates = {
  account_deletion: (name: string, deletionDate: string) => ({
    subject: "We're sorry to see you go",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">👋</span>
      </div>
      <h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0;">We're sorry to see you go</h1>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Hi${name ? ` ${name}` : ''},
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      We've received your request to delete your Domani account. Your account is now scheduled for permanent deletion on <strong style="color: #1e293b;">${deletionDate}</strong>.
    </p>

    <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
        Changed your mind? Simply sign back into Domani before ${deletionDate} and your account will be automatically reactivated.
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      After the deletion date, all your data including plans, tasks, and settings will be permanently removed and cannot be recovered.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 24px 0 0;">
      Thank you for being part of Domani. We hope to see you again someday.
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
        This email was sent by Domani. If you didn't request account deletion, please contact support immediately.
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),

  account_reactivation: (name: string) => ({
    subject: 'Welcome back to Domani!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); border-radius: 16px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">🎉</span>
      </div>
      <h1 style="color: #1e293b; font-size: 24px; font-weight: 700; margin: 0;">Welcome back!</h1>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Hi${name ? ` ${name}` : ''},
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      Great news! Your Domani account has been successfully reactivated. All your plans, tasks, and settings are right where you left them.
    </p>

    <div style="background: #dcfce7; border-radius: 12px; padding: 16px; margin: 24px 0;">
      <p style="color: #166534; font-size: 14px; margin: 0; font-weight: 500;">
        Your scheduled account deletion has been cancelled. Your account is now fully active again.
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
      We're thrilled to have you back. Ready to plan your next productive day?
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0; text-align: center;">
        This email was sent by Domani. If you didn't reactivate your account, please contact support immediately.
      </p>
    </div>
  </div>
</body>
</html>
    `,
  }),
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function deliverClaim(
  admin: ReturnType<typeof createClient>,
  claim: {
    id: string
    claimToken: string
    type: AccountEmailType
    email: string
    name: string | null
    deletionScheduledFor: string | null
  },
) {
  let emailContent: { subject: string; html: string }
  try {
    const name = escapeEmailHtml(typeof claim.name === 'string' ? claim.name : '')
    emailContent = claim.type === 'account_deletion'
      ? emailTemplates.account_deletion(name, formatRecordedDeletionDate(claim.deletionScheduledFor!))
      : emailTemplates.account_reactivation(name)
  } catch {
    await admin.rpc('finish_account_email_event', {
      p_event_id: claim.id, p_claim_token: claim.claimToken, p_sent: false,
    })
    return jsonResponse({ error: 'Recorded account event invalid' }, 500)
  }

  const delivery = await sendClaimedAccountEmail({
    apiKey: RESEND_API_KEY!,
    from: FROM_EMAIL,
    eventId: claim.id,
    email: claim.email,
    subject: emailContent.subject,
    html: emailContent.html,
  })

  const { data: finished, error: finishError } = await admin.rpc('finish_account_email_event', {
    p_event_id: claim.id,
    p_claim_token: claim.claimToken,
    p_sent: delivery.sent,
  })
  if (finishError || finished !== true) {
    console.error('[send-account-email] Event completion failed', {
      code: finishError?.code ?? null,
    })
    return jsonResponse({ error: 'Email completion unavailable' }, 503)
  }
  if (!delivery.sent) {
    console.error('[send-account-email] Provider send failed', { status: delivery.status })
    return jsonResponse({ error: 'Email provider unavailable' }, 502)
  }
  return jsonResponse({ success: true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[send-account-email] Required server configuration is missing')
    return jsonResponse({ error: 'Server not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (ACCOUNT_EMAIL_RETRY_SECRET && authHeader === `Bearer ${ACCOUNT_EMAIL_RETRY_SECRET}`) {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    const { data: pending, error: listError } = await admin.rpc(
      'list_pending_account_email_events', { p_limit: 5 },
    )
    if (listError) {
      console.error('[send-account-email] Pending event lookup failed', {
        code: listError.code ?? null,
      })
      return jsonResponse({ error: 'Email queue unavailable' }, 503)
    }

    let sent = 0
    let failed = 0
    for (const event of pending ?? []) {
      try {
        const { data: authData, error: userError } = await admin.auth.admin.getUserById(event.user_id)
        if (userError || !authData?.user?.email) {
          failed += 1
          continue
        }
        const { data: claim, error: claimError } = await admin.rpc('claim_account_email_event', {
          p_user_id: event.user_id,
          p_event_type: event.event_type,
          p_verified_email: authData.user.email,
        })
        if (claimError || claim?.status !== 'claimed') {
          failed += 1
          continue
        }
        const result = await deliverClaim(admin, claim)
        if (result.ok) sent += 1
        else failed += 1
      } catch {
        failed += 1
      }
    }
    return jsonResponse({ claimed: pending?.length ?? 0, sent, failed })
  }

  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) return jsonResponse({ error: 'Unauthorized' }, 401)

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader! } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user?.email) return jsonResponse({ error: 'Unauthorized' }, 401)

  let type: AccountEmailType | null
  try {
    type = parseAccountEmailType(await req.json())
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }
  if (!type) return jsonResponse({ error: 'Invalid email type' }, 400)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: claim, error: claimError } = await admin.rpc('claim_account_email_event', {
    p_user_id: user.id,
    p_event_type: type,
    p_verified_email: user.email,
  })
  if (claimError) {
    console.error('[send-account-email] Event claim failed', { code: claimError.code ?? null })
    return jsonResponse({ error: 'Email event unavailable' }, 503)
  }
  if (claim?.status === 'already_sent') return jsonResponse({ success: true, status: 'already_sent' })
  if (claim?.status === 'in_progress') return jsonResponse({ status: 'in_progress' }, 409)
  if (claim?.status !== 'claimed') return jsonResponse({ error: 'No recorded account event' }, 409)

  return deliverClaim(admin, claim)
})
