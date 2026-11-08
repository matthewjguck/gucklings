import type { Block, CornerSticker, Signature } from '@/types/canvas'
import type { Json } from '@/types/database'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'inklings.onboardingDraft_v1'

export type OnboardingDraft = {
  content: {
    blocks: Block[]
    prompt: string
    cornerSticker?: CornerSticker
    signature?: Signature
    headerVariant?: 'simple' | 'squids-checkers' | 'squids-v1' | 'none'
    receiptImage?: string
  } | null
  recipient: {
    name: string
    phone: string
  } | null
  createdAt: string
}

function empty(): OnboardingDraft {
  return { content: null, recipient: null, createdAt: new Date().toISOString() }
}

export function loadDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return empty()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as OnboardingDraft
    return parsed ?? empty()
  } catch {
    return empty()
  }
}

export function saveDraft(patch: Partial<OnboardingDraft>): OnboardingDraft {
  const current = loadDraft()
  const next: OnboardingDraft = {
    ...current,
    ...patch,
    createdAt: current.createdAt || new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (err) {
    // Likely localStorage quota exceeded (a large image dataUrl). Don't crash
    // the caller — best-effort persistence; the in-memory state and edge
    // function call will still complete the send.
    console.warn('saveDraft: failed to persist to localStorage', err)
  }
  return next
}

export function clearDraft() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

export type CommitResult =
  | { kind: 'delivered'; recipientId: string; receiptId: string }
  | { kind: 'pending'; pendingId: string }

export async function commitDraftForUser(authorId: string): Promise<CommitResult | null> {
  if (!supabase) throw new Error('Supabase not configured')
  const draft = loadDraft()
  if (!draft.content || !draft.recipient) return null

  const phone = normalizePhone(draft.recipient.phone)
  const content = draft.content as unknown as Json

  const { data: match, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle()
  if (lookupError) throw lookupError

  if (match) {
    const recipientId = match.id as string
    const { data, error } = await supabase
      .from('receipts')
      .insert({ author_id: authorId, recipient_id: recipientId, content })
      .select('id')
      .single()
    if (error) throw error

    if (recipientId !== authorId) {
      try {
        await supabase
          .from('friends')
          .insert({ requester_id: authorId, addressee_id: recipientId, status: 'pending' })
      } catch {
        // ignore if already exists
      }
    }

    clearDraft()
    return { kind: 'delivered', recipientId, receiptId: data.id as string }
  }

  const { data, error } = await (supabase.from('pending_receipts' as never) as any)
    .insert({ author_id: authorId, recipient_phone: phone, content })
    .select('id')
    .single()
  if (error) throw error

  clearDraft()
  return { kind: 'pending', pendingId: (data as { id: string }).id }
}

function normalizePhone(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '')
  const digits = trimmed.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}
