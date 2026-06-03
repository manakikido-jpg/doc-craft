import type {
  DocumentMeta,
  DocumentType,
  DocDocument,
  SlidesDocument,
  SpreadsheetDocument,
  Sheet,
  Block,
  BlockType,
} from '@/types'
import { generateId } from '../utils'
import { SLIDE_TEMPLATES } from '../templates/slide-templates'

const META_KEY = 'doccraft:meta'
const SLIDE_PREFIX = 'doccraft:slide:'
const DOC_PREFIX = 'doccraft:doc:'
const SPREADSHEET_PREFIX = 'doccraft:spreadsheet:'

function isBrowser() {
  return typeof window !== 'undefined'
}

export function listDocuments(): DocumentMeta[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as DocumentMeta[]
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } catch {
    return []
  }
}

/** Deep clone via JSON round-trip (safe for serializable data) */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/** Safe localStorage.setItem with QuotaExceededError handling */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error(`[DocCraft] localStorage quota exceeded for key: ${key} (${(value.length / 1024).toFixed(1)} KB)`)
      return false
    }
    throw e
  }
}

function saveMeta(meta: DocumentMeta) {
  const list = listDocuments()
  const idx = list.findIndex((m) => m.id === meta.id)
  if (idx >= 0) list[idx] = meta
  else list.unshift(meta)
  safeSetItem(META_KEY, JSON.stringify(list))
}

function deleteMeta(id: string) {
  const list = listDocuments().filter((m) => m.id !== id)
  localStorage.setItem(META_KEY, JSON.stringify(list))
}

export function createDocument(type: DocumentType, title?: string): DocumentMeta {
  const now = new Date().toISOString()
  const defaultTitle =
    type === 'slides'
      ? '無題のプレゼンテーション'
      : type === 'spreadsheet'
        ? '無題のスプレッドシート'
        : '無題のドキュメント'
  const meta: DocumentMeta = {
    id: generateId(),
    title: title || defaultTitle,
    type,
    createdAt: now,
    updatedAt: now,
    thumbnailTheme: 'dark-blue',
  }
  saveMeta(meta)

  if (type === 'slides') {
    const firstSlide = SLIDE_TEMPLATES[0].buildSlide('dark-blue')
    const doc: SlidesDocument = {
      meta,
      slides: [firstSlide],
      activeSlideId: firstSlide.id,
    }
    safeSetItem(SLIDE_PREFIX + meta.id, JSON.stringify(doc))
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
      colCount: 52,
    }
    const doc: SpreadsheetDocument = {
      meta,
      sheets: [defaultSheet],
      activeSheetId: sheetId,
    }
    safeSetItem(SPREADSHEET_PREFIX + meta.id, JSON.stringify(doc))
  } else {
    const firstBlock: Block = { id: generateId(), type: 'h1' as BlockType, content: title || 'ドキュメントタイトル' }
    const doc: DocDocument = {
      meta,
      blocks: [firstBlock, { id: generateId(), type: 'paragraph', content: '' }],
    }
    safeSetItem(DOC_PREFIX + meta.id, JSON.stringify(doc))
  }

  return meta
}

export function getSlideDoc(id: string): SlidesDocument | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(SLIDE_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSlideDoc(doc: SlidesDocument) {
  if (!isBrowser()) return
  const updatedMeta = { ...doc.meta, updatedAt: new Date().toISOString() }
  const updated = { ...doc, meta: updatedMeta }
  localStorage.setItem(SLIDE_PREFIX + updated.meta.id, JSON.stringify(updated))
  saveMeta(updatedMeta)
}

export function getDocDoc(id: string): DocDocument | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(DOC_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDocDoc(doc: DocDocument) {
  if (!isBrowser()) return
  const updatedMeta = { ...doc.meta, updatedAt: new Date().toISOString() }
  const updated = { ...doc, meta: updatedMeta }
  localStorage.setItem(DOC_PREFIX + updated.meta.id, JSON.stringify(updated))
  saveMeta(updatedMeta)
}

export function getSpreadsheetDoc(id: string): SpreadsheetDocument | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(SPREADSHEET_PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSpreadsheetDoc(doc: SpreadsheetDocument) {
  if (!isBrowser()) return
  const updatedMeta = { ...doc.meta, updatedAt: new Date().toISOString() }
  const updated = { ...doc, meta: updatedMeta }
  localStorage.setItem(SPREADSHEET_PREFIX + updated.meta.id, JSON.stringify(updated))
  saveMeta(updatedMeta)
}

export function deleteDocument(id: string) {
  if (!isBrowser()) return
  deleteMeta(id)
  localStorage.removeItem(SLIDE_PREFIX + id)
  localStorage.removeItem(DOC_PREFIX + id)
  localStorage.removeItem(SPREADSHEET_PREFIX + id)
}

export function duplicateDocument(id: string): DocumentMeta | null {
  if (!isBrowser()) return null
  const metas = listDocuments()
  const meta = metas.find((m) => m.id === id)
  if (!meta) return null

  const now = new Date().toISOString()
  const newMeta: DocumentMeta = {
    ...meta,
    id: generateId(),
    title: meta.title + ' (コピー)',
    createdAt: now,
    updatedAt: now,
  }
  saveMeta(newMeta)

  if (meta.type === 'slides') {
    const doc = getSlideDoc(id)
    if (doc) {
      const newDoc: SlidesDocument = deepClone(doc)
      newDoc.meta = newMeta
      safeSetItem(SLIDE_PREFIX + newMeta.id, JSON.stringify(newDoc))
    }
  } else if (meta.type === 'spreadsheet') {
    const doc = getSpreadsheetDoc(id)
    if (doc) {
      const newDoc: SpreadsheetDocument = deepClone(doc)
      newDoc.meta = newMeta
      safeSetItem(SPREADSHEET_PREFIX + newMeta.id, JSON.stringify(newDoc))
    }
  } else {
    const doc = getDocDoc(id)
    if (doc) {
      const newDoc: DocDocument = deepClone(doc)
      newDoc.meta = newMeta
      safeSetItem(DOC_PREFIX + newMeta.id, JSON.stringify(newDoc))
    }
  }

  return newMeta
}
