'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDesign } from '@/hooks/use-design'
import type { DesignDocument, SlideElement, SlideTextElement, SlideShapeElement, SlideImageElement, DesignCanvasPreset, SlideThemeKey } from '@/types'
import { DESIGN_CANVAS_PRESETS, PRESET_CATEGORIES, getPresetByKey } from '@/lib/design-presets'
import { SLIDE_THEMES, THEME_KEYS } from '@/lib/themes'
import { generateId } from '@/lib/utils'
import { renderSlideElement, type CanvasCallbacks } from '@/components/slide-editor/element-renderer'
import { getElementTransform, getElementFilterStyle } from '@/lib/canvas-helpers'
import { computeRotatedResize, computeGroupResize } from '@/lib/resize-geometry'
import { computeSpacingMeasures, type SpacingMeasure } from '@/lib/spacing-measure'
import { fileToDataURL } from '@/lib/image-utils'
import { compressImage } from '@/lib/image-compress'
import { useToast } from '@/components/shared/toast'
import { exportDesignToPNG } from '@/lib/export/design-export'
import {
  ArrowLeft, Type, Square, Image, Undo2, Redo2, Download,
  Palette, ZoomIn, ZoomOut, ChevronDown,
  Trash2, Copy, MoveUp, MoveDown, ChevronsUp, ChevronsDown,
  Circle, Triangle, Star, Minus, PanelRight, PanelRightClose,
  Maximize, Grid3X3, Layers, Eye, EyeOff, Lock, Unlock, Paintbrush,
  GripVertical,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  LayoutTemplate, Italic, Underline,
  FlipHorizontal, FlipVertical, HelpCircle, X, ImagePlus,
  Diamond, Hexagon, Heart, Pentagon, MessageSquare, Plus,
  ArrowRight, ArrowUp, ArrowDown,
} from 'lucide-react'

interface Props {
  initialDoc: DesignDocument
}

// ─── Shape dropdown items ───
const SHAPE_OPTIONS: { shape: SlideShapeElement['shape']; icon: typeof Square; label: string }[] = [
  { shape: 'rect', icon: Square, label: '四角形' },
  { shape: 'circle', icon: Circle, label: '円' },
  { shape: 'triangle', icon: Triangle, label: '三角形' },
  { shape: 'diamond', icon: Diamond, label: 'ひし形' },
  { shape: 'pentagon', icon: Pentagon, label: '五角形' },
  { shape: 'hexagon', icon: Hexagon, label: '六角形' },
  { shape: 'star', icon: Star, label: '星' },
  { shape: 'heart', icon: Heart, label: 'ハート' },
  { shape: 'cross', icon: Plus, label: '十字' },
  { shape: 'callout', icon: MessageSquare, label: '吹き出し' },
  { shape: 'arrow-right', icon: ArrowRight, label: '矢印（右）' },
  { shape: 'arrow-left', icon: ArrowLeft, label: '矢印（左）' },
  { shape: 'arrow-up', icon: ArrowUp, label: '矢印（上）' },
  { shape: 'arrow-down', icon: ArrowDown, label: '矢印（下）' },
  { shape: 'line', icon: Minus, label: '線' },
]

