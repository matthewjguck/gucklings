import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

interface SessionPayload {
  userId: string
  displayName?: string
  phone?: string
  iat: number
  exp: number
}

function getSigningSecret(): string {
  const url = process.env.SUPABASE_URL || 'default'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'default'
  return createHmac('sha256', key).update(url).digest('hex')
}

function signToken(payload: SessionPayload): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  const body = JSON.stringify(payload)
  const headerB64 = Buffer.from(header).toString('base64url')
  const bodyB64 = Buffer.from(body).toString('base64url')
  const message = `${headerB64}.${bodyB64}`
  const signature = createHmac('sha256', getSigningSecret()).update(message).digest('base64url')
  return `${message}.${signature}`
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [headerB64, bodyB64, signatureB64] = parts
    const message = `${headerB64}.${bodyB64}`
    const expectedSignature = createHmac('sha256', getSigningSecret()).update(message).digest('base64url')
    if (signatureB64 !== expectedSignature) return null
    const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf-8')) as SessionPayload
    if (payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

function getSessionToken(req: VercelRequest): string | undefined {
  if (!req.headers.cookie) return undefined
  const cookies = req.headers.cookie.split(';').map(c => c.trim())
  const sessionCookie = cookies.find(c => c.startsWith('session_token='))
  if (!sessionCookie) return undefined
  return sessionCookie.split('=')[1]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'POST') {
    try {
      const { phone, passcode } = req.body
      if (!phone || !passcode) {
        return res.status(400).json({ error: 'Phone and passcode required' })
      }

      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || ''
      )

      const phoneDigits = parseInt('1' + phone.replace(/\D/g, ''), 10)
      const { data: allProfiles, error: queryError } = await supabase
        .from('profiles')
        .select('id, phone_number, passcode_hash, display_name')
        .returns<Array<{ id: string; phone_number: number; passcode_hash: string; display_name: string }>>()

      if (queryError || !allProfiles) {
        return res.status(401).json({ error: 'Unable to verify phone number' })
      }

      const profile = allProfiles.find(p => p.phone_number === phoneDigits)
      if (!profile) {
        return res.status(401).json({ error: 'Phone number not found. Contact your family to be added.' })
      }

      if (profile.passcode_hash !== passcode) {
        return res.status(401).json({ error: 'Incorrect passcode' })
      }

      const now = Math.floor(Date.now() / 1000)
      const payload: SessionPayload = {
        userId: profile.id,
        displayName: profile.display_name,
        phone: String(phoneDigits),
        iat: now,
        exp: now + 30 * 24 * 60 * 60,
      }

      const token = signToken(payload)
      const isSecure = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
      res.setHeader(
        'Set-Cookie',
        `session_token=${token}; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}; Max-Age=${30 * 24 * 60 * 60}`
      )

      return res.status(200).json({
        user: {
          id: profile.id,
          email: `${phoneDigits}@gucklings.local`,
          user_metadata: {
            phone: String(phoneDigits),
            display_name: profile.display_name,
          },
        },
        sessionToken: token,
      })
    } catch (error) {
      console.error('[session] Error creating session:', error)
      return res.status(500).json({ error: 'Session creation failed' })
    }
  }

  if (req.method === 'GET') {
    try {
      const token = getSessionToken(req)
      if (!token) {
        return res.status(401).json({ error: 'No session found' })
      }

      const payload = verifyToken(token)
      if (!payload) {
        res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      const now = Math.floor(Date.now() / 1000)
      const newPayload: SessionPayload = {
        ...payload,
        iat: now,
        exp: now + 30 * 24 * 60 * 60,
      }

      const newToken = signToken(newPayload)
      const isSecure = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
      res.setHeader(
        'Set-Cookie',
        `session_token=${newToken}; Path=/; HttpOnly; SameSite=Lax${isSecure ? '; Secure' : ''}; Max-Age=${30 * 24 * 60 * 60}`
      )

      return res.status(200).json({
        user: {
          id: payload.userId,
          email: `${payload.phone}@gucklings.local`,
          user_metadata: {
            phone: payload.phone,
            display_name: payload.displayName,
          },
        },
      })
    } catch (error) {
      console.error('[session] Error validating session:', error)
      return res.status(500).json({ error: 'Session validation failed' })
    }
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
