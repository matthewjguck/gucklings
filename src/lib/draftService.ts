import type { Block, CornerSticker, Signature } from '@/types/canvas'

export interface ComposeDraft {
  id: string
  userId: string
  to: string
  date: string
  blocks: Block[]
  signature: Signature
  cornerSticker?: CornerSticker
  createdAt: number
  updatedAt: number
}

const DB_NAME = 'gucklings_drafts'
const STORE_NAME = 'compose_drafts'
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
      }
    }
  })
}

async function saveDraftToDB(draft: ComposeDraft): Promise<void> {
  try {
    const db = await initDB()
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve, reject) => {
      const request = store.put(draft)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('[draftService] Error saving draft:', error)
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some drafts.')
    }
    throw error
  }
}

export function autosaveDraft(draft: ComposeDraft): Promise<{ saving: boolean }> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        await saveDraftToDB(draft)
      } catch (error) {
        console.error('[draftService] Autosave error:', error)
      }
      resolve({ saving: true })
    }, 800)
  })
}

export async function saveDraftNow(draft: ComposeDraft): Promise<void> {
  await saveDraftToDB(draft)
}

export async function loadDraft(draftId: string, userId: string): Promise<ComposeDraft | null> {
  try {
    const db = await initDB()
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve, reject) => {
      const request = store.get(draftId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const draft = request.result as ComposeDraft | undefined
        if (draft && draft.userId === userId) {
          resolve(draft)
        } else {
          resolve(null)
        }
      }
    })
  } catch (error) {
    console.error('[draftService] Error loading draft:', error)
    return null
  }
}

export async function loadUserDrafts(userId: string): Promise<ComposeDraft[]> {
  try {
    const db = await initDB()
    const tx = db.transaction([STORE_NAME], 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('userId')
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const drafts = (request.result as ComposeDraft[]).sort((a, b) => b.updatedAt - a.updatedAt)
        resolve(drafts)
      }
    })
  } catch (error) {
    console.error('[draftService] Error loading user drafts:', error)
    return []
  }
}

export async function deleteDraft(draftId: string, userId: string): Promise<void> {
  try {
    const draft = await loadDraft(draftId, userId)
    if (!draft) throw new Error('Draft not found')
    const db = await initDB()
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve, reject) => {
      const request = store.delete(draftId)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('[draftService] Error deleting draft:', error)
    throw error
  }
}

export async function clearUserDrafts(userId: string): Promise<void> {
  try {
    const drafts = await loadUserDrafts(userId)
    const db = await initDB()
    const tx = db.transaction([STORE_NAME], 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve, reject) => {
      let completed = 0
      const total = drafts.length
      if (total === 0) {
        resolve()
        return
      }
      drafts.forEach((draft) => {
        const request = store.delete(draft.id)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          completed++
          if (completed === total) resolve()
        }
      })
    })
  } catch (error) {
    console.error('[draftService] Error clearing user drafts:', error)
  }
}

export function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
