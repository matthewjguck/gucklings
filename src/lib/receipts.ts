import { supabase } from './supabase'
import type { Receipt } from '@/types/app'

export interface PrintJobInput {
  sender_id: string
  recipient_id?: string
  recipient_name: string
  message_text: string
  payload_base64: string
}

export interface SaveReceiptInput {
  sender_email: string
  sender_name: string
  recipient_email: string
  content: string
  receiptImage?: string
}

/**
 * Send a receipt email notification to the recipient (fire-and-forget).
 * Calls the deployed `send-recipt-email` edge function with `receiptId` so
 * the function uses the existing row instead of inserting a duplicate.
 */
function sendReceiptEmail(receiptId: string, senderName: string, recipientEmail: string): void {
  if (!supabase) return

  Promise.race([
    supabase.functions.invoke('send-recipt-email', {
      body: {
        receiptId,
        recipientEmail,
        senderName,
      },
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
  ]).then(() => {
    console.log('[Receipt] Email sent to', recipientEmail)
  }).catch((error) => {
    console.warn('[Receipt] Email send failed (non-blocking):', error instanceof Error ? error.message : String(error))
  })
}

/**
 * Get all receipts (print jobs) sent to a specific friend.
 * Uses recipient_id to match jobs sent to that profile.
 */
export async function getReceiptsByFriend(
  currentUserEmail: string,
  friendEmail: string
): Promise<Receipt[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('delivered_receipts')
      .select('*')
      .eq('sender_email', currentUserEmail)
      .eq('recipient_email', friendEmail)
      .not('printed_at', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getReceiptsByFriend error:', error)
      return []
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      date: new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      to: friendEmail.split('@')[0] ?? 'Unknown',
      from: 'You',
      content: job.content ?? '(no content)',
      friendId: friendEmail,
      receiptStateJson: job.content,
      receiptImage: job.receipt_image,
      printedAt: job.printed_at,
    }))
  } catch (error) {
    console.error('getReceiptsByFriend exception:', error)
    return []
  }
}

/**
 * Save a receipt (message) to delivered_receipts when user hits send.
 * Returns the receipt ID or throws on error.
 */
export async function saveReceipt(input: SaveReceiptInput): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')

  try {
    const { data, error } = await supabase
      .from('delivered_receipts')
      .insert([{
        sender_email: input.sender_email,
        sender_name: input.sender_name,
        recipient_email: input.recipient_email,
        content: input.content,
        receipt_image: input.receiptImage ?? null,
      }] as any)
      .select('id')
      .single()

    if (error) {
      console.error('saveReceipt error:', error)
      throw error
    }

    const result = data as any
    console.log('[Receipt] Saved to delivered_receipts:', result.id)

    // Send email notification to recipient (fire-and-forget)
    sendReceiptEmail(result.id, input.sender_name, input.recipient_email)

    return result.id
  } catch (error) {
    console.error('saveReceipt exception:', error)
    throw error
  }
}

/**
 * Save a print job to the archive.
 */
export async function savePrintJob(job: PrintJobInput): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase.from('print_jobs').insert({
      sender_id: job.sender_id,
      recipient_id: job.recipient_id || null,
      recipient_name: job.recipient_name,
      message_text: job.message_text,
      payload_base64: job.payload_base64,
    })

    if (error) {
      console.error('savePrintJob error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('savePrintJob exception:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Get all receipts (print jobs) sent by the current user.
 * Used for the full archive view.
 */
export async function getReceiptsByCurrentUser(userEmail: string): Promise<Receipt[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('delivered_receipts')
      .select('*')
      .eq('sender_email', userEmail)
      .not('printed_at', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getReceiptsByCurrentUser error:', error)
      return []
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      date: new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      to: job.recipient_email?.split('@')[0] ?? 'Unknown',
      from: 'You',
      content: job.content ?? '(no content)',
      friendId: job.recipient_email ?? '',
      receiptStateJson: job.content,
      receiptImage: job.receipt_image,
      printedAt: job.printed_at,
    }))
  } catch (error) {
    console.error('getReceiptsByCurrentUser exception:', error)
    return []
  }
}

/**
 * Get all receipts received by the current user from a specific friend.
 */
