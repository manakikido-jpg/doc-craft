import { describe, it, expect } from 'vitest'
import { designReducer, type DesignState } from './use-design'
import type {
  DesignDocument,
  DesignCanvasSize,
  SlideElement,
  SlideTextElement,
  SlideShapeElement,
} from '@/types'

// ---------------------------------------------------------------------------
// Factory helpers — minimal, valid fixtures
// ---------------------------------------------------------------------------

const CANVAS_SIZE: DesignCanvasSize = {
  preset: 'instagram-post',
  width: 1080,
  height: 1080,
  label: 'Instagram投稿',
}

function makeText(id: string, overrides: Partial<SlideTextElement> = {}): SlideTextElement {
  return {
    id,
    type: 'body',
    x: 0,
    y: 0,
    w: 100,
    h: 40,
    zIndex: 0,
    content: 'hello',
    fontSize: 24,
    fontWeight: '400',
    align: 'left',
    ...overrides,
  }
}

function makeShape(id: string, overrides: Partial<SlideShapeElement> = {}): SlideShapeElement {
  return {
    id,
    type: 'shape',
    x: 10,
    y: 10,
    w: 50,
    h: 50,
    zIndex: 0,
    shape: 'rect',
    fill: '#ff0000',
    ...overrides,
  }
}

function makeDoc(elements: SlideElement[] = []): DesignDocument {
  return {
    meta: { id: 'doc-1', title: 'Test', type: 'design', createdAt: '', updatedAt: '' },
    canvas: { id: 'canvas-1', themeKey: 'dark-blue', elements },
    canvasSize: CANVAS_SIZE,
  }
}

function makeState(elements: SlideElement[] = []): DesignState {
  return {
    doc: makeDoc(elements),
    past: [],
    future: [],
    savedAt: 1000,
  }
}

const els = (s: DesignState): SlideElement[] => s.doc.canvas.elements
const byId = (s: DesignState, id: string) => els(s).find((e) => e.id === id)

// Type-safe position read: narrows the SlideElement union to the positioned
// variants (every variant except SlideConnectorElement carries x/y).
const posOf = (el: SlideElement | undefined): [number, number] => {
  if (!el || !('x' in el)) throw new Error('element has no position')
  return [el.x, el.y]
}

// ---------------------------------------------------------------------------

