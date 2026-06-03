// Real IndexedDB round-trip tests for the image store, using fake-indexeddb to
// provide a working IndexedDB in the jsdom test environment. This locks in the
// externalize → persist → internalize behavior verified manually in the browser.
import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { externalizeImages, internalizeImages, isImageRef } from './image-store'

const BIG = 'data:image/png;base64,' + 'A'.repeat(80_000)
const BIG2 = 'data:image/jpeg;base64,' + 'B'.repeat(70_000)
const SMALL = 'data:image/png;base64,' + 'C'.repeat(100)

describe('image-store round-trip (with IndexedDB)', () => {
  it('externalizes a large image to a ref and restores it', async () => {
    const doc = { meta: { id: 'd1' }, canvas: { elements: [{ id: 'i', type: 'image', src: BIG }] } }
    const light = await externalizeImages(doc)

    const ref = (light as any).canvas.elements[0].src
    expect(isImageRef(ref)).toBe(true)
    // The lightweight doc must NOT contain the base64 payload.
    expect(JSON.stringify(light).includes('AAAAAAAAAA')).toBe(false)

    const restored = await internalizeImages(light)
    expect((restored as any).canvas.elements[0].src).toBe(BIG)
  })

  it('leaves small images and non-images untouched', async () => {
    const doc = { a: SMALL, b: 'https://x/y.png', c: 'hello', n: 3 }
    const light = await externalizeImages(doc)
    expect(light.a).toBe(SMALL)
    expect(light.b).toBe('https://x/y.png')
    const restored = await internalizeImages(light)
    expect(restored).toEqual(doc)
  })

  it('deduplicates identical images to the same ref (no leak on re-save)', async () => {
    const a = await externalizeImages({ src: BIG })
    const b = await externalizeImages({ src: BIG })
    expect((a as any).src).toBe((b as any).src)
  })

  it('handles multiple distinct images in one document', async () => {
    const doc = { els: [{ src: BIG }, { src: BIG2 }, { src: SMALL }] }
    const light = await externalizeImages(doc)
    const refs = (light as any).els.map((e: any) => e.src)
    expect(isImageRef(refs[0])).toBe(true)
    expect(isImageRef(refs[1])).toBe(true)
    expect(refs[2]).toBe(SMALL) // small stays inline
    expect(refs[0]).not.toBe(refs[1]) // distinct content → distinct refs

    const restored = await internalizeImages(light)
    const out = (restored as any).els.map((e: any) => e.src)
    expect(out[0]).toBe(BIG)
    expect(out[1]).toBe(BIG2)
    expect(out[2]).toBe(SMALL)
  })

  it('dramatically shrinks the serialized payload', async () => {
    const doc = { canvas: { elements: [{ src: BIG }, { src: BIG2 }] } }
    const beforeLen = JSON.stringify(doc).length
    const light = await externalizeImages(doc)
    const afterLen = JSON.stringify(light).length
    expect(afterLen).toBeLessThan(beforeLen / 10) // >90% reduction
  })
})
