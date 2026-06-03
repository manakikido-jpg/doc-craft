/**
 * Offline document cache for DocCraft.
 * Saves document state to localStorage on every auto-save so that
 * documents remain accessible when the user goes offline.
 */

const OFFLINE_PREFIX = 'doccraft:offline:'
const OFFLINE_INDEX_KEY = 'doccraft:offline:index'
const SYNC_QUEUE_KEY = 'doccraft:offline:sync-queue'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export interface OfflineCacheEntry {
  id: string
  type: 'slides' | 'doc' | 'spreadsheet'
  data: string
  savedAt: string
  dirty: boolean // true if saved offline and needs sync
}

/** Get the index of all cached document IDs */
function getIndex(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(OFFLINE_INDEX_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveIndex(ids: string[]) {
  localStorage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(ids))
}

/**
 * Save a document to the offline cache.
 * Call this on every auto-save to keep the local copy up to date.
 */
export function saveToOfflineCache(
  id: string,
  type: 'slides' | 'doc' | 'spreadsheet',
  data: string,
): void {
  if (!isBrowser()) return

  const entry: OfflineCacheEntry = {
    id,
    type,
    data,
    savedAt: new Date().toISOString(),
    dirty: !navigator.onLine,
  }

  try {
    localStorage.setItem(OFFLINE_PREFIX + id, JSON.stringify(entry))

    const index = getIndex()
    if (!index.includes(id)) {
      index.push(id)
      saveIndex(index)
    }

    // If offline, add to sync queue
    if (!navigator.onLine) {
      addToSyncQueue(id)
    }
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.warn('[DocCraft] Offline cache: localStorage quota exceeded for document', id)
    }
  }
}

/**
 * Load a document from the offline cache.
 * Returns null if no cached version exists.
 */
export function loadFromOfflineCache(id: string): OfflineCacheEntry | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(OFFLINE_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Check whether the browser is currently offline.
 */
export function isOffline(): boolean {
  if (!isBrowser()) return false
  return !navigator.onLine
}

/**
 * Remove a document from the offline cache.
 */
export function removeFromOfflineCache(id: string): void {
  if (!isBrowser()) return
  localStorage.removeItem(OFFLINE_PREFIX + id)
  const index = getIndex().filter((i) => i !== id)
  saveIndex(index)
}

/** List all documents available in the offline cache */
export function listOfflineDocs(): OfflineCacheEntry[] {
  if (!isBrowser()) return []
  const index = getIndex()
  const entries: OfflineCacheEntry[] = []
  for (const id of index) {
    const entry = loadFromOfflineCache(id)
    if (entry) entries.push(entry)
  }
  return entries
}

// ── Sync queue ──

function addToSyncQueue(id: string) {
  const queue = getSyncQueue()
  if (!queue.includes(id)) {
    queue.push(id)
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  }
}

function getSyncQueue(): string[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function clearSyncQueue() {
  localStorage.removeItem(SYNC_QUEUE_KEY)
}

/**
 * Sync all dirty offline documents back to their primary storage.
 * Call this when the browser comes back online.
 * Returns the IDs of documents that were synced.
 */
export function syncOfflineDocuments(): string[] {
  if (!isBrowser()) return []

  const queue = getSyncQueue()
  const synced: string[] = []

  for (const id of queue) {
    const entry = loadFromOfflineCache(id)
    if (!entry) continue

    // Determine the primary storage key
    const prefix =
      entry.type === 'slides'
        ? 'doccraft:slide:'
        : entry.type === 'spreadsheet'
          ? 'doccraft:spreadsheet:'
          : 'doccraft:doc:'

    try {
      localStorage.setItem(prefix + id, entry.data)

      // Mark as clean
      entry.dirty = false
      localStorage.setItem(OFFLINE_PREFIX + id, JSON.stringify(entry))
      synced.push(id)
    } catch {
      // Quota exceeded or other error, leave in queue
    }
  }

  if (synced.length === queue.length) {
    clearSyncQueue()
  } else {
    // Keep unsynced items in queue
    const remaining = queue.filter((id) => !synced.includes(id))
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining))
  }

  return synced
}

/**
 * Set up online/offline event listeners for automatic sync.
 * Returns a cleanup function.
 */
export function setupOfflineSync(onSync?: (syncedIds: string[]) => void): () => void {
  if (!isBrowser()) return () => {}

  function handleOnline() {
    const synced = syncOfflineDocuments()
    if (synced.length > 0 && onSync) {
      onSync(synced)
    }
  }

  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}