describe('designReducer', () => {
  describe('LOAD', () => {
    it('sets doc and clears past/future', () => {
      const start = makeState([makeText('a')])
      const withHistory: DesignState = {
        ...start,
        past: [makeDoc(), makeDoc()],
        future: [makeDoc()],
      }
      const newDoc = makeDoc([makeShape('s1')])

      const next = designReducer(withHistory, { type: 'LOAD', doc: newDoc })

      expect(next.doc).toBe(newDoc)
      expect(next.past).toEqual([])
      expect(next.future).toEqual([])
    })
  })

  describe('ADD_ELEMENT', () => {
    it('appends element with zIndex = maxZ + 1', () => {
      const state = makeState([makeText('a', { zIndex: 3 }), makeText('b', { zIndex: 7 })])
      const newEl = makeShape('c', { zIndex: 0 })

      const next = designReducer(state, { type: 'ADD_ELEMENT', element: newEl })

      expect(els(next)).toHaveLength(3)
      expect(byId(next, 'c')!.zIndex).toBe(8) // maxZ(7) + 1
    })

    it('pushes previous doc to past and clears future', () => {
      const state: DesignState = { ...makeState([makeText('a')]), future: [makeDoc()] }

      const next = designReducer(state, { type: 'ADD_ELEMENT', element: makeShape('c') })

      expect(next.past).toHaveLength(1)
      expect(next.past[0]).toBe(state.doc)
      expect(next.future).toEqual([])
    })
  })

  describe('UPDATE_ELEMENT', () => {
    it('updates the matched element and leaves others unchanged', () => {
      const a = makeText('a', { content: 'A' })
      const b = makeText('b', { content: 'B' })
      const state = makeState([a, b])

      const next = designReducer(state, {
        type: 'UPDATE_ELEMENT',
        id: 'a',
        props: { content: 'CHANGED' },
      })

      expect((byId(next, 'a') as SlideTextElement).content).toBe('CHANGED')
      // untouched element keeps identical reference (structural sharing)
      expect(byId(next, 'b')).toBe(b)
    })
  })

  describe('DELETE_ELEMENTS', () => {
    it('removes the given ids', () => {
      const state = makeState([makeText('a'), makeText('b'), makeText('c')])

      const next = designReducer(state, { type: 'DELETE_ELEMENTS', ids: ['a', 'c'] })

      expect(els(next).map((e) => e.id)).toEqual(['b'])
    })
  })

  describe('transient actions (no history push)', () => {
    it('MOVE_ELEMENT moves element without pushing to past', () => {
      const state = makeState([makeShape('a', { x: 10, y: 10 })])

      const next = designReducer(state, { type: 'MOVE_ELEMENT', id: 'a', x: 99, y: 88 })

      const moved = byId(next, 'a') as SlideShapeElement
      expect(moved.x).toBe(99)
      expect(moved.y).toBe(88)
      expect(next.past).toHaveLength(state.past.length) // unchanged
    })

    it('RESIZE_ELEMENT resizes without pushing to past', () => {
      const state = makeState([makeShape('a', { x: 0, y: 0, w: 50, h: 50 })])

      const next = designReducer(state, {
        type: 'RESIZE_ELEMENT',
        id: 'a',
        x: 5,
        y: 6,
        w: 200,
        h: 300,
      })

      const r = byId(next, 'a') as SlideShapeElement
      expect([r.x, r.y, r.w, r.h]).toEqual([5, 6, 200, 300])
      expect(next.past).toHaveLength(state.past.length)
    })

    it('BATCH_MOVE moves multiple elements without pushing to past', () => {
      const state = makeState([makeShape('a', { x: 0, y: 0 }), makeShape('b', { x: 0, y: 0 })])

      const next = designReducer(state, {
        type: 'BATCH_MOVE',
        moves: [
          { id: 'a', x: 11, y: 22 },
          { id: 'b', x: 33, y: 44 },
        ],
      })

      expect(posOf(byId(next, 'a'))).toEqual([11, 22])
      expect(posOf(byId(next, 'b'))).toEqual([33, 44])
      expect(next.past).toHaveLength(state.past.length)
    })
  })

  describe('SNAPSHOT', () => {
    it('pushes current doc to past, clears future, leaves doc unchanged', () => {
      const state: DesignState = { ...makeState([makeText('a')]), future: [makeDoc()] }

      const next = designReducer(state, { type: 'SNAPSHOT' })

      expect(next.doc).toBe(state.doc) // doc identity preserved
      expect(next.past).toHaveLength(1)
      expect(next.past[0]).toBe(state.doc)
      expect(next.future).toEqual([])
    })
  })

  describe('UNDO / REDO', () => {
    it('round-trips an ADD_ELEMENT', () => {
      const state = makeState([makeText('a')])
      const originalDoc = state.doc

      const added = designReducer(state, { type: 'ADD_ELEMENT', element: makeShape('b') })
      expect(els(added)).toHaveLength(2)
      expect(added.past).toHaveLength(1)

      const undone = designReducer(added, { type: 'UNDO' })
      expect(undone.doc).toBe(originalDoc) // previous doc restored by reference
      expect(els(undone)).toHaveLength(1)
      expect(undone.past).toHaveLength(0)
      expect(undone.future).toHaveLength(1)
      expect(undone.future[0]).toBe(added.doc)

      const redone = designReducer(undone, { type: 'REDO' })
      expect(redone.doc).toBe(added.doc) // re-applied by reference
      expect(els(redone)).toHaveLength(2)
      expect(redone.past).toHaveLength(1)
      expect(redone.future).toHaveLength(0)
    })

    it('UNDO on empty past returns the same state object', () => {
      const state = makeState([makeText('a')])
      expect(designReducer(state, { type: 'UNDO' })).toBe(state)
    })

    it('REDO on empty future returns the same state object', () => {
      const state = makeState([makeText('a')])
      expect(designReducer(state, { type: 'REDO' })).toBe(state)
    })
  })

  describe('immutability (structural sharing)', () => {
    it('does not mutate the original state on a committing action', () => {
      const a = makeText('a', { content: 'ORIGINAL' })
      const b = makeText('b', { content: 'B' })
      const state = makeState([a, b])

      // snapshot original observable values
      const originalDoc = state.doc
      const originalElements = state.doc.canvas.elements
      const originalPastLen = state.past.length
      const originalAContent = a.content

      const next = designReducer(state, {
        type: 'UPDATE_ELEMENT',
        id: 'a',
        props: { content: 'NEW' },
      })

      // new top-level doc ref
      expect(next.doc).not.toBe(originalDoc)
      // original state untouched
      expect(state.doc).toBe(originalDoc)
      expect(state.doc.canvas.elements).toBe(originalElements)
      expect(state.past).toHaveLength(originalPastLen)
      // original element object not mutated
      expect(a.content).toBe(originalAContent)
      expect(originalElements[0]).toBe(a)
    })

    it('shares unchanged element references when ADDing (structural sharing)', () => {
      const a = makeText('a')
      const b = makeText('b')
      const state = makeState([a, b])

      const next = designReducer(state, { type: 'ADD_ELEMENT', element: makeShape('c') })

      // pre-existing elements are the SAME objects in the new state
      expect(byId(next, 'a')).toBe(a)
      expect(byId(next, 'b')).toBe(b)
    })

    it('history isolation: doc in past keeps the OLD property value after UPDATE', () => {
      const a = makeText('a', { content: 'OLD' })
      const state = makeState([a])

      const next = designReducer(state, {
        type: 'UPDATE_ELEMENT',
        id: 'a',
        props: { content: 'NEW' },
      })

      const pastDoc = next.past[0]
      const pastA = pastDoc.canvas.elements.find((e) => e.id === 'a') as SlideTextElement
      expect(pastA.content).toBe('OLD') // proves no shared mutation
      expect((byId(next, 'a') as SlideTextElement).content).toBe('NEW')
    })
  })

  describe('z-order', () => {
    it('BRING_TO_FRONT sets zIndex to maxZ + 1 and pushes history', () => {
      const state = makeState([
        makeText('a', { zIndex: 1 }),
        makeText('b', { zIndex: 5 }),
        makeText('c', { zIndex: 3 }),
      ])

      const next = designReducer(state, { type: 'BRING_TO_FRONT', id: 'a' })

      expect(byId(next, 'a')!.zIndex).toBe(6) // maxZ(5) + 1
      expect(next.past).toHaveLength(1)
    })

    it('SEND_TO_BACK sets zIndex to minZ - 1 and pushes history', () => {
      const state = makeState([
        makeText('a', { zIndex: 1 }),
        makeText('b', { zIndex: 5 }),
        makeText('c', { zIndex: 3 }),
      ])

      const next = designReducer(state, { type: 'SEND_TO_BACK', id: 'b' })

      // True minimum of {1,5,3} is 1, so "send to back" goes strictly below it: 1 - 1 = 0
      expect(byId(next, 'b')!.zIndex).toBe(0)
      expect(next.past).toHaveLength(1)
    })

    it('BRING_FORWARD swaps zIndex with the element above', () => {
      const state = makeState([
        makeText('a', { zIndex: 1 }),
        makeText('b', { zIndex: 2 }),
        makeText('c', { zIndex: 3 }),
      ])

      const next = designReducer(state, { type: 'BRING_FORWARD', id: 'a' })

      expect(byId(next, 'a')!.zIndex).toBe(2)
      expect(byId(next, 'b')!.zIndex).toBe(1)
      expect(byId(next, 'c')!.zIndex).toBe(3)
      expect(next.past).toHaveLength(1)
    })

    it('SEND_BACKWARD swaps zIndex with the element below', () => {
      const state = makeState([
        makeText('a', { zIndex: 1 }),
        makeText('b', { zIndex: 2 }),
        makeText('c', { zIndex: 3 }),
      ])

      const next = designReducer(state, { type: 'SEND_BACKWARD', id: 'c' })

      expect(byId(next, 'c')!.zIndex).toBe(2)
      expect(byId(next, 'b')!.zIndex).toBe(3)
      expect(byId(next, 'a')!.zIndex).toBe(1)
      expect(next.past).toHaveLength(1)
    })
  })

  describe('REPLACE_ALL_ELEMENTS', () => {
    it('replaces all elements and assigns zIndex', () => {
      const state = makeState([makeText('old1'), makeText('old2')])
      const replacement = [makeShape('n1', { zIndex: undefined }), makeShape('n2', { zIndex: undefined })]

      const next = designReducer(state, {
        type: 'REPLACE_ALL_ELEMENTS',
        elements: replacement,
      })

      expect(els(next).map((e) => e.id)).toEqual(['n1', 'n2'])
      // zIndex assigned from index when undefined
      expect(byId(next, 'n1')!.zIndex).toBe(0)
      expect(byId(next, 'n2')!.zIndex).toBe(1)
      expect(next.past).toHaveLength(1)
    })

    it('preserves an explicit zIndex when present', () => {
      const state = makeState([])
      const next = designReducer(state, {
        type: 'REPLACE_ALL_ELEMENTS',
        elements: [makeShape('n1', { zIndex: 42 })],
      })
      expect(byId(next, 'n1')!.zIndex).toBe(42)
    })
  })

  describe('history cap', () => {
    it('caps past at 30 entries (slice(-30) + current)', () => {
      let state = makeState([makeText('a')])

      // 35 committing actions -> 35 history pushes
      for (let i = 0; i < 35; i++) {
        state = designReducer(state, { type: 'SNAPSHOT' })
      }

      // snapshot() does `past.slice(-30)` THEN pushes current => max 31
      expect(state.past.length).toBeLessThanOrEqual(31)
      expect(state.past.length).toBe(31)
    })
  })
})
