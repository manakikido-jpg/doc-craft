import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key]
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k])
  }),
  get length() {
    return Object.keys(store).length
  },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// Must import after mock is set up
import { createDocument, listDocuments, deleteDocument, getSpreadsheetDoc, saveSpreadsheetDoc } from './document-store'

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('createDocument', () => {
  it('creates a slides document', () => {
    const meta = createDocument('slides', 'Test Slides')
    expect(meta.type).toBe('slides')
    expect(meta.title).toBe('Test Slides')
    expect(meta.id).toBeTruthy()
    expect(meta.createdAt).toBeTruthy()
  })

  it('creates a doc document', () => {
    const meta = createDocument('doc', 'Test Doc')
    expect(meta.type).toBe('doc')
    expect(meta.title).toBe('Test Doc')
  })

  it('creates a spreadsheet document', () => {
    const meta = createDocument('spreadsheet', 'Test Sheet')
    expect(meta.type).toBe('spreadsheet')
    expect(meta.title).toBe('Test Sheet')
  })

  it('uses default title for spreadsheet', () => {
    const meta = createDocument('spreadsheet')
    expect(meta.title).toBe('無題のスプレッドシート')
  })

  it('uses default title for slides', () => {
    const meta = createDocument('slides')
    expect(meta.title).toBe('無題のプレゼンテーション')
  })

  it('uses default title for doc', () => {
    const meta = createDocument('doc')
    expect(meta.title).toBe('無題のドキュメント')
  })

  it('stores document metadata in localStorage', () => {
    createDocument('slides', 'My Slides')
    const docs = listDocuments()
    expect(docs.length).toBe(1)
    expect(docs[0].title).toBe('My Slides')
  })
})

describe('listDocuments', () => {
  it('returns empty array when no documents', () => {
    expect(listDocuments()).toEqual([])
  })

  it('returns all created documents', () => {
    createDocument('slides', 'Slides 1')
    createDocument('doc', 'Doc 1')
    createDocument('spreadsheet', 'Sheet 1')
    const docs = listDocuments()
    expect(docs.length).toBe(3)
  })
})

describe('deleteDocument', () => {
  it('removes document from list', () => {
    const meta = createDocument('slides', 'To Delete')
    expect(listDocuments().length).toBe(1)
    deleteDocument(meta.id)
    expect(listDocuments().length).toBe(0)
  })
})

describe('spreadsheet get/save', () => {
  it('saves and retrieves spreadsheet', () => {
    const meta = createDocument('spreadsheet', 'My Sheet')
    const doc = getSpreadsheetDoc(meta.id)
    expect(doc).not.toBeNull()
    expect(doc!.meta.title).toBe('My Sheet')
    expect(doc!.sheets.length).toBeGreaterThan(0)
    expect(doc!.activeSheetId).toBeTruthy()
  })

  it('returns null for non-existent id', () => {
    expect(getSpreadsheetDoc('nonexistent')).toBeNull()
  })

  it('persists changes after save', () => {
    const meta = createDocument('spreadsheet', 'My Sheet')
    const doc = getSpreadsheetDoc(meta.id)!
    doc.meta.title = 'Updated Title'
    saveSpreadsheetDoc(doc)

    const loaded = getSpreadsheetDoc(meta.id)!
    expect(loaded.meta.title).toBe('Updated Title')
  })
})
