// Persists an Inklings receipt and emails the recipient a link to claim/print it.
// POST body: { recipientEmail, senderName, content }   (content = { blocks, prompt, ... })
// Env vars (Project Settings → Edge Functions → Secrets):
//   RESEND_API_KEY            (required, re_…)
//   RESEND_FROM               (optional; defaults to "Inklings <onboarding@resend.dev>")
//   SITE_URL                  (optional; defaults to "https://inklings.thecupidproject.org")
//   SUPABASE_URL              (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: {
    recipientEmail?: string
    senderName?: string
    content?: unknown
    message?: string
    receiptId?: string
    receiptImage?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { recipientEmail, senderName, receiptId: providedReceiptId, receiptImage } = body
  const content = body.content ?? { blocks: [], prompt: '', legacyMessage: body.message ?? '' }
  console.log('[send-recipt-email] Received receiptImage length:', receiptImage?.length ?? 'undefined')
  if (!recipientEmail || !senderName) {
    return json({ error: 'recipientEmail and senderName are required' }, 400)
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!apiKey) return json({ error: 'RESEND_API_KEY not set on the function' }, 500)
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Supabase env not available in function runtime' }, 500)
  }

  // If the caller already persisted the row (saveReceipt path), use that id
  // and skip the insert. Otherwise insert here (legacy onboarding path).
  let receiptId: string
  if (providedReceiptId) {
    receiptId = providedReceiptId
  } else {
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/delivered_receipts`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        sender_name: senderName,
        recipient_email: recipientEmail,
        content,
        receipt_image: receiptImage ?? null,
      }),
    })
    console.log('[send-recipt-email] Insert response status:', insertRes.status, 'ok:', insertRes.ok)

    if (!insertRes.ok) {
      const detail = await insertRes.text()
      return json({ error: 'Failed to persist receipt', status: insertRes.status, detail }, 500)
    }

    const rows = await insertRes.json()
    console.log('[send-recipt-email] Insert response:', rows)
    const insertedId = Array.isArray(rows) ? rows[0]?.id : rows?.id
    if (!insertedId) return json({ error: 'No receipt id returned from insert' }, 500)
    receiptId = insertedId

    // Verify receipt was stored
    if (Array.isArray(rows) && rows[0]) {
      console.log('[send-recipt-email] Stored receipt_image length:', rows[0].receipt_image?.length ?? 'null')
    }
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://inklings.thecupidproject.org'
  const link = `${siteUrl}/r/${receiptId}`

  const from = Deno.env.get('RESEND_FROM') ?? 'Inklings <onboarding@resend.dev>'
  const subject = `${senderName} sent you an Inkling`
  const text = `${senderName} sent you an Inkling.\n\nInklings is a new campus messaging system designed to spread love.\n\nHead to oncall and find the Inklings printer (by drink pick up section next to photobooth) before pressing the button below to print your message.\n\nPrint it here: ${link}\n\n— Inklings`

  const fontStack = `'Printvetica', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`
  const logoUrl = 'https://inklings.thecupidproject.org/logo.png'
  const html = `<!doctype html>
<html><body style="margin:0;padding:48px 16px;background:#ffffff;font-family:${fontStack};color:#000000;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border:1px solid #d4d4d8;padding:32px 24px;text-align:center;font-family:${fontStack};">
    <img src="${logoUrl}" alt="Inklings" width="80" height="80" border="0" style="display:block;margin:0 auto 20px;width:80px;height:80px;border:0;" />
    <p style="margin:0 0 12px;font-size:12px;color:#787878;letter-spacing:0.2em;text-transform:uppercase;font-family:${fontStack};">you've got mail</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:#000000;font-family:${fontStack};">${escapeHtml(senderName)} sent you an Inkling</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#000000;font-family:${fontStack};">Inklings is a new campus messaging system designed to spread love.</p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.5;color:#000000;font-family:${fontStack};">Head to oncall and find the Inklings printer (by drink pick up section next to photobooth) before pressing the button below to print your message.</p>
    <a href="${link}" style="display:inline-block;padding:14px 28px;background:#E8395A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;font-family:${fontStack};">Print my Inkling</a>
    <p style="margin:28px 0 0;font-size:11px;color:#969696;word-break:break-all;font-family:${fontStack};">${escapeHtml(link)}</p>
  </div>
  <p style="max-width:420px;margin:16px auto 0;font-size:11px;color:#969696;text-align:center;font-family:${fontStack};">Sent via Inklings · inklings.thecupidproject.org</p>
</body></html>`

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [recipientEmail],
      subject,
      html,
      text,
    }),
  })

  if (!sendRes.ok) {
    const detail = await sendRes.text()
    return json({ error: 'Resend send failed', status: sendRes.status, detail, receiptId }, 502)
  }

  const sendData = await sendRes.json()
  return json({ ok: true, receiptId, link, emailId: sendData.id })
})
