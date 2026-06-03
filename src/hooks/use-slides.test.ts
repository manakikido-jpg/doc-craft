import { describe, it, expect } from 'vitest'
import { slidesReducer } from './use-slides'
import type { SlidesDocument, Slide, SlideTextElement } from '@/types'

// ---------------------------------------------------------------------------
// Minimal fixtures — valid SlidesDocument / Slide / element shapes
// ---------------------------------------------------------------------------

function makeText(id: string, content = 'hello'): SlideTextElement {
  return {
    id,
    type: 'body',
    x: 0,
    y: 0,
    w: 100,
    h: 40,
    zIndex: 0,
    content,
    fontSize: 24,
    fontWeight: '400',
    align: 'left',
  }
}

function makeSlide(id: string, elements: SlideTextElement[] = []): Slide {
  return { id, themeKey: 'dark-blue', elements }
}

function makeDoc(slides: Slide[], activeSlideId?: string): SlidesDocument {
  return {
    meta: { id: 'doc-1', title: 'Test', type: 'slides', createdAt: '', updatedAt: '' },
    slides,
    activeSlideId: activeSlideId ?? slides[0]?.id ?? '',
  }
}

describe('slidesReducer', () => {
  describe('document-level actions', () => {
    it('SET_TITLE updates the document title', () => {
      const doc = makeDoc([makeSlide('a')])
      const next = slidesReducer(doc, { type: 'SET_TITLE', title: '新しいタイトル' })
      expect(next.meta.title).toBe('新しいタイトル')
    })

    it('SET_ACTIVE sets the active slide id', () => {
      const doc = makeDoc([makeSlide('a'), makeSlide('b')], 'a')
      const next = slidesReducer(doc, { type: 'SET_ACTIVE', id: 'b' })
      expect(next.activeSlideId).toBe('b')
    })
  })

  describe('ADD_SLIDE', () => {
    it('appends a new slide and makes it active', () => {
      const doc = makeDoc([makeSlide('a')], 'a')
      const next = slidesReducer(doc, { type: 'ADD_SLIDE' })
      expect(next.slides).toHaveLength(2)
      expect(next.activeSlideId).toBe(next.slides[1].id)
      expect(next.activeSlideId).not.toBe('a')
    })

    it('inserts the new slide immediately after afterId', () => {
      const doc = makeDoc([makeSlide('a'), makeSlide('b')], 'a')
      const next = slidesReducer(doc, { type: 'ADD_SLIDE', afterId: 'a' })
      expect(next.slides).toHaveLength(3)
      expect(next.slides[0].id).toBe('a')
      expect(next.slides[2].id).toBe('b')
      // the inserted slide sits between a and b
      expect(next.slides[1].id).toBe(next.activeSlideId)
    })
  })

  describe('DELETE_SLIDE', () => {
    it('removes the slide', () => {
      const doc = makeDoc([makeSlide('a'), makeSlide('b')], 'a')
      const next = slidesReducer(doc, { type: 'DELETE_SLIDE', id: 'b' })
      expect(next.slides.map((s) => s.id)).toEqual(['a'])
    })

    it('is a no-op when only one slide remains (always keep at least one)', () => {
      const doc = makeDoc([makeSlide('a')], 'a')
      const next = slidesReducer(doc, { type: 'DELETE_SLIDE', id: 'a' })
      expect(next).toBe(doc) // same reference — guarded early return
    })

    it('reassigns the active slide when the active one is deleted', () => {
      const doc = makeDoc([makeSlide('a'), makeSlide('b')], 'b')
      const next = slidesReducer(doc, { type: 'DELETE_SLIDE', id: 'b' })
      expect(next.slides.map((s) => s.id)).toEqual(['a'])
      expect(next.activeSlideId).toBe('a')
    })
  })

  describe('DUPLICATE_SLIDE', () => {
    it('inserts a copy with a fresh slide id and fresh element ids', () => {
      const doc = makeDoc([makeSlide('a', [makeText('el-1', 'orig')])], 'a')
      const next = slidesReducer(doc, { type: 'DUPLICATE_SLIDE', id: 'a' })
      expect(next.slides).toHaveLength(2)
      const copy = next.slides[1]
      expect(copy.id).not.toBe('a')
      expect(copy.elements).toHaveLength(1)
      expect(copy.elements[0].id).not.toBe('el-1')
      // content is preserved on the duplicated element
      expect((copy.elements[0] as SlideTextElement).content).toBe('orig')
    })
  })

  describe('REORDER_SLIDES', () => {
    it('moves a slide from one index to another', () => {
      const doc = makeDoc([makeSlide('a'), makeSlide('b'), makeSlide('c')], 'a')
      const next = slidesReducer(doc, { type: 'REORDER_SLIDES', fromIndex: 0, toIndex: 2 })
      expect(next.slides.map((s) => s.id)).toEqual(['b', 'c', 'a'])
    })

    it('is a no-op for an out-of-range index', () => {
      const doc = makeDoc([makeSlide('a'), makeSlide('b')], 'a')
      const next = slidesReducer(doc, { type: 'REORDER_SLIDES', fromIndex: 0, toIndex: 5 })
      expect(next).toBe(doc)
    })
  })

  describe('element actions', () => {
    it('UPDATE_ELEMENT changes the text content', () => {
      const doc = makeDoc([makeSlide('a', [makeText('el-1', 'before')])], 'a')
      const next = slidesReducer(doc, {
        type: 'UPDATE_ELEMENT',
        slideId: 'a',
        elementId: 'el-1',
        content: 'after',
      })
      expect((next.slides[0].elements[0] as SlideTextElement).content).toBe('after')
    })

    it('DELETE_ELEMENT removes the element from the slide', () => {
      const doc = makeDoc([makeSlide('a', [makeText('el-1'), makeText('el-2')])], 'a')
      const next = slidesReducer(doc, { type: 'DELETE_ELEMENT', slideId: 'a', elementId: 'el-1' })
      expect(next.slides[0].elements.map((e) => e.id)).toEqual(['el-2'])
    })
  })
})
