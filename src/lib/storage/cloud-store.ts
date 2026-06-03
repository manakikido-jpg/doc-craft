import type { DocumentMeta, DocumentType, DocDocument, SlidesDocument, SpreadsheetDocument, DesignDocument, DesignCanvasSize, Sheet, Block, BlockType } from '@/types'
import { generateId } from '../utils'
import { SLIDE_TEMPLATES } from '../templates/slide-templates'
import { createClient } from '@/lib/supabase/client'
import { logError } from '../error-logger'
import { externalizeImages, internalizeImages } from './image-store'

// ─── Supabase クラウドストア ───
// テーブル: documents (id, user_id, type, title, content, created_at, updated_at)
// content カラムに JSONB でドキュメント全体を保存

let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (typeof window === 'undefined') return null
  if (!_supabase) {
    try {
      _supabase = createClient()
    } catch {
      return null
    }
  }
  return _supabase
}

function isGuestMode(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('doccraft:guest-mode') === '1'
}

// Resolve a promise but give up after `ms`, returning `fallback` instead of
// hanging forever. Guards against Supabase auth/network calls that never settle.
function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(fallback) }
    }, ms)
    Promise.resolve(promise).then(
      (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v) } },
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(fallback) } },
    )
  })
}

async function getUserId(): Promise<string | null> {
  // ゲストモードの場合はSupabaseを使わない
  if (isGuestMode()) return 'guest'
  if (!getSupabase()) return null
  try {
    // 5s timeout: if auth.getUser() hangs, fall back to null (→ localStorage path)
    // so the editor never gets stuck on the loading spinner forever.
    const res = await withTimeout(
      getSupabase()!.auth.getUser(),
      5000,
      { data: { user: null } } as Awaited<ReturnType<NonNullable<ReturnType<typeof getSupabase>>['auth']['getUser']>>,
    )
    return res?.data?.user?.id ?? null
  } catch {
    return null
  }
}

function handleError(operation: string, error: unknown): void {
  console.error(`[CloudStore] ${operation} error:`, error)
  logError(error, `cloud-store:${operation}`)
  // Dispatch custom event for UI to catch
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cloudstore:error', { detail: { operation, error } }))
  }
}

