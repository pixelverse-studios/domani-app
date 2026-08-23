import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildAccountEmail,
  MAX_ACCOUNT_EMAIL_REQUEST_BYTES,
  parseAccountEmailRequest,
  type AccountEmailType,
} from './accountEmailCore.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Domani <noreply@domani.app>'

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Content-Type': 'application/json',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders })
}

interface DeliveryClaim {
  status: 'claimed' | 'not_found' | 'rate_limited'
  eventId?: string
  deletionScheduledFor?: string | null
}

async function releaseClaim(
  adminClient: ReturnType<typeof createClient>,
  eventId: string,
): Promise<void> {
  const { error } = await adminClient.rpc('release_account_email_delivery', {
    p_event_id: eventId,
  })
  if (error) console.error('[send-account-email] Failed to release delivery claim')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: responseHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    console.error('[send-account-email] Required server configuration is missing')
    return jsonResponse({ error: 'Email service unavailable' }, 503)
  }

  const declaredLength = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_ACCOUNT_EMAIL_REQUEST_BYTES) {
    return jsonResponse({ error: 'Invalid request' }, 400)
  }

  const authHeader = req.headers.get('Authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!accessToken) return jsonResponse({ error: 'Unauthorized' }, 401)

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader! } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(accessToken)

  if (authError || !user?.id || !user.email) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let type: AccountEmailType
  try {
    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_ACCOUNT_EMAIL_REQUEST_BYTES) {
      return jsonResponse({ error: 'Invalid request' }, 400)
    }
    type = parseAccountEmailRequest(JSON.parse(rawBody)).type
  } catch {
    return jsonResponse({ error: 'Invalid request' }, 400)
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: claimData, error: claimError } = await adminClient.rpc(
    'claim_account_email_delivery',
    {
      p_user_id: user.id,
      p_message_type: type,
    },
  )

  if (claimError) {
    console.error('[send-account-email] Account event claim failed')
    return jsonResponse({ error: 'Email service unavailable' }, 503)
  }

  const claim = claimData as DeliveryClaim | null
  if (!claim || claim.status === 'not_found') {
    return jsonResponse({ error: 'Account event unavailable' }, 409)
  }
  if (claim.status === 'rate_limited') {
    return jsonResponse({ error: 'Please try again later' }, 429)
  }
  if (!claim.eventId) {
    return jsonResponse({ error: 'Email service unavailable' }, 503)
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    await releaseClaim(adminClient, claim.eventId)
    return jsonResponse({ error: 'Email service unavailable' }, 503)
  }

  let emailContent: ReturnType<typeof buildAccountEmail>
  try {
    emailContent = buildAccountEmail(type, profile?.full_name, claim.deletionScheduledFor)
  } catch {
    await releaseClaim(adminClient, claim.eventId)
    console.error('[send-account-email] Verified account event was invalid')
    return jsonResponse({ error: 'Email service unavailable' }, 503)
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    })

    if (!resendResponse.ok) {
      await releaseClaim(adminClient, claim.eventId)
      console.error('[send-account-email] Provider request failed', {
        status: resendResponse.status,
      })
      return jsonResponse({ error: 'Failed to send email' }, 502)
    }

    const providerData = (await resendResponse.json().catch(() => ({}))) as { id?: unknown }
    const providerMessageId =
      typeof providerData.id === 'string' ? providerData.id.slice(0, 255) : null
    const { error: completeError } = await adminClient.rpc('complete_account_email_delivery', {
      p_event_id: claim.eventId,
      p_provider_message_id: providerMessageId,
    })

    if (completeError) {
      console.error('[send-account-email] Delivery completion record failed')
    }

    return jsonResponse({ success: true })
  } catch {
    await releaseClaim(adminClient, claim.eventId)
    console.error('[send-account-email] Provider request was unavailable')
    return jsonResponse({ error: 'Failed to send email' }, 502)
  }
})
