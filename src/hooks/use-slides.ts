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
import { SLIDE_TEMPLATES } from '@/lib/templates'
import { saveSlideDoc } from '@/lib/document-store'
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
  | { type: 'ADD_COMMENT'; text: string; slideId?: string; parentId?: string }
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
  | { type: 'REPLACE_IMAGE'; slideId: string; elementId: string; src: string }
  // Phase G: Footer
  | { type: 'SET_GLOBAL_FOOTER'; footer: SlidesDocument['globalFooter'] }
  // Phase 5: Master slides
  | { type: 'ADD_MASTER'; master: SlideMaster }
  | { type: 'SET_SLIDE_MASTER'; slideId: string; masterId?: string }

export type { SlideAction }

function makeBlankSlide(): Slide {
  return SLIDE_TEMPLATES[0].buildSlide('dark-blue')
}

function updateSlide(state: SlidesDocument, slideId: string, fn: (s: Slide) => Slide): SlidesDocument {
  return { ...state, slides: state.slides.map((s) => (s.id === slideId ? fn(s) : s)) }
}

function slidesReducer(state: SlidesDocument, action: SlideAction): SlidesDocument {
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
      const slides = [...state.slides]
      const [moved] = slides.splice(action.fromIndex, 1)
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

    case 'UPDATE_ELEMENT_POSITION':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === action.elementId ? { ...e, x: action.x, y: action.y } : e)),
      }))

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
    case 'UPDATE_ELEMENTS_POSITION':
      return updateSlide(state, action.slideId, (s) => ({
        ...s,
        elements: s.elements.map((e) => {
          const move = action.moves.find((m) => m.elementId === e.id)
          return move ? { ...e, x: move.x, y: move.y } : e
        }),
      }))
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
      const sampleData = {
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
