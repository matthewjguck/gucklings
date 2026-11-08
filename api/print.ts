import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Get print job status via query parameter
    try {
      const jobId = req.query.jobId as string | undefined

      if (!jobId) {
        return res.status(200).json({ status: 'ok' })
      }

      // Create Supabase client with anon key (public reads only)
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || ''
      )

      // Get print job status
      const { data, error } = await supabase
        .from('print_jobs')
        .select('id, status, error_message, created_at, updated_at')
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('[print-api] Supabase error getting status:', error)
        return res.status(404).json({ error: 'Print job not found' })
      }

      return res.status(200).json({
        jobId: data.id,
        status: data.status,
        errorMessage: data.error_message,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      })
    } catch (err) {
      console.error('[print-api] Status error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { receiptImage, senderName } = req.body

      if (!receiptImage) {
        return res.status(400).json({ error: 'receiptImage is required' })
      }

      // Create Supabase client with service key
      const url = process.env.SUPABASE_URL || ''
      const key = process.env.SUPABASE_SERVICE_KEY || ''

      console.log('[print-api] Creating client with:', {
        url: url ? 'set' : 'missing',
        key: key ? 'set' : 'missing',
        keyLength: key.length,
      })

      const supabase = createClient(url, key)
      console.log('[print-api] Client created, attempting insert...')

      // Store print job in Supabase
      const { data, error } = await supabase
        .from('print_jobs')
        .insert({
          printer_id: 'home-printer-gucklings',
          payload_base64: receiptImage,
          message_text: senderName,
          status: 'pending',
        })
        .select('id')
        .single()

      if (error) {
        console.error('[print-api] Supabase error:', error)
        return res.status(500).json({ error: 'Failed to create print job', details: error })
      }

      console.log('[print-api] Insert successful, jobId:', data.id)
      return res.status(200).json({ jobId: data.id })
    } catch (err) {
      console.error('Print API error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  } else if (req.method === 'GET') {
    // Health check
    return res.status(200).json({ status: 'ok' })
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