export default function DesignEditor({ initialDoc }: Props) {
  // Refs let the save-time metadata getter read the latest locked/hidden/group
  // state without making useDesign depend on state declared further down.
  const lockedRef = useRef<Set<string>>(new Set())
  const hiddenRef = useRef<Set<string>>(new Set())
  const groupsRef = useRef<Map<string, string[]>>(new Map())
  const getCanvasMeta = useCallback(() => ({
    lockedElementIds: Array.from(lockedRef.current),
    hiddenElementIds: Array.from(hiddenRef.current),
    elementGroups: Object.fromEntries(groupsRef.current),
  }), [])

  const { doc, canvas, canvasSize, dispatch, canUndo, canRedo, saveStatus } = useDesign(getCanvasMeta)
  const { addToast } = useToast()
  const router = useRouter()


  // ─── Local UI state ───
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{
    mx: number; my: number; positions: { id: string; x: number; y: number }[]
  } | null>(null)
  const [zoom, setZoom] = useState(100)
  const [propertiesOpen, setPropertiesOpen] = useState(true)
  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false)
  const [canvasSizeDropdownOpen, setCanvasSizeDropdownOpen] = useState(false)
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false)
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [snapGuides, setSnapGuides] = useState<{ horizontal: number[]; vertical: number[] }>({ horizontal: [], vertical: [] })
  const [measureLines, setMeasureLines] = useState<SpacingMeasure[]>([])
  const [showGrid, setShowGrid] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'layers'>('properties')
  const [lockedIds, setLockedIds] = useState<Set<string>>(() => new Set(canvas?.lockedElementIds ?? []))
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set(canvas?.hiddenElementIds ?? []))
  const [layerDragId, setLayerDragId] = useState<string | null>(null)
  const [layerDragOverId, setLayerDragOverId] = useState<string | null>(null)
  const [groups, setGroups] = useState<Map<string, string[]>>(() => {
    const g = new Map<string, string[]>()
    if (canvas?.elementGroups) {
      for (const [k, v] of Object.entries(canvas.elementGroups)) {
        g.set(k, v)
      }
    }
    return g
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)
  const [resizing, setResizing] = useState<{ id: string; handle: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; rotation: number } | null>(null)
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
  const [multiResize, setMultiResize] = useState<{ handle: string; startX: number; startY: number; box: { x: number; y: number; w: number; h: number }; els: { id: string; x: number; y: number; w: number; h: number }[] } | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Keep the save-time getter refs pointed at the latest metadata.
  lockedRef.current = lockedIds
  hiddenRef.current = hiddenIds
  groupsRef.current = groups

  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const clipboardRef = useRef<SlideElement[]>([])
  const styleClipboardRef = useRef<Record<string, unknown> | null>(null)
  const lastNudgeTimeRef = useRef<number>(0)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const bgImageInputRef = useRef<HTMLInputElement>(null)
  const editingTextRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)

  // Load the initial doc
  useEffect(() => {
    dispatch({ type: 'LOAD', doc: initialDoc })
  }, [initialDoc.meta.id])

  // ─── Hydrate lockedIds/hiddenIds/groups FROM the loaded document (once per doc) ───
  // Read-only on load. Persistence (P0-4) handled at explicit save time, not via a
  // reactive effect (a reactive sync caused a render/save loop — see notes).
  const hydratedDocIdRef = useRef<string>('')
  useEffect(() => {
    const c: any = initialDoc.canvas
    if (!c) return
    if (hydratedDocIdRef.current === initialDoc.meta.id) return
    hydratedDocIdRef.current = initialDoc.meta.id
    if (Array.isArray(c.lockedElementIds) && c.lockedElementIds.length) setLockedIds(new Set(c.lockedElementIds))
    if (Array.isArray(c.hiddenElementIds) && c.hiddenElementIds.length) setHiddenIds(new Set(c.hiddenElementIds))
    if (c.elementGroups && typeof c.elementGroups === 'object' && Object.keys(c.elementGroups).length) {
      setGroups(new Map(Object.entries(c.elementGroups as Record<string, string[]>)))
    }
  }, [initialDoc.meta.id])

  // ─── Auto-focus contentEditable when editing text ───
  useEffect(() => {
    if (editingTextId && editingTextRef.current) {
      editingTextRef.current.focus()
      // Place cursor at end
      const sel = window.getSelection()
      if (sel) {
        sel.selectAllChildren(editingTextRef.current)
        sel.collapseToEnd()
      }
    }
  }, [editingTextId])

  // ─── Derived ───
  const elements = canvas?.elements ?? []
  const themeKey = canvas?.themeKey ?? 'dark-blue'
  const theme = SLIDE_THEMES[themeKey] ?? SLIDE_THEMES['dark-blue']
  const selectedElements = useMemo(() => elements.filter((el) => selectedIds.has(el.id)), [elements, selectedIds])
  const singleSelected = selectedElements.length === 1 ? selectedElements[0] : null
  const singleWithPos = singleSelected && 'x' in singleSelected ? singleSelected as (SlideElement & { x: number; y: number; w: number; h: number }) : null

  // Axis-aligned union bounding box of the (positioned) selected elements.
  // Used to render a single group resize frame when 2+ elements are selected.
  const selectionBox = useMemo(() => {
    const pos = selectedElements.filter((el): el is SlideElement & { x: number; y: number; w: number; h: number } => 'x' in el)
    if (pos.length < 2) return null
    const minX = Math.min(...pos.map((e) => e.x))
    const minY = Math.min(...pos.map((e) => e.y))
    const maxX = Math.max(...pos.map((e) => e.x + e.w))
    const maxY = Math.max(...pos.map((e) => e.y + e.h))
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }, [selectedElements])

  // ─── IME composition tracking ───
  useEffect(() => {
    const handleCompositionStart = () => { composingRef.current = true }
    const handleCompositionEnd = () => { composingRef.current = false }
    window.addEventListener('compositionstart', handleCompositionStart)
    window.addEventListener('compositionend', handleCompositionEnd)
    return () => {
      window.removeEventListener('compositionstart', handleCompositionStart)
      window.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [])

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (composingRef.current) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Locked elements are protected from deletion (unlock first to remove).
        const deletable = Array.from(selectedIds).filter((id) => !lockedIds.has(id))
        if (deletable.length > 0) {
          e.preventDefault()
          dispatch({ type: 'DELETE_ELEMENTS', ids: deletable })
          setSelectedIds(new Set())
        }
      }
      // Ctrl+Shift+C: copy style; Ctrl+Shift+V: paste style onto selection
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        const src = elements.find((el) => selectedIds.has(el.id)) as Record<string, unknown> | undefined
        if (src) {
          e.preventDefault()
          const STYLE_KEYS = ['fill', 'stroke', 'strokeWidth', 'borderRadius', 'opacity', 'rotation', 'fillMode', 'gradientFrom', 'gradientTo', 'gradientAngle', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowColor', 'blurAmount', 'glowAmount', 'glowColor', 'fontSize', 'fontWeight', 'color', 'align', 'fontFamily', 'fontStyle', 'textDecoration', 'letterSpacing', 'lineHeight', 'colorFilter', 'brightness', 'contrast', 'objectFit']
          const style: Record<string, unknown> = {}
          for (const k of STYLE_KEYS) if (src[k] !== undefined) style[k] = src[k]
          styleClipboardRef.current = style
          addToast('スタイルをコピーしました', 'success')
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        if (styleClipboardRef.current && selectedIds.size > 0) {
          e.preventDefault()
          const style = styleClipboardRef.current
          dispatch({ type: 'SNAPSHOT' })
          selectedIds.forEach((id) => {
            if (lockedIds.has(id)) return
            dispatch({ type: 'UPDATE_ELEMENT', id, props: style as any })
          })
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.size > 0) {
          clipboardRef.current = elements.filter((el) => selectedIds.has(el.id))
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboardRef.current.length > 0) {
          e.preventDefault()
          const newIds: string[] = []
          clipboardRef.current.forEach((el) => {
            const newId = generateId()
            newIds.push(newId)
            const clone = { ...JSON.parse(JSON.stringify(el)), id: newId } as SlideElement
            if ('x' in clone) { (clone as any).x += 20; (clone as any).y += 20 }
            dispatch({ type: 'ADD_ELEMENT', element: clone })
          })
          setSelectedIds(new Set(newIds))
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedIds(new Set(elements.map((el) => el.id)))
      }
      // Ctrl+D: duplicate selected elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedIds.size > 0) {
          e.preventDefault()
          dispatch({ type: 'SNAPSHOT' })
          const newIds: string[] = []
          elements.filter((el) => selectedIds.has(el.id)).forEach((el) => {
            const newId = generateId()
            newIds.push(newId)
            const clone = { ...JSON.parse(JSON.stringify(el)), id: newId } as SlideElement
            if ('x' in clone) { (clone as any).x += 20; (clone as any).y += 20 }
            dispatch({ type: 'ADD_ELEMENT', element: clone })
          })
          setSelectedIds(new Set(newIds))
        }
      }
      // Ctrl+] / Ctrl+[ : bring forward / send backward
      if ((e.ctrlKey || e.metaKey) && (e.key === ']' || e.key === '[')) {
        if (selectedIds.size > 0) {
          e.preventDefault()
          const action = e.key === ']' ? 'BRING_FORWARD' : 'SEND_BACKWARD'
          selectedIds.forEach((id) => dispatch({ type: action, id } as { type: 'BRING_FORWARD' | 'SEND_BACKWARD'; id: string }))
        }
      }
      // Ctrl+G: group selected elements
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        if (selectedIds.size > 1) {
          e.preventDefault()
          const groupId = generateId()
          setGroups((prev) => {
            const next = new Map(prev)
            next.set(groupId, Array.from(selectedIds))
            return next
          })
        }
      }
      // Ctrl+Shift+G: ungroup
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        if (selectedIds.size > 0) {
          e.preventDefault()
          setGroups((prev) => {
            const next = new Map(prev)
            for (const [gid, memberIds] of prev) {
              if (memberIds.some((mid) => selectedIds.has(mid))) {
                next.delete(gid)
              }
            }
            return next
          })
        }
      }
      // Arrow keys: nudge selected elements (locked elements are not moved)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const movableIds = Array.from(selectedIds).filter((id) => !lockedIds.has(id))
        if (movableIds.length > 0) {
          e.preventDefault()
          const now = Date.now()
          if (now - lastNudgeTimeRef.current > 500) {
            dispatch({ type: 'SNAPSHOT' })
          }
          lastNudgeTimeRef.current = now
          const step = e.shiftKey ? 10 : 1
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
          if (movableIds.length === 1) {
            const id = movableIds[0]
            const el = elements.find((x) => x.id === id)
            if (el && 'x' in el) {
              dispatch({ type: 'MOVE_ELEMENT', id, x: el.x + dx, y: el.y + dy })
            }
          } else {
            const moves = movableIds
              .map((id) => {
                const el = elements.find((x) => x.id === id)
                if (el && 'x' in el) return { id, x: el.x + dx, y: el.y + dy }
                return null
              })
              .filter((m): m is { id: string; x: number; y: number } => m !== null)
            if (moves.length > 0) {
              dispatch({ type: 'BATCH_MOVE', moves })
            }
          }
        }
      }
      // "?" key: toggle shortcuts help dialog
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, elements, dispatch, lockedIds, addToast])

  // ─── Close dropdowns on outside click ───
  useEffect(() => {
    function handleGlobalClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Don't close if clicking inside a dropdown
      if (target.closest('[data-dropdown]')) return
      setShapeDropdownOpen(false)
      setCanvasSizeDropdownOpen(false)
      setThemeDropdownOpen(false)
      setTemplateDropdownOpen(false)
      setContextMenu(null)
    }
    // Use 'click' instead of 'mousedown' to avoid interference with drag/element handlers
    document.addEventListener('click', handleGlobalClick, true)
    return () => document.removeEventListener('click', handleGlobalClick, true)
  }, [])

  // ─── Ctrl+Wheel zoom ───
  useEffect(() => {
    const area = canvasAreaRef.current
    if (!area) return
    function handleWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -10 : 10
      setZoom((prev) => Math.min(400, Math.max(25, prev + delta)))
    }
    area.addEventListener('wheel', handleWheel, { passive: false })
    return () => area.removeEventListener('wheel', handleWheel)
  }, [])

  // ─── Canvas scale ───
  const canvasScale = useMemo(() => {
    return zoom / 100
  }, [zoom])

  // ─── Element interaction handlers ───
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg === 'true') {
      setSelectedIds(new Set())
      // Start marquee selection
      const canvasEl = canvasRef.current
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect()
        const scale = canvasScale
        const mx = (e.clientX - rect.left) / scale
        const my = (e.clientY - rect.top) / scale
        setMarquee({ startX: mx, startY: my, currentX: mx, currentY: my })
      }
    }
    setShapeDropdownOpen(false)
    setCanvasSizeDropdownOpen(false)
    setThemeDropdownOpen(false)
    setTemplateDropdownOpen(false)
    setContextMenu(null)
  }, [canvasScale])

  const handleElementMouseDown = useCallback((e: React.MouseEvent, el: SlideElement) => {
    if (editingTextId === el.id) return
    e.stopPropagation()
    let newSelected: Set<string>
    if (e.shiftKey) {
      newSelected = new Set(selectedIds)
      newSelected.has(el.id) ? newSelected.delete(el.id) : newSelected.add(el.id)
    } else {
      // Check if this element belongs to a group — select all group members
      let groupMembers: string[] | null = null
      for (const [, memberIds] of groups) {
        if (memberIds.includes(el.id)) {
          groupMembers = memberIds
          break
        }
      }
      newSelected = groupMembers ? new Set(groupMembers) : new Set([el.id])
    }
    // Alt+Drag: duplicate element and drag the clone
    if (e.altKey && 'x' in el) {
      dispatch({ type: 'SNAPSHOT' })
      const newId = generateId()
      const clone = { ...JSON.parse(JSON.stringify(el)), id: newId } as SlideElement
      dispatch({ type: 'ADD_ELEMENT', element: clone })
      const cloneSelected = new Set([newId])
      setSelectedIds(cloneSelected)
      setDraggingId(newId)
      const positions = [{ id: newId, x: 'x' in clone ? (clone as any).x : 0, y: 'y' in clone ? (clone as any).y : 0 }]
      setDragStart({ mx: e.clientX, my: e.clientY, positions })
      return
    }

    setSelectedIds(newSelected)
    dispatch({ type: 'SNAPSHOT' })
    setDraggingId(el.id)

    const idsToMove = newSelected.has(el.id) ? Array.from(newSelected) : [el.id]
    const positions = idsToMove.map((id) => {
      const found = elements.find((x) => x.id === id)!
      return { id, x: 'x' in found ? found.x : 0, y: 'y' in found ? found.y : 0 }
    })
    setDragStart({ mx: e.clientX, my: e.clientY, positions })
  }, [selectedIds, elements, editingTextId, groups, dispatch])

  const handleTextDoubleClick = useCallback((e: React.MouseEvent, el: SlideElement) => {
    e.stopPropagation()
    if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
      setEditingTextId(el.id)
      setSelectedIds(new Set([el.id]))
    }
  }, [])

  const handleTextBlur = useCallback((el: SlideElement, newContent: string) => {
    if (editingTextId === el.id) {
      dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { content: newContent } })
      setEditingTextId(null)
    }
  }, [editingTextId, dispatch])

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent, el: SlideElement) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const target = e.currentTarget as HTMLDivElement
      dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { content: target.innerText } })
      setEditingTextId(null)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingTextId(null)
    }
  }, [dispatch])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, el: SlideElement, handle: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!('x' in el)) return
    dispatch({ type: 'SNAPSHOT' })
    const cursorMap: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' }
    document.body.style.cursor = cursorMap[handle] ?? 'default'
    setResizing({ id: el.id, handle, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y, origW: el.w, origH: el.h, rotation: (el as SlideElement & { rotation?: number }).rotation ?? 0 })
  }, [dispatch])

  const handleGroupResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!selectionBox) return
    dispatch({ type: 'SNAPSHOT' })
    const cursorMap: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' }
    document.body.style.cursor = cursorMap[handle] ?? 'default'
    const els = selectedElements
      .filter((el): el is SlideElement & { x: number; y: number; w: number; h: number } => 'x' in el)
      .map((el) => ({ id: el.id, x: el.x, y: el.y, w: el.w, h: el.h }))
    setMultiResize({ handle, startX: e.clientX, startY: e.clientY, box: selectionBox, els })
  }, [selectionBox, selectedElements, dispatch])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const scale = canvasScale

    // ─── Group (multi-select) resize ───
    if (multiResize) {
      const resizes = computeGroupResize({
        handle: multiResize.handle,
        box: multiResize.box,
        els: multiResize.els,
        rawDx: (e.clientX - multiResize.startX) / scale,
        rawDy: (e.clientY - multiResize.startY) / scale,
      })
      dispatch({ type: 'BATCH_RESIZE', resizes })
      return
    }

    // ─── Resize logic (rotation-aware; keeps the opposite corner anchored) ───
    if (resizing) {
      const { x, y, w, h } = computeRotatedResize({
        handle: resizing.handle,
        origX: resizing.origX,
        origY: resizing.origY,
        origW: resizing.origW,
        origH: resizing.origH,
        rotation: resizing.rotation,
        rawDx: (e.clientX - resizing.startX) / scale,
        rawDy: (e.clientY - resizing.startY) / scale,
        lockAspect: e.shiftKey,
      })
      dispatch({ type: 'RESIZE_ELEMENT', id: resizing.id, x, y, w, h })
      return
    }

    // ─── Marquee logic ───
    if (marquee && !draggingId) {
      const canvasEl = canvasRef.current
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect()
        const mx = (e.clientX - rect.left) / scale
        const my = (e.clientY - rect.top) / scale
        setMarquee({ ...marquee, currentX: mx, currentY: my })
        const left = Math.min(marquee.startX, mx)
        const top = Math.min(marquee.startY, my)
        const right = Math.max(marquee.startX, mx)
        const bottom = Math.max(marquee.startY, my)
        const intersecting = new Set<string>()
        for (const el of elements) {
          if (!('x' in el)) continue
          if (el.x < right && el.x + el.w > left && el.y < bottom && el.y + el.h > top) {
            intersecting.add(el.id)
          }
        }
        setSelectedIds(intersecting)
      }
      return
    }

    // ─── Drag logic ───
    if (!draggingId || !dragStart) return
    const dx = (e.clientX - dragStart.mx) / scale
    const dy = (e.clientY - dragStart.my) / scale

    const SNAP_THRESHOLD = 5
    const newHGuides: number[] = []
    const newVGuides: number[] = []

    dragStart.positions.forEach(({ id, x, y }) => {
      let newX = x + dx
      let newY = y + dy

      const draggedEl = elements.find((el) => el.id === id)
      if (draggedEl && 'x' in draggedEl && 'w' in draggedEl) {
        const dw = draggedEl.w
        const dh = draggedEl.h
        const dragLeft = newX
        const dragRight = newX + dw
        const dragCenterX = newX + dw / 2
        const dragTop = newY
        const dragBottom = newY + dh
        const dragCenterY = newY + dh / 2

        for (const other of elements) {
          if (other.id === id) continue
          if (!('x' in other && 'w' in other)) continue
          const ox = other.x
          const oy = other.y
          const ow = other.w
          const oh = other.h

          const vPairs: [number, number][] = [
            [dragLeft, ox], [dragLeft, ox + ow], [dragLeft, ox + ow / 2],
            [dragRight, ox], [dragRight, ox + ow], [dragRight, ox + ow / 2],
            [dragCenterX, ox], [dragCenterX, ox + ow], [dragCenterX, ox + ow / 2],
          ]
          for (const [dEdge, oEdge] of vPairs) {
            if (Math.abs(dEdge - oEdge) < SNAP_THRESHOLD) {
              newX += oEdge - dEdge
              newVGuides.push(oEdge)
              break
            }
          }

          const hPairs: [number, number][] = [
            [dragTop, oy], [dragTop, oy + oh], [dragTop, oy + oh / 2],
            [dragBottom, oy], [dragBottom, oy + oh], [dragBottom, oy + oh / 2],
            [dragCenterY, oy], [dragCenterY, oy + oh], [dragCenterY, oy + oh / 2],
          ]
          for (const [dEdge, oEdge] of hPairs) {
            if (Math.abs(dEdge - oEdge) < SNAP_THRESHOLD) {
              newY += oEdge - dEdge
              newHGuides.push(oEdge)
              break
            }
          }
        }

        // ── Snap to canvas edges and center ──
        const canvasVLines = [0, canvasSize.width / 2, canvasSize.width]
        const canvasHLines = [0, canvasSize.height / 2, canvasSize.height]
        const dEdgesX: number[] = [newX, newX + dw / 2, newX + dw]
        for (const dEdge of dEdgesX) {
          for (const line of canvasVLines) {
            if (Math.abs(dEdge - line) < SNAP_THRESHOLD) { newX += line - dEdge; newVGuides.push(line); break }
          }
        }
        const dEdgesY: number[] = [newY, newY + dh / 2, newY + dh]
        for (const dEdge of dEdgesY) {
          for (const line of canvasHLines) {
            if (Math.abs(dEdge - line) < SNAP_THRESHOLD) { newY += line - dEdge; newHGuides.push(line); break }
          }
        }
      }

      dispatch({ type: 'MOVE_ELEMENT', id, x: newX, y: newY })
    })

    setSnapGuides({ horizontal: newHGuides, vertical: newVGuides })

    // ── Spacing measurements (single-element drag only) ──
    if (dragStart.positions.length === 1) {
      const id = dragStart.positions[0].id
      const moved = elements.find((el) => el.id === id)
      if (moved && 'x' in moved && 'w' in moved) {
        const box = { x: (moved.x as number), y: (moved.y as number), w: moved.w, h: moved.h }
        const others = elements
          .filter((el) => el.id !== id && 'x' in el && 'w' in el)
          .map((el) => ({ x: (el as any).x, y: (el as any).y, w: (el as any).w, h: (el as any).h }))
        setMeasureLines(computeSpacingMeasures(box, others))
      }
    } else {
      setMeasureLines([])
    }
  }, [draggingId, dragStart, canvasScale, dispatch, elements, resizing, marquee, multiResize, canvasSize])

  const handleMouseUp = useCallback(() => {
    if (resizing || multiResize) {
      document.body.style.cursor = ''
      setResizing(null)
      setMultiResize(null)
    }
    setDraggingId(null)
    setDragStart(null)
    setSnapGuides({ horizontal: [], vertical: [] })
    setMeasureLines([])
    setMarquee(null)
  }, [resizing, multiResize])

  // ─── Zoom to fit ───
  const zoomToFit = useCallback(() => {
    const area = canvasAreaRef.current
    if (!area) return
    const vw = area.clientWidth - 64
    const vh = area.clientHeight - 64
    const fitZoom = Math.min(vw / canvasSize.width, vh / canvasSize.height) * 90
    setZoom(Math.round(Math.max(25, Math.min(400, fitZoom))))
  }, [canvasSize])

  // ─── Insert actions ───
  const insertText = useCallback(() => {
    const id = generateId()
    const el: SlideTextElement = {
      id,
      type: 'body',
      x: canvasSize.width / 2 - 200,
      y: canvasSize.height / 2 - 30,
      w: 400,
      h: 60,
      content: 'テキストを入力',
      fontSize: 32,
      fontWeight: '400',
      align: 'center',
      color: theme.bodyColor,
    }
    dispatch({ type: 'ADD_ELEMENT', element: el })
    setSelectedIds(new Set([id]))
  }, [canvasSize, theme, dispatch])

  const insertShape = useCallback((shape: SlideShapeElement['shape']) => {
    const id = generateId()
    const size = shape === 'line' ? { w: 200, h: 4 } : { w: 150, h: 150 }
    const el: SlideShapeElement = {
      id,
      type: 'shape',
      shape,
      x: canvasSize.width / 2 - size.w / 2,
      y: canvasSize.height / 2 - size.h / 2,
      ...size,
      fill: theme.accentColor,
    }
    dispatch({ type: 'ADD_ELEMENT', element: el })
    setSelectedIds(new Set([id]))
    setShapeDropdownOpen(false)
  }, [canvasSize, theme, dispatch])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToDataURL(file)
      const src = await compressImage(dataUrl, 1200)
      const id = generateId()
      const el: SlideImageElement = {
        id,
        type: 'image',
        x: canvasSize.width / 2 - 200,
        y: canvasSize.height / 2 - 150,
        w: 400,
        h: 300,
        src,
        alt: file.name,
      }
      dispatch({ type: 'ADD_ELEMENT', element: el })
      setSelectedIds(new Set([id]))
    } catch {
      addToast('画像の読み込みに失敗しました', 'error')
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }, [canvasSize, dispatch, addToast])

  const handleBgImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToDataURL(file)
      const src = await compressImage(dataUrl, 1920)
      dispatch({ type: 'SET_BACKGROUND_IMAGE', src })
    } catch {
      addToast('背景画像の読み込みに失敗しました', 'error')
    }
    if (bgImageInputRef.current) bgImageInputRef.current.value = ''
  }, [dispatch, addToast])

  // ─── Canvas size change ───
  const changeCanvasSize = useCallback((preset: DesignCanvasPreset) => {
    const size = getPresetByKey(preset)
    if (size) {
      dispatch({ type: 'SET_CANVAS_SIZE', canvasSize: size })
    }
    setCanvasSizeDropdownOpen(false)
  }, [dispatch])

  // ─── Theme change ───
  const changeTheme = useCallback((key: SlideThemeKey) => {
    dispatch({ type: 'SET_THEME', themeKey: key })
    setThemeDropdownOpen(false)
  }, [dispatch])

  // ─── Export ───
  const handleExport = useCallback(async () => {
    const el = canvasRef.current
    if (!el) return
    try {
      await exportDesignToPNG(el, canvasSize.width, canvasSize.height, `${doc.meta?.title || 'design'}.png`)
      addToast('PNG をエクスポートしました', 'success')
    } catch {
      addToast('エクスポートに失敗しました。スクリーンショット機能をご利用ください。', 'error')
    }
  }, [canvasSize, doc.meta?.title, addToast])

  // ─── Title ───
  const handleTitleSubmit = useCallback(() => {
    dispatch({ type: 'SET_TITLE', title: titleDraft })
    setTitleEditing(false)
  }, [titleDraft, dispatch])

  // ─── Properties panel updates ───
  const updateElementProp = useCallback(<K extends string>(key: K, value: unknown) => {
    if (!singleSelected) return
    dispatch({ type: 'UPDATE_ELEMENT', id: singleSelected.id, props: { [key]: value } as any })
  }, [singleSelected, dispatch])

  // Shift+↑/↓ on a numeric property input nudges by 10 (native arrows already do ±1).
  const numberKeyStep = useCallback((e: React.KeyboardEvent, key: string, current: number) => {
    if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      updateElementProp(key, Math.round(current) + (e.key === 'ArrowUp' ? 10 : -10))
    }
  }, [updateElementProp])

  // Align the selected element(s) to the canvas edges / center.
  const alignToCanvas = useCallback((dir: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    const cw = canvasSize.width, ch = canvasSize.height
    const targets = selectedElements.filter((el): el is SlideElement & { x: number; y: number; w: number; h: number } => 'x' in el && !lockedIds.has(el.id))
    if (targets.length === 0) return
    dispatch({ type: 'SNAPSHOT' })
    targets.forEach((el) => {
      let prop: 'x' | 'y'; let value: number
      if (dir === 'left') { prop = 'x'; value = 0 }
      else if (dir === 'hcenter') { prop = 'x'; value = Math.round((cw - el.w) / 2) }
      else if (dir === 'right') { prop = 'x'; value = cw - el.w }
      else if (dir === 'top') { prop = 'y'; value = 0 }
      else if (dir === 'vcenter') { prop = 'y'; value = Math.round((ch - el.h) / 2) }
      else { prop = 'y'; value = ch - el.h }
      dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { [prop]: value } as any })
    })
  }, [canvasSize, selectedElements, lockedIds, dispatch])

  // ─── Layer ordering ───
  const bringToFront = useCallback(() => {
    if (!singleSelected) return
    dispatch({ type: 'BRING_TO_FRONT', id: singleSelected.id })
  }, [singleSelected, dispatch])
  const sendToBack = useCallback(() => {
    if (!singleSelected) return
    dispatch({ type: 'SEND_TO_BACK', id: singleSelected.id })
  }, [singleSelected, dispatch])
  const bringForward = useCallback(() => {
    if (!singleSelected) return
    dispatch({ type: 'BRING_FORWARD', id: singleSelected.id })
  }, [singleSelected, dispatch])
  const sendBackward = useCallback(() => {
    if (!singleSelected) return
    dispatch({ type: 'SEND_BACKWARD', id: singleSelected.id })
  }, [singleSelected, dispatch])

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    dispatch({ type: 'DELETE_ELEMENTS', ids: Array.from(selectedIds) })
    setSelectedIds(new Set())
  }, [selectedIds, dispatch])

  const duplicateSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    const newIds: string[] = []
    elements.filter((el) => selectedIds.has(el.id)).forEach((el) => {
      const newId = generateId()
      newIds.push(newId)
      const clone = { ...JSON.parse(JSON.stringify(el)), id: newId } as SlideElement
      if ('x' in clone) { (clone as any).x += 20; (clone as any).y += 20 }
      dispatch({ type: 'ADD_ELEMENT', element: clone })
    })
    setSelectedIds(new Set(newIds))
  }, [selectedIds, elements, dispatch])

  // ─── Element context menu ───
  const handleElementContextMenu = useCallback((e: React.MouseEvent, el: SlideElement) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIds((prev) => prev.has(el.id) ? prev : new Set([el.id]))
    const canvasArea = canvasAreaRef.current
    const rect = canvasArea?.getBoundingClientRect()
    setContextMenu({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
      elementId: el.id,
    })
  }, [])

  // ─── Canvas callbacks for renderSlideElement ───
  const canvasCallbacks: CanvasCallbacks = useMemo(() => ({
    onMouseDown: handleElementMouseDown,
    onClick: (_id: string, e: React.MouseEvent) => { e.stopPropagation() },
    onDoubleClick: () => {},
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onConnectorEndpointMouseDown: () => {},
    onTableEdit: () => {},
    onTableCellBlur: () => {},
    isEditingTable: () => false,
    selectedIds,
    draggingId,
    theme,
    connectorDragId: null,
    connectorDragMode: null,
    connectorDragPoint: null,
    colResizeDrag: null,
    onColResizeStart: () => {},
  }), [handleElementMouseDown, selectedIds, draggingId, theme])

  // ─── Build combined filter string for elements ───
  const buildElementFilter = useCallback((el: SlideElement) => {
    const parts: string[] = []
    if ((el as any).shadowBlur) {
      parts.push(`drop-shadow(${(el as any).shadowOffsetX ?? 0}px ${(el as any).shadowOffsetY ?? 0}px ${(el as any).shadowBlur ?? 0}px ${(el as any).shadowColor ?? '#000'})`)
    }
    if ((el as any).glowAmount) {
      parts.push(`drop-shadow(0 0 ${(el as any).glowAmount}px ${(el as any).glowColor ?? '#fff'})`)
    }
    if ((el as any).blurAmount) {
      parts.push(`blur(${(el as any).blurAmount}px)`)
    }
    return parts.length > 0 ? { filter: parts.join(' ') } : {}
  }, [])

  // ─── Sorted elements by z-index ───
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  }, [elements])

  // ─── Render ───
  return (
    <div data-editor-shell className="fixed inset-0 bg-slate-950 flex flex-col select-none">
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />

      {/* ── Toolbar ── */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-3 gap-2 shrink-0 z-20">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">ダッシュボード</span>
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Title */}
        {titleEditing ? (
          <input
            className="bg-slate-800 text-white text-sm px-2 py-1 rounded border border-slate-600 outline-none focus:border-indigo-500 w-48"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
          />
        ) : (
          <button
            className="text-white text-sm font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors max-w-[200px] truncate"
            onClick={() => { setTitleDraft(doc.meta?.title ?? ''); setTitleEditing(true) }}
          >
            {doc.meta?.title || '無題のデザイン'}
          </button>
        )}

        {/* Save status indicator */}
        <span
          data-save-status={saveStatus}
          className={`flex items-center gap-1 text-[11px] px-1.5 select-none ${
            saveStatus === 'error' ? 'text-red-400' : saveStatus === 'saved' ? 'text-emerald-400' : 'text-slate-500'
          }`}
          title={saveStatus === 'error' ? '保存に失敗しました' : ''}
        >
          {saveStatus === 'saving' && (
            <span className="w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
          )}
          {saveStatus === 'saving' ? '保存中…'
            : saveStatus === 'saved' ? '✓ 保存済み'
            : saveStatus === 'unsaved' ? '未保存の変更'
            : saveStatus === 'error' ? '⚠ 保存失敗'
            : ''}
        </span>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Insert Text */}
        <button
          onClick={insertText}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
          title="テキスト挿入"
        >
          <Type size={15} />
          <span className="hidden md:inline">テキスト</span>
        </button>

        {/* Insert Shape */}
        <div className="relative">
          <button
            onClick={() => setShapeDropdownOpen(!shapeDropdownOpen)}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
            title="図形挿入"
          >
            <Square size={15} />
            <span className="hidden md:inline">図形</span>
            <ChevronDown size={12} />
          </button>
          {shapeDropdownOpen && (
            <div data-dropdown="true" className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-36 z-50 max-h-80 overflow-y-auto">
              {SHAPE_OPTIONS.map(({ shape, icon: Icon, label }) => (
                <button
                  key={shape}
                  onClick={() => insertShape(shape)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Insert Image */}
        <button
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
          title="画像挿入"
        >
          <Image size={15} />
          <span className="hidden md:inline">画像</span>
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Canvas Size Picker */}
        <div className="relative">
          <button
            onClick={() => setCanvasSizeDropdownOpen(!canvasSizeDropdownOpen)}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
            title="キャンバスサイズ"
          >
            <span>{canvasSize.width} × {canvasSize.height}</span>
            <ChevronDown size={12} />
          </button>
          {canvasSizeDropdownOpen && (
            <div data-dropdown="true" className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-56 z-50 max-h-80 overflow-y-auto">
              {PRESET_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div className="px-3 py-1 text-xs text-slate-500 font-medium">{cat.label}</div>
                  {cat.presets.map((presetKey) => {
                    const p = getPresetByKey(presetKey)
                    if (!p) return null
                    return (
                      <button
                        key={presetKey}
                        onClick={() => changeCanvasSize(presetKey)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors ${
                          canvasSize.preset === presetKey ? 'text-indigo-400 bg-slate-700/50' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <span>{p.label}</span>
                        <span className="text-xs text-slate-500">{p.width}×{p.height}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme Picker */}
        <div className="relative">
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
            title="テーマ"
          >
            <Palette size={15} />
            <span className="hidden md:inline">{theme.label}</span>
            <ChevronDown size={12} />
          </button>
          {themeDropdownOpen && (
            <div data-dropdown="true" className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-48 z-50">
              {THEME_KEYS.map((key) => {
                const t = SLIDE_THEMES[key]
                return (
                  <button
                    key={key}
                    onClick={() => changeTheme(key)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                      themeKey === key ? 'text-indigo-400 bg-slate-700/50' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-slate-600 shrink-0"
                      style={{ background: t.accentColor }}
                    />
                    {t.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Templates */}
        <div className="relative">
          <button
            onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
            title="テンプレート"
          >
            <LayoutTemplate size={15} />
            <span className="hidden md:inline">テンプレート</span>
            <ChevronDown size={12} />
          </button>
          {templateDropdownOpen && (
            <div data-dropdown="true" className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 w-56 z-50">
              {[
                { label: 'SNS投稿カード', key: 'sns-card' },
                { label: 'セールバナー', key: 'sale-banner' },
                { label: '引用カード', key: 'quote-card' },
                { label: 'タイトルスライド', key: 'title-slide' },
              ].map((tpl) => (
                <button
                  key={tpl.key}
                  onClick={() => {
                    const tplElements: SlideElement[] = []
                    if (tpl.key === 'sns-card') {
                      tplElements.push(
                        { id: generateId(), type: 'shape', shape: 'rect', x: 90, y: 90, w: 900, h: 900, fill: theme.accentColor, zIndex: 0, cornerRadius: 16 } as SlideShapeElement,
                        { id: generateId(), type: 'title', x: 140, y: 340, w: 800, h: 120, content: 'タイトルを入力', fontSize: 64, fontWeight: '700', align: 'center', color: theme.titleColor, zIndex: 1 } as SlideTextElement,
                        { id: generateId(), type: 'body', x: 190, y: 500, w: 700, h: 80, content: 'サブテキストをここに入力', fontSize: 28, fontWeight: '400', align: 'center', color: theme.bodyColor, zIndex: 2 } as SlideTextElement,
                      )
                    } else if (tpl.key === 'sale-banner') {
                      tplElements.push(
                        { id: generateId(), type: 'title', x: 140, y: 200, w: 800, h: 150, content: 'SALE', fontSize: 120, fontWeight: '900', align: 'center', color: theme.titleColor, zIndex: 1 } as SlideTextElement,
                        { id: generateId(), type: 'subtitle', x: 190, y: 400, w: 700, h: 100, content: '50% OFF', fontSize: 72, fontWeight: '700', align: 'center', color: theme.accentColor, zIndex: 2 } as SlideTextElement,
                        { id: generateId(), type: 'shape', shape: 'star', x: 800, y: 100, w: 180, h: 180, fill: theme.accentColor, zIndex: 0 } as SlideShapeElement,
                        { id: generateId(), type: 'body', x: 190, y: 550, w: 700, h: 60, content: '期間限定セール開催中', fontSize: 28, fontWeight: '400', align: 'center', color: theme.bodyColor, zIndex: 3 } as SlideTextElement,
                      )
                    } else if (tpl.key === 'quote-card') {
                      tplElements.push(
                        { id: generateId(), type: 'title', x: 120, y: 250, w: 840, h: 300, content: '「ここに引用文を入力」', fontSize: 48, fontWeight: '500', align: 'center', color: theme.titleColor, zIndex: 1 } as SlideTextElement,
                        { id: generateId(), type: 'label', x: 300, y: 700, w: 480, h: 50, content: '— 著者名', fontSize: 24, fontWeight: '400', align: 'center', color: theme.bodyColor, zIndex: 2 } as SlideTextElement,
                      )
                    } else if (tpl.key === 'title-slide') {
                      tplElements.push(
                        { id: generateId(), type: 'title', x: 140, y: 300, w: 800, h: 120, content: 'プレゼンタイトル', fontSize: 64, fontWeight: '700', align: 'center', color: theme.titleColor, zIndex: 1 } as SlideTextElement,
                        { id: generateId(), type: 'shape', shape: 'line', x: 340, y: 460, w: 400, h: 4, fill: theme.accentColor, zIndex: 2 } as SlideShapeElement,
                        { id: generateId(), type: 'subtitle', x: 190, y: 500, w: 700, h: 80, content: 'サブタイトルを入力', fontSize: 32, fontWeight: '400', align: 'center', color: theme.bodyColor, zIndex: 3 } as SlideTextElement,
                      )
                    }
                    dispatch({ type: 'REPLACE_ALL_ELEMENTS', elements: tplElements })
                    setSelectedIds(new Set())
                    setTemplateDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <LayoutTemplate size={14} className="text-slate-500" />
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="元に戻す (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="やり直す (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Zoom */}
        <button
          onClick={() => setZoom((z) => Math.max(25, z - 25))}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="縮小"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-slate-400 w-10 text-center tabular-nums">{zoom}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(400, z + 25))}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="拡大"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomToFit}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="フィット"
        >
          <Maximize size={16} />
        </button>
        <button
          onClick={() => setShowGrid((v) => !v)}
          className={`p-1.5 rounded transition-colors ${showGrid ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="グリッド表示"
        >
          <Grid3X3 size={16} />
        </button>
        <button
          onClick={() => setShowShortcuts((v) => !v)}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="ショートカット一覧 (?)"
        >
          <HelpCircle size={16} />
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Layers panel toggle */}
        <button
          onClick={() => { setPropertiesOpen(true); setRightPanelTab('layers') }}
          className={`p-1.5 rounded transition-colors ${rightPanelTab === 'layers' && propertiesOpen ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="レイヤーパネル"
        >
          <Layers size={16} />
        </button>

        {/* Properties panel toggle */}
        <button
          onClick={() => setPropertiesOpen(!propertiesOpen)}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="プロパティパネル"
        >
          {propertiesOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded transition-colors"
          title="PNGエクスポート"
        >
          <Download size={14} />
          <span className="hidden sm:inline">エクスポート</span>
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div
          ref={canvasAreaRef}
          className="relative flex-1 overflow-auto flex items-center justify-center bg-slate-950 p-8"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `scale(${canvasScale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Canvas */}
            <div
              ref={canvasRef}
              className="relative shadow-2xl"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                background: canvas?.backgroundColor ?? theme.background,
              }}
              data-canvas-bg="true"
            >
              {/* Background image */}
              {canvas?.backgroundImage && (
                <img
                  src={canvas.backgroundImage}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                  draggable={false}
                />
              )}
              {/* Elements */}
              {sortedElements.map((el) => {
                const isSelected = selectedIds.has(el.id)
                const isHidden = hiddenIds.has(el.id)
                const isLocked = lockedIds.has(el.id)

                if (isHidden) return null
                if (el.type === 'connector') return null

                if (el.type === 'shape' || el.type === 'image') {
                  return (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.w,
                        height: el.h,
                        zIndex: el.zIndex ?? 0,
                        transform: getElementTransform(el),
                        ...getElementFilterStyle(el),
                        ...buildElementFilter(el),
                        cursor: isLocked ? 'not-allowed' : draggingId ? 'grabbing' : 'grab',
                        ...(el.type === 'image' ? { overflow: 'hidden' as const } : {}),
                      }}
                      onMouseDown={(e) => { if (!isLocked) handleElementMouseDown(e, el); else { e.stopPropagation(); setSelectedIds(new Set([el.id])) } }}
                      onContextMenu={(e) => handleElementContextMenu(e, el)}
                    >
                      {el.type === 'image' && (
                        <img
                          src={(el as SlideImageElement).src}
                          alt={(el as SlideImageElement).alt ?? ''}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: (el as SlideImageElement).objectFit ?? 'cover',
                            display: 'block',
                          }}
                          draggable={false}
                        />
                      )}
                      {el.type === 'shape' && ((el as any).fillMode === 'gradient' ? (
                        <div className="absolute inset-0" style={{
                          background: `linear-gradient(${(el as any).gradientAngle ?? 180}deg, ${(el as any).gradientFrom ?? (el as SlideShapeElement).fill ?? theme.accentColor}, ${(el as any).gradientTo ?? '#000'})`,
                          borderRadius: (el as SlideShapeElement).shape === 'circle' ? '50%' : `${(el as any).borderRadius ?? 0}%`,
                          border: (el as SlideShapeElement).strokeWidth ? `${(el as SlideShapeElement).strokeWidth}px solid ${(el as SlideShapeElement).stroke ?? '#000'}` : undefined,
                        }} />
                      ) : (
                        renderSlideElement({ ...el, x: 0, y: 0, w: 100, h: 100 } as typeof el, 'canvas', canvasCallbacks)
                      ))}
                      {isSelected && (
                        <div className={`absolute inset-0 border-2 pointer-events-none rounded-sm ${isLocked ? 'border-amber-500/70 border-dashed' : 'border-indigo-500'}`}>
                          {!isLocked && ['nw', 'ne', 'sw', 'se'].map((pos) => {
                            const style: React.CSSProperties = {
                              position: 'absolute',
                              width: 12,
                              height: 12,
                              background: 'white',
                              border: '2px solid #6366f1',
                              borderRadius: 2,
                              pointerEvents: 'auto',
                              ...(pos.includes('n') ? { top: -6 } : { bottom: -6 }),
                              ...(pos.includes('w') ? { left: -6 } : { right: -6 }),
                              cursor: pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize',
                            }
                            return <div key={pos} style={style} onMouseDown={(e) => handleResizeMouseDown(e, el, pos)} />
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
                  const textEl = el as SlideTextElement
                  return (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.w,
                        height: el.h,
                        zIndex: el.zIndex ?? 0,
                        transform: getElementTransform(el),
                        opacity: el.opacity != null ? el.opacity / 100 : 1,
                        cursor: isLocked ? 'not-allowed' : draggingId ? 'grabbing' : 'grab',
                        fontSize: textEl.fontSize,
                        fontWeight: textEl.fontWeight,
                        color: textEl.color ?? theme.bodyColor,
                        textAlign: textEl.align,
                        fontFamily: textEl.fontFamily ?? 'inherit',
                        fontStyle: textEl.fontStyle ?? 'normal',
                        textDecoration: textEl.textDecoration ?? 'none',
                        letterSpacing: textEl.letterSpacing ? `${textEl.letterSpacing}px` : undefined,
                        lineHeight: textEl.lineHeight ? textEl.lineHeight : undefined,
                        display: 'flex',
                        alignItems: textEl.verticalAlign === 'bottom' ? 'flex-end' : textEl.verticalAlign === 'middle' ? 'center' : 'flex-start',
                        overflow: 'hidden',
                        wordBreak: 'break-word' as const,
                        ...buildElementFilter(el),
                      }}
                      onMouseDown={(e) => { if (!isLocked) handleElementMouseDown(e, el); else { e.stopPropagation(); setSelectedIds(new Set([el.id])) } }}
                      onDoubleClick={(e) => handleTextDoubleClick(e, el)}
                      onContextMenu={(e) => handleElementContextMenu(e, el)}
                    >
                      {editingTextId === el.id ? (
                        <div
                          ref={editingTextRef}
                          className="w-full"
                          contentEditable
                          suppressContentEditableWarning={true}
                          style={{ outline: '2px solid rgba(99, 102, 241, 0.6)', outlineOffset: 2, cursor: 'text', minHeight: '1em' }}
                          onBlur={(e) => handleTextBlur(el, (e.currentTarget as HTMLDivElement).innerText)}
                          onKeyDown={(e) => handleTextKeyDown(e, el)}
                          onMouseDown={(e) => e.stopPropagation()}
                          dangerouslySetInnerHTML={{ __html: textEl.content }}
                        />
                      ) : (
                        <div className="w-full">{textEl.content}</div>
                      )}
                      {isSelected && (
                        <div className={`absolute inset-0 border-2 pointer-events-none rounded-sm ${isLocked ? 'border-amber-500/70 border-dashed' : 'border-indigo-500'}`}>
                          {!isLocked && ['nw', 'ne', 'sw', 'se'].map((pos) => {
                            const style: React.CSSProperties = {
                              position: 'absolute',
                              width: 12,
                              height: 12,
                              background: 'white',
                              border: '2px solid #6366f1',
                              borderRadius: 2,
                              pointerEvents: 'auto',
                              ...(pos.includes('n') ? { top: -6 } : { bottom: -6 }),
                              ...(pos.includes('w') ? { left: -6 } : { right: -6 }),
                              cursor: pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize',
                            }
                            return <div key={pos} style={style} onMouseDown={(e) => handleResizeMouseDown(e, el, pos)} />
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.w,
                      height: el.h,
                      zIndex: el.zIndex ?? 0,
                      transform: getElementTransform(el),
                      cursor: 'grab',
                    }}
                    onMouseDown={(e) => handleElementMouseDown(e, el)}
                  >
                    {renderSlideElement({ ...el, x: 0, y: 0, w: 100, h: 100 } as typeof el, 'canvas', canvasCallbacks)}
                    {isSelected && <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none rounded-sm" />}
                  </div>
                )
              })}

              {/* Group selection box + handles (2+ elements selected) */}
              {selectionBox && (
                <div
                  style={{
                    position: 'absolute',
                    left: selectionBox.x,
                    top: selectionBox.y,
                    width: selectionBox.w,
                    height: selectionBox.h,
                    border: '1px dashed #6366f1',
                    pointerEvents: 'none',
                    zIndex: 9997,
                  }}
                >
                  {['nw', 'ne', 'sw', 'se'].map((pos) => {
                    const style: React.CSSProperties = {
                      position: 'absolute',
                      width: 12,
                      height: 12,
                      background: '#6366f1',
                      border: '2px solid white',
                      borderRadius: 2,
                      pointerEvents: 'auto',
                      ...(pos.includes('n') ? { top: -6 } : { bottom: -6 }),
                      ...(pos.includes('w') ? { left: -6 } : { right: -6 }),
                      cursor: pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize',
                    }
                    return <div key={pos} style={style} onMouseDown={(e) => handleGroupResizeMouseDown(e, pos)} />
                  })}
                </div>
              )}

              {/* Snap guide lines */}
              {snapGuides.vertical.map((x, i) => (
                <div
                  key={`sv-${i}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: 0,
                    width: 1,
                    height: canvasSize.height,
                    backgroundColor: '#ff00ff',
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }}
                />
              ))}
              {snapGuides.horizontal.map((y, i) => (
                <div
                  key={`sh-${i}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: y,
                    width: canvasSize.width,
                    height: 1,
                    backgroundColor: '#ff00ff',
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }}
                />
              ))}

              {/* Spacing measurement lines (gap to nearest neighbor while dragging) */}
              {measureLines.map((m, i) => {
                const isH = m.orientation === 'h'
                const midX = (m.x1 + m.x2) / 2
                const midY = (m.y1 + m.y2) / 2
                return (
                  <div key={`ms-${i}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10000 }}>
                    <div style={{
                      position: 'absolute',
                      left: Math.min(m.x1, m.x2),
                      top: Math.min(m.y1, m.y2),
                      width: isH ? Math.abs(m.x2 - m.x1) : 1,
                      height: isH ? 1 : Math.abs(m.y2 - m.y1),
                      backgroundColor: '#ef4444',
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: midX,
                      top: midY,
                      // Counter-scale so the badge stays a constant on-screen size regardless of zoom.
                      transform: `translate(-50%, -50%) scale(${1 / canvasScale})`,
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: 11,
                      lineHeight: 1,
                      padding: '2px 4px',
                      borderRadius: 3,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}>{m.label}</div>
                  </div>
                )
              })}

              {/* Grid overlay */}
              {showGrid && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 9998,
                    backgroundImage: [
                      `repeating-linear-gradient(to right, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent ${canvasSize.width / 10}px)`,
                      `repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent ${canvasSize.height / 10}px)`,
                    ].join(', '),
                  }}
                />
              )}

              {/* Marquee selection overlay */}
              {marquee && (
                <div
                  style={{
                    position: 'absolute',
                    left: Math.min(marquee.startX, marquee.currentX),
                    top: Math.min(marquee.startY, marquee.currentY),
                    width: Math.abs(marquee.currentX - marquee.startX),
                    height: Math.abs(marquee.currentY - marquee.startY),
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.6)',
                    pointerEvents: 'none',
                    zIndex: 10000,
                  }}
                />
              )}
            </div>

            {/* Canvas size label */}
            <div className="text-center mt-3 text-xs text-slate-500">
              {canvasSize.label} — {canvasSize.width} × {canvasSize.height}
            </div>
          </div>

          {/* Context menu */}
          {contextMenu && (
            <div
              style={{
                position: 'absolute',
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 100,
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] text-sm"
              data-dropdown="true"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {[
                { label: '複製', action: () => { const el = elements.find((x) => x.id === contextMenu.elementId); if (el) { const newId = generateId(); const clone = { ...JSON.parse(JSON.stringify(el)), id: newId } as SlideElement; if ('x' in clone) { (clone as any).x += 20; (clone as any).y += 20 } dispatch({ type: 'ADD_ELEMENT', element: clone }); setSelectedIds(new Set([newId])) } } },
                { label: '削除', action: () => { dispatch({ type: 'DELETE_ELEMENTS', ids: [contextMenu.elementId] }); setSelectedIds(new Set()) } },
                { label: lockedIds.has(contextMenu.elementId) ? 'ロック解除' : 'ロック', action: () => { setLockedIds((prev) => { const next = new Set(prev); next.has(contextMenu.elementId) ? next.delete(contextMenu.elementId) : next.add(contextMenu.elementId); return next }) } },
                { label: '最前面へ', action: () => { dispatch({ type: 'BRING_TO_FRONT', id: contextMenu.elementId }) } },
                { label: '最背面へ', action: () => { dispatch({ type: 'SEND_TO_BACK', id: contextMenu.elementId }) } },
                ...(selectedIds.size > 1 ? [{ label: 'グループ化', action: () => { const groupId = generateId(); setGroups((prev) => { const next = new Map(prev); next.set(groupId, Array.from(selectedIds)); return next }) } }] : []),
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  onClick={() => { item.action(); setContextMenu(null) }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Properties panel ── */}
        {propertiesOpen && (
          <div className="w-64 bg-slate-900 border-l border-slate-800 overflow-y-auto shrink-0">
            {/* Tab switcher */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setRightPanelTab('properties')}
                className={`flex-1 text-xs py-2 font-medium transition-colors ${rightPanelTab === 'properties' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                プロパティ
              </button>
              <button
                onClick={() => setRightPanelTab('layers')}
                className={`flex-1 text-xs py-2 font-medium transition-colors ${rightPanelTab === 'layers' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                レイヤー
              </button>
            </div>

            {/* Layers tab */}
            {rightPanelTab === 'layers' && (
              <div className="p-2 space-y-0.5">
                {[...elements].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0)).map((el) => {
                  const isSelected = selectedIds.has(el.id)
                  const isLocked = lockedIds.has(el.id)
                  const isHidden = hiddenIds.has(el.id)
                  const typeIcon = el.type === 'shape' ? '■' : el.type === 'image' ? '🖼' : 'T'
                  const label = el.type === 'shape' ? (el as SlideShapeElement).shape
                    : (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label')
                      ? ((el as SlideTextElement).content ?? '').slice(0, 15) || el.type
                      : el.type
                  return (
                    <div
                      key={el.id}
                      draggable
                      onDragStart={() => setLayerDragId(el.id)}
                      onDragOver={(e) => { e.preventDefault(); setLayerDragOverId(el.id) }}
                      onDrop={() => {
                        if (layerDragId && layerDragOverId && layerDragId !== layerDragOverId) {
                          const dragEl = elements.find((e) => e.id === layerDragId)
                          const overEl = elements.find((e) => e.id === layerDragOverId)
                          if (dragEl && overEl) {
                            const tmp = dragEl.zIndex ?? 0
                            dispatch({ type: 'UPDATE_ELEMENT', id: dragEl.id, props: { zIndex: overEl.zIndex ?? 0 } })
                            dispatch({ type: 'UPDATE_ELEMENT', id: overEl.id, props: { zIndex: tmp } })
                          }
                        }
                        setLayerDragId(null)
                        setLayerDragOverId(null)
                      }}
                      onDragEnd={() => { setLayerDragId(null); setLayerDragOverId(null) }}
                      onClick={() => setSelectedIds(new Set([el.id]))}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:bg-slate-800'
                      } ${layerDragOverId === el.id ? 'border border-indigo-400' : 'border border-transparent'} ${isHidden ? 'opacity-40' : ''}`}
                    >
                      <GripVertical size={12} className="text-slate-600 shrink-0 cursor-grab" />
                      <span className="w-4 text-center shrink-0">{typeIcon}</span>
                      <span className="flex-1 truncate">{label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setHiddenIds((prev) => { const next = new Set(prev); next.has(el.id) ? next.delete(el.id) : next.add(el.id); return next }) }}
                        className="p-0.5 hover:text-white"
                        title={isHidden ? '表示' : '非表示'}
                      >
                        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLockedIds((prev) => { const next = new Set(prev); next.has(el.id) ? next.delete(el.id) : next.add(el.id); return next }) }}
                        className="p-0.5 hover:text-white"
                        title={isLocked ? 'ロック解除' : 'ロック'}
                      >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>
                  )
                })}
                {elements.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4">要素がありません</div>
                )}
              </div>
            )}

            {/* Properties tab */}
            {rightPanelTab === 'properties' && <div className="p-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">プロパティ</h3>

              {singleSelected ? (
                <div className="space-y-4">
                  <div className="text-sm text-slate-300 font-medium capitalize">{singleSelected.type}</div>

                  {/* Position */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">位置</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600">X</label>
                        <input
                          type="number"
                          value={Math.round(singleWithPos?.x ?? 0)}
                          onChange={(e) => updateElementProp('x', Number(e.target.value))}
                          onKeyDown={(e) => numberKeyStep(e, 'x', singleWithPos?.x ?? 0)}
                          className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">Y</label>
                        <input
                          type="number"
                          value={Math.round(singleWithPos?.y ?? 0)}
                          onChange={(e) => updateElementProp('y', Number(e.target.value))}
                          onKeyDown={(e) => numberKeyStep(e, 'y', singleWithPos?.y ?? 0)}
                          className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Size */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">サイズ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600">W</label>
                        <input
                          type="number"
                          value={Math.round(singleWithPos?.w ?? 0)}
                          onChange={(e) => updateElementProp('w', Number(e.target.value))}
                          onKeyDown={(e) => numberKeyStep(e, 'w', singleWithPos?.w ?? 0)}
                          className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600">H</label>
                        <input
                          type="number"
                          value={Math.round(singleWithPos?.h ?? 0)}
                          onChange={(e) => updateElementProp('h', Number(e.target.value))}
                          onKeyDown={(e) => numberKeyStep(e, 'h', singleWithPos?.h ?? 0)}
                          className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Align to canvas */}
                  {singleWithPos && (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">キャンバス整列</label>
                      <div className="grid grid-cols-6 gap-1">
                        <button onClick={() => alignToCanvas('left')} title="左端" className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"><AlignStartVertical size={13} /></button>
                        <button onClick={() => alignToCanvas('hcenter')} title="水平中央" className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"><AlignCenterVertical size={13} /></button>
                        <button onClick={() => alignToCanvas('right')} title="右端" className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"><AlignEndVertical size={13} /></button>
                        <button onClick={() => alignToCanvas('top')} title="上端" className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"><AlignStartHorizontal size={13} /></button>
                        <button onClick={() => alignToCanvas('vcenter')} title="垂直中央" className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"><AlignCenterHorizontal size={13} /></button>
                        <button onClick={() => alignToCanvas('bottom')} title="下端" className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"><AlignEndHorizontal size={13} /></button>
                      </div>
                    </div>
                  )}

                  {/* Rotation */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">回転</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={singleSelected.rotation ?? 0}
                        onChange={(e) => updateElementProp('rotation', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-slate-400 w-10 text-right">{singleSelected.rotation ?? 0}°</span>
                    </div>
                  </div>

                  {/* Flip */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">反転</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateElementProp('flipH', !(singleSelected as any).flipH)}
                        className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded transition-colors ${
                          (singleSelected as any).flipH ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="水平反転"
                      >
                        <FlipHorizontal size={13} /> 水平反転
                      </button>
                      <button
                        onClick={() => updateElementProp('flipV', !(singleSelected as any).flipV)}
                        className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 rounded transition-colors ${
                          (singleSelected as any).flipV ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                        title="垂直反転"
                      >
                        <FlipVertical size={13} /> 垂直反転
                      </button>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">不透明度</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={singleSelected.opacity ?? 100}
                        onChange={(e) => updateElementProp('opacity', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-slate-400 w-10 text-right">{singleSelected.opacity ?? 100}%</span>
                    </div>
                  </div>

                  {/* Text-specific props */}
                  {(singleSelected.type === 'title' || singleSelected.type === 'subtitle' || singleSelected.type === 'body' || singleSelected.type === 'label') && (() => {
                    const textEl = singleSelected as SlideTextElement
                    return (
                      <>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">フォントサイズ</label>
                          <input
                            type="number"
                            min={8}
                            max={200}
                            value={textEl.fontSize}
                            onChange={(e) => updateElementProp('fontSize', Number(e.target.value))}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">文字色</label>
                          <input
                            type="color"
                            value={textEl.color ?? theme.bodyColor}
                            onChange={(e) => updateElementProp('color', e.target.value)}
                            className="w-full h-8 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">配置</label>
                          <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map((a) => (
                              <button
                                key={a}
                                onClick={() => updateElementProp('align', a)}
                                className={`flex-1 text-xs py-1 rounded transition-colors ${
                                  textEl.align === a ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {a === 'left' ? '左' : a === 'center' ? '中央' : '右'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">太さ</label>
                          <select
                            value={textEl.fontWeight}
                            onChange={(e) => updateElementProp('fontWeight', e.target.value)}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-indigo-500"
                          >
                            <option value="300">Light</option>
                            <option value="400">Regular</option>
                            <option value="500">Medium</option>
                            <option value="600">Semibold</option>
                            <option value="700">Bold</option>
                            <option value="900">Black</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">装飾</label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateElementProp('fontStyle', textEl.fontStyle === 'italic' ? 'normal' : 'italic')}
                              className={`flex-1 text-xs py-1 rounded transition-colors flex items-center justify-center gap-1 ${
                                textEl.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                              title="イタリック"
                            >
                              <Italic size={12} />
                            </button>
                            <button
                              onClick={() => updateElementProp('textDecoration', textEl.textDecoration === 'underline' ? 'none' : 'underline')}
                              className={`flex-1 text-xs py-1 rounded transition-colors flex items-center justify-center gap-1 ${
                                textEl.textDecoration === 'underline' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                              title="下線"
                            >
                              <Underline size={12} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">字間</label>
                          <input
                            type="number"
                            min={-5}
                            max={20}
                            value={textEl.letterSpacing ?? 0}
                            onChange={(e) => updateElementProp('letterSpacing', Number(e.target.value))}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                          />
                          <div className="flex gap-1 mt-1">
                            {([['狭', -1], ['標準', 0], ['広', 2], ['最大', 5]] as const).map(([lbl, v]) => (
                              <button key={lbl} onClick={() => updateElementProp('letterSpacing', v)}
                                className={`flex-1 text-[10px] py-0.5 rounded ${ (textEl.letterSpacing ?? 0) === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{lbl}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">行間</label>
                          <div className="flex gap-1">
                            {([['狭い', 1.0], ['標準', 1.4], ['広い', 1.8], ['最大', 2.2]] as const).map(([lbl, v]) => (
                              <button key={lbl} onClick={() => updateElementProp('lineHeight', v)}
                                className={`flex-1 text-[10px] py-1 rounded ${ (textEl.lineHeight ?? 1.4) === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{lbl}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">フォント</label>
                          <select
                            value={textEl.fontFamily ?? 'inherit'}
                            onChange={(e) => updateElementProp('fontFamily', e.target.value)}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-indigo-500"
                          >
                            <option value="inherit">デフォルト</option>
                            <option value="'Noto Sans JP', sans-serif">Noto Sans JP</option>
                            <option value="serif">明朝体</option>
                            <option value="monospace">等幅</option>
                            <option value="cursive">筆記体</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">テキスト内容</label>
                          <textarea
                            value={textEl.content ?? ''}
                            onChange={(e) => updateElementProp('content', e.target.value)}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-indigo-500 resize-y min-h-[60px]"
                            rows={3}
                          />
                        </div>
                      </>
                    )
                  })()}

                  {/* Shape-specific props */}
                  {singleSelected.type === 'shape' && (() => {
                    const shapeEl = singleSelected as SlideShapeElement
                    return (
                      <>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">塗りモード</label>
                          <div className="flex gap-1 mb-2">
                            <button
                              onClick={() => updateElementProp('fillMode', 'solid')}
                              className={`flex-1 text-xs py-1 rounded ${((shapeEl as any).fillMode ?? 'solid') === 'solid' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >単色</button>
                            <button
                              onClick={() => updateElementProp('fillMode', 'gradient')}
                              className={`flex-1 text-xs py-1 rounded ${(shapeEl as any).fillMode === 'gradient' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >グラデ</button>
                          </div>
                          {(shapeEl as any).fillMode === 'gradient' ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-600 w-8">開始</span>
                                <input type="color" value={(shapeEl as any).gradientFrom ?? shapeEl.fill ?? theme.accentColor} onChange={(e) => updateElementProp('gradientFrom', e.target.value)} className="flex-1 h-6 bg-slate-800 rounded border border-slate-700 cursor-pointer" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-600 w-8">終了</span>
                                <input type="color" value={(shapeEl as any).gradientTo ?? '#000000'} onChange={(e) => updateElementProp('gradientTo', e.target.value)} className="flex-1 h-6 bg-slate-800 rounded border border-slate-700 cursor-pointer" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-600 w-8">角度</span>
                                <input type="range" min={0} max={360} value={(shapeEl as any).gradientAngle ?? 180} onChange={(e) => updateElementProp('gradientAngle', Number(e.target.value))} className="flex-1" />
                                <span className="text-xs text-slate-400 w-8 text-right">{(shapeEl as any).gradientAngle ?? 180}°</span>
                              </div>
                              {/* Preview */}
                              <div className="h-6 rounded border border-slate-700" style={{ background: `linear-gradient(${(shapeEl as any).gradientAngle ?? 180}deg, ${(shapeEl as any).gradientFrom ?? shapeEl.fill ?? theme.accentColor}, ${(shapeEl as any).gradientTo ?? '#000'})` }} />
                            </div>
                          ) : (
                            <div>
                              <input
                                type="color"
                                value={shapeEl.fill ?? theme.accentColor}
                                onChange={(e) => updateElementProp('fill', e.target.value)}
                                className="w-full h-8 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">枠線色</label>
                          <input
                            type="color"
                            value={shapeEl.stroke ?? '#000000'}
                            onChange={(e) => updateElementProp('stroke', e.target.value)}
                            className="w-full h-8 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">枠線幅</label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={shapeEl.strokeWidth ?? 0}
                            onChange={(e) => updateElementProp('strokeWidth', Number(e.target.value))}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                        {shapeEl.shape === 'rect' && (
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">角丸</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={50}
                                value={(shapeEl as any).borderRadius ?? 0}
                                onChange={(e) => updateElementProp('borderRadius', Number(e.target.value))}
                                className="flex-1"
                              />
                              <span className="text-xs text-slate-400 w-8 text-right">{(shapeEl as any).borderRadius ?? 0}%</span>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}

                  {/* Image-specific props */}
                  {singleSelected.type === 'image' && (() => {
                    const imgEl = singleSelected as SlideImageElement
                    return (
                      <>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">カラーフィルター</label>
                          <select
                            value={imgEl.colorFilter ?? 'none'}
                            onChange={(e) => updateElementProp('colorFilter', e.target.value)}
                            className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-700 outline-none focus:border-indigo-500"
                          >
                            <option value="none">なし</option>
                            <option value="grayscale">グレースケール</option>
                            <option value="sepia">セピア</option>
                            <option value="high-contrast">ハイコントラスト</option>
                            <option value="washout">ウォッシュアウト</option>
                            <option value="cool">クール</option>
                            <option value="warm">ウォーム</option>
                            <option value="vintage">ヴィンテージ</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">明るさ</label>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            value={imgEl.brightness ?? 0}
                            onChange={(e) => updateElementProp('brightness', Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">コントラスト</label>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            value={imgEl.contrast ?? 0}
                            onChange={(e) => updateElementProp('contrast', Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 block mb-1">表示モード</label>
                          <div className="flex gap-1">
                            {(['cover', 'contain', 'fill'] as const).map((fit) => (
                              <button
                                key={fit}
                                onClick={() => updateElementProp('objectFit', fit)}
                                className={`flex-1 text-xs py-1 rounded transition-colors ${
                                  (imgEl.objectFit ?? 'cover') === fit ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                {fit === 'cover' ? 'カバー' : fit === 'contain' ? '収まる' : '伸縮'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )
                  })()}

                  {/* Shadow controls (all elements) */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">ドロップシャドウ</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 w-10">ぼかし</span>
                        <input
                          type="range"
                          min={0}
                          max={50}
                          value={(singleSelected as any).shadowBlur ?? 0}
                          onChange={(e) => updateElementProp('shadowBlur', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-400 w-6 text-right">{(singleSelected as any).shadowBlur ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 w-10">X</span>
                        <input
                          type="range"
                          min={-30}
                          max={30}
                          value={(singleSelected as any).shadowOffsetX ?? 0}
                          onChange={(e) => updateElementProp('shadowOffsetX', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-400 w-6 text-right">{(singleSelected as any).shadowOffsetX ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 w-10">Y</span>
                        <input
                          type="range"
                          min={-30}
                          max={30}
                          value={(singleSelected as any).shadowOffsetY ?? 0}
                          onChange={(e) => updateElementProp('shadowOffsetY', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-400 w-6 text-right">{(singleSelected as any).shadowOffsetY ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-600 w-10">色</span>
                        <input
                          type="color"
                          value={(singleSelected as any).shadowColor ?? '#000000'}
                          onChange={(e) => updateElementProp('shadowColor', e.target.value)}
                          className="flex-1 h-6 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Blur effect */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">ぼかし効果</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={(singleSelected as any).blurAmount ?? 0}
                        onChange={(e) => updateElementProp('blurAmount', Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-slate-400 w-8 text-right">{(singleSelected as any).blurAmount ?? 0}px</span>
                    </div>
                  </div>

                  {/* Glow effect (outline glow) */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">グロー効果</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 w-10">強度</span>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          value={(singleSelected as any).glowAmount ?? 0}
                          onChange={(e) => updateElementProp('glowAmount', Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs text-slate-400 w-6 text-right">{(singleSelected as any).glowAmount ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-600 w-10">色</span>
                        <input
                          type="color"
                          value={(singleSelected as any).glowColor ?? '#ffffff'}
                          onChange={(e) => updateElementProp('glowColor', e.target.value)}
                          className="flex-1 h-6 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <label className="text-xs text-slate-500 block mb-2">レイヤー</label>
                    <div className="grid grid-cols-4 gap-1">
                      <button onClick={bringToFront} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="最前面">
                        <ChevronsUp size={14} />
                      </button>
                      <button onClick={bringForward} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="前面">
                        <MoveUp size={14} />
                      </button>
                      <button onClick={sendBackward} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="背面">
                        <MoveDown size={14} />
                      </button>
                      <button onClick={sendToBack} className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="最背面">
                        <ChevronsDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-800 pt-3 flex gap-2">
                    <button
                      onClick={duplicateSelected}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <Copy size={13} /> 複製
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={13} /> 削除
                    </button>
                  </div>
                </div>
              ) : selectedElements.length > 1 ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-300">{selectedElements.length} 個の要素を選択中</div>

                  {/* Alignment buttons */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">整列</label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => {
                          const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                          if (els.length < 2) return
                          const minX = Math.min(...els.map((el) => el.x))
                          els.forEach((el) => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { x: minX } }))
                        }}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        title="左揃え"
                      >
                        <AlignStartVertical size={14} />
                        <span className="text-[10px]">左</span>
                      </button>
                      <button
                        onClick={() => {
                          const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                          if (els.length < 2) return
                          const minX = Math.min(...els.map((el) => el.x))
                          const maxRight = Math.max(...els.map((el) => el.x + el.w))
                          const centerX = (minX + maxRight) / 2
                          els.forEach((el) => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { x: centerX - el.w / 2 } }))
                        }}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        title="水平中央"
                      >
                        <AlignCenterVertical size={14} />
                        <span className="text-[10px]">中央</span>
                      </button>
                      <button
                        onClick={() => {
                          const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                          if (els.length < 2) return
                          const maxRight = Math.max(...els.map((el) => el.x + el.w))
                          els.forEach((el) => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { x: maxRight - el.w } }))
                        }}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        title="右揃え"
                      >
                        <AlignEndVertical size={14} />
                        <span className="text-[10px]">右</span>
                      </button>
                      <button
                        onClick={() => {
                          const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                          if (els.length < 2) return
                          const minY = Math.min(...els.map((el) => el.y))
                          els.forEach((el) => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { y: minY } }))
                        }}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        title="上揃え"
                      >
                        <AlignStartHorizontal size={14} />
                        <span className="text-[10px]">上</span>
                      </button>
                      <button
                        onClick={() => {
                          const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                          if (els.length < 2) return
                          const minY = Math.min(...els.map((el) => el.y))
                          const maxBottom = Math.max(...els.map((el) => el.y + el.h))
                          const centerY = (minY + maxBottom) / 2
                          els.forEach((el) => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { y: centerY - el.h / 2 } }))
                        }}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        title="垂直中央"
                      >
                        <AlignCenterHorizontal size={14} />
                        <span className="text-[10px]">中央</span>
                      </button>
                      <button
                        onClick={() => {
                          const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                          if (els.length < 2) return
                          const maxBottom = Math.max(...els.map((el) => el.y + el.h))
                          els.forEach((el) => dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { y: maxBottom - el.h } }))
                        }}
                        className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                        title="下揃え"
                      >
                        <AlignEndHorizontal size={14} />
                        <span className="text-[10px]">下</span>
                      </button>
                    </div>
                  </div>

                  {/* Distribution buttons (3+ elements) */}
                  {selectedElements.length >= 3 && (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">均等分布</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => {
                            const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                            if (els.length < 3) return
                            const sorted = [...els].sort((a, b) => a.x - b.x)
                            const first = sorted[0]
                            const last = sorted[sorted.length - 1]
                            const totalSpan = (last.x + last.w) - first.x
                            const totalWidths = sorted.reduce((sum, el) => sum + el.w, 0)
                            const gap = (totalSpan - totalWidths) / (sorted.length - 1)
                            let currentX = first.x
                            sorted.forEach((el) => {
                              dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { x: currentX } })
                              currentX += el.w + gap
                            })
                          }}
                          className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-[10px]"
                          title="水平分布"
                        >
                          水平分布
                        </button>
                        <button
                          onClick={() => {
                            const els = selectedElements.filter((el) => 'x' in el) as (SlideElement & { x: number; y: number; w: number; h: number })[]
                            if (els.length < 3) return
                            const sorted = [...els].sort((a, b) => a.y - b.y)
                            const first = sorted[0]
                            const last = sorted[sorted.length - 1]
                            const totalSpan = (last.y + last.h) - first.y
                            const totalHeights = sorted.reduce((sum, el) => sum + el.h, 0)
                            const gap = (totalSpan - totalHeights) / (sorted.length - 1)
                            let currentY = first.y
                            sorted.forEach((el) => {
                              dispatch({ type: 'UPDATE_ELEMENT', id: el.id, props: { y: currentY } })
                              currentY += el.h + gap
                            })
                          }}
                          className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-[10px]"
                          title="垂直分布"
                        >
                          垂直分布
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={duplicateSelected}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      <Copy size={13} /> 複製
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={13} /> 削除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  要素を選択するとプロパティが表示されます
                </div>
              )}

              {/* Canvas background color */}
              <div className="border-t border-slate-800 pt-3 mt-3">
                <label className="text-xs text-slate-500 flex items-center gap-1 mb-1"><Paintbrush size={12} /> キャンバス背景色</label>
                <input
                  type="color"
                  value={canvas?.backgroundColor ?? theme.background}
                  onChange={(e) => dispatch({ type: 'SET_BACKGROUND_COLOR', color: e.target.value })}
                  className="w-full h-8 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                />
              </div>

              {/* Canvas background image */}
              <div className="border-t border-slate-800 pt-3 mt-3">
                <label className="text-xs text-slate-500 flex items-center gap-1 mb-1"><ImagePlus size={12} /> 背景画像</label>
                {canvas?.backgroundImage ? (
                  <div className="space-y-2">
                    <div className="w-full h-20 rounded border border-slate-700 overflow-hidden">
                      <img src={canvas.backgroundImage} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'CLEAR_BACKGROUND_IMAGE' })}
                      className="w-full text-xs py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                    >
                      背景画像を削除
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => bgImageInputRef.current?.click()}
                    className="w-full text-xs py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <ImagePlus size={13} /> 画像を選択
                  </button>
                )}
              </div>
            </div>}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help dialog */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold">ショートカット一覧</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { key: 'Ctrl+Z', label: '元に戻す' },
                { key: 'Ctrl+Y', label: 'やり直す' },
                { key: 'Ctrl+C', label: 'コピー' },
                { key: 'Ctrl+V', label: 'ペースト' },
                { key: 'Ctrl+A', label: '全選択' },
                { key: 'Ctrl+D', label: '複製' },
                { key: 'Delete', label: '削除' },
                { key: 'Ctrl+G', label: 'グループ化' },
                { key: 'Ctrl+Shift+G', label: 'グループ解除' },
                { key: 'Ctrl+]', label: '前面へ' },
                { key: 'Ctrl+[', label: '背面へ' },
                { key: 'Ctrl+Shift+C', label: 'スタイルをコピー' },
                { key: 'Ctrl+Shift+V', label: 'スタイルを貼付' },
                { key: '↑↓←→', label: '移動 (1px)' },
                { key: 'Shift+矢印', label: '移動 (10px)' },
                { key: 'Ctrl+Wheel', label: 'ズーム' },
                { key: 'Alt+ドラッグ', label: '要素を複製' },
                { key: '?', label: 'ショートカット一覧' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1">
                  <kbd className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-600 font-mono">{item.key}</kbd>
                  <span className="text-xs text-slate-400 ml-2">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
