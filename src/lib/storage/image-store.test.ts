import { describe, it, expect } from 'vitest'
import { isImageRef, externalizeImages, internalizeImages } from './image-store'

// jsdom has no IndexedDB, so externalize/internalize run their graceful-
// degradation paths. These tests pin the deep-walk structure handling and the
// "never throw, never corrupt the doc" contract.

const BIG_IMAGE = 'data:image/png;base64,' + 'A'.repeat(60_000)
const SMALL_IMAGE = 'data:image/png;base64,' + 'A'.repeat(100)

describe('isImageRef', () => {
  it('recognises idb references', () => {
    expect(isImageRef('idb:abc_1')).toBe(true)
  })
  it('rejects data URLs and plain strings', () => {
    expect(isImageRef(BIG_IMAGE)).toBe(false)
    expect(isImageRef('https://example.com/a.png')).toBe(false)
    expect(isImageRef(42)).toBe(false)
    expect(isImageRef(null)).toBe(false)
  })
})

describe('externalizeImages (no IndexedDB → graceful degradation)', () => {
  it('preserves overall document structure', async () => {
    const doc = {
      meta: { id: 'd1', title: 'T' },
      canvas: {
        elements: [
          { id: 'a', type: 'text', content: 'hi' },
          { id: 'b', type: 'image', src: SMALL_IMAGE },
        ],
        backgroundColor: '#000',
      },
    }
    const out = await externalizeImages(doc)
    expect(out.meta.id).toBe('d1')
    expect(out.canvas.elements).toHaveLength(2)
    expect(out.canvas.elements[0].content).toBe('hi')
    expect(out.canvas.backgroundColor).toBe('#000')
  })

  it('keeps small images inline (below threshold)', async () => {
    const out = await externalizeImages({ src: SMALL_IMAGE })
    expect(out.src).toBe(SMALL_IMAGE)
  })

  it('without IndexedDB, large images stay inline rather than being lost', async () => {
    const out = await externalizeImages({ src: BIG_IMAGE })
    // Graceful degradation: never replace with a ref we cannot read back.
    expect(out.src).toBe(BIG_IMAGE)
  })

  it('handles arrays, nulls and primitives without throwing', async () => {
    const doc = { a: [1, 2, null], b: undefined as unknown, c: 'x', d: { e: true } }
    const out = await externalizeImages(doc)
    expect(out).toEqual(doc)
  })
})

describe('internalizeImages', () => {
  it('leaves non-reference strings untouched', async () => {
    const doc = { src: SMALL_IMAGE, url: 'https://x/y.png', n: 5 }
    const out = await internalizeImages(doc)
    expect(out).toEqual(doc)
  })

  it('leaves unresolved idb references as-is (no IndexedDB)', async () => {
    const out = await internalizeImages({ src: 'idb:deadbeef_1' })
    expect(out.src).toBe('idb:deadbeef_1')
  })

  it('preserves nested structure', async () => {
    const doc = { canvas: { elements: [{ src: 'idb:x_1' }, { content: 'k' }] } }
    const out = await internalizeImages(doc)
    expect(out.canvas.elements[1].content).toBe('k')
  })
})