/**
 * Retry a Supabase operation up to maxRetries times with a short delay.
 * Re-runs the operation if the result contains an error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function withRetry(fn: () => PromiseLike<any>, maxRetries = 2): Promise<any> {
  let result = await fn()
  for (let attempt = 0; attempt < maxRetries && result?.error; attempt++) {
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    result = await fn()
  }
  return result
}

// ─── List ───
export async function listDocuments(): Promise<DocumentMeta[]> {
  // ゲストモード: localStorageから読み込む
  if (isGuestMode()) {
    return listDocumentsLocal()
  }

  const userId = await getUserId()
  if (!getSupabase() || !userId) return listDocumentsLocal()

  try {
    const { data, error } = await withRetry(() =>
      getSupabase()!
        .from('documents')
        .select('id, type, title, created_at, updated_at, thumbnail_theme')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
    )

    if (error) {
      handleError('listDocuments', error)
      return listDocumentsLocal()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      type: row.type as DocumentType,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      thumbnailTheme: row.thumbnail_theme,
    }))
  } catch {
    return listDocumentsLocal()
  }
}

// localStorage フォールバック
function listDocumentsLocal(): DocumentMeta[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('doccraft:meta')
    if (!raw) return []
    const list = JSON.parse(raw) as DocumentMeta[]
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } catch {
    return []
  }
}

// ─── Create ───
export async function createDocument(type: DocumentType, title: string): Promise<DocumentMeta | null> {
  const now = new Date().toISOString()
  const defaultTitle =
    type === 'slides' ? '無題のプレゼンテーション'
    : type === 'spreadsheet' ? '無題のスプレッドシート'
    : type === 'design' ? '無題のデザイン'
    : '無題のドキュメント'

  const docId = generateId()
  const docTitle = title || defaultTitle

  let content: Record<string, unknown>

  if (type === 'slides') {
    const firstSlide = SLIDE_TEMPLATES[0].buildSlide('dark-blue')
    content = {
      slides: [firstSlide],
      activeSlideId: firstSlide.id,
    }
  } else if (type === 'spreadsheet') {
    const sheetId = generateId()
    const defaultSheet: Sheet = {
      id: sheetId,
      name: 'Sheet1',
      cells: {},
      colWidths: {},
      rowHeights: {},
      mergedCells: [],
      rowCount: 50,
      colCount: 26,
    }
    content = {
      sheets: [defaultSheet],
      activeSheetId: sheetId,
    }
  } else if (type === 'design') {
    const { getDefaultPreset } = await import('@/lib/design-presets')
    const defaultSize = getDefaultPreset()
    content = {
      canvas: {
        id: generateId(),
        themeKey: 'dark-blue',
        elements: [],
      },
      canvasSize: defaultSize,
    }
  } else {
    const firstBlock: Block = { id: generateId(), type: 'h1' as BlockType, content: docTitle }
    content = {
      blocks: [firstBlock, { id: generateId(), type: 'paragraph', content: '' }],
    }
  }

  const meta: DocumentMeta = {
    id: docId,
    title: docTitle,
    type,
    createdAt: now,
    updatedAt: now,
    thumbnailTheme: 'dark-blue',
  }

  // ゲストモード or Supabase未接続: localStorageに保存
  if (isGuestMode() || !getSupabase()) {
    return createDocumentLocal(meta, content, type)
  }

  try {
    const userId = await getUserId()
    if (!userId) return createDocumentLocal(meta, content, type)

    const { error } = await withRetry(() =>
      getSupabase()!.from('documents').insert({
        id: docId,
        user_id: userId,
        type,
        title: docTitle,
        content,
        thumbnail_theme: 'dark-blue',
        created_at: now,
        updated_at: now,
      })
    )

    if (error) {
      handleError('createDocument', error)
      return createDocumentLocal(meta, content, type)
    }

    return meta
  } catch {
    return createDocumentLocal(meta, content, type)
  }
}

function createDocumentLocal(meta: DocumentMeta, content: Record<string, unknown>, type: DocumentType): DocumentMeta {
  if (typeof window === 'undefined') return meta
  try {
    // メタ一覧に追加
    const raw = localStorage.getItem('doccraft:meta')
    const list: DocumentMeta[] = raw ? JSON.parse(raw) : []
    list.unshift(meta)
    localStorage.setItem('doccraft:meta', JSON.stringify(list))

    // コンテンツを保存
    const prefix = type === 'slides' ? 'doccraft:slide:' : type === 'spreadsheet' ? 'doccraft:spreadsheet:' : type === 'design' ? 'doccraft:design:' : 'doccraft:doc:'
    localStorage.setItem(prefix + meta.id, JSON.stringify({ meta, ...content }))
  } catch (e) {
    console.warn('[CloudStore] localStorage fallback error:', e)
  }
  return meta
}

// ─── Get ───
async function getDocumentLocal<T>(id: string, type: DocumentType): Promise<T | null> {
  if (typeof window === 'undefined') return null
  try {
    const prefix = type === 'slides' ? 'doccraft:slide:' : type === 'spreadsheet' ? 'doccraft:spreadsheet:' : type === 'design' ? 'doccraft:design:' : 'doccraft:doc:'
    const raw = localStorage.getItem(prefix + id)
    if (!raw) return null
    const parsed = JSON.parse(raw) as T
    // Rehydrate any `idb:<hash>` image references back to base64 data URLs.
    return await internalizeImages(parsed)
  } catch {
    return null
  }
}

export async function getDocument<T extends SlidesDocument | DocDocument | SpreadsheetDocument | DesignDocument>(
  id: string,
  type: DocumentType,
): Promise<T | null> {
  // ゲストモード: localStorageから読み込む
  if (isGuestMode()) return getDocumentLocal<T>(id, type)

  const userId = await getUserId()
  if (!getSupabase() || !userId) return getDocumentLocal<T>(id, type)

  try {
    // 8s timeout on the whole query (incl. retries): never hang the loader.
    const result = await withTimeout(
      withRetry(() =>
        getSupabase()!
          .from('documents')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single()
      ),
      8000,
      { error: { message: 'timeout' }, data: null } as any,
    )

    if (result.error || !result.data) return getDocumentLocal<T>(id, type)
    const data = result.data

    const meta: DocumentMeta = {
      id: data.id,
      title: data.title,
      type: data.type,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      thumbnailTheme: data.thumbnail_theme,
    }

    return { meta, ...data.content } as T
  } catch {
    return getDocumentLocal<T>(id, type)
  }
}

export async function getSlideDoc(id: string): Promise<SlidesDocument | null> {
  return getDocument<SlidesDocument>(id, 'slides')
}

export async function getDocDoc(id: string): Promise<DocDocument | null> {
  return getDocument<DocDocument>(id, 'doc')
}

export async function getSpreadsheetDoc(id: string): Promise<SpreadsheetDocument | null> {
  return getDocument<SpreadsheetDocument>(id, 'spreadsheet')
}

export async function getDesignDoc(id: string): Promise<DesignDocument | null> {
  return getDocument<DesignDocument>(id, 'design') as Promise<DesignDocument | null>
}

// ─── Save ───
async function saveDocumentLocal(doc: SlidesDocument | DocDocument | SpreadsheetDocument | DesignDocument): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const { meta } = doc
  const now = new Date().toISOString()
  meta.updatedAt = now
  const prefix = meta.type === 'slides' ? 'doccraft:slide:' : meta.type === 'spreadsheet' ? 'doccraft:spreadsheet:' : meta.type === 'design' ? 'doccraft:design:' : 'doccraft:doc:'

  // Move large base64 images into IndexedDB so the localStorage copy stays small
  // and never blows the 5–10 MB quota (the #1 cause of silent save loss).
  let lightDoc: typeof doc = doc
  try {
    lightDoc = await externalizeImages(doc)
  } catch {
    lightDoc = doc // degrade gracefully — try saving with images inline
  }

  const writeOnce = (): boolean => {
    const { meta: m, ...content } = lightDoc
    localStorage.setItem(prefix + m.id, JSON.stringify({ meta: m, ...content }))
    const raw = localStorage.getItem('doccraft:meta')
    const list: DocumentMeta[] = raw ? JSON.parse(raw) : []
    const idx = list.findIndex((x) => x.id === m.id)
    if (idx >= 0) list[idx] = m
    else list.unshift(m)
    localStorage.setItem('doccraft:meta', JSON.stringify(list))
    return true
  }

  try {
    return writeOnce()
  } catch (e) {
    // Quota exceeded even after externalizing images → surface to the user
    // instead of failing silently (was a silent data-loss path before).
    console.warn('[CloudStore] localStorage save error:', e)
    handleError('saveDocumentLocal:quota', e)
    return false
  }
}

export async function saveDocument(
  doc: SlidesDocument | DocDocument | SpreadsheetDocument | DesignDocument,
): Promise<boolean> {
  // ゲストモード: localStorageに保存
  if (isGuestMode()) return saveDocumentLocal(doc)

  const userId = await getUserId()
  if (!getSupabase() || !userId) return saveDocumentLocal(doc)

  try {
    const now = new Date().toISOString()
    const { meta, ...content } = doc

    const { error } = await withRetry(() =>
      getSupabase()!
        .from('documents')
        .update({
          title: meta.title,
          content,
          thumbnail_theme: meta.thumbnailTheme,
          updated_at: now,
        })
        .eq('id', meta.id)
        .eq('user_id', userId)
    )

    if (error) {
      handleError('saveDocument', error)
      return saveDocumentLocal(doc)
    }

    return true
  } catch {
    return saveDocumentLocal(doc)
  }
}

export async function saveSlideDoc(doc: SlidesDocument): Promise<boolean> {
  try {
    return await saveDocument(doc)
  } catch (error) {
    handleError('saveSlidesDoc', error)
    return false
  }
}

export async function saveDocDoc(doc: DocDocument): Promise<boolean> {
  try {
    return await saveDocument(doc)
  } catch (error) {
    handleError('saveDocDoc', error)
    return false
  }
}

export async function saveSpreadsheetDoc(doc: SpreadsheetDocument): Promise<boolean> {
  try {
    return await saveDocument(doc)
  } catch (error) {
    handleError('saveSpreadsheetDoc', error)
    return false
  }
}

export async function saveDesignDoc(doc: DesignDocument): Promise<boolean> {
  try {
    return await saveDocument(doc as any)
  } catch (error) {
    handleError('saveDesignDoc', error)
    return false
  }
}

// ─── Delete ───
function deleteDocumentLocal(id: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    // メタ一覧から削除
    const raw = localStorage.getItem('doccraft:meta')
    if (raw) {
      const list: DocumentMeta[] = JSON.parse(raw)
      const filtered = list.filter(m => m.id !== id)
      localStorage.setItem('doccraft:meta', JSON.stringify(filtered))
    }
    // コンテンツを削除（どのプレフィックスか不明なので全部試す）
    for (const prefix of ['doccraft:doc:', 'doccraft:slide:', 'doccraft:spreadsheet:', 'doccraft:design:']) {
      localStorage.removeItem(prefix + id)
    }
    return true
  } catch {
    return false
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  // ゲストモード: localStorageから削除
  if (isGuestMode()) return deleteDocumentLocal(id)

  try {
    const userId = await getUserId()
    if (!getSupabase() || !userId) return deleteDocumentLocal(id)

    const { error } = await getSupabase()!.from('documents').delete().eq('id', id).eq('user_id', userId)

    if (error) {
      handleError('deleteDocument', error)
      return deleteDocumentLocal(id)
    }

    return true
  } catch (error) {
    handleError('deleteDocument', error)
    return deleteDocumentLocal(id)
  }
}

// ─── Duplicate ───
function duplicateDocumentLocal(id: string): DocumentMeta | null {
  if (typeof window === 'undefined') return null
  try {
    // 元のドキュメントを探す
    for (const prefix of ['doccraft:doc:', 'doccraft:slide:', 'doccraft:spreadsheet:', 'doccraft:design:'] as const) {
      const raw = localStorage.getItem(prefix + id)
      if (raw) {
        const doc = JSON.parse(raw)
        const now = new Date().toISOString()
        const newId = generateId()
        const type: DocumentType = prefix.includes('slide') ? 'slides' : prefix.includes('spreadsheet') ? 'spreadsheet' : prefix.includes('design') ? 'design' : 'doc'
        const newMeta: DocumentMeta = {
          id: newId,
          title: (doc.meta?.title || '無題') + ' (コピー)',
          type,
          createdAt: now,
          updatedAt: now,
          thumbnailTheme: doc.meta?.thumbnailTheme || 'dark-blue',
        }
        // コンテンツを保存
        const { meta: _oldMeta, ...content } = doc
        localStorage.setItem(prefix + newId, JSON.stringify({ meta: newMeta, ...content }))
        // メタ一覧に追加
        const metaRaw = localStorage.getItem('doccraft:meta')
        const list: DocumentMeta[] = metaRaw ? JSON.parse(metaRaw) : []
        list.unshift(newMeta)
        localStorage.setItem('doccraft:meta', JSON.stringify(list))
        return newMeta
      }
    }
    return null
  } catch {
    return null
  }
}

export async function duplicateDocument(id: string): Promise<DocumentMeta | null> {
  // ゲストモード: localStorageで複製
  if (isGuestMode()) return duplicateDocumentLocal(id)

  try {
    const userId = await getUserId()
    if (!getSupabase() || !userId) return duplicateDocumentLocal(id)

    const { data, error } = await getSupabase()!
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !data) return duplicateDocumentLocal(id)

    const now = new Date().toISOString()
    const newId = generateId()
    const newTitle = data.title + ' (コピー)'

    const { error: insertError } = await getSupabase()!.from('documents').insert({
      id: newId,
      user_id: userId,
      type: data.type,
      title: newTitle,
      content: data.content,
      thumbnail_theme: data.thumbnail_theme,
      created_at: now,
      updated_at: now,
    })

    if (insertError) {
      handleError('duplicateDocument', insertError)
      return duplicateDocumentLocal(id)
    }

    return {
      id: newId,
      title: newTitle,
      type: data.type,
      createdAt: now,
      updatedAt: now,
      thumbnailTheme: data.thumbnail_theme,
    }
  } catch (error) {
    handleError('duplicateDocument', error)
    return duplicateDocumentLocal(id)
  }
}

// ─── Favorites (localStorage) ───
const FAVORITES_KEY = 'doccraft:favorites'

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
  } catch { return [] }
}

export function toggleFavorite(id: string): boolean {
  const favs = getFavorites()
  const idx = favs.indexOf(id)
  if (idx >= 0) {
    favs.splice(idx, 1)
  } else {
    favs.push(id)
  }
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
  } catch (e) {
    console.warn('[CloudStore] localStorage full — お気に入りを保存できませんでした')
    handleError('toggleFavorite:localStorage', e)
  }
  return idx < 0 // returns true if now favorited
}

// ─── Trash (localStorage with timestamps + auto-expiry) ───
const TRASH_KEY = 'doccraft:trash-ids'
const TRASH_MAP_KEY = 'doccraft:trash-map' // { [id]: deletedAt ISO string }
const TRASH_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Get trash map: { docId → deletedAt ISO string } */
function getTrashMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    // Migration: if old array format exists, convert to map format
    const oldRaw = localStorage.getItem(TRASH_KEY)
    if (oldRaw) {
      const oldIds: string[] = JSON.parse(oldRaw)
      if (Array.isArray(oldIds) && oldIds.length > 0) {
        const map: Record<string, string> = {}
        const now = new Date().toISOString()
        for (const id of oldIds) map[id] = now
        localStorage.setItem(TRASH_MAP_KEY, JSON.stringify(map))
        localStorage.removeItem(TRASH_KEY) // remove old format
        return map
      }
      localStorage.removeItem(TRASH_KEY)
    }
    const raw = localStorage.getItem(TRASH_MAP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveTrashMap(map: Record<string, string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TRASH_MAP_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn('[CloudStore] localStorage full — ゴミ箱データを保存できませんでした')
    handleError('saveTrashMap:localStorage', e)
  }
}

