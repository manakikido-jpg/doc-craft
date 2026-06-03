'use client'

import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import type { DesignDocument, DesignCanvasSize, SlideElement } from '@/types'
import { saveDesignDoc } from '@/lib/storage/cloud-store'
import { generateId } from '@/lib/utils'

// Action types
type DesignAction =
  | { type: 'LOAD'; doc: DesignDocument }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_CANVAS_SIZE'; canvasSize: DesignCanvasSize }
  | { type: 'SET_BACKGROUND_COLOR'; color: string }
  | { type: 'SET_BACKGROUND_IMAGE'; src: string; fit?: 'cover' | 'contain' | 'stretch' }
  | { type: 'CLEAR_BACKGROUND_IMAGE' }
  | { type: 'SET_THEME'; themeKey: string }
  | { type: 'ADD_ELEMENT'; element: SlideElement }
  | { type: 'UPDATE_ELEMENT'; id: string; props: Partial<SlideElement> }
  | { type: 'DELETE_ELEMENTS'; ids: string[] }
  | { type: 'MOVE_ELEMENT'; id: string; x: number; y: number }
  | { type: 'RESIZE_ELEMENT'; id: string; x: number; y: number; w: number; h: number }
  | { type: 'BATCH_MOVE'; moves: { id: string; x: number; y: number }[] }
  | { type: 'BATCH_RESIZE'; resizes: { id: string; x: number; y: number; w: number; h: number }[] }
  | { type: 'SNAPSHOT' }
  | { type: 'BRING_TO_FRONT'; id: string }
  | { type: 'SEND_TO_BACK'; id: string }
  | { type: 'BRING_FORWARD'; id: string }
  | { type: 'SEND_BACKWARD'; id: string }
  | { type: 'DUPLICATE_ELEMENTS'; ids: string[] }
  | { type: 'REPLACE_ALL_ELEMENTS'; elements: SlideElement[] }
  | { type: 'UPDATE_CANVAS_META'; lockedElementIds: string[]; hiddenElementIds: string[]; elementGroups: Record<string, string[]> }
  | { type: 'UNDO' }
  | { type: 'REDO' }

export type { DesignAction }

export interface DesignState {
  doc: DesignDocument
  past: DesignDocument[]
  future: DesignDocument[]
  savedAt: number
}

// Push the CURRENT (immutable) doc reference onto history. No deep clone needed:
// every reducer case below builds a new doc via structural sharing and never
// mutates an existing doc object, so old references stay valid forever.
function snapshot(state: DesignState): DesignState {
  return {
    ...state,
    past: [...state.past.slice(-30), state.doc],
    future: [],
  }
}

