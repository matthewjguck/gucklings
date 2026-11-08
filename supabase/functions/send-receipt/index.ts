// Sends an Inklings receipt as an SMS via Twilio.
// Expects POST body: { recipientPhone: string, senderName: string, message: string }
// Env vars required (Project Settings → Edge Functions → Secrets):
//   TWILIO_ACCOUNT_SID            (AC…)
//   TWILIO_AUTH_TOKEN             (hex token)
//   TWILIO_MESSAGING_SERVICE_SID  (MG…)

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck - Deno runtime, not Node

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function normalizePhone(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '')
  const digits = trimmed.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: { recipientPhone?: string; senderName?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { recipientPhone, senderName, message } = body
  if (!recipientPhone || !senderName || !message) {
    return json({ error: 'recipientPhone, senderName, and message are required' }, 400)
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')

  if (!accountSid || !authToken || !messagingServiceSid) {
    return json({ error: 'Twilio credentials not configured on the function' }, 500)
  }

  const smsBody = `📬 ${senderName} sent you an Inklings: ${message}`
  const to = normalizePhone(recipientPhone)

  const params = new URLSearchParams({
    MessagingServiceSid: messagingServiceSid,
    To: to,
    Body: smsBody,
  })

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const auth = btoa(`${accountSid}:${authToken}`)

  const res = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const detail = await res.text()
    return json({ error: 'Twilio send failed', status: res.status, detail }, 502)
  }

  const data = await res.json()
  return json({ ok: true, sid: data.sid })
})