/**
 * Purge expired trash items (older than 24 hours).
 * Call this on dashboard load to clean up automatically.
 * Returns the IDs that were permanently deleted.
 */
export async function purgeExpiredTrash(): Promise<string[]> {
  const map = getTrashMap()
  const now = Date.now()
  const expiredIds: string[] = []

  for (const [id, deletedAt] of Object.entries(map)) {
    const elapsed = now - new Date(deletedAt).getTime()
    if (elapsed >= TRASH_EXPIRY_MS) {
      expiredIds.push(id)
    }
  }

  // Permanently delete expired items
  for (const id of expiredIds) {
    delete map[id]
    // Remove from favorites
    const favs = getFavorites().filter(f => f !== id)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
    // Delete actual document data
    await deleteDocument(id)
  }

  if (expiredIds.length > 0) {
    saveTrashMap(map)
  }

  return expiredIds
}

export function isInTrash(id: string): boolean {
  return id in getTrashMap()
}

export function getTrashIds(): string[] {
  return Object.keys(getTrashMap())
}

/** Get the time remaining (in ms) before a trashed item expires. Returns 0 if already expired. */
export function getTrashTimeRemaining(id: string): number {
  const map = getTrashMap()
  const deletedAt = map[id]
  if (!deletedAt) return 0
  const remaining = TRASH_EXPIRY_MS - (Date.now() - new Date(deletedAt).getTime())
  return Math.max(0, remaining)
}

