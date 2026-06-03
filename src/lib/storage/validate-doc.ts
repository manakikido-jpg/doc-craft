/**
 * Lightweight document validation / normalization layer.
 *
 * Storage may hand back corrupt, partial, or legacy-shaped documents (bad JSON
 * roundtrips, interrupted writes, hand-edited blobs, schema drift). The editors
 * assume well-formed shapes and will white-screen with "cannot read property of
 * undefined" the moment a required array or nested object is missing.
 *
 * These normalizers coerce an `unknown` value into a USABLE (possibly empty)
 * document, or return `null` when the input is too broken to recover. They are
 * intentionally defensive, dependency-free (no zod), and NEVER throw.
 */

import type {
  DesignDocument,
  SlidesDocument,
  DocDocument,
  SpreadsheetDocument,
  DocumentMeta,
  DocumentType,
  DesignCanvasSize,
  Slide,
} from '@/types'

/** Narrow an unknown value to a plain (non-null, non-array) object. */
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

const VALID_DOC_TYPES: DocumentType[] = ['slides', 'doc', 'spreadsheet', 'design']

/** A sensible default canvas size used when a design doc has none. */
const DEFAULT_CANVAS_SIZE: DesignCanvasSize = {
  width: 1080,
  height: 1080,
  preset: 'instagram-post',
  label: 'Instagram Post',
}

function nowISO(): string {
  try {
    return new Date().toISOString()
  } catch {
    return ''
  }
}

/**
 * Ensure a usable DocumentMeta. Returns a repaired meta, or `null` only when
 * `fallbackType` cannot establish a type (it always can, so this never returns
 * null in practice — kept defensive).
 */
function normalizeMeta(raw: unknown, fallbackType: DocumentType): DocumentMeta {
  const src = isPlainObject(raw) ? raw : {}

  const id = isNonEmptyString(src.id) ? src.id : genId()
  const title = isNonEmptyString(src.title) ? src.title : '無題'
  const type =
    typeof src.type === 'string' && (VALID_DOC_TYPES as string[]).includes(src.type)
      ? (src.type as DocumentType)
      : fallbackType
  const createdAt = isNonEmptyString(src.createdAt) ? src.createdAt : nowISO()
  const updatedAt = isNonEmptyString(src.updatedAt) ? src.updatedAt : createdAt

  const meta: DocumentMeta = { id, title, type, createdAt, updatedAt }

  if (isNonEmptyString(src.thumbnailTheme)) meta.thumbnailTheme = src.thumbnailTheme
  if (isNonEmptyString(src.folder)) meta.folder = src.folder

  return meta
}

function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* fall through */
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Keep only array entries that are plain objects carrying a non-empty `id`. */
function filterObjectsWithId(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is Record<string, unknown> => isPlainObject(e) && isNonEmptyString(e.id),
  )
}

// ── Design ──────────────────────────────────────────────────────────────────

function normalizeCanvasSize(raw: unknown): DesignCanvasSize {
  if (!isPlainObject(raw)) return { ...DEFAULT_CANVAS_SIZE }
  const width = isFiniteNumber(raw.width) && raw.width > 0 ? raw.width : DEFAULT_CANVAS_SIZE.width
  const height =
    isFiniteNumber(raw.height) && raw.height > 0 ? raw.height : DEFAULT_CANVAS_SIZE.height
  const preset = isNonEmptyString(raw.preset)
    ? (raw.preset as DesignCanvasSize['preset'])
    : DEFAULT_CANVAS_SIZE.preset
  const label = isNonEmptyString(raw.label) ? raw.label : DEFAULT_CANVAS_SIZE.label
  return { width, height, preset, label }
}

/**
 * Repair the `canvas` (a Slide) of a design document. We preserve every known
 * field if present but guarantee `id`, `themeKey`, and an `elements` array of
 * valid (object-with-id) elements.
 */
function normalizeCanvasSlide(raw: unknown): Slide {
  const src = isPlainObject(raw) ? raw : {}
  const elements = filterObjectsWithId(src.elements)
  const id = isNonEmptyString(src.id) ? src.id : genId()
  const themeKey = isNonEmptyString(src.themeKey)
    ? (src.themeKey as Slide['themeKey'])
    : 'white-clean'

  // Preserve any other slide fields verbatim, then override the guaranteed ones.
  return {
    ...(src as object),
    id,
    themeKey,
    elements: elements as unknown as Slide['elements'],
  } as Slide
}

export function normalizeDesignDoc(raw: unknown): DesignDocument | null {
  try {
    if (!isPlainObject(raw)) return null

    const meta = normalizeMeta(raw.meta, 'design')
    const canvas = normalizeCanvasSlide(raw.canvas)
    const canvasSize = normalizeCanvasSize(raw.canvasSize)

    const doc: DesignDocument = { meta, canvas, canvasSize }

    if (Array.isArray(raw.comments)) doc.comments = raw.comments as DesignDocument['comments']
    if (Array.isArray(raw.versions)) doc.versions = raw.versions as DesignDocument['versions']

    return doc
  } catch {
    return null
  }
}

// ── Slides ──────────────────────────────────────────────────────────────────

