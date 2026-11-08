import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { receiptImage, senderName } = req.body

      if (!receiptImage) {
        return res.status(400).json({ error: 'receiptImage is required' })
      }

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
        console.error('Supabase error:', error)
        return res.status(500).json({ error: 'Failed to create print job' })
      }

      return res.status(200).json({ jobId: data.id })
    } catch (err) {
      console.error('Print API error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'GET') {
    // Health check
    return res.status(200).json({ status: 'ok' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
