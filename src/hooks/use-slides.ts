'use client'

import { useReducer, useEffect, useRef, useCallback } from 'react'
import type {
  Slide,
  SlidesDocument,
  SlideThemeKey,
  SlideElement,
  SlideTextElement,
  SlideImageElement,
  SlideShapeElement,
  SlideTableElement,
  SlideConnectorElement,
  SlideVideoElement,
  SlideAudioElement,
  SlideChartElement,
  Comment,
  ElementAnimation,
  SlideMaster,
} from '@/types'
import { generateId } from '@/lib/utils'
import { SLIDE_TEMPLATES } from '@/lib/templates/slide-templates'
import { saveSlideDoc } from '@/lib/storage/cloud-store'
import { createUndoableReducer, initUndoable, type UndoableAction } from '@/lib/undoable'

type SlideAction =
  | { type: 'LOAD'; doc: SlidesDocument }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_ACTIVE'; id: string }
  | { type: 'ADD_SLIDE'; afterId?: string }
  | { type: 'DELETE_SLIDE'; id: string }
  | { type: 'DUPLICATE_SLIDE'; id: string }
  | { type: 'REORDER_SLIDES'; fromIndex: number; toIndex: number }
  | { type: 'SET_THEME'; slideId: string; themeKey: SlideThemeKey }
  | { type: 'SET_THEME_ALL'; themeKey: SlideThemeKey }
  | { type: 'UPDATE_ELEMENT'; slideId: string; elementId: string; content: string }
  | { type: 'APPLY_TEMPLATE'; templateId: string }
  | { type: 'ADD_TEXT_ELEMENT'; slideId: string; textType?: SlideTextElement['type'] }
  | { type: 'ADD_IMAGE_ELEMENT'; slideId: string; src: string; alt?: string }
  | { type: 'ADD_SHAPE_ELEMENT'; slideId: string; shape: SlideShapeElement['shape']; fill: string }
  | { type: 'UPDATE_ELEMENT_POSITION'; slideId: string; elementId: string; x: number; y: number }
  | { type: 'UPDATE_ELEMENT_SIZE'; slideId: string; elementId: string; w: number; h: number }
  | { type: 'DELETE_ELEMENT'; slideId: string; elementId: string }
  | { type: 'SET_NOTES'; slideId: string; notes: string }
  | { type: 'SET_TRANSITION'; slideId: string; transition: Slide['transition'] }
  | { type: 'ADD_COMMENT'; text: string; slideId?: string; parentId?: string; blockId?: string }
  | { type: 'RESOLVE_COMMENT'; id: string }
  | { type: 'DELETE_COMMENT'; id: string }
  | { type: 'SET_CUSTOM_THEME'; slideId: string; customTheme: Partial<import('@/types').SlideTheme> }
  | { type: 'SET_CUSTOM_THEME_ALL'; customTheme: Partial<import('@/types').SlideTheme> }
  | { type: 'SAVE_VERSION' }
  // Phase 1: Z-index layering
  | { type: 'BRING_TO_FRONT'; slideId: string; elementId: string }
  | { type: 'SEND_TO_BACK'; slideId: string; elementId: string }
  | { type: 'BRING_FORWARD'; slideId: string; elementId: string }
  | { type: 'SEND_BACKWARD'; slideId: string; elementId: string }
  // Phase 1: Multi-select batch operations
  | { type: 'UPDATE_ELEMENTS_POSITION'; slideId: string; moves: { elementId: string; x: number; y: number }[] }
  | { type: 'DELETE_ELEMENTS'; slideId: string; elementIds: string[] }
  // Phase 1: Copy/Paste
  | { type: 'PASTE_ELEMENTS'; slideId: string; elements: SlideElement[] }
  // Phase 1: Rotation
  | { type: 'UPDATE_ELEMENT_ROTATION'; slideId: string; elementId: string; rotation: number }
  // Phase 1: Update element props generically
  | { type: 'UPDATE_ELEMENT_PROPS'; slideId: string; elementId: string; props: Partial<SlideElement> }
  // Phase 2: Background image
  | { type: 'SET_BACKGROUND_IMAGE'; slideId: string; backgroundImage?: string; backgroundFit?: Slide['backgroundFit'] }
  // Phase 2: Table element
  | { type: 'ADD_TABLE_ELEMENT'; slideId: string; rows: number; cols: number }
  | { type: 'UPDATE_TABLE_CELL'; slideId: string; elementId: string; row: number; col: number; value: string }
  | { type: 'ADD_TABLE_ROW'; slideId: string; elementId: string }
  | { type: 'ADD_TABLE_COL'; slideId: string; elementId: string }
  | { type: 'DELETE_TABLE_ROW'; slideId: string; elementId: string; row: number }
  | { type: 'DELETE_TABLE_COL'; slideId: string; elementId: string; col: number }
  // Phase 2: Connector
  | {
      type: 'ADD_CONNECTOR'
      slideId: string
      fromPoint: { x: number; y: number }
      toPoint: { x: number; y: number }
      stroke: string
    }
  // Phase 5: Animation
  | { type: 'SET_ELEMENT_ANIMATION'; slideId: string; elementId: string; animation?: ElementAnimation }
  | { type: 'REORDER_ANIMATIONS'; slideId: string; elementId: string; order: number }
  | { type: 'SET_ANIMATION_TRIGGER'; slideId: string; elementId: string; trigger: ElementAnimation['trigger'] }
  // Phase 5: Grouping
  | { type: 'GROUP_ELEMENTS'; slideId: string; elementIds: string[] }
  | { type: 'UNGROUP_ELEMENTS'; slideId: string; groupId: string }
  // Phase B: Video/Audio/Chart
  | { type: 'ADD_VIDEO_ELEMENT'; slideId: string; src: string; embedType: 'youtube' | 'url' }
  | { type: 'ADD_AUDIO_ELEMENT'; slideId: string; src: string }
  | { type: 'ADD_CHART_ELEMENT'; slideId: string; chartType: SlideChartElement['chartType'] }
  | { type: 'UPDATE_CHART_DATA'; slideId: string; elementId: string; data: SlideChartElement['data'] }
  | { type: 'UPDATE_CHART_PROPS'; slideId: string; elementId: string; props: Record<string, unknown> }
  | { type: 'REPLACE_IMAGE'; slideId: string; elementId: string; src: string }
  // Phase G: Footer
  | { type: 'SET_GLOBAL_FOOTER'; footer: SlidesDocument['globalFooter'] }
  // Phase 5: Master slides
  | { type: 'ADD_MASTER'; master: SlideMaster }
  | { type: 'SET_SLIDE_MASTER'; slideId: string; masterId?: string }
  | { type: 'SET_SLIDE_ELEMENTS'; slideId: string; elements: SlideElement[] }
  | { type: 'IMPORT_SLIDES'; slides: { elements: SlideElement[]; themeKey?: SlideThemeKey; transition?: Slide['transition']; transitionDuration?: number; notes?: string; customTheme?: Slide['customTheme'] }[]; afterId?: string }
  // Table merge/resize
  | { type: 'MERGE_TABLE_CELLS'; slideId: string; elementId: string; startRow: number; startCol: number; rowSpan: number; colSpan: number }
  | { type: 'UNMERGE_TABLE_CELLS'; slideId: string; elementId: string; startRow: number; startCol: number }
  | { type: 'SET_TABLE_COL_WIDTH'; slideId: string; elementId: string; col: number; width: number }
  | { type: 'SET_TABLE_ROW_HEIGHT'; slideId: string; elementId: string; row: number; height: number }
  | { type: 'UPDATE_CONNECTOR_ENDPOINTS'; slideId: string; elementId: string; fromPoint: { x: number; y: number }; toPoint: { x: number; y: number }; fromElementId?: string; toElementId?: string }
  // PowerPoint improvements
  | { type: 'SET_SLIDE_SIZE'; slideSize: SlidesDocument['slideSize'] }
  | { type: 'SET_TRANSITION_DURATION'; slideId: string; duration: number }
  | { type: 'ADD_SECTION'; name: string; startSlideIndex: number; color?: string }
  | { type: 'RENAME_SECTION'; sectionId: string; name: string }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'UPDATE_MASTER'; masterId: string; master: Partial<SlideMaster> }
  | { type: 'DELETE_MASTER'; masterId: string }
  | { type: 'SET_AUTO_ADVANCE'; slideId: string; seconds: number }
  | { type: 'SET_TRANSITION_ALL'; transition: Slide['transition']; duration?: number }
  | { type: 'FIND_REPLACE_TEXT'; find: string; replace: string; slideIds?: string[] }
  // New element/slide actions
  | { type: 'SORT_ELEMENTS_BY_ZINDEX'; slideId: string }
  | { type: 'SET_ELEMENT_LOCKED'; slideId: string; elementId: string; locked: boolean }
  | { type: 'SET_ELEMENT_OPACITY'; slideId: string; elementId: string; opacity: number }
  | { type: 'FLIP_ELEMENT'; slideId: string; elementId: string; direction: 'horizontal' | 'vertical' }
  | { type: 'ALIGN_ELEMENTS'; slideId: string; elementIds: string[]; alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' }
  | { type: 'DISTRIBUTE_ELEMENTS'; slideId: string; elementIds: string[]; direction: 'horizontal' | 'vertical' }
  | { type: 'SET_SLIDE_SECTION'; slideId: string; sectionName?: string; sectionColor?: string }
  | { type: 'DUPLICATE_ELEMENTS'; slideId: string; elementIds: string[] }
  | { type: 'MOVE_SLIDE_TO_SECTION'; slideId: string; sectionIndex: number }
  | { type: 'PASTE_ELEMENTS_TO_SLIDE'; slideId: string; elements: SlideElement[] }
  | { type: 'TOGGLE_SLIDE_HIDDEN'; slideId: string }
  | { type: 'SORT_TABLE'; slideId: string; elementId: string; col: number; direction: 'asc' | 'desc'; excludeHeader: boolean }

export type { SlideAction }

function makeBlankSlide(): Slide {
  return SLIDE_TEMPLATES[0].buildSlide('dark-blue')
}

function updateSlide(state: SlidesDocument, slideId: string, fn: (s: Slide) => Slide): SlidesDocument {
  return { ...state, slides: state.slides.map((s) => (s.id === slideId ? fn(s) : s)) }
}

export function slidesReducer(state: SlidesDocument, action: SlideAction): SlidesDocument {
  switch (action.type) {
    case 'LOAD':
      return action.doc

    case 'SET_TITLE':
      return { ...state, meta: { ...state.meta, title: action.title } }

    case 'SET_ACTIVE':
      return { ...state, activeSlideId: action.id }

    case 'ADD_SLIDE': {
      const newSlide = makeBlankSlide()
      const idx = action.afterId ? state.slides.findIndex((s) => s.id === action.afterId) : state.slides.length - 1
      const slides = [...state.slides]
      slides.splice(idx + 1, 0, newSlide)
      return { ...state, slides, activeSlideId: newSlide.id }
    }

    case 'DELETE_SLIDE': {
      if (state.slides.length <= 1) return state
      const slides = state.slides.filter((s) => s.id !== action.id)
      const activeSlideId =
        state.activeSlideId === action.id
          ? (slides[Math.max(0, state.slides.findIndex((s) => s.id === action.id) - 1)]?.id ?? slides[0].id)
          : state.activeSlideId
      return { ...state, slides, activeSlideId }
    }

    case 'DUPLICATE_SLIDE': {
      const src = state.slides.find((s) => s.id === action.id)
      if (!src) return state
      const newSlide: Slide = {
        ...src,
        id: generateId(),
        elements: src.elements.map((e) => ({ ...e, id: generateId() })),
      }
      const idx = state.slides.findIndex((s) => s.id === action.id)
      const slides = [...state.slides]
      slides.splice(idx + 1, 0, newSlide)
      return { ...state, slides, activeSlideId: newSlide.id }
    }

    case 'REORDER_SLIDES': {
      if (action.fromIndex < 0 || action.fromIndex >= state.slides.length) return state
      if (action.toIndex < 0 || action.toIndex >= state.slides.length) return state
      const slides = [...state.slides]
      const [moved] = slides.splice(action.fromIndex, 1)
      if (!moved) return state
      slides.splice(action.toIndex, 0, moved)
      return { ...state, slides }
    }

    case 'SET_THEME':
      return updateSlide(state, action.slideId, (s) => ({ ...s, themeKey: action.themeKey }))

    case 'SET_THEME_ALL': {
      const slides = state.slides.map((s) => ({ ...s, themeKey: action.themeKey }))
      return { ...state, slides }
    }

    case 'UPDATE_ELEMENT':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId && e.type !== 'image' && e.type !== 'shape' ? { ...e, content: action.content } : e,
        ),
      }))

    case 'APPLY_TEMPLATE': {
      const template = SLIDE_TEMPLATES.find((t) => t.id === action.templateId)
      if (!template) return state
      const active = state.slides.find((s) => s.id === state.activeSlideId)
      const newSlide = template.buildSlide(active?.themeKey ?? 'dark-blue')
      newSlide.id = state.activeSlideId
      const slides = state.slides.map((s) => (s.id === state.activeSlideId ? newSlide : s))
      return { ...state, slides }
    }

    case 'ADD_TEXT_ELEMENT': {
      const textType = action.textType || 'body'
      const defaults: Record<
        string,
        { fontSize: number; fontWeight: SlideTextElement['fontWeight']; x: number; y: number; w: number; h: number; content: string }
      > = {
        title: { fontSize: 36, fontWeight: '700', x: 10, y: 10, w: 80, h: 15, content: 'タイトル' },
        subtitle: { fontSize: 24, fontWeight: '500', x: 15, y: 25, w: 70, h: 10, content: 'サブタイトル' },
        body: { fontSize: 18, fontWeight: '400', x: 10, y: 35, w: 50, h: 30, content: 'テキストを入力...' },
        label: { fontSize: 14, fontWeight: '400', x: 30, y: 45, w: 40, h: 8, content: 'ラベル' },
      }
      const d = defaults[textType] || defaults.body
      const textEl: SlideTextElement = {
        id: generateId(),
        type: textType,
        content: d.content,
        x: d.x,
        y: d.y,
        w: d.w,
        h: d.h,
        fontSize: d.fontSize,
        fontWeight: d.fontWeight,
        align: 'left',
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, textEl],
      }))
    }

    case 'ADD_IMAGE_ELEMENT': {
      const imgEl: SlideImageElement = {
        id: generateId(),
        type: 'image',
        src: action.src,
        alt: action.alt,
        x: 30,
        y: 20,
        w: 40,
        h: 50,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, imgEl],
      }))
    }

    case 'ADD_SHAPE_ELEMENT': {
      const shapeEl: SlideShapeElement = {
        id: generateId(),
        type: 'shape',
        shape: action.shape,
        fill: action.fill,
        x: 35,
        y: 35,
        w: 30,
        h: 30,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, shapeEl],
      }))
    }

    case 'UPDATE_ELEMENT_POSITION': {
      let newState = updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId && e.type !== 'connector' ? { ...e, x: action.x, y: action.y } : e)),
      }))
      // Update connected connectors
      const slideAfterPos = newState.slides.find(s => s.id === action.slideId)
      if (slideAfterPos) {
        const movedEl = slideAfterPos.elements.find(e => e.id === action.elementId)
        if (movedEl && movedEl.type !== 'connector') {
          newState = updateSlide(newState, action.slideId, (s) => ({
            ...s,
            elements: s.elements.map((el) => {
              if (el.type !== 'connector') return el
              const conn = el as SlideConnectorElement
              let updated = false
              let newFrom = conn.fromPoint
              let newTo = conn.toPoint
              if (conn.fromElementId === action.elementId) {
                const anchorRatioX = (conn.fromPoint.x - (movedEl.x - (action.x - movedEl.x))) // not needed, use direct calc
                // Recompute: find old element position from the diff
                // The element was already moved, so we compute anchor offset from new position
                // We stored the anchor as absolute %, so recompute relative to old pos then apply to new
                // Actually, we need to know which anchor was used. Since we store absolute coords,
                // we shift by the delta of the element move.
                const prevEl = state.slides.find(sl => sl.id === action.slideId)?.elements.find(e => e.id === action.elementId)
                if (prevEl && prevEl.type !== 'connector') {
                  const dx = action.x - prevEl.x
                  const dy = action.y - prevEl.y
                  newFrom = { x: conn.fromPoint.x + dx, y: conn.fromPoint.y + dy }
                  updated = true
                }
              }
              if (conn.toElementId === action.elementId) {
                const prevEl = state.slides.find(sl => sl.id === action.slideId)?.elements.find(e => e.id === action.elementId)
                if (prevEl && prevEl.type !== 'connector') {
                  const dx = action.x - prevEl.x
                  const dy = action.y - prevEl.y
                  newTo = { x: conn.toPoint.x + dx, y: conn.toPoint.y + dy }
                  updated = true
                }
              }
              if (updated) return { ...conn, fromPoint: newFrom, toPoint: newTo }
              return el
            }),
          }))
        }
      }
      return newState
    }

    case 'UPDATE_ELEMENT_SIZE':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, w: action.w, h: action.h } : e)),
      }))

    case 'DELETE_ELEMENT':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.filter((e) => e.id !== action.elementId),
      }))

    case 'SET_NOTES':
      return updateSlide(state, action.slideId, (s) => ({ ...s, notes: action.notes }))

    case 'SET_TRANSITION':
      return updateSlide(state, action.slideId, (s) => ({ ...s, transition: action.transition }))

    case 'SET_CUSTOM_THEME':
      return updateSlide(state, action.slideId, (s) => ({ ...s, customTheme: action.customTheme }))

    case 'SET_CUSTOM_THEME_ALL': {
      const slides = state.slides.map((s) => ({ ...s, customTheme: action.customTheme }))
      return { ...state, slides }
    }

    // Comments
    case 'ADD_COMMENT': {
      const comment: Comment = {
        id: generateId(),
        text: action.text,
        slideId: action.slideId,
        parentId: action.parentId,
        blockId: action.blockId,
        author: 'ユーザー',
        createdAt: new Date().toISOString(),
      }
      return { ...state, comments: [...(state.comments || []), comment] }
    }

    case 'RESOLVE_COMMENT':
      return {
        ...state,
        comments: (state.comments || []).map((c) => (c.id === action.id ? { ...c, resolved: true } : c)),
      }

    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: (state.comments || []).filter((c) => c.id !== action.id),
      }

    // Versions
    case 'SAVE_VERSION': {
      const snapshot = {
        id: generateId(),
        title: state.meta.title || '無題',
        timestamp: new Date().toISOString(),
        data: JSON.stringify({ slides: state.slides }),
      }
      const versions = [...(state.versions || []), snapshot].slice(-20)
      return { ...state, versions }
    }

    // Phase 1: Z-index layering
    case 'BRING_TO_FRONT':
      return updateSlide(state, action.slideId, (s) => {
        const maxZ = Math.max(0, ...s.elements.map((e) => e.zIndex ?? 0))
        return { ...s, elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, zIndex: maxZ + 1 } : e)) }
      })
    case 'SEND_TO_BACK':
      return updateSlide(state, action.slideId, (s) => {
        const minZ = Math.min(0, ...s.elements.map((e) => e.zIndex ?? 0))
        return { ...s, elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, zIndex: minZ - 1 } : e)) }
      })
    case 'BRING_FORWARD':
      return updateSlide(state, action.slideId, (s) => {
        return {
          ...s,
          elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, zIndex: (e.zIndex ?? 0) + 1 } : e)),
        }
      })
    case 'SEND_BACKWARD':
      return updateSlide(state, action.slideId, (s) => {
        return {
          ...s,
          elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, zIndex: (e.zIndex ?? 0) - 1 } : e)),
        }
      })

    // Phase 1: Multi-select batch
    case 'UPDATE_ELEMENTS_POSITION': {
      let newState = updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          const move = action.moves.find((m) => m.elementId === e.id)
          return move ? { ...e, x: move.x, y: move.y } : e
        }),
      }))
      // Update connected connectors for each moved element
      const slideAfterMoves = newState.slides.find(s => s.id === action.slideId)
      const prevSlide = state.slides.find(s => s.id === action.slideId)
      if (slideAfterMoves && prevSlide) {
        newState = updateSlide(newState, action.slideId, (s) => ({
          ...s,
          elements: s.elements.map((el) => {
            if (el.type !== 'connector') return el
            const conn = el as SlideConnectorElement
            let newFrom = conn.fromPoint
            let newTo = conn.toPoint
            let updated = false
            if (conn.fromElementId) {
              const move = action.moves.find(m => m.elementId === conn.fromElementId)
              if (move) {
                const prevEl = prevSlide.elements.find(e => e.id === conn.fromElementId)
                if (prevEl && prevEl.type !== 'connector') {
                  const dx = move.x - prevEl.x
                  const dy = move.y - prevEl.y
                  newFrom = { x: conn.fromPoint.x + dx, y: conn.fromPoint.y + dy }
                  updated = true
                }
              }
            }
            if (conn.toElementId) {
              const move = action.moves.find(m => m.elementId === conn.toElementId)
              if (move) {
                const prevEl = prevSlide.elements.find(e => e.id === conn.toElementId)
                if (prevEl && prevEl.type !== 'connector') {
                  const dx = move.x - prevEl.x
                  const dy = move.y - prevEl.y
                  newTo = { x: conn.toPoint.x + dx, y: conn.toPoint.y + dy }
                  updated = true
                }
              }
            }
            if (updated) return { ...conn, fromPoint: newFrom, toPoint: newTo }
            return el
          }),
        }))
      }
      return newState
    }
    case 'DELETE_ELEMENTS':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.filter((e) => !action.elementIds.includes(e.id)),
      }))

    // Phase 1: Copy/Paste
    case 'PASTE_ELEMENTS':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, ...action.elements.map((e) => ({ ...e, id: generateId() }))],
      }))

    // Phase 1: Rotation
    case 'UPDATE_ELEMENT_ROTATION':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, rotation: action.rotation } : e)),
      }))

    // Phase 1: Generic element prop update
    case 'UPDATE_ELEMENT_PROPS':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId ? ({ ...e, ...action.props } as SlideElement) : e)),
      }))

    // Phase 2: Background image
    case 'SET_BACKGROUND_IMAGE':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        backgroundImage: action.backgroundImage,
        backgroundFit: action.backgroundFit || 'cover',
      }))

    // Phase 2: Table element
    case 'ADD_TABLE_ELEMENT': {
      const rows: string[][] = Array.from({ length: action.rows }, (_, ri) =>
        Array.from({ length: action.cols }, (_, ci) => (ri === 0 ? `列${ci + 1}` : '')),
      )
      const tableEl: SlideTableElement = {
        id: generateId(),
        type: 'table',
        x: 10,
        y: 20,
        w: 80,
        h: 50,
        rows,
        headerRow: true,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, tableEl],
      }))
    }
    case 'UPDATE_TABLE_CELL':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== action.elementId || e.type !== 'table') return e
          const newRows = (e as SlideTableElement).rows.map((r, ri) =>
            ri === action.row ? r.map((c, ci) => (ci === action.col ? action.value : c)) : r,
          )
          return { ...e, rows: newRows }
        }),
      }))
    case 'ADD_TABLE_ROW':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== action.elementId || e.type !== 'table') return e
          const te = e as SlideTableElement
          const cols = te.rows[0]?.length || 3
          return { ...te, rows: [...te.rows, Array(cols).fill('')] }
        }),
      }))
    case 'ADD_TABLE_COL':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== action.elementId || e.type !== 'table') return e
          const te = e as SlideTableElement
          return { ...te, rows: te.rows.map((r, ri) => [...r, ri === 0 ? `列${r.length + 1}` : '']) }
        }),
      }))
    case 'DELETE_TABLE_ROW':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== action.elementId || e.type !== 'table') return e
          const te = e as SlideTableElement
          if (te.rows.length <= 1) return e
          return { ...te, rows: te.rows.filter((_, i) => i !== action.row) }
        }),
      }))
    case 'DELETE_TABLE_COL':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== action.elementId || e.type !== 'table') return e
          const te = e as SlideTableElement
          if ((te.rows[0]?.length || 0) <= 1) return e
          return { ...te, rows: te.rows.map((r) => r.filter((_, i) => i !== action.col)) }
        }),
      }))

    case 'MERGE_TABLE_CELLS': {
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id !== action.elementId || el.type !== 'table') return el
          const table = el as SlideTableElement
          const existing = table.mergedCells || []
          // Remove any overlapping merges
          const filtered = existing.filter(m =>
            !(m.startRow >= action.startRow && m.startRow < action.startRow + action.rowSpan &&
              m.startCol >= action.startCol && m.startCol < action.startCol + action.colSpan)
          )
          return { ...table, mergedCells: [...filtered, { startRow: action.startRow, startCol: action.startCol, rowSpan: action.rowSpan, colSpan: action.colSpan }] }
        }),
      }))
    }

    case 'UNMERGE_TABLE_CELLS': {
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id !== action.elementId || el.type !== 'table') return el
          const table = el as SlideTableElement
          return { ...table, mergedCells: (table.mergedCells || []).filter(m => !(m.startRow === action.startRow && m.startCol === action.startCol)) }
        }),
      }))
    }

    case 'SET_TABLE_COL_WIDTH': {
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id !== action.elementId || el.type !== 'table') return el
          const table = el as SlideTableElement
          const colWidths = [...(table.colWidths || table.rows[0]?.map(() => 100) || [])]
          colWidths[action.col] = action.width
          return { ...table, colWidths }
        }),
      }))
    }

    case 'SET_TABLE_ROW_HEIGHT': {
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id !== action.elementId || el.type !== 'table') return el
          const table = el as SlideTableElement
          const rowHeights = [...(table.rowHeights || table.rows.map(() => 32) || [])]
          rowHeights[action.row] = action.height
          return { ...table, rowHeights }
        }),
      }))
    }

    // Phase 2: Connector
    case 'ADD_CONNECTOR': {
      const conn: SlideConnectorElement = {
        id: generateId(),
        type: 'connector',
        fromPoint: action.fromPoint,
        toPoint: action.toPoint,
        style: 'straight',
        stroke: action.stroke,
        strokeWidth: 2,
        arrowHead: true,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, conn],
      }))
    }

    // Phase 5: Animation
    case 'SET_ELEMENT_ANIMATION':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, animation: action.animation } : e)),
      }))

    case 'REORDER_ANIMATIONS':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId && 'animation' in e && e.animation
            ? { ...e, animation: { ...e.animation, order: action.order } }
            : e,
        ),
      }))

    case 'SET_ANIMATION_TRIGGER':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId && 'animation' in e && e.animation
            ? { ...e, animation: { ...e.animation, trigger: action.trigger } }
            : e,
        ),
      }))

    // Phase 5: Grouping
    case 'GROUP_ELEMENTS': {
      const gid = generateId()
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (action.elementIds.includes(e.id) ? { ...e, groupId: gid } : e)),
      }))
    }
    case 'UNGROUP_ELEMENTS':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => ((e as any).groupId === action.groupId ? { ...e, groupId: undefined } : e)),
      }))

    // Phase B: Video element
    case 'ADD_VIDEO_ELEMENT': {
      const vidEl: SlideVideoElement = {
        id: generateId(),
        type: 'video',
        src: action.src,
        embedType: action.embedType,
        x: 20,
        y: 20,
        w: 60,
        h: 45,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, vidEl],
      }))
    }

    // Phase B: Audio element
    case 'ADD_AUDIO_ELEMENT': {
      const audEl: SlideAudioElement = {
        id: generateId(),
        type: 'audio',
        src: action.src,
        x: 30,
        y: 80,
        w: 40,
        h: 8,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, audEl],
      }))
    }

    // Phase B: Chart element
    case 'ADD_CHART_ELEMENT': {
      // Multi-series chart types are only meaningful with 2+ datasets.
      const multiSeries = ['stackedBar', 'stackedBar100', 'stackedArea', 'combo'].includes(action.chartType)
      const isWaterfall = action.chartType === 'waterfall'
      const sampleData = isWaterfall
        ? {
            labels: ['期首', '売上', '原価', '販管費', '期末'],
            datasets: [{ label: '増減', values: [100, 60, -40, -25, 0], color: '#6366f1' }],
          }
        : multiSeries
          ? {
              labels: ['A', 'B', 'C', 'D'],
              datasets: [
                { label: 'データ1', values: [30, 50, 20, 40], color: '#6366f1' },
                { label: 'データ2', values: [20, 25, 35, 15], color: '#f97316' },
              ],
            }
          : {
              labels: ['A', 'B', 'C', 'D'],
              datasets: [{ label: 'データ1', values: [30, 50, 20, 40], color: '#6366f1' }],
            }
      const chartEl: SlideChartElement = {
        id: generateId(),
        type: 'chart',
        chartType: action.chartType,
        data: sampleData,
        x: 15,
        y: 15,
        w: 70,
        h: 65,
        showLegend: true,
        showValues: true,
      }
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements, chartEl],
      }))
    }

    case 'UPDATE_CHART_DATA':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId && e.type === 'chart' ? { ...e, data: action.data } : e,
        ),
      }))

    case 'UPDATE_CHART_PROPS':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId && e.type === 'chart' ? { ...e, ...action.props } : e,
        ),
      }))

    case 'REPLACE_IMAGE':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId && e.type === 'image' ? { ...e, src: action.src } : e,
        ),
      }))

    // Phase G: Footer
    case 'SET_GLOBAL_FOOTER':
      return { ...state, globalFooter: action.footer }

    // Phase 5: Master slides
    case 'ADD_MASTER':
      return { ...state, masters: [...(state.masters || []), action.master] }
    case 'SET_SLIDE_MASTER':
      return updateSlide(state, action.slideId, (s) => ({ ...s, masterId: action.masterId }))
    case 'SET_SLIDE_ELEMENTS':
      return updateSlide(state, action.slideId, (s) => ({ ...s, elements: action.elements }))

    // Connector endpoint update with snap anchors
    case 'UPDATE_CONNECTOR_ENDPOINTS': {
      const targetSlide = state.slides.find(s => s.id === action.slideId)
      if (!targetSlide) return state
      const connEl = targetSlide.elements.find(e => e.id === action.elementId)
      if (!connEl || connEl.type !== 'connector') return state
      // Validate that referenced element IDs actually exist in the slide
      const fromElId = action.fromElementId
        ? (targetSlide.elements.some(e => e.id === action.fromElementId) ? action.fromElementId : undefined)
        : undefined
      const toElId = action.toElementId
        ? (targetSlide.elements.some(e => e.id === action.toElementId) ? action.toElementId : undefined)
        : undefined
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id !== action.elementId || el.type !== 'connector') return el
          return {
            ...el,
            fromPoint: action.fromPoint,
            toPoint: action.toPoint,
            fromElementId: fromElId,
            toElementId: toElId,
          }
        }),
      }))
    }

    case 'IMPORT_SLIDES': {
      const newSlides: Slide[] = action.slides.map((sd) => {
        const slide = makeBlankSlide()
        slide.elements = sd.elements
        if (sd.themeKey) slide.themeKey = sd.themeKey
        if (sd.transition) slide.transition = sd.transition
        if (sd.transitionDuration) slide.transitionDuration = sd.transitionDuration
        if (sd.notes) slide.notes = sd.notes
        if (sd.customTheme) slide.customTheme = sd.customTheme
        return slide
      })
      let updatedSlides: Slide[]
      if (action.afterId) {
        const idx = state.slides.findIndex(s => s.id === action.afterId)
        if (idx >= 0) {
          updatedSlides = [...state.slides.slice(0, idx + 1), ...newSlides, ...state.slides.slice(idx + 1)]
        } else {
          updatedSlides = [...state.slides, ...newSlides]
        }
      } else {
        updatedSlides = [...state.slides, ...newSlides]
      }
      return {
        ...state,
        slides: updatedSlides,
        activeSlideId: newSlides.length > 0 ? newSlides[0].id : state.activeSlideId,
      }
    }

    // PowerPoint improvements
    case 'SET_SLIDE_SIZE':
      return { ...state, slideSize: action.slideSize }

    case 'SET_TRANSITION_DURATION':
      return updateSlide(state, action.slideId, (s) => ({ ...s, transitionDuration: action.duration }))

    case 'ADD_SECTION': {
      const section = { id: generateId(), name: action.name, color: action.color, startSlideIndex: action.startSlideIndex }
      return { ...state, sections: [...(state.sections || []), section] }
    }

    case 'RENAME_SECTION':
      return { ...state, sections: (state.sections || []).map(s => s.id === action.sectionId ? { ...s, name: action.name } : s) }

    case 'DELETE_SECTION':
      return { ...state, sections: (state.sections || []).filter(s => s.id !== action.sectionId) }

    case 'UPDATE_MASTER': {
      return { ...state, masters: (state.masters || []).map(m => m.id === action.masterId ? { ...m, ...action.master } : m) }
    }

    case 'DELETE_MASTER':
      return { ...state, masters: (state.masters || []).filter(m => m.id !== action.masterId) }

    case 'SET_AUTO_ADVANCE':
      return updateSlide(state, action.slideId, (s) => ({ ...s, autoAdvance: action.seconds }))

    case 'SET_TRANSITION_ALL': {
      const slides = state.slides.map(s => ({
        ...s,
        transition: action.transition,
        ...(action.duration !== undefined ? { transitionDuration: action.duration } : {})
      }))
      return { ...state, slides }
    }

    case 'FIND_REPLACE_TEXT': {
      const targetSlides = action.slideIds || state.slides.map(s => s.id)
      return {
        ...state,
        slides: state.slides.map(s => {
          if (!targetSlides.includes(s.id)) return s
          return {
            ...s,
            elements: s.elements.map(el => {
              if (el.type !== 'title' && el.type !== 'subtitle' && el.type !== 'body' && el.type !== 'label') return el
              const textEl = el as import('@/types').SlideTextElement
              if (!textEl.content.includes(action.find)) return el
              return { ...textEl, content: textEl.content.split(action.find).join(action.replace) }
            })
          }
        })
      }
    }

    // Sort elements by zIndex
    case 'SORT_ELEMENTS_BY_ZINDEX':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: [...s.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
      }))

    // Lock/unlock element
    case 'SET_ELEMENT_LOCKED':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, locked: action.locked } : e)),
      }))

    // Set element opacity
    case 'SET_ELEMENT_OPACITY':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === action.elementId ? { ...e, opacity: Math.max(0, Math.min(1, action.opacity)) } : e,
        ),
      }))

    // Flip element
    case 'FLIP_ELEMENT':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          if (e.id !== action.elementId) return e
          if (action.direction === 'horizontal') return { ...e, flipH: !(e.flipH ?? false) }
          return { ...e, flipV: !(e.flipV ?? false) }
        }),
      }))

    // Align multiple elements (connectors excluded since they lack x/y/w/h)
    case 'ALIGN_ELEMENTS': {
      if (action.elementIds.length < 2) return state
      return updateSlide(state, action.slideId, (s) => {
        const targets = s.elements.filter(
          (e): e is Exclude<SlideElement, SlideConnectorElement> =>
            action.elementIds.includes(e.id) && e.type !== 'connector',
        )
        if (targets.length < 2) return s
        const targetIds = new Set(targets.map((e) => e.id))
        let updater: (e: Exclude<SlideElement, SlideConnectorElement>) => SlideElement
        switch (action.alignment) {
          case 'left': {
            const minX = Math.min(...targets.map((e) => e.x))
            updater = (e) => ({ ...e, x: minX })
            break
          }
          case 'right': {
            const maxRight = Math.max(...targets.map((e) => e.x + e.w))
            updater = (e) => ({ ...e, x: maxRight - e.w })
            break
          }
          case 'top': {
            const minY = Math.min(...targets.map((e) => e.y))
            updater = (e) => ({ ...e, y: minY })
            break
          }
          case 'bottom': {
            const maxBottom = Math.max(...targets.map((e) => e.y + e.h))
            updater = (e) => ({ ...e, y: maxBottom - e.h })
            break
          }
          case 'center-h': {
            const avgCenterX = targets.reduce((sum, e) => sum + e.x + e.w / 2, 0) / targets.length
            updater = (e) => ({ ...e, x: avgCenterX - e.w / 2 })
            break
          }
          case 'center-v': {
            const avgCenterY = targets.reduce((sum, e) => sum + e.y + e.h / 2, 0) / targets.length
            updater = (e) => ({ ...e, y: avgCenterY - e.h / 2 })
            break
          }
        }
        return {
          ...s,
          elements: s.elements.map((e) =>
            targetIds.has(e.id) && e.type !== 'connector'
              ? (updater(e as Exclude<SlideElement, SlideConnectorElement>) as SlideElement)
              : e,
          ),
        }
      })
    }

    // Distribute elements evenly (connectors excluded)
    case 'DISTRIBUTE_ELEMENTS': {
      if (action.elementIds.length < 3) return state
      return updateSlide(state, action.slideId, (s) => {
        const targets = s.elements.filter(
          (e): e is Exclude<SlideElement, SlideConnectorElement> =>
            action.elementIds.includes(e.id) && e.type !== 'connector',
        )
        if (targets.length < 3) return s
        if (action.direction === 'horizontal') {
          const sorted = [...targets].sort((a, b) => a.x - b.x)
          const first = sorted[0]
          const last = sorted[sorted.length - 1]
          const totalSpan = (last.x + last.w) - first.x
          const totalElementWidth = sorted.reduce((sum, e) => sum + e.w, 0)
          const gap = (totalSpan - totalElementWidth) / (sorted.length - 1)
          const posMap = new Map<string, number>()
          let currentX = first.x
          for (const el of sorted) {
            posMap.set(el.id, currentX)
            currentX += el.w + gap
          }
          return {
            ...s,
            elements: s.elements.map((e) => {
              const newX = posMap.get(e.id)
              return newX !== undefined ? ({ ...e, x: newX } as SlideElement) : e
            }),
          }
        } else {
          const sorted = [...targets].sort((a, b) => a.y - b.y)
          const first = sorted[0]
          const last = sorted[sorted.length - 1]
          const totalSpan = (last.y + last.h) - first.y
          const totalElementHeight = sorted.reduce((sum, e) => sum + e.h, 0)
          const gap = (totalSpan - totalElementHeight) / (sorted.length - 1)
          const posMap = new Map<string, number>()
          let currentY = first.y
          for (const el of sorted) {
            posMap.set(el.id, currentY)
            currentY += el.h + gap
          }
          return {
            ...s,
            elements: s.elements.map((e) => {
              const newY = posMap.get(e.id)
              return newY !== undefined ? ({ ...e, y: newY } as SlideElement) : e
            }),
          }
        }
      })
    }

    // Set section metadata on a slide
    case 'SET_SLIDE_SECTION':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        sectionName: action.sectionName,
        sectionColor: action.sectionColor,
      }))

    // Duplicate selected elements with offset
    case 'DUPLICATE_ELEMENTS':
      return updateSlide(state, action.slideId, (s) => {
        const toDuplicate = s.elements.filter((e) => action.elementIds.includes(e.id))
        const duplicated = toDuplicate.map((e) => {
          if (e.type === 'connector') {
            const conn = e as SlideConnectorElement
            return {
              ...conn,
              id: generateId(),
              fromPoint: { x: conn.fromPoint.x + 2, y: conn.fromPoint.y + 2 },
              toPoint: { x: conn.toPoint.x + 2, y: conn.toPoint.y + 2 },
              fromElementId: undefined,
              toElementId: undefined,
            }
          }
          return { ...e, id: generateId(), x: e.x + 2, y: e.y + 2 }
        })
        return { ...s, elements: [...s.elements, ...duplicated] }
      })

    // Move slide to a specific section position
    case 'MOVE_SLIDE_TO_SECTION': {
      const slideIdx = state.slides.findIndex((s) => s.id === action.slideId)
      if (slideIdx === -1) return state
      const targetIdx = Math.max(0, Math.min(action.sectionIndex, state.slides.length - 1))
      if (slideIdx === targetIdx) return state
      const slides = [...state.slides]
      const [moved] = slides.splice(slideIdx, 1)
      slides.splice(targetIdx, 0, moved)
      return { ...state, slides }
    }

    // Toggle slide hidden
    case 'TOGGLE_SLIDE_HIDDEN':
      return updateSlide(state, action.slideId, (s) => ({ ...s, hidden: !s.hidden }))

    // Cross-slide element paste
    case 'PASTE_ELEMENTS_TO_SLIDE': {
      return {
        ...state,
        slides: state.slides.map(s =>
          s.id === action.slideId
            ? {
                ...s,
                elements: [
                  ...s.elements,
                  ...action.elements.map(el => ({
                    ...el,
                    id: generateId(),
                    x: ('x' in el ? el.x : 0) + 2,
                    y: ('y' in el ? el.y : 0) + 2,
                  })),
                ] as SlideElement[],
              }
            : s,
        ),
      }
    }

    // Sort table rows by column
    case 'SORT_TABLE': {
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((el) => {
          if (el.id !== action.elementId || el.type !== 'table') return el
          const table = el as SlideTableElement
          const headerRows = action.excludeHeader && table.rows.length > 0 ? [table.rows[0]] : []
          const dataRows = action.excludeHeader ? table.rows.slice(1) : [...table.rows]
          const col = action.col

          dataRows.sort((a, b) => {
            const valA = (a[col] || '').replace(/<[^>]*>/g, '').trim()
            const valB = (b[col] || '').replace(/<[^>]*>/g, '').trim()
            const numA = parseFloat(valA)
            const numB = parseFloat(valB)
            // Numeric comparison if both values are valid numbers
            if (!isNaN(numA) && !isNaN(numB)) {
              return action.direction === 'asc' ? numA - numB : numB - numA
            }
            // String comparison
            const cmp = valA.localeCompare(valB, 'ja')
            return action.direction === 'asc' ? cmp : -cmp
          })

          return { ...table, rows: [...headerRows, ...dataRows] }
        }),
      }))
    }

    default:
      return state
  }
}

const INITIAL: SlidesDocument = {
  meta: { id: '', title: '', type: 'slides', createdAt: '', updatedAt: '' },
  slides: [],
  activeSlideId: '',
}

const undoableSlidesReducer = createUndoableReducer(slidesReducer)

export function useSlides() {
  const [undoState, rawDispatch] = useReducer(undoableSlidesReducer, initUndoable(INITIAL))
  const state = undoState.present
  const canUndo = undoState.past.length > 0
  const canRedo = undoState.future.length > 0
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useCallback((action: UndoableAction<SlideAction>) => {
    rawDispatch(action)
  }, [])

  useEffect(() => {
    if (!state.meta.id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveSlideDoc(state)
    }, 800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state])

  return { state, dispatch, canUndo, canRedo }
}
