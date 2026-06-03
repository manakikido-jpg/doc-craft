/**
 * IndexedDB-backed image store.
 *
 * localStorage has a hard 5–10 MB quota. Documents embed images as base64 data
 * URLs, so 3–4 photos can overflow it and make local saves fail silently,
 * losing the user's work.
 *
 * This module moves large base64 images OUT of the localStorage copy of a
 * document and into IndexedDB (which has GB-scale quota), leaving a tiny
 * `idb:<hash>` reference in their place. On load the references are rehydrated
 * back to base64 so the editor, rendering, export and cloud-save paths are all
 * unchanged.
 *
 * The cloud (Supabase JSONB) path is intentionally NOT touched — it keeps full
 * base64 so cross-device sync keeps working.
 */

const DB_NAME = 'doccraft-images'
const STORE = 'images'
const DB_VERSION = 1

// Only externalize data URLs larger than this (chars). Small inline icons stay.
const EXTERNALIZE_THRESHOLD = 50_000

const IDB_PREFIX = 'idb:'

let _dbPromise: Promise<IDBDatabase | null> | null = null

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null)
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return _dbPromise
}

/** Stable content hash → identical images reuse the same key (no leak on re-save). */
function hashContent(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  }
  return `${(h >>> 0).toString(36)}_${s.length.toString(36)}`
}

function idbPut(key: string, value: string): Promise<boolean> {
  return openDB().then((db) => {
    if (!db) return false
    return new Promise<boolean>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(value, key)
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => resolve(false)
        tx.onabort = () => resolve(false)
      } catch {
        resolve(false)
      }
    })
  })
}

function idbGet(key: string): Promise<string | null> {
  return openDB().then((db) => {
    if (!db) return null
    return new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(key)
        req.onsuccess = () => resolve((req.result as string) ?? null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  })
}

/** True if a string is a large embedded image worth externalizing. */
function isLargeImageDataUrl(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('data:image/') && v.length > EXTERNALIZE_THRESHOLD
}

/** True if a string is one of our IndexedDB references. */
export function isImageRef(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(IDB_PREFIX)
}

/**
 * Deep-clone `doc`, replacing every large base64 image with an `idb:<hash>`
 * reference and persisting the bytes in IndexedDB. Returns the lightweight
 * doc safe to write to localStorage. If IndexedDB is unavailable the original
 * value is kept (graceful degradation).
 */
export async function externalizeImages<T>(doc: T): Promise<T> {
  async function walk(value: unknown): Promise<unknown> {
    if (isLargeImageDataUrl(value)) {
      const key = hashContent(value)
      const ok = await idbPut(key, value)
      return ok ? IDB_PREFIX + key : value
    }
    if (Array.isArray(value)) {
      const out: unknown[] = []
      for (const item of value) out.push(await walk(item))
      return out
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(value as Record<string, unknown>)) {
        out[k] = await walk((value as Record<string, unknown>)[k])
      }
      return out
    }
    return value
  }
  return (await walk(doc)) as T
}

/**
 * Deep-clone `doc`, replacing every `idb:<hash>` reference with its base64 data
 * URL read back from IndexedDB. Broken references are left as-is.
 */
export async function internalizeImages<T>(doc: T): Promise<T> {
  async function walk(value: unknown): Promise<unknown> {
    if (isImageRef(value)) {
      const key = value.slice(IDB_PREFIX.length)
      const data = await idbGet(key)
      return data ?? value
    }
    if (Array.isArray(value)) {
      const out: unknown[] = []
      for (const item of value) out.push(await walk(item))
      return out
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(value as Record<string, unknown>)) {
        out[k] = await walk((value as Record<string, unknown>)[k])
      }
      return out
    }
    return value
  }
  return (await walk(doc)) as T
}
