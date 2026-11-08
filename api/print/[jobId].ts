import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { jobId } = req.query

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'jobId is required' })
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
      console.error('Supabase error:', error)
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
    console.error('Print status API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
