import type { DocumentMeta, DocumentType, DocDocument, SlidesDocument, SpreadsheetDocument, Sheet, Block, BlockType } from '@/types'
import { generateId } from './utils'
import { SLIDE_TEMPLATES } from './templates'
import { createClient } from '@/lib/supabase/client'

// ─── Supabase クラウドストア ───
// テーブル: documents (id, user_id, type, title, content, created_at, updated_at)
// content カラムに JSONB でドキュメント全体を保存

const supabase = typeof window !== 'undefined' ? createClient() : null

async function getUserId(): Promise<string | null> {
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ─── List ───
export async function listDocuments(): Promise<DocumentMeta[]> {
  const userId = await getUserId()
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('documents')
    .select('id, type, title, created_at, updated_at, thumbnail_theme')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[CloudStore] listDocuments error:', error)
    return []
  }

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as DocumentType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailTheme: row.thumbnail_theme,
  }))
}

// ─── Create ───
export async function createDocument(type: DocumentType, title: string): Promise<DocumentMeta | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null

  const now = new Date().toISOString()
  const defaultTitle =
    type === 'slides' ? '無題のプレゼンテーション' : type === 'spreadsheet' ? '無題のスプレッドシート' : '無題のドキュメント'

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
  } else {
    const firstBlock: Block = { id: generateId(), type: 'h1' as BlockType, content: docTitle }
    content = {
      blocks: [firstBlock, { id: generateId(), type: 'paragraph', content: '' }],
    }
  }

  const { error } = await supabase.from('documents').insert({
    id: docId,
    user_id: userId,
    type,
    title: docTitle,
    content,
    thumbnail_theme: 'dark-blue',
    created_at: now,
    updated_at: now,
  })

  if (error) {
    console.error('[CloudStore] createDocument error:', error)
    return null
  }

  return {
    id: docId,
    title: docTitle,
    type,
    createdAt: now,
    updatedAt: now,
    thumbnailTheme: 'dark-blue',
  }
}

// ─── Get ───
export async function getDocument<T extends SlidesDocument | DocDocument | SpreadsheetDocument>(
  id: string,
  type: DocumentType,
): Promise<T | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  const meta: DocumentMeta = {
    id: data.id,
    title: data.title,
    type: data.type,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    thumbnailTheme: data.thumbnail_theme,
  }

  return { meta, ...data.content } as T
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

// ─── Save ───
export async function saveDocument(
  doc: SlidesDocument | DocDocument | SpreadsheetDocument,
): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId) return false

  const now = new Date().toISOString()
  const { meta, ...content } = doc

  const { error } = await supabase
    .from('documents')
    .update({
      title: meta.title,
      content,
      thumbnail_theme: meta.thumbnailTheme,
      updated_at: now,
    })
    .eq('id', meta.id)
    .eq('user_id', userId)

  if (error) {
    console.error('[CloudStore] saveDocument error:', error)
    return false
  }

  return true
}

export async function saveSlideDoc(doc: SlidesDocument): Promise<boolean> {
  return saveDocument(doc)
}

export async function saveDocDoc(doc: DocDocument): Promise<boolean> {
  return saveDocument(doc)
}

export async function saveSpreadsheetDoc(doc: SpreadsheetDocument): Promise<boolean> {
  return saveDocument(doc)
}

// ─── Delete ───
export async function deleteDocument(id: string): Promise<boolean> {
  const userId = await getUserId()
  if (!supabase || !userId) return false

  const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', userId)

  if (error) {
    console.error('[CloudStore] deleteDocument error:', error)
    return false
  }

  return true
}

// ─── Duplicate ───
export async function duplicateDocument(id: string): Promise<DocumentMeta | null> {
  const userId = await getUserId()
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  const now = new Date().toISOString()
  const newId = generateId()
  const newTitle = data.title + ' (コピー)'

  const { error: insertError } = await supabase.from('documents').insert({
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
    console.error('[CloudStore] duplicateDocument error:', insertError)
    return null
  }

  return {
    id: newId,
    title: newTitle,
    type: data.type,
    createdAt: now,
    updatedAt: now,
    thumbnailTheme: data.thumbnail_theme,
  }
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
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
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
  localStorage.setItem(FOLDER_MAP_KEY, JSON.stringify(map))
}