// Structural-sharing helper: returns a new doc whose elements array is the
// result of `fn`, sharing every unchanged element/sub-object by reference.
function withElements(
  doc: DesignDocument,
  fn: (els: SlideElement[]) => SlideElement[],
): DesignDocument {
  return { ...doc, canvas: { ...doc.canvas, elements: fn(doc.canvas.elements) } }
}

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case 'LOAD':
      return { doc: action.doc, past: [], future: [], savedAt: Date.now() }

    case 'SET_TITLE': {
      const s = snapshot(state)
      return { ...s, doc: { ...s.doc, meta: { ...s.doc.meta, title: action.title } } }
    }

    case 'SET_CANVAS_SIZE': {
      const s = snapshot(state)
      return { ...s, doc: { ...s.doc, canvasSize: action.canvasSize } }
    }

    case 'SET_BACKGROUND_COLOR': {
      const s = snapshot(state)
      return { ...s, doc: { ...s.doc, canvas: { ...s.doc.canvas, backgroundColor: action.color } } }
    }

    case 'SET_BACKGROUND_IMAGE': {
      const s = snapshot(state)
      const canvas = { ...s.doc.canvas, backgroundImage: action.src }
      if (action.fit) (canvas as any).backgroundFit = action.fit
      return { ...s, doc: { ...s.doc, canvas } }
    }

    case 'CLEAR_BACKGROUND_IMAGE': {
      const s = snapshot(state)
      const canvas = { ...s.doc.canvas }
      delete (canvas as any).backgroundImage
      delete (canvas as any).backgroundFit
      return { ...s, doc: { ...s.doc, canvas } }
    }

    case 'SET_THEME': {
      const s = snapshot(state)
      return { ...s, doc: { ...s.doc, canvas: { ...s.doc.canvas, themeKey: action.themeKey as any } } }
    }

    case 'ADD_ELEMENT': {
      const s = snapshot(state)
      const maxZ = s.doc.canvas.elements.reduce((m, e) => Math.max(m, e.zIndex ?? 0), 0)
      return { ...s, doc: withElements(s.doc, (els) => [...els, { ...action.element, zIndex: maxZ + 1 }]) }
    }

    case 'UPDATE_ELEMENT': {
      const s = snapshot(state)
      return {
        ...s,
        doc: withElements(s.doc, (els) =>
          els.map((e) => (e.id === action.id ? ({ ...e, ...action.props } as SlideElement) : e)),
        ),
      }
    }

    case 'DELETE_ELEMENTS': {
      const s = snapshot(state)
      return { ...s, doc: withElements(s.doc, (els) => els.filter((e) => !action.ids.includes(e.id))) }
    }

    case 'MOVE_ELEMENT': {
      // Lightweight: no history push, just shallow clone for React detection
      const newDoc = { ...state.doc, canvas: { ...state.doc.canvas, elements: state.doc.canvas.elements.map(e => {
        if (e.id === action.id && 'x' in e) {
          return { ...e, x: action.x, y: action.y }
        }
        return e
      })}}
      return { ...state, doc: newDoc }
    }

    case 'RESIZE_ELEMENT': {
      // Lightweight: no history push, just shallow clone for React detection
      const newDoc = { ...state.doc, canvas: { ...state.doc.canvas, elements: state.doc.canvas.elements.map(e => {
        if (e.id === action.id && 'x' in e) {
          return { ...e, x: action.x, y: action.y, w: action.w, h: action.h }
        }
        return e
      })}}
      return { ...state, doc: newDoc }
    }

    case 'BATCH_MOVE': {
      // Lightweight: no history push, just shallow clone for React detection
      const moveMap = new Map(action.moves.map(m => [m.id, m]))
      const newDoc = { ...state.doc, canvas: { ...state.doc.canvas, elements: state.doc.canvas.elements.map(e => {
        const m = moveMap.get(e.id)
        if (m && 'x' in e) {
          return { ...e, x: m.x, y: m.y }
        }
        return e
      })}}
      return { ...state, doc: newDoc }
    }

    case 'BATCH_RESIZE': {
      // Transient (no history push) — like BATCH_MOVE, used during group resize drag.
      const map = new Map(action.resizes.map((r) => [r.id, r]))
      const newDoc = withElements(state.doc, (els) => els.map((e) => {
        const r = map.get(e.id)
        if (r && 'x' in e) return { ...e, x: r.x, y: r.y, w: r.w, h: r.h }
        return e
      }))
      return { ...state, doc: newDoc }
    }

    case 'SNAPSHOT': {
      return snapshot(state)
    }

    case 'BRING_TO_FRONT': {
      const s = snapshot(state)
      // Seed with -Infinity so the true maximum is found even if every zIndex is negative.
      const maxZ = s.doc.canvas.elements.reduce((m, e) => Math.max(m, e.zIndex ?? 0), -Infinity)
      const top = Number.isFinite(maxZ) ? maxZ : 0
      return { ...s, doc: withElements(s.doc, (els) => els.map((e) => (e.id === action.id ? { ...e, zIndex: top + 1 } : e))) }
    }

    case 'SEND_TO_BACK': {
      const s = snapshot(state)
      // Seed with +Infinity so "send to back" goes strictly below the real minimum,
      // even when every element already has a zIndex >= 1.
      const minZ = s.doc.canvas.elements.reduce((m, e) => Math.min(m, e.zIndex ?? 0), Infinity)
      const bottom = Number.isFinite(minZ) ? minZ : 0
      return { ...s, doc: withElements(s.doc, (els) => els.map((e) => (e.id === action.id ? { ...e, zIndex: bottom - 1 } : e))) }
    }

    case 'BRING_FORWARD': {
      const s = snapshot(state)
      const sorted = [...s.doc.canvas.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      const idx = sorted.findIndex((e) => e.id === action.id)
      if (idx < 0 || idx >= sorted.length - 1) return { ...s, doc: s.doc }
      const cur = sorted[idx], above = sorted[idx + 1]
      const curZ = cur.zIndex ?? 0, aboveZ = above.zIndex ?? 0
      return { ...s, doc: withElements(s.doc, (els) => els.map((e) =>
        e.id === cur.id ? { ...e, zIndex: aboveZ } : e.id === above.id ? { ...e, zIndex: curZ } : e)) }
    }

    case 'SEND_BACKWARD': {
      const s = snapshot(state)
      const sorted = [...s.doc.canvas.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      const idx = sorted.findIndex((e) => e.id === action.id)
      if (idx <= 0) return { ...s, doc: s.doc }
      const cur = sorted[idx], below = sorted[idx - 1]
      const curZ = cur.zIndex ?? 0, belowZ = below.zIndex ?? 0
      return { ...s, doc: withElements(s.doc, (els) => els.map((e) =>
        e.id === cur.id ? { ...e, zIndex: belowZ } : e.id === below.id ? { ...e, zIndex: curZ } : e)) }
    }

    case 'DUPLICATE_ELEMENTS': {
      const s = snapshot(state)
      const maxZ = s.doc.canvas.elements.reduce((m, e) => Math.max(m, e.zIndex ?? 0), 0)
      const newEls: SlideElement[] = []
      for (const id of action.ids) {
        const orig = s.doc.canvas.elements.find((e) => e.id === id)
        if (orig) {
          const clone = { ...JSON.parse(JSON.stringify(orig)), id: generateId(), zIndex: maxZ + newEls.length + 1 }
          if ('x' in clone) { clone.x += 2; clone.y += 2 }
          newEls.push(clone)
        }
      }
      return { ...s, doc: withElements(s.doc, (els) => [...els, ...newEls]) }
    }

    case 'REPLACE_ALL_ELEMENTS': {
      const s = snapshot(state)
      return { ...s, doc: withElements(s.doc, () => action.elements.map((el, i) => ({ ...el, zIndex: el.zIndex ?? i }))) }
    }

    case 'UPDATE_CANVAS_META': {
      const newDoc = { ...state.doc, canvas: { ...state.doc.canvas, lockedElementIds: action.lockedElementIds, hiddenElementIds: action.hiddenElementIds, elementGroups: action.elementGroups } }
      return { ...state, doc: newDoc }
    }

    case 'UNDO': {
      if (state.past.length === 0) return state
      const prev = state.past[state.past.length - 1]
      // No clone: docs are immutable, so sharing references is safe.
      return {
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future.slice(0, 30)],
        savedAt: state.savedAt,
      }
    }

    case 'REDO': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        doc: next,
        past: [...state.past, state.doc],
        future: state.future.slice(1),
        savedAt: state.savedAt,
      }
    }

    default:
      return state
  }
}