/** Get the deletedAt timestamp for a trashed item */
export function getTrashDeletedAt(id: string): string | null {
  return getTrashMap()[id] || null
}

export function moveToTrash(id: string): void {
  if (typeof window === 'undefined') return
  const map = getTrashMap()
  if (!(id in map)) {
    map[id] = new Date().toISOString()
    saveTrashMap(map)
  }
}

export function restoreFromTrash(id: string): void {
  if (typeof window === 'undefined') return
  const map = getTrashMap()
  delete map[id]
  saveTrashMap(map)
}

export async function permanentlyDelete(id: string): Promise<boolean> {
  // Remove from trash tracking
  if (typeof window !== 'undefined') {
    const map = getTrashMap()
    delete map[id]
    saveTrashMap(map)
  }
  // Remove from favorites
  if (typeof window !== 'undefined') {
    const favs = getFavorites().filter(f => f !== id)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
  }
  // Delete from Supabase
  return deleteDocument(id)
}

// ─── Folders (localStorage) ───
const FOLDERS_KEY = 'doccraft:folders'
const FOLDER_MAP_KEY = 'doccraft:folder-map'

export function getFolders(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]')
  } catch { return [] }
}

export function saveFolders(folders: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
  } catch (e) {
    console.warn('[CloudStore] localStorage full — フォルダデータを保存できませんでした')
    handleError('saveFolders:localStorage', e)
  }
}