export function normalizeSlidesDoc(raw: unknown): SlidesDocument | null {
  try {
    if (!isPlainObject(raw)) return null

    const meta = normalizeMeta(raw.meta, 'slides')

    // Each slide must be an object with an id; repair its `elements` array.
    const slides = filterObjectsWithId(raw.slides).map((s) => ({
      ...s,
      themeKey: isNonEmptyString(s.themeKey) ? s.themeKey : 'white-clean',
      elements: filterObjectsWithId(s.elements),
    })) as unknown as SlidesDocument['slides']

    // activeSlideId must reference a surviving slide — a dangling id (e.g. its
    // slide was dropped as malformed) would crash the editor on lookup.
    const slideExists = isNonEmptyString(raw.activeSlideId) && slides.some((s) => (s as { id: string }).id === raw.activeSlideId)
    const activeSlideId = slideExists ? (raw.activeSlideId as string) : (slides[0] as { id?: string } | undefined)?.id ?? ''

    const doc: SlidesDocument = { meta, slides, activeSlideId }

    if (Array.isArray(raw.comments)) doc.comments = raw.comments as SlidesDocument['comments']
    if (Array.isArray(raw.versions)) doc.versions = raw.versions as SlidesDocument['versions']
    if (Array.isArray(raw.masters)) doc.masters = raw.masters as SlidesDocument['masters']
    if (isPlainObject(raw.globalFooter))
      doc.globalFooter = raw.globalFooter as unknown as SlidesDocument['globalFooter']
    if (isPlainObject(raw.slideSize))
      doc.slideSize = raw.slideSize as unknown as SlidesDocument['slideSize']
    if (Array.isArray(raw.sections)) doc.sections = raw.sections as SlidesDocument['sections']
    if (isPlainObject(raw.outlineCollapsed))
      doc.outlineCollapsed = raw.outlineCollapsed as unknown as SlidesDocument['outlineCollapsed']

    return doc
  } catch {
    return null
  }
}

// ── Doc ─────────────────────────────────────────────────────────────────────

export function normalizeDocDoc(raw: unknown): DocDocument | null {
  try {
    if (!isPlainObject(raw)) return null

    const meta = normalizeMeta(raw.meta, 'doc')

    // Blocks must be objects with an id and a string `type`; drop the rest.
    const blocks = filterObjectsWithId(raw.blocks).filter((b) =>
      isNonEmptyString(b.type),
    ) as unknown as DocDocument['blocks']

    const doc: DocDocument = { meta, blocks }

    if (Array.isArray(raw.comments)) doc.comments = raw.comments as DocDocument['comments']
    if (Array.isArray(raw.versions)) doc.versions = raw.versions as DocDocument['versions']
    if (isPlainObject(raw.pageSettings))
      doc.pageSettings = raw.pageSettings as unknown as DocDocument['pageSettings']
    if (isPlainObject(raw.headerFooter))
      doc.headerFooter = raw.headerFooter as unknown as DocDocument['headerFooter']
    if (isPlainObject(raw.watermark))
      doc.watermark = raw.watermark as unknown as DocDocument['watermark']
    if (Array.isArray(raw.bookmarks)) doc.bookmarks = raw.bookmarks as DocDocument['bookmarks']
    if (Array.isArray(raw.trackChanges))
      doc.trackChanges = raw.trackChanges as DocDocument['trackChanges']
    if (typeof raw.trackChangesEnabled === 'boolean')
      doc.trackChangesEnabled = raw.trackChangesEnabled
    if (raw.footnotePosition === 'page' || raw.footnotePosition === 'end')
      doc.footnotePosition = raw.footnotePosition
    if (isPlainObject(raw.pageBorder))
      doc.pageBorder = raw.pageBorder as unknown as DocDocument['pageBorder']

    return doc
  } catch {
    return null
  }
}

// ── Spreadsheet ───────────────────────────────────────────────────────────────

export function normalizeSpreadsheetDoc(raw: unknown): SpreadsheetDocument | null {
  try {
    if (!isPlainObject(raw)) return null

    const meta = normalizeMeta(raw.meta, 'spreadsheet')

    // Each sheet must be an object with an id; guarantee the container shapes the
    // editor reads (cells/colWidths/rowHeights/mergedCells and counts).
    const sheets = filterObjectsWithId(raw.sheets).map((s) => ({
      ...s,
      name: isNonEmptyString(s.name) ? s.name : 'Sheet',
      cells: isPlainObject(s.cells) ? s.cells : {},
      colWidths: isPlainObject(s.colWidths) ? s.colWidths : {},
      rowHeights: isPlainObject(s.rowHeights) ? s.rowHeights : {},
      mergedCells: Array.isArray(s.mergedCells) ? s.mergedCells : [],
      rowCount: isFiniteNumber(s.rowCount) && s.rowCount > 0 ? s.rowCount : 100,
      colCount: isFiniteNumber(s.colCount) && s.colCount > 0 ? s.colCount : 26,
    })) as unknown as SpreadsheetDocument['sheets']

    // activeSheetId must reference a surviving sheet to avoid a crash on lookup.
    const sheetExists = isNonEmptyString(raw.activeSheetId) && sheets.some((s) => (s as { id: string }).id === raw.activeSheetId)
    const activeSheetId = sheetExists ? (raw.activeSheetId as string) : (sheets[0] as { id?: string } | undefined)?.id ?? ''

    const out: SpreadsheetDocument = { meta, sheets, activeSheetId }
    // Preserve persisted charts (drop malformed entries lacking an id/range).
    if (Array.isArray(raw.charts)) {
      out.charts = (raw.charts as unknown[]).filter(
        (c) => isPlainObject(c) && isNonEmptyString((c as { id?: unknown }).id) && isPlainObject((c as { range?: unknown }).range),
      ) as SpreadsheetDocument['charts']
    }
    return out
  } catch {
    return null
  }
}
