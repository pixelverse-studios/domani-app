import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Domani <noreply@domani.app>'

interface EmailRequest {
  type: 'account_deletion' | 'account_reactivation'
  email: string
  name?: string
  deletionDate?: string
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    console.log('[send-account-email] Received body:', JSON.stringify(body))

    const { type, email, name, deletionDate } = body as EmailRequest

    if (!type || !email) {
      console.log('[send-account-email] Missing fields - type:', type, 'email:', email)
      return new Response(
        JSON.stringify({ error: 'Missing required fields', received: { type, email } }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let emailContent: { subject: string; html: string }

    if (type === 'account_deletion') {
      if (!deletionDate) {
        return new Response(
          JSON.stringify({ error: 'deletionDate is required for account_deletion' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      emailContent = emailTemplates.account_deletion(name || '', deletionDate)
    } else if (type === 'account_reactivation') {
      emailContent = emailTemplates.account_reactivation(name || '')
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: data }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