export function getFolderMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(FOLDER_MAP_KEY) || '{}')
  } catch { return {} }
}

export function setDocFolder(docId: string, folder: string | null): void {
  if (typeof window === 'undefined') return
  const map = getFolderMap()
  if (folder) {
    map[docId] = folder
  } else {
    delete map[docId]
  }
  try {
    localStorage.setItem(FOLDER_MAP_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn('[CloudStore] localStorage full — フォルダ割り当てを保存できませんでした')
    handleError('setDocFolder:localStorage', e)
  }
}

// ─── Full-text Content Search ───
function searchDocumentContentLocal(query: string): { id: string; matches: string[] }[] {
  if (typeof window === 'undefined' || !query.trim()) return []
  const q = query.toLowerCase()
  const results: { id: string; matches: string[] }[] = []
  const metaRaw = localStorage.getItem('doccraft:meta')
  if (!metaRaw) return []
  try {
    const list: DocumentMeta[] = JSON.parse(metaRaw)
    for (const meta of list) {
      const prefix = meta.type === 'slides' ? 'doccraft:slide:' : meta.type === 'spreadsheet' ? 'doccraft:spreadsheet:' : meta.type === 'design' ? 'doccraft:design:' : 'doccraft:doc:'
      const raw = localStorage.getItem(prefix + meta.id)
      if (!raw) continue
      const doc = JSON.parse(raw)
      const matches: string[] = []
      if (meta.type === 'doc' && doc.blocks) {
        for (const block of doc.blocks) {
          if (block.content && block.content.toLowerCase().includes(q)) {
            matches.push(block.content.slice(0, 50))
          }
        }
      }
      if (matches.length > 0) results.push({ id: meta.id, matches: matches.slice(0, 3) })
    }
  } catch { /* ignore */ }
  return results
}

export async function searchDocumentContent(query: string): Promise<{ id: string; matches: string[] }[]> {
  // ゲストモード: localStorageを検索
  if (isGuestMode()) return searchDocumentContentLocal(query)

  const userId = await getUserId()
  if (!getSupabase() || !userId || !query.trim()) return searchDocumentContentLocal(query)

  const q = query.toLowerCase()
  const results: { id: string; matches: string[] }[] = []

  try {
    const { data, error } = await getSupabase()!
      .from('documents')
      .select('id, type, content')
      .eq('user_id', userId)

    if (error || !data) return searchDocumentContentLocal(query)

    for (const row of data) {
    const matches: string[] = []

    if (row.type === 'doc') {
      try {
        const doc = row.content as Record<string, unknown>
        for (const block of (doc.blocks as Array<{ content?: string }>) || []) {
          if (block.content && block.content.toLowerCase().includes(q)) {
            const idx = block.content.toLowerCase().indexOf(q)
            const start = Math.max(0, idx - 20)
            const end = Math.min(block.content.length, idx + query.length + 20)
            matches.push((start > 0 ? '...' : '') + block.content.slice(start, end) + (end < block.content.length ? '...' : ''))
          }
        }
      } catch { /* ignore */ }
    }

    if (row.type === 'slides') {
      try {
        const doc = row.content as Record<string, unknown>
        for (const slide of (doc.slides as Array<{ elements?: Array<{ content?: string }> }>) || []) {
          for (const el of slide.elements || []) {
            if (el.content && el.content.toLowerCase().includes(q)) {
              const idx = el.content.toLowerCase().indexOf(q)
              const start = Math.max(0, idx - 20)
              const end = Math.min(el.content.length, idx + query.length + 20)
              matches.push((start > 0 ? '...' : '') + el.content.slice(start, end) + (end < el.content.length ? '...' : ''))
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (row.type === 'spreadsheet') {
      try {
        const doc = row.content as Record<string, unknown>
        for (const sheet of (doc.sheets as Array<{ cells?: Record<string, { value?: string }> }>) || []) {
          for (const [, cell] of Object.entries(sheet.cells || {})) {
            if (cell.value && String(cell.value).toLowerCase().includes(q)) {
              matches.push(String(cell.value).slice(0, 50))
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (row.type === 'design') {
      try {
        const doc = row.content as Record<string, unknown>
        const canvas = doc.canvas as { elements?: Array<{ content?: string; textContent?: string }> }
        for (const el of canvas?.elements || []) {
          const text = el.content || el.textContent || ''
          if (text.toLowerCase().includes(q)) {
            matches.push(text.slice(0, 50))
          }
        }
      } catch { /* ignore */ }
    }

    if (matches.length > 0) {
      results.push({ id: row.id, matches: matches.slice(0, 3) })
    }
  }

    return results
  } catch {
    return searchDocumentContentLocal(query)
  }
}

// ─── Tags (localStorage) ───
const TAGS_KEY = 'doccraft:tags'
const DOC_TAGS_KEY = 'doccraft:doctags'

export function getAllTags(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]') } catch { return [] }
}

export function saveAllTags(tags: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(TAGS_KEY, JSON.stringify([...new Set(tags)]))
  } catch (e) {
    console.warn('[CloudStore] localStorage full — タグデータを保存できませんでした')
    handleError('saveAllTags:localStorage', e)
  }
}

export function getDocTags(docId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    const map = JSON.parse(localStorage.getItem(DOC_TAGS_KEY) || '{}')
    return map[docId] || []
  } catch { return [] }
}

export function setDocTags(docId: string, tags: string[]): void {
  if (typeof window === 'undefined') return
  try {
    const map = JSON.parse(localStorage.getItem(DOC_TAGS_KEY) || '{}')
    map[docId] = tags
    localStorage.setItem(DOC_TAGS_KEY, JSON.stringify(map))
    const all = getAllTags()
    tags.forEach(t => { if (!all.includes(t)) all.push(t) })
    saveAllTags(all)
  } catch { /* ignore */ }
}

export function getAllDocTags(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(DOC_TAGS_KEY) || '{}')
  } catch { return {} }
}

// ─── REST API Documentation & Helpers ───

/**
 * Planned REST API endpoints:
 *
 * GET    /api/documents      - List documents (returns DocumentMeta[])
 * POST   /api/documents      - Create document (body: { type, title })
 * GET    /api/documents/:id  - Get document (returns full document with content)
 * PUT    /api/documents/:id  - Update document (body: partial document data)
 * DELETE /api/documents/:id  - Delete document
 */

const LOCAL_DOCS_KEY = 'doccraft:local-documents'

/**
 * Read all documents stored in localStorage and return a summary list.
 * Each entry contains { id, title, type, updatedAt }.
 */
export function getDocumentList(): { id: string; title: string; type: DocumentType; updatedAt: string }[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_KEY)
    if (!raw) return []
    const docs: Array<{ id: string; title: string; type: DocumentType; updatedAt: string }> = JSON.parse(raw)
    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      updatedAt: d.updatedAt,
    }))
  } catch {
    return []
  }
}

/**
 * Generate a mock JSON API response for a given document ID.
 * Simulates what a REST GET /api/documents/:id would return.
 */
export function generateAPIResponse(docId: string): {
  status: number
  data: { id: string; title: string; type: string; updatedAt: string; content: unknown } | null
  error: string | null
} {
  if (typeof window === 'undefined') {
    return { status: 500, data: null, error: 'Server-side rendering — no localStorage available' }
  }
  try {
    const raw = localStorage.getItem(LOCAL_DOCS_KEY)
    if (!raw) {
      return { status: 404, data: null, error: 'Document not found' }
    }
    const docs: Array<{ id: string; title: string; type: string; updatedAt: string; content?: unknown }> =
      JSON.parse(raw)
    const doc = docs.find((d) => d.id === docId)
    if (!doc) {
      return { status: 404, data: null, error: 'Document not found' }
    }
    return {
      status: 200,
      data: {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        updatedAt: doc.updatedAt,
        content: doc.content ?? null,
      },
      error: null,
    }
  } catch {
    return { status: 500, data: null, error: 'Internal server error' }
  }
}

/**
 * Return the URL path for a document based on its id and type.
 * E.g. getDocumentLink('abc123', 'spreadsheet') => '/spreadsheets/abc123'
 */
export function getDocumentLink(id: string, type: DocumentType): string {
  switch (type) {
    case 'spreadsheet':
      return `/spreadsheets/${id}`
    case 'slides':
      return `/slides/${id}`
    case 'design':
      return `/designs/${id}`
    case 'doc':
      return `/docs/${id}`
    default:
      return `/documents/${id}`
  }
}
