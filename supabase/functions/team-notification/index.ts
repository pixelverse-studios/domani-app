import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import {
  buildSlackMessage,
  getWebhookSecretName,
  type AuthenticatedNotificationUser,
  type TeamNotificationPayload,
  validatePayload,
} from './teamNotificationCore.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getBearerToken(req: Request) {
  const authorizationHeader = req.headers.get('Authorization')
  if (!authorizationHeader?.startsWith('Bearer ')) return null

  return authorizationHeader.slice('Bearer '.length).trim()
}

async function getAuthenticatedUser(req: Request): Promise<AuthenticatedNotificationUser | null> {
  const token = getBearerToken(req)
  if (!token) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[team-notification] Supabase auth environment is not configured')
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    console.warn('[team-notification] failed to verify Supabase user:', error?.message)
    return null
  }

  return {
    email: data.user.email ?? null,
    sub: data.user.id,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const payload = (await req.json()) as Partial<TeamNotificationPayload>
    const authenticatedUser = await getAuthenticatedUser(req)
    const validationError = validatePayload(payload, authenticatedUser)

    if (validationError) {
      console.warn('[team-notification] invalid payload:', validationError)
      return jsonResponse({ error: validationError }, authenticatedUser ? 400 : 401)
    }

    const typedPayload = payload as TeamNotificationPayload
    const webhookSecretName = getWebhookSecretName(typedPayload.type)
    const webhookUrl = Deno.env.get(webhookSecretName)

    if (!webhookUrl) {
      console.warn('[team-notification] Slack webhook URL not configured:', webhookSecretName)
      return jsonResponse({ success: false, skipped: 'missing_slack_webhook_url' })
    }

    const environment = Deno.env.get('APP_ENV') || Deno.env.get('ENVIRONMENT') || 'unknown'

    const slackResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        buildSlackMessage(typedPayload, {
          environment,
          timestamp: new Date().toISOString(),
        }),
      ),
    })

    if (!slackResponse.ok) {
      console.warn('[team-notification] Slack webhook failed:', {
        type: typedPayload.type,
        status: slackResponse.status,
      })

      return jsonResponse({ success: false, status: slackResponse.status }, 502)
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error('[team-notification] handler error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
