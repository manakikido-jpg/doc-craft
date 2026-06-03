import { describe, it, expect } from 'vitest'
import {
  isPlainObject,
  normalizeDesignDoc,
  normalizeSlidesDoc,
  normalizeDocDoc,
  normalizeSpreadsheetDoc,
} from './validate-doc'
import type {
  DesignDocument,
  SlidesDocument,
  DocDocument,
  SpreadsheetDocument,
} from '@/types'

const BAD_INPUTS: unknown[] = [null, undefined, 'a string', 42, 0, true, false, [], [1, 2, 3]]

describe('isPlainObject', () => {
  it('accepts plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
  })
  it('rejects null, arrays, and primitives', () => {
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject(undefined)).toBe(false)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject('x')).toBe(false)
    expect(isPlainObject(5)).toBe(false)
  })
})

describe('normalizeDesignDoc', () => {
  it('returns null for non-object inputs and never throws', () => {
    for (const input of BAD_INPUTS) {
      expect(() => normalizeDesignDoc(input)).not.toThrow()
      expect(normalizeDesignDoc(input)).toBeNull()
    }
  })

  it('repairs a missing meta', () => {
    const doc = normalizeDesignDoc({ canvas: { id: 'c', elements: [] } })
    expect(doc).not.toBeNull()
    expect(doc!.meta).toBeTruthy()
    expect(typeof doc!.meta.id).toBe('string')
    expect(doc!.meta.id.length).toBeGreaterThan(0)
    expect(doc!.meta.type).toBe('design')
    expect(typeof doc!.meta.title).toBe('string')
  })

  it('defaults canvas.elements to [] when missing', () => {
    const doc = normalizeDesignDoc({ meta: { id: 'm', title: 't', type: 'design' }, canvas: {} })
    expect(doc).not.toBeNull()
    expect(Array.isArray(doc!.canvas.elements)).toBe(true)
    expect(doc!.canvas.elements).toHaveLength(0)
  })

  it('defaults canvas.elements to [] when canvas itself is missing', () => {
    const doc = normalizeDesignDoc({ meta: { id: 'm', title: 't', type: 'design' } })
    expect(doc).not.toBeNull()
    expect(Array.isArray(doc!.canvas.elements)).toBe(true)
  })

  it('filters out non-object and missing-id elements', () => {
    const doc = normalizeDesignDoc({
      meta: { id: 'm', title: 't', type: 'design' },
      canvas: {
        id: 'c',
        elements: [
          { id: 'keep-1', type: 'shape' },
          null,
          'bad',
          42,
          { type: 'no-id' }, // missing id -> dropped
          { id: 'keep-2', type: 'title' },
        ],
      },
    })
    expect(doc).not.toBeNull()
    expect(doc!.canvas.elements).toHaveLength(2)
    expect(doc!.canvas.elements.map((e) => e.id)).toEqual(['keep-1', 'keep-2'])
  })

  it('defaults canvasSize to Instagram 1080x1080 when missing', () => {
    const doc = normalizeDesignDoc({ meta: { id: 'm', title: 't', type: 'design' }, canvas: {} })
    expect(doc!.canvasSize).toEqual({
      width: 1080,
      height: 1080,
      preset: 'instagram-post',
      label: 'Instagram Post',
    })
  })

  it('repairs a partial canvasSize', () => {
    const doc = normalizeDesignDoc({
      meta: { id: 'm', title: 't', type: 'design' },
      canvas: {},
      canvasSize: { width: 800 },
    })
    expect(doc!.canvasSize.width).toBe(800)
    expect(doc!.canvasSize.height).toBe(1080)
    expect(doc!.canvasSize.preset).toBe('instagram-post')
    expect(typeof doc!.canvasSize.label).toBe('string')
  })

  it('passes a fully-valid design doc through unchanged (deep equal)', () => {
    const valid: DesignDocument = {
      meta: {
        id: 'doc-1',
        title: 'My Design',
        type: 'design',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
      canvas: {
        id: 'canvas-1',
        themeKey: 'white-clean',
        elements: [
          {
            id: 'el-1',
            type: 'title',
            x: 0,
            y: 0,
            w: 100,
            h: 50,
            content: 'Hello',
            fontSize: 24,
            fontWeight: '700',
            align: 'left',
          },
        ],
      },
      canvasSize: { width: 1080, height: 1080, preset: 'instagram-post', label: 'Instagram Post' },
    }
    const out = normalizeDesignDoc(structuredClone(valid))
    expect(out).toEqual(valid)
  })
})

describe('normalizeSlidesDoc', () => {
  it('returns null for non-object inputs and never throws', () => {
    for (const input of BAD_INPUTS) {
      expect(() => normalizeSlidesDoc(input)).not.toThrow()
      expect(normalizeSlidesDoc(input)).toBeNull()
    }
  })

  it('ensures slides[] exists when missing', () => {
    const doc = normalizeSlidesDoc({ meta: { id: 'm', title: 't', type: 'slides' } })
    expect(doc).not.toBeNull()
    expect(Array.isArray(doc!.slides)).toBe(true)
    expect(doc!.slides).toHaveLength(0)
    expect(doc!.activeSlideId).toBe('')
  })

  it('drops malformed slides and repairs slide elements', () => {
    const doc = normalizeSlidesDoc({
      meta: { id: 'm', title: 't', type: 'slides' },
      slides: [
        { id: 's1', themeKey: 'emerald', elements: [{ id: 'e1' }, null, { noId: true }] },
        null,
        'bad',
        { noId: true },
      ],
    })
    expect(doc!.slides).toHaveLength(1)
    expect(doc!.slides[0].id).toBe('s1')
    expect(doc!.slides[0].elements).toHaveLength(1)
  })

  it('derives activeSlideId from first slide when absent', () => {
    const doc = normalizeSlidesDoc({
      meta: { id: 'm', title: 't', type: 'slides' },
      slides: [{ id: 's-first', elements: [] }],
    })
    expect(doc!.activeSlideId).toBe('s-first')
  })

  it('passes a fully-valid slides doc through unchanged (deep equal)', () => {
    const valid: SlidesDocument = {
      meta: {
        id: 'd',
        title: 'Deck',
        type: 'slides',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      slides: [{ id: 's1', themeKey: 'white-clean', elements: [] }],
      activeSlideId: 's1',
    }
    expect(normalizeSlidesDoc(structuredClone(valid))).toEqual(valid)
  })
})

describe('normalizeDocDoc', () => {
  it('returns null for non-object inputs and never throws', () => {
    for (const input of BAD_INPUTS) {
      expect(() => normalizeDocDoc(input)).not.toThrow()
      expect(normalizeDocDoc(input)).toBeNull()
    }
  })

  it('ensures blocks[] exists when missing', () => {
    const doc = normalizeDocDoc({ meta: { id: 'm', title: 't', type: 'doc' } })
    expect(doc).not.toBeNull()
    expect(Array.isArray(doc!.blocks)).toBe(true)
    expect(doc!.blocks).toHaveLength(0)
  })

  it('drops blocks lacking an id or a type', () => {
    const doc = normalizeDocDoc({
      meta: { id: 'm', title: 't', type: 'doc' },
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'hi' },
        { id: 'b2' }, // no type -> dropped
        { type: 'h1' }, // no id -> dropped
        null,
        'bad',
      ],
    })
    expect(doc!.blocks).toHaveLength(1)
    expect(doc!.blocks[0].id).toBe('b1')
  })

  it('passes a fully-valid doc through unchanged (deep equal)', () => {
    const valid: DocDocument = {
      meta: {
        id: 'd',
        title: 'Doc',
        type: 'doc',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      blocks: [{ id: 'b1', type: 'paragraph', content: 'hello' }],
    }
    expect(normalizeDocDoc(structuredClone(valid))).toEqual(valid)
  })
})

describe('normalizeSpreadsheetDoc', () => {
  it('returns null for non-object inputs and never throws', () => {
    for (const input of BAD_INPUTS) {
      expect(() => normalizeSpreadsheetDoc(input)).not.toThrow()
      expect(normalizeSpreadsheetDoc(input)).toBeNull()
    }
  })

  it('ensures sheets[] exists when missing', () => {
    const doc = normalizeSpreadsheetDoc({ meta: { id: 'm', title: 't', type: 'spreadsheet' } })
    expect(doc).not.toBeNull()
    expect(Array.isArray(doc!.sheets)).toBe(true)
    expect(doc!.sheets).toHaveLength(0)
    expect(doc!.activeSheetId).toBe('')
  })

  it('drops malformed sheets and fills container shapes', () => {
    const doc = normalizeSpreadsheetDoc({
      meta: { id: 'm', title: 't', type: 'spreadsheet' },
      sheets: [{ id: 'sh1' }, null, 'bad', { noId: true }],
    })
    expect(doc!.sheets).toHaveLength(1)
    const sh = doc!.sheets[0]
    expect(sh.id).toBe('sh1')
    expect(sh.cells).toEqual({})
    expect(sh.colWidths).toEqual({})
    expect(sh.rowHeights).toEqual({})
    expect(Array.isArray(sh.mergedCells)).toBe(true)
    expect(sh.rowCount).toBeGreaterThan(0)
    expect(sh.colCount).toBeGreaterThan(0)
    expect(doc!.activeSheetId).toBe('sh1')
  })

  it('passes a fully-valid spreadsheet doc through unchanged (deep equal)', () => {
    const valid: SpreadsheetDocument = {
      meta: {
        id: 'd',
        title: 'Sheet',
        type: 'spreadsheet',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      sheets: [
        {
          id: 'sh1',
          name: 'Sheet1',
          cells: {},
          colWidths: {},
          rowHeights: {},
          mergedCells: [],
          rowCount: 100,
          colCount: 26,
        },
      ],
      activeSheetId: 'sh1',
    }
    expect(normalizeSpreadsheetDoc(structuredClone(valid))).toEqual(valid)
  })
})

import { normalizeSlidesDoc as _nsd, normalizeSpreadsheetDoc as _nss } from './validate-doc'

describe('active-id integrity (dangling references)', () => {
  it('repoints a dangling activeSlideId to the first surviving slide', () => {
    const out = _nsd({
      meta: { id: 'd', title: 't', type: 'slides' },
      slides: [{ id: 's1', elements: [] }, { id: 's2', elements: [] }],
      activeSlideId: 'does-not-exist',
    })
    expect(out).not.toBeNull()
    expect(out!.activeSlideId).toBe('s1')
  })

  it('keeps a valid activeSlideId', () => {
    const out = _nsd({
      meta: { id: 'd', title: 't', type: 'slides' },
      slides: [{ id: 's1', elements: [] }, { id: 's2', elements: [] }],
      activeSlideId: 's2',
    })
    expect(out!.activeSlideId).toBe('s2')
  })

  it('repoints a dangling activeSheetId to the first surviving sheet', () => {
    const out = _nss({
      meta: { id: 'd', title: 't', type: 'spreadsheet' },
      sheets: [{ id: 'sh1', name: 'A', cells: {} }],
      activeSheetId: 'ghost',
    })
    expect(out).not.toBeNull()
    expect(out!.activeSheetId).toBe('sh1')
  })
})

import { normalizeSpreadsheetDoc as _nssCharts } from './validate-doc'

describe('spreadsheet charts persistence', () => {
  it('preserves valid charts', () => {
    const out = _nssCharts({
      meta: { id: 'd', title: 't', type: 'spreadsheet' },
      sheets: [{ id: 'sh1', name: 'A', cells: {} }],
      activeSheetId: 'sh1',
      charts: [{ id: 'ch1', chartType: 'bar', title: 'C', range: { startRow: 0, startCol: 0, endRow: 2, endCol: 1 }, x: 10, y: 10 }],
    })
    expect(out!.charts).toHaveLength(1)
    expect(out!.charts![0].id).toBe('ch1')
  })

  it('drops malformed charts (missing id/range)', () => {
    const out = _nssCharts({
      meta: { id: 'd', title: 't', type: 'spreadsheet' },
      sheets: [{ id: 'sh1', name: 'A', cells: {} }],
      activeSheetId: 'sh1',
      charts: [{ chartType: 'bar' }, 'garbage', { id: 'ok', range: {} }],
    })
    expect(out!.charts).toHaveLength(1)
    expect(out!.charts![0].id).toBe('ok')
  })
})