const EMPTY_DOC: DesignDocument = {
  meta: { id: '', title: '', type: 'design', createdAt: '', updatedAt: '' },
  canvas: { id: '', themeKey: 'dark-blue', elements: [] },
  canvasSize: { preset: 'instagram-post', width: 1080, height: 1080, label: 'Instagram投稿' },
}

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

/** Extra canvas metadata (locked/hidden/groups) folded into the doc at save time. */
export interface CanvasMetaExtra {
  lockedElementIds: string[]
  hiddenElementIds: string[]
  elementGroups: Record<string, string[]>
}

/**
 * @param getCanvasMeta optional getter for UI-managed canvas metadata (locked /
 *   hidden / group state). It is merged into the document ONLY at save time —
 *   never via a reactive dispatch — so it persists without any render/save loop.
 */
export function useDesign(getCanvasMeta?: () => CanvasMetaExtra) {
  const [state, dispatch] = useReducer(designReducer, {
    doc: EMPTY_DOC,
    past: [],
    future: [],
    savedAt: Date.now(),
  })
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  const getMetaRef = useRef(getCanvasMeta)
  getMetaRef.current = getCanvasMeta
  const latestDocRef = useRef(state.doc)
  latestDocRef.current = state.doc
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // Build the doc to persist: base doc + current locked/hidden/group metadata.
  const buildSaveDoc = useCallback((doc: DesignDocument): DesignDocument => {
    const extra = getMetaRef.current?.()
    if (!extra) return doc
    return { ...doc, canvas: { ...doc.canvas, ...extra } as DesignDocument['canvas'] }
  }, [])

  // Persist the given doc now and reflect the outcome in saveStatus.
  const persist = useCallback(async (doc: DesignDocument, json: string) => {
    setSaveStatus('saving')
    try {
      const ok = await saveDesignDoc(buildSaveDoc(doc))
      if (ok) { lastSavedRef.current = json; setSaveStatus('saved') }
      else setSaveStatus('error')
      return ok
    } catch {
      setSaveStatus('error')
      return false
    }
  }, [buildSaveDoc])

  // Immediately flush any pending change (used on navigation / tab close).
  const flush = useCallback(() => {
    const doc = latestDocRef.current
    if (!doc.meta.id) return
    const json = JSON.stringify(doc)
    if (json === lastSavedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    void persist(doc, json)
  }, [persist])

  // Auto-save 1.5s after changes settle.
  useEffect(() => {
    if (!state.doc.meta.id) return
    const json = JSON.stringify(state.doc)
    if (json === lastSavedRef.current) return
    setSaveStatus('unsaved')

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void persist(state.doc, json) }, 1500)

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [state.doc, persist])

  // Flush a final save when leaving the editor (in-app navigation / unmount),
  // so lock/hide/group changes and sub-debounce edits still persist.
  useEffect(() => {
    return () => { flush() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Warn + best-effort flush on hard tab close while a save is pending.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const json = JSON.stringify(latestDocRef.current)
      if (latestDocRef.current.meta.id && json !== lastSavedRef.current) {
        flush()
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [flush])

  const load = useCallback((doc: DesignDocument) => dispatch({ type: 'LOAD', doc }), [])
  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  return {
    doc: state.doc,
    canvas: state.doc.canvas,
    canvasSize: state.doc.canvasSize,
    dispatch,
    load,
    canUndo,
    canRedo,
    saveStatus,
    flush,
  }
}