export async function getReceivedReceiptsByFriend(
  currentUserEmail: string,
  friendEmail: string
): Promise<Receipt[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('delivered_receipts')
      .select('*')
      .eq('sender_email', friendEmail)
      .eq('recipient_email', currentUserEmail)
      .not('printed_at', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getReceivedReceiptsByFriend error:', error)
      return []
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      date: new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      to: 'You',
      from: job.sender_name ?? job.sender_email ?? 'Unknown',
      content: job.content ?? '(no content)',
      friendId: friendEmail,
      receiptStateJson: job.content,
      receiptImage: job.receipt_image,
      printedAt: job.printed_at,
    }))
  } catch (error) {
    console.error('getReceivedReceiptsByFriend exception:', error)
    return []
  }
}

/**
 * Get all receipts received by the current user.
 */
export async function getReceivedReceiptsByCurrentUser(userEmail: string): Promise<Receipt[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('delivered_receipts')
      .select('*')
      .eq('recipient_email', userEmail)
      .not('printed_at', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getReceivedReceiptsByCurrentUser error:', error)
      return []
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      date: new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      to: 'You',
      from: job.sender_name ?? job.sender_email ?? 'Unknown',
      content: job.content ?? '(no content)',
      friendId: job.sender_email ?? '',
      receiptStateJson: job.content,
      receiptImage: job.receipt_image,
      printedAt: job.printed_at,
    }))
  } catch (error) {
    console.error('getReceivedReceiptsByCurrentUser exception:', error)
    return []
  }
}

/**
 * Mark a receipt as printed.
 */
export async function markReceiptAsPrinted(receiptId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')

  try {
    const { error } = await (supabase
      .from('delivered_receipts' as never) as any)
      .update({ printed_at: new Date().toISOString() })
      .eq('id', receiptId)

    if (error) {
      console.error('markReceiptAsPrinted error:', error)
      throw error
    }

    console.log('[Receipt] Marked as printed:', receiptId)
  } catch (error) {
    console.error('markReceiptAsPrinted exception:', error)
    throw error
  }
}

/**
 * Get count of unprinted receipts the current user has received from others.
 * Powers the home-screen printer-tile badge, which should match the list shown
 * in PrintingScreen (`getReceivedUnprintedReceipts`).
 */
export async function getUnprintedReceiptCount(userEmail: string): Promise<number> {
  if (!supabase) return 0

  try {
    const { count, error } = await supabase
      .from('delivered_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_email', userEmail)
      .is('printed_at', null)

    if (error) {
      console.error('getUnprintedReceiptCount error:', error)
      return 0
    }

    return count ?? 0
  } catch (error) {
    console.error('getUnprintedReceiptCount exception:', error)
    return 0
  }
}

/**
 * Get unprinted receipts sent by the current user.
 */
export async function getUnprintedReceipts(userEmail: string): Promise<Receipt[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('delivered_receipts')
      .select('*')
      .eq('sender_email', userEmail)
      .is('printed_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getUnprintedReceipts error:', error)
      return []
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      date: new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      to: job.recipient_email?.split('@')[0] ?? 'Unknown',
      from: 'You',
      content: job.content ?? '(no content)',
      friendId: job.recipient_email ?? '',
      receiptStateJson: job.content,
      receiptImage: job.receipt_image,
      printedAt: job.printed_at,
    }))
  } catch (error) {
    console.error('getUnprintedReceipts exception:', error)
    return []
  }
}

/**
 * Get unprinted receipts received by the current user (sent by others).
 */
export async function getReceivedUnprintedReceipts(userEmail: string): Promise<Receipt[]> {
  if (!supabase) return []

  try {
    console.log('[Receipts] Loading unprinted receipts for:', userEmail)
    const { data, error } = await supabase
      .from('delivered_receipts')
      .select('*')
      .eq('recipient_email', userEmail)
      .is('printed_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Receipts] Query error:', error)
      return []
    }

    console.log('[Receipts] Found unprinted receipts:', data?.length ?? 0)
    if (data && data.length > 0) {
      console.log('[Receipts] Sample receipt:', JSON.stringify(data[0], null, 2))
    }

    return (data || []).map((job: any) => ({
      id: job.id,
      date: new Date(job.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      to: 'You',
      from: job.sender_name ?? job.sender_email ?? 'Unknown',
      content: job.content ?? '(no content)',
      friendId: job.sender_email ?? '',
      receiptStateJson: job.content,
      receiptImage: job.receipt_image,
      printedAt: job.printed_at,
    }))
  } catch (error) {
    console.error('[Receipts] Exception:', error)
    return []
  }
}
