import { useEffect, useState, useCallback, useRef } from 'react'
import type { Block, Signature, CornerSticker } from '@/types/canvas'
import { useAuth } from '@/contexts/AuthContext'
import {
  autosaveDraft,
  saveDraftNow,
  loadDraft as loadDraftFromDB,
  deleteDraft,
  generateDraftId,
  type ComposeDraft,
} from './draftService'

export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error'

interface UseComposeDraftOptions {
  draftId?: string
  to: string
  date: string
  blocks: Block[]
  signature: Signature
  cornerSticker?: CornerSticker
  onDraftLoaded?: (draft: ComposeDraft) => void
}

export function useComposeDraft({
  draftId: initialDraftId,
  to,
  date,
  blocks,
  signature,
  cornerSticker,
  onDraftLoaded,
}: UseComposeDraftOptions) {
  const { user } = useAuth()
  const [saveState, setSaveState] = useState<DraftSaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => {
    return initialDraftId || generateDraftId()
  })
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Initialize draft from storage if requested
  useEffect(() => {
    if (!user || !initialDraftId) return

    const loadInitialDraft = async () => {
      try {
        const draft = await loadDraftFromDB(initialDraftId, user.id)
        if (draft && onDraftLoaded) {
          onDraftLoaded(draft)
        }
      } catch (err) {
        console.error('[useComposeDraft] Error loading initial draft:', err)
      }
    }

    loadInitialDraft()
  }, [initialDraftId, user, onDraftLoaded])

  // Debounced autosave
  const triggerAutosave = useCallback(() => {
    if (!user) return

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    setSaveState('saving')
    setError(null)

    const draft: ComposeDraft = {
      id: currentDraftId,
      userId: user.id,
      to,
      date,
      blocks,
      signature,
      cornerSticker,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        await autosaveDraft(draft)
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to save draft'
        console.error('[useComposeDraft] Autosave error:', err)
        setError(errorMsg)
        setSaveState('error')
      }
    }, 800)
  }, [user, currentDraftId, to, date, blocks, signature, cornerSticker])

  // Save immediately
  const saveNow = useCallback(async () => {
    if (!user) return

    setSaveState('saving')
    setError(null)

    const draft: ComposeDraft = {
      id: currentDraftId,
      userId: user.id,
      to,
      date,
      blocks,
      signature,
      cornerSticker,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    try {
      await saveDraftNow(draft)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save draft'
      console.error('[useComposeDraft] Save error:', err)
      setError(errorMsg)
      setSaveState('error')
    }
  }, [user, currentDraftId, to, date, blocks, signature, cornerSticker])

  // Delete draft
  const removeDraft = useCallback(async () => {
    if (!user) return

    try {
      await deleteDraft(currentDraftId, user.id)
      setCurrentDraftId(generateDraftId())
      setSaveState('idle')
      setError(null)
    } catch (err) {
      console.error('[useComposeDraft] Error deleting draft:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete draft')
    }
  }, [user, currentDraftId])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    draftId: currentDraftId,
    saveState,
    error,
    triggerAutosave,
    saveNow,
    removeDraft,
  }
}
