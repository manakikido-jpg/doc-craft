'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type {
  SlidesDocument,
  SlideElement,
  SlideTableElement,
  SlideConnectorElement,
  SlideImageElement,
  SlideShapeElement,
} from '@/types'
import type { SlideAction } from '@/hooks/use-slides'
import type { UndoableAction } from '@/lib/undoable'
import ChartRenderer from './chart-renderer'
import { SLIDE_THEMES } from '@/lib/themes'
import SlideTextBlock from './slide-text-block'
import ResizeHandles from './resize-handles'
import {
  renderSlideElement,
  LockedBadge,
  type CanvasCallbacks,
} from './element-renderer'
import ElementContextMenu from './element-context-menu'
import SlideFormatToolbar from './slide-format-toolbar'
import AlignmentToolbar from './alignment-toolbar'
import ElementPropertiesPanel from './element-properties-panel'
import ImageFiltersPanel from './image-filters-panel'
import ImageCropModal from './image-crop-modal'
import ChartDataEditor from './chart-data-editor'
import ElementSizeTooltip from './element-size-tooltip'
import SlideRuler from './slide-ruler'
import CanvasGrid from './canvas-grid'
import CanvasRuler from './canvas-ruler'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import { compressImage } from '@/lib/image-compress'
import { generateId } from '@/lib/utils'
import { useToast } from '@/components/shared/toast'
import { sanitizeHtml } from '@/lib/sanitize'
import {
  computeSmartGuides as computeSmartGuidesUtil,
  getAnchorPoints,
  findNearestAnchor as findNearestAnchorUtil,
  ANCHOR_SNAP_THRESHOLD,
  getElementTransform,
  getElementFilterStyle,
  snapToGridValue,
  type SmartGuide,
} from '@/lib/canvas-helpers'

interface WatermarkConfig {
  enabled: boolean
  text: string
  fontSize: number
  color: string
  opacity: number
  rotation: number
  position: 'center' | 'diagonal' | 'bottom-right'
}

interface Props {
  state: SlidesDocument
  dispatch: React.Dispatch<UndoableAction<SlideAction>>
  onSelectionChange?: (ids: string[]) => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  watermarkConfig?: WatermarkConfig
  gridVisible?: boolean
  rulerVisible?: boolean
  onCropOverlay?: (elementId: string) => void
}


export default function SlideCanvas({ state, dispatch, onSelectionChange, zoom: externalZoom, onZoomChange, watermarkConfig, gridVisible = false, rulerVisible = false, onCropOverlay }: Props) {
  const { addToast } = useToast()
  const elementClipboardRef = useRef<SlideElement[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{
    mx: number
    my: number
    positions: { id: string; x: number; y: number }[]
  } | null>(null)
  const [rubberBand, setRubberBand] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(
    null,
  )
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showFormatToolbar, setShowFormatToolbar] = useState(false)
  const [localZoom, setLocalZoom] = useState(100)
  const zoom = externalZoom ?? localZoom
  const setZoom = useCallback((v: number | ((prev: number) => number)) => {
    const next = typeof v === 'function' ? v(zoom) : v
    if (onZoomChange) onZoomChange(next)
    else setLocalZoom(next)
  }, [zoom, onZoomChange])
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize] = useState(5)
  const [smartGuides, setSmartGuides] = useState<{ x?: number; y?: number; type?: 'edge' | 'center' | 'spacing' }[]>([])
  const [snapGuides, setSnapGuides] = useState<{type: 'horizontal'|'vertical', position: number}[]>([])
  const [propertiesPanel, setPropertiesPanel] = useState(false)
  const [imageFiltersPanel, setImageFiltersPanel] = useState(false)
  const [chartEditorPanel, setChartEditorPanel] = useState(false)
  const [cropModalElementId, setCropModalElementId] = useState<string | null>(null)
  const [connectorDragMode, setConnectorDragMode] = useState<'from' | 'to' | null>(null)
  const [connectorDragId, setConnectorDragId] = useState<string | null>(null)
  const [connectorDragPoint, setConnectorDragPoint] = useState<{ x: number; y: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null)
  const [altDragging, setAltDragging] = useState(false)
  const [showRuler, setShowRuler] = useState(false)
  const [guides, setGuides] = useState<{ orientation: 'h' | 'v'; position: number }[]>([])
  const [resizeTooltip, setResizeTooltip] = useState<{ visible: boolean; x: number; y: number; w: number; h: number }>({ visible: false, x: 0, y: 0, w: 0, h: 0 })
  const [dragTooltip, setDragTooltip] = useState<{ visible: boolean; clientX: number; clientY: number; elX: number; elY: number }>({ visible: false, clientX: 0, clientY: 0, elX: 0, elY: 0 })
  const [colResizeDrag, setColResizeDrag] = useState<{ elementId: string; col: number; startX: number; startWidth: number; currentX: number; tableLeft: number; tableWidth: number } | null>(null)
  const [cropOverlayOpen, setCropOverlayOpen] = useState(false)
  const [insideGroupId, setInsideGroupId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceFileRef = useRef<HTMLInputElement>(null)
  const smartGuidesRafRef = useRef<number>(0)
  const shiftKeyRef = useRef(false)

  // Track shift key state for aspect-ratio-locked resize
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Shift') shiftKeyRef.current = true }
    function onKeyUp(e: KeyboardEvent) { if (e.key === 'Shift') shiftKeyRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Clean up requestAnimationFrame on unmount
  useEffect(() => {
    return () => {
      if (smartGuidesRafRef.current) cancelAnimationFrame(smartGuidesRafRef.current)
    }
  }, [])

  const slideOrNull = state.slides.find((s) => s.id === state.activeSlideId)

  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds))
  }, [selectedIds, onSelectionChange])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!slideOrNull) return
      const slide = slideOrNull
      if (editingTextId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't handle if user is editing text in a contentEditable, input, or textarea
        const active = document.activeElement
        if (active && (
          (active as HTMLElement).isContentEditable ||
          active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA'
        )) return
        if (selectedIds.size > 0) {
          e.preventDefault()
          const unlocked = Array.from(selectedIds).filter((id) => {
            const el = slide.elements.find((e) => e.id === id)
            return !el || !('locked' in el && el.locked)
          })
          if (unlocked.length > 0) {
            dispatch({ type: 'DELETE_ELEMENTS', slideId: slide.id, elementIds: unlocked })
            setSelectedIds(new Set())
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.size > 0) {
          elementClipboardRef.current = slide.elements.filter((el) => selectedIds.has(el.id)).map((el) => ({ ...el }))
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        if (selectedIds.size > 0) {
          e.preventDefault()
          // Copy selected elements to clipboard
          elementClipboardRef.current = slide.elements.filter((el) => selectedIds.has(el.id)).map((el) => ({ ...el }))
          // Delete them from the slide
          const unlocked = Array.from(selectedIds).filter((id) => {
            const el = slide.elements.find((e) => e.id === id)
            return !el || !('locked' in el && el.locked)
          })
          if (unlocked.length > 0) {
            dispatch({ type: 'DELETE_ELEMENTS', slideId: slide.id, elementIds: unlocked })
            setSelectedIds(new Set())
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (elementClipboardRef.current.length > 0) {
          const pasted = elementClipboardRef.current.map((el) => {
            if (el.type === 'connector') return { ...el, id: generateId() }
            return { ...el, id: generateId(), x: el.x + 2, y: el.y + 2 }
          })
          dispatch({ type: 'PASTE_ELEMENTS', slideId: slide.id, elements: pasted })
          setSelectedIds(new Set(pasted.map((el) => el.id)))
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (selectedIds.size > 0) {
          const toDup = slide.elements.filter((el) => selectedIds.has(el.id))
          const duped = toDup.map((el) => {
            if (el.type === 'connector') return { ...el, id: generateId() }
            return { ...el, id: generateId(), x: el.x + 2, y: el.y + 2 }
          })
          dispatch({ type: 'PASTE_ELEMENTS', slideId: slide.id, elements: duped })
          setSelectedIds(new Set(duped.map((el) => el.id)))
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedIds(new Set(slide.elements.map((el) => el.id)))
      }
      // Arrow key nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.size > 0) {
        e.preventDefault()
        const step = e.shiftKey ? 5 : 1
        const moves = Array.from(selectedIds)
          .map((id) => {
            const el = slide.elements.find((e) => e.id === id)
            if (!el || el.type === 'connector' || ('locked' in el && el.locked)) return null
            let nx = el.x,
              ny = el.y
            if (e.key === 'ArrowLeft') nx = Math.max(0, el.x - step)
            if (e.key === 'ArrowRight') nx = Math.min(90, el.x + step)
            if (e.key === 'ArrowUp') ny = Math.max(0, el.y - step)
            if (e.key === 'ArrowDown') ny = Math.min(90, el.y + step)
            return { elementId: id, x: nx, y: ny }
          })
          .filter(Boolean) as { elementId: string; x: number; y: number }[]
        if (moves.length > 0) dispatch({ type: 'UPDATE_ELEMENTS_POSITION', slideId: slide.id, moves })
      }
      // Enter or F2: start editing selected text element
      if ((e.key === 'Enter' || e.key === 'F2') && selectedIds.size === 1 && !e.ctrlKey && !e.metaKey) {
        const id = Array.from(selectedIds)[0]
        const el = slide.elements.find((el) => el.id === id)
        if (el && (el.type === 'title' || el.type === 'body' || el.type === 'subtitle')) {
          e.preventDefault()
          setEditingTextId(id)
          setSelectedIds(new Set([id]))
          setShowFormatToolbar(true)
        }
      }
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setZoom((z) => Math.min(200, z + 10))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setZoom((z) => Math.max(50, z - 10))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoom(100)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        if (selectedIds.size > 1) {
          e.preventDefault()
          dispatch({ type: 'GROUP_ELEMENTS', slideId: slide.id, elementIds: Array.from(selectedIds) })
        }
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const els = slide?.elements.filter(el => el.type !== 'connector') || []
        if (els.length === 0) return
        const currentIdx = els.findIndex(el => selectedIds.has(el.id))
        const nextIdx = e.shiftKey
          ? (currentIdx <= 0 ? els.length - 1 : currentIdx - 1)
          : (currentIdx + 1) % els.length
        setSelectedIds(new Set([els[nextIdx].id]))
        setEditingTextId(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        const el = slide.elements.find((el) => selectedIds.has(el.id) && (el as any).groupId)
        if (el) dispatch({ type: 'UNGROUP_ELEMENTS', slideId: slide.id, groupId: (el as any).groupId })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slideOrNull, selectedIds, editingTextId, dispatch])

  // useMemo MUST be called before early return to satisfy Rules of Hooks
  const sortedElements = useMemo(() => {
    if (!slideOrNull) return []
    return [...slideOrNull.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  }, [slideOrNull?.elements])

  if (!slideOrNull) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <span className="text-slate-500 block">
            {state.slides.length === 0
              ? 'スライドがありません。左パネルの「スライド追加」で作成してください。'
              : 'スライドが選択されていません'}
          </span>
        </div>
      </div>
    )
  }

  const slide = slideOrNull
  const baseTheme = SLIDE_THEMES[slide.themeKey]
  const theme = slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme

  function selectElement(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    // Commit any ongoing text edit when selecting a different element
    if (editingTextId && editingTextId !== id) {
      commitEditingText()
    }
    // Exit table editing when selecting a different element
    if (editingTableId && editingTableId !== id) {
      setEditingTableId(null)
    }
    if (e.shiftKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else if (!selectedIds.has(id)) {
      // Group selection: if clicking an element with a groupId and not inside the group,
      // auto-select ALL elements in that group
      const clickedEl = slide.elements.find(el => el.id === id)
      const clickedGroupId = clickedEl && (clickedEl as any).groupId as string | undefined
      if (clickedGroupId && insideGroupId !== clickedGroupId) {
        const groupMemberIds = slide.elements
          .filter(el => (el as any).groupId === clickedGroupId)
          .map(el => el.id)
        setSelectedIds(new Set(groupMemberIds))
      } else {
        setSelectedIds(new Set([id]))
      }
    }
    setContextMenu(null)
  }

  function handleElementDoubleClick(id: string) {
    const el = slide.elements.find(el => el.id === id)
    const elGroupId = el && (el as any).groupId as string | undefined
    if (elGroupId && insideGroupId !== elGroupId) {
      // Enter the group: allow selecting individual elements within it
      setInsideGroupId(elGroupId)
      setSelectedIds(new Set([id]))
      return true // signal that we handled the double-click as group-enter
    }
    return false // not a group-enter, let normal double-click behavior proceed
  }

  function handleElementMouseDown(e: React.MouseEvent, el: SlideElement) {
    if (el.type === 'connector') return
    if ('locked' in el && el.locked) {
      e.stopPropagation()
      setSelectedIds(new Set([el.id]))
      return
    }
    e.stopPropagation()
    // Commit any ongoing text edit when interacting with a different element
    if (editingTextId && editingTextId !== el.id) {
      commitEditingText()
    }

    // Alt+drag = duplicate: clone element at original position, drag the copy
    if (e.altKey) {
      const duped = { ...el, id: generateId(), x: el.x, y: el.y }
      dispatch({ type: 'PASTE_ELEMENTS', slideId: slide.id, elements: [duped] })
      setSelectedIds(new Set([duped.id]))
      setDraggingId(duped.id)
      setAltDragging(true)
      const positions = [{ id: duped.id, x: el.x, y: el.y }]
      setDragStart({ mx: e.clientX, my: e.clientY, positions })
      return
    }

    if (!selectedIds.has(el.id) && !e.shiftKey) {
      setSelectedIds(new Set([el.id]))
    }

    setDraggingId(el.id)
    const ids = selectedIds.has(el.id) ? Array.from(selectedIds) : [el.id]
    const positions = ids.map((id) => {
      const elem = slide!.elements.find((e) => e.id === id)
      if (!elem || elem.type === 'connector') return { id, x: 0, y: 0 }
      return { id, x: elem.x, y: elem.y }
    })
    setDragStart({ mx: e.clientX, my: e.clientY, positions })
  }

  function snapValue(val: number): number {
    return snapToGridValue(val, gridSize, snapToGrid)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!canvasRef.current) return

    // Handle table column resize dragging
    if (colResizeDrag) {
      setColResizeDrag(prev => prev ? { ...prev, currentX: e.clientX } : null)
      return
    }

    // Handle connector endpoint dragging
    if (connectorDragId && connectorDragMode) {
      const rect = canvasRef.current.getBoundingClientRect()
      const px = ((e.clientX - rect.left) / rect.width) * 100
      const py = ((e.clientY - rect.top) / rect.height) * 100
      setConnectorDragPoint({ x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) })
      return
    }

    if (draggingId && dragStart) {
      const rect = canvasRef.current.getBoundingClientRect()
      let dx = ((e.clientX - dragStart.mx) / rect.width) * 100
      let dy = ((e.clientY - dragStart.my) / rect.height) * 100
      // Constrain to single axis when Ctrl+Shift held
      if (e.ctrlKey && e.shiftKey) {
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        if (absDx > absDy) {
          dy = 0
        } else {
          dx = 0
        }
      }
      let moves = dragStart.positions.map((p) => ({
        elementId: p.id,
        x: snapValue(Math.max(0, Math.min(90, p.x + dx))),
        y: snapValue(Math.max(0, Math.min(90, p.y + dy))),
      }))
      const { guides, snapDx, snapDy } = computeSmartGuidesUtil(
        slide.elements,
        moves.map((m) => m.elementId),
        moves,
      )
      // Apply smart guide snapping
      if (snapDx !== 0 || snapDy !== 0) {
        moves = moves.map((m) => ({
          ...m,
          x: Math.max(0, Math.min(90, m.x + snapDx)),
          y: Math.max(0, Math.min(90, m.y + snapDy)),
        }))
      }
      if (smartGuidesRafRef.current) cancelAnimationFrame(smartGuidesRafRef.current)
      smartGuidesRafRef.current = requestAnimationFrame(() => {
        setSmartGuides(guides)
        // Build snap guide lines for div-based rendering
        const newSnapGuides: {type: 'horizontal'|'vertical', position: number}[] = []
        for (const g of guides) {
          if (g.x !== undefined) {
            newSnapGuides.push({ type: 'vertical', position: g.x })
          }
          if (g.y !== undefined) {
            newSnapGuides.push({ type: 'horizontal', position: g.y })
          }
        }
        setSnapGuides(newSnapGuides)
      })
      dispatch({ type: 'UPDATE_ELEMENTS_POSITION', slideId: slide.id, moves })
      // Update drag position tooltip
      if (moves.length > 0) {
        const m = moves[0]
        setDragTooltip({ visible: true, clientX: e.clientX, clientY: e.clientY, elX: m.x, elY: m.y })
      }
      return
    }

    if (rubberBand) {
      const rect = canvasRef.current.getBoundingClientRect()
      setRubberBand((prev) =>
        prev
          ? {
              ...prev,
              endX: ((e.clientX - rect.left) / rect.width) * 100,
              endY: ((e.clientY - rect.top) / rect.height) * 100,
            }
          : null,
      )
    }
  }

  function handleMouseUp() {
    // Finalize table column resize
    if (colResizeDrag) {
      const deltaX = colResizeDrag.currentX - colResizeDrag.startX
      const deltaPct = (deltaX / colResizeDrag.tableWidth) * 100
      const newWidth = Math.max(10, colResizeDrag.startWidth + deltaPct)
      dispatch({
        type: 'SET_TABLE_COL_WIDTH',
        slideId: slide.id,
        elementId: colResizeDrag.elementId,
        col: colResizeDrag.col,
        width: newWidth,
      })
      setColResizeDrag(null)
      return
    }

    // Finalize connector endpoint drag with anchor snapping
    if (connectorDragId && connectorDragMode && connectorDragPoint) {
      const conn = slide.elements.find(e => e.id === connectorDragId && e.type === 'connector') as SlideConnectorElement | undefined
      if (conn) {
        const snap = findNearestAnchorUtil(slide.elements, connectorDragPoint, connectorDragId)
        const finalPoint = snap ? snap.anchor : connectorDragPoint
        const finalElementId = snap ? snap.elementId : undefined
        const fromPoint = connectorDragMode === 'from' ? finalPoint : conn.fromPoint
        const toPoint = connectorDragMode === 'to' ? finalPoint : conn.toPoint
        const fromElementId = connectorDragMode === 'from' ? finalElementId : conn.fromElementId
        const toElementId = connectorDragMode === 'to' ? finalElementId : conn.toElementId
        dispatch({
          type: 'UPDATE_CONNECTOR_ENDPOINTS',
          slideId: slide.id,
          elementId: connectorDragId,
          fromPoint,
          toPoint,
          fromElementId,
          toElementId,
        })
      }
      setConnectorDragId(null)
      setConnectorDragMode(null)
      setConnectorDragPoint(null)
      return
    }

    if (rubberBand) {
      const x1 = Math.min(rubberBand.startX, rubberBand.endX)
      const y1 = Math.min(rubberBand.startY, rubberBand.endY)
      const x2 = Math.max(rubberBand.startX, rubberBand.endX)
      const y2 = Math.max(rubberBand.startY, rubberBand.endY)

      const ids = slide.elements
        .filter((el) => {
          if (el.type === 'connector') {
            const cx = Math.min(el.fromPoint.x, el.toPoint.x)
            const cy = Math.min(el.fromPoint.y, el.toPoint.y)
            const cw = Math.abs(el.toPoint.x - el.fromPoint.x)
            const ch = Math.abs(el.toPoint.y - el.fromPoint.y)
            return cx + cw > x1 && cx < x2 && cy + ch > y1 && cy < y2
          }
          const ew = el.w ?? 0
          const eh = (el as any).h ?? 0
          return el.x + ew > x1 && el.x < x2 && el.y + eh > y1 && el.y < y2
        })
        .map((el) => el.id)

      setSelectedIds(new Set(ids))
      setRubberBand(null)
    }
    setDraggingId(null)
    setDragStart(null)
    setAltDragging(false)
    setSmartGuides([])
    setSnapGuides([])
    setConnectorDragId(null)
    setConnectorDragMode(null)
    setConnectorDragPoint(null)
    setResizeTooltip((prev) => ({ ...prev, visible: false }))
    setDragTooltip((prev) => ({ ...prev, visible: false }))
  }

  function commitEditingText() {
    if (!editingTextId) return
    const editEl = document.querySelector<HTMLElement>('[contenteditable="true"]')
    if (editEl) {
      // Dispatch content update BEFORE clearing editing state
      dispatch({ type: 'UPDATE_ELEMENT', slideId: slide.id, elementId: editingTextId, content: sanitizeHtml(editEl.innerHTML) })
    }
    setEditingTextId(null)
    setShowFormatToolbar(false)
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    // Don't deselect/cancel editing if clicking inside an actively-edited text element
    if (editingTextId) {
      const editEl = document.querySelector<HTMLElement>('[contenteditable="true"]')
      if (editEl && editEl.contains(e.target as Node)) return
      // Commit text before deselecting
      commitEditingText()
    }
    if (editingTableId) {
      setEditingTableId(null)
    }
    setSelectedIds(new Set())
    setContextMenu(null)
    setInsideGroupId(null)

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const sx = ((e.clientX - rect.left) / rect.width) * 100
      const sy = ((e.clientY - rect.top) / rect.height) * 100
      setRubberBand({ startX: sx, startY: sy, endX: sx, endY: sy })
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    if (selectedIds.size > 0) {
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
  }

  function handleResize(elementId: string, x: number, y: number, w: number, h: number) {
    let nw = Math.max(3, w)
    let nh = Math.max(3, h)

    // Shift key: lock aspect ratio based on original element dimensions
    if (shiftKeyRef.current) {
      const el = slide.elements.find((e) => e.id === elementId)
      if (el && el.type !== 'connector') {
        const origW = el.w
        const origH = (el as any).h ?? el.w
        if (origW > 0 && origH > 0) {
          const aspect = origW / origH
          // Use the dimension with the larger proportional change
          if (Math.abs(nw - origW) / origW >= Math.abs(nh - origH) / origH) {
            nh = nw / aspect
          } else {
            nw = nh * aspect
          }
          nw = Math.max(3, nw)
          nh = Math.max(3, nh)
        }
      }
    }

    dispatch({ type: 'UPDATE_ELEMENT_POSITION', slideId: slide.id, elementId, x, y })
    dispatch({ type: 'UPDATE_ELEMENT_SIZE', slideId: slide.id, elementId, w: nw, h: nh })
    // Show size tooltip during resize
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setResizeTooltip({ visible: true, x: rect.left + rect.width * (x + nw) / 100, y: rect.top + rect.height * y / 100 - 30, w: nw, h: nh })
    }
  }

  function handleRotate(elementId: string, rotation: number) {
    dispatch({ type: 'UPDATE_ELEMENT_ROTATION', slideId: slide.id, elementId, rotation })
  }

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith('image/') || !slide) return
    if (isStorageNearLimit()) {
      addToast('ストレージの容量が不足しています。', 'warning')
      return
    }
    const rawDataUrl = await fileToDataURL(file)
    const dataUrl = await compressImage(rawDataUrl)
    dispatch({ type: 'ADD_IMAGE_ELEMENT', slideId: slide.id, src: dataUrl, alt: file.name })
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    const acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
    for (const file of files) {
      if (acceptedTypes.includes(file.type)) {
        if (!slide || !canvasRef.current) continue
        if (isStorageNearLimit()) {
          addToast('ストレージの容量が不足しています。', 'warning')
          return
        }
        const rawDataUrl = await fileToDataURL(file)
        const dataUrl = await compressImage(rawDataUrl)
        // Calculate drop position in canvas coordinates
        const rect = canvasRef.current.getBoundingClientRect()
        const dropX = ((e.clientX - rect.left) / rect.width) * 100
        const dropY = ((e.clientY - rect.top) / rect.height) * 100
        // Center the default size (300x200 mapped to percentage)
        const imgW = (300 / rect.width) * 100
        const imgH = (200 / rect.height) * 100
        const posX = Math.max(0, Math.min(100 - imgW, dropX - imgW / 2))
        const posY = Math.max(0, Math.min(100 - imgH, dropY - imgH / 2))
        dispatch({
          type: 'PASTE_ELEMENTS',
          slideId: slide.id,
          elements: [{
            id: generateId(),
            type: 'image' as const,
            src: dataUrl,
            alt: file.name,
            x: posX,
            y: posY,
            w: imgW,
            h: imgH,
          } as any],
        })
        addToast('画像を追加しました', 'success', 2000)
      }
    }
  }

  function handleTextFocus(id: string) {
    setEditingTextId(id)
    setSelectedIds(new Set([id]))
    setShowFormatToolbar(true)
  }

  function handleTextBlur(id: string, content: string) {
    // Always save content on blur (covers clicking another element, tabbing away, etc.)
    dispatch({ type: 'UPDATE_ELEMENT', slideId: slide.id, elementId: id, content: sanitizeHtml(content) })
    setEditingTextId(null)
    setShowFormatToolbar(false)
  }

  // Handle connector endpoint drag start
  function handleConnectorEndpointMouseDown(
    e: React.MouseEvent,
    connId: string,
    mode: 'from' | 'to',
  ) {
    e.stopPropagation()
    setConnectorDragId(connId)
    setConnectorDragMode(mode)
    setSelectedIds(new Set([connId]))
  }

  // Canvas callbacks for the shared element renderer
  const canvasCallbacks: CanvasCallbacks = {
    onMouseDown: handleElementMouseDown,
    onClick: selectElement,
    onDoubleClick: (id: string) => {
      const el = slide.elements.find(e => e.id === id)
      if (!el) return
      if (!handleElementDoubleClick(id)) {
        if (el.type === 'image') setImageFiltersPanel(true)
        else if (el.type === 'chart') setChartEditorPanel(true)
      }
    },
    onContextMenu: handleContextMenu,
    onConnectorEndpointMouseDown: handleConnectorEndpointMouseDown,
    onTableEdit: (id: string) => { setEditingTableId(id); setSelectedIds(new Set([id])) },
    onTableCellBlur: (elementId: string, row: number, col: number, value: string) => {
      dispatch({ type: 'UPDATE_TABLE_CELL', slideId: slide.id, elementId, row, col, value: sanitizeHtml(value) })
    },
    isEditingTable: (id: string) => editingTableId === id,
    selectedIds,
    draggingId,
    theme,
    connectorDragId,
    connectorDragMode,
    connectorDragPoint,
    colResizeDrag,
    onColResizeStart: (e: React.MouseEvent, elementId: string, col: number, startWidth: number) => {
      e.stopPropagation()
      e.preventDefault()
      const tableDiv = (e.currentTarget as HTMLElement).parentElement
      if (!tableDiv) return
      const tableRect = tableDiv.getBoundingClientRect()
      setColResizeDrag({ elementId, col, startX: e.clientX, startWidth, currentX: e.clientX, tableLeft: tableRect.left, tableWidth: tableRect.width })
    },
  }

  function renderElement(el: SlideElement) {
    const isSelected = selectedIds.has(el.id)
    const singleSelected = isSelected && selectedIds.size === 1

    // Delegate connector, image, shape, video, audio, chart to shared renderer
    if (el.type === 'connector' || el.type === 'image' || el.type === 'shape' ||
        el.type === 'video' || el.type === 'audio' || el.type === 'chart') {
      const shared = renderSlideElement(el, 'canvas', canvasCallbacks)
      // Wrap with ResizeHandles for canvas mode (shared renderer does not include them)
      if (el.type === 'connector') return shared
      // For shape elements, add hover detection for connector anchor points
      if (el.type === 'shape') {
        const shapeEl = el as SlideShapeElement
        const elH = shapeEl.h ?? shapeEl.w
        return (
          <div
            key={`wrap-${el.id}`}
            style={{ display: 'contents' } as React.CSSProperties}
            onMouseEnter={() => setHoveredShapeId(el.id)}
            onMouseLeave={() => setHoveredShapeId((prev) => (prev === el.id ? null : prev))}
          >
            {shared}
            {/* Connector anchor points shown on hover */}
            {hoveredShapeId === el.id && !connectorDragId && (
              <>
                {/* Top center */}
                <div style={{ position: 'absolute', left: `${shapeEl.x + shapeEl.w / 2}%`, top: `${shapeEl.y}%`, width: 8, height: 8, borderRadius: '50%', background: 'rgba(59,130,246,0.7)', border: '1.5px solid #fff', transform: 'translate(-50%,-50%)', zIndex: 99996, pointerEvents: 'none' }} />
                {/* Bottom center */}
                <div style={{ position: 'absolute', left: `${shapeEl.x + shapeEl.w / 2}%`, top: `${shapeEl.y + elH}%`, width: 8, height: 8, borderRadius: '50%', background: 'rgba(59,130,246,0.7)', border: '1.5px solid #fff', transform: 'translate(-50%,-50%)', zIndex: 99996, pointerEvents: 'none' }} />
                {/* Left center */}
                <div style={{ position: 'absolute', left: `${shapeEl.x}%`, top: `${shapeEl.y + elH / 2}%`, width: 8, height: 8, borderRadius: '50%', background: 'rgba(59,130,246,0.7)', border: '1.5px solid #fff', transform: 'translate(-50%,-50%)', zIndex: 99996, pointerEvents: 'none' }} />
                {/* Right center */}
                <div style={{ position: 'absolute', left: `${shapeEl.x + shapeEl.w}%`, top: `${shapeEl.y + elH / 2}%`, width: 8, height: 8, borderRadius: '50%', background: 'rgba(59,130,246,0.7)', border: '1.5px solid #fff', transform: 'translate(-50%,-50%)', zIndex: 99996, pointerEvents: 'none' }} />
              </>
            )}
            {singleSelected && (
              <ResizeHandles
                x={el.x}
                y={el.y}
                w={el.w}
                h={elH}
                rotation={el.rotation}
                canvasRef={canvasRef}
                onResize={(nx, ny, nw, nh) => handleResize(el.id, nx, ny, nw, nh)}
                onRotate={(r) => handleRotate(el.id, r)}
                snapToGrid={snapToGrid}
                gridSize={gridSize}
              />
            )}
          </div>
        )
      }
      if (!singleSelected) return shared
      return (
        <div key={`wrap-${el.id}`} style={{ display: 'contents' } as React.CSSProperties}>
          {shared}
          <ResizeHandles
            x={el.x}
            y={el.y}
            w={el.w}
            h={(el as any).h ?? el.w}
            rotation={el.rotation}
            canvasRef={canvasRef}
            onResize={(nx, ny, nw, nh) => handleResize(el.id, nx, ny, nw, nh)}
            onRotate={el.type === 'audio' ? () => {} : (r) => handleRotate(el.id, r)}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        </div>
      )
    }

    // Table element: kept inline due to deep editing integration
    if (el.type === 'table') {
      const tableEl = el as SlideTableElement
      const colCount = tableEl.rows[0]?.length || 1
      const defaultColWidth = 100 / colCount
      const colWidthsArr = tableEl.colWidths || Array(colCount).fill(defaultColWidth)
      const totalColWidth = colWidthsArr.reduce((a: number, b: number) => a + b, 0)
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            outline: isSelected ? `2px solid ${theme.accentColor}` : 'none',
            cursor: draggingId === el.id ? 'grabbing' : 'grab',
            opacity: draggingId === el.id ? 0.8 : 1,
            boxShadow: draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
            overflow: 'visible',
          }}
          onMouseDown={(e) => {
            if (editingTableId === el.id) return
            handleElementMouseDown(e, el)
          }}
          onClick={(e) => selectElement(el.id, e)}
          onDoubleClick={() => { if (!handleElementDoubleClick(el.id)) { setEditingTableId(el.id); setSelectedIds(new Set([el.id])) } }}
          onContextMenu={handleContextMenu}
        >
          {el.locked && <LockedBadge />}
          <table className="w-full h-full border-collapse" style={{ fontSize: 'clamp(8px, 1.2vw, 14px)', tableLayout: 'fixed' }}>
            <colgroup>
              {colWidthsArr.map((cw: number, ci: number) => (
                <col key={ci} style={{ width: `${(cw / totalColWidth) * 100}%` }} />
              ))}
            </colgroup>
            <tbody>
              {tableEl.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border border-slate-500/50 px-1 py-0.5 ${ri === 0 && tableEl.headerRow ? 'font-semibold bg-white/10' : ''}`}
                      style={{ color: theme.bodyColor }}
                      contentEditable={editingTableId === el.id}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        dispatch({
                          type: 'UPDATE_TABLE_CELL',
                          slideId: slide.id,
                          elementId: el.id,
                          row: ri,
                          col: ci,
                          value: sanitizeHtml(e.currentTarget.innerHTML),
                        })
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Column resize handles */}
          {isSelected && colWidthsArr.length > 1 && (() => {
            let accPct = 0
            return colWidthsArr.slice(0, -1).map((cw: number, ci: number) => {
              accPct += (cw / totalColWidth) * 100
              return (
                <div
                  key={`col-resize-${ci}`}
                  style={{
                    position: 'absolute',
                    left: `${accPct}%`,
                    top: 0,
                    width: '6px',
                    height: '100%',
                    transform: 'translateX(-3px)',
                    cursor: 'col-resize',
                    zIndex: 20,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const tableDiv = e.currentTarget.parentElement
                    if (!tableDiv) return
                    const tableRect = tableDiv.getBoundingClientRect()
                    setColResizeDrag({
                      elementId: el.id,
                      col: ci,
                      startX: e.clientX,
                      startWidth: cw,
                      currentX: e.clientX,
                      tableLeft: tableRect.left,
                      tableWidth: tableRect.width,
                    })
                  }}
                >
                  <div
                    className="w-0.5 h-full mx-auto transition-colors"
                    style={{
                      backgroundColor: colResizeDrag?.elementId === el.id && colResizeDrag?.col === ci
                        ? '#3b82f6'
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!colResizeDrag) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.5)'
                    }}
                    onMouseLeave={(e) => {
                      if (!colResizeDrag || colResizeDrag.col !== ci) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  />
                </div>
              )
            })
          })()}
          {/* Column resize drag preview line */}
          {colResizeDrag && colResizeDrag.elementId === el.id && (() => {
            const deltaX = colResizeDrag.currentX - colResizeDrag.startX
            const deltaPct = (deltaX / colResizeDrag.tableWidth) * 100
            let accPct = 0
            for (let i = 0; i <= colResizeDrag.col; i++) {
              accPct += (colWidthsArr[i] / totalColWidth) * 100
            }
            const newPos = Math.max(5, Math.min(95, accPct + deltaPct))
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${newPos}%`,
                  top: 0,
                  width: '2px',
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  zIndex: 30,
                  pointerEvents: 'none',
                }}
              />
            )
          })()}
          {singleSelected && (
            <ResizeHandles
              x={el.x}
              y={el.y}
              w={el.w}
              h={el.h}
              rotation={el.rotation}
              canvasRef={canvasRef}
              onResize={(nx, ny, nw, nh) => handleResize(el.id, nx, ny, nw, nh)}
              onRotate={(r) => handleRotate(el.id, r)}
              snapToGrid={snapToGrid}
              gridSize={gridSize}
            />
          )}
        </div>
      )
    }

    // Text element: kept inline due to deep editing integration
    const isEditingThis = editingTextId === el.id
    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: el.h ? `${el.h}%` : undefined,
          zIndex: isEditingThis ? 999 : (el.zIndex ?? 0),
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          outline: isSelected && !isEditingThis ? `2px solid ${theme.accentColor}40` : 'none',
          cursor: draggingId === el.id ? 'grabbing' : (isEditingThis ? undefined : 'grab'),
          overflow: el.autoSize === 'shrink' ? 'hidden' : undefined,
          opacity: draggingId === el.id ? 0.8 : 1,
          boxShadow: draggingId === el.id ? '0 0 0 2px rgba(99,102,241,0.5)' : undefined,
        }}
        onMouseDown={(e) => {
          if (!isEditingThis) handleElementMouseDown(e, el)
        }}
        onClick={(e) => selectElement(el.id, e)}
        onDoubleClick={() => {
          if (!handleElementDoubleClick(el.id)) {
            handleTextFocus(el.id)
          }
        }}
        onContextMenu={handleContextMenu}
      >
        {el.locked && <LockedBadge />}
        <SlideTextBlock
          element={el}
          theme={theme}
          isEditing={isEditingThis}
          onFocus={() => handleTextFocus(el.id)}
          onBlur={(content) => handleTextBlur(el.id, content)}
          onResize={el.autoSize === 'grow' ? (newH: number) => {
            dispatch({ type: 'UPDATE_ELEMENT_SIZE', slideId: slide.id, elementId: el.id, w: el.w, h: newH })
          } : undefined}
        />
        {/* Confirm / Cancel buttons while editing */}
        {isEditingThis && (
          <div
            className="absolute left-0 flex items-center gap-1.5 mt-1 z-[1000]"
            style={{ top: '100%' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-lg transition-colors active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                commitEditingText()
              }}
            >
              ✓ 確定
            </button>
            <button
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg shadow-lg transition-colors active:scale-95"
              onClick={(e) => {
                e.stopPropagation()
                // Revert DOM to original content and exit
                const editEl = document.querySelector<HTMLElement>('[contenteditable="true"]')
                if (editEl) editEl.innerHTML = el.content
                setEditingTextId(null)
                setShowFormatToolbar(false)
              }}
            >
              ✕ キャンセル
            </button>
            <span className="text-[10px] text-slate-500 ml-1 whitespace-nowrap">Esc でキャンセル</span>
          </div>
        )}
        {singleSelected && !isEditingThis && (
          <ResizeHandles
            x={el.x}
            y={el.y}
            w={el.w}
            h={el.h ?? 10}
            rotation={el.rotation}
            canvasRef={canvasRef}
            onResize={(nx, ny, nw, nh) => handleResize(el.id, nx, ny, nw, nh)}
            onRotate={(r) => handleRotate(el.id, r)}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />
        )}
      </div>
    )
  }

  const bgStyle: React.CSSProperties = {
    background: theme.background,
    aspectRatio: '16/9',
  }
  if (slide.backgroundImage) {
    bgStyle.backgroundImage = `url(${slide.backgroundImage})`
    bgStyle.backgroundSize = slide.backgroundFit === 'stretch' ? '100% 100%' : slide.backgroundFit || 'cover'
    bgStyle.backgroundPosition = 'center'
    bgStyle.backgroundRepeat = 'no-repeat'
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8 overflow-auto"
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          setZoom((z) => Math.max(50, Math.min(200, z + (e.deltaY > 0 ? -10 : 10))))
        }
      }}
    >
      {/* Grid controls */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${showGrid ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
          aria-label="グリッド表示切替"
          aria-pressed={showGrid}
        >
          グリッド
        </button>
        {showGrid && (
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${snapToGrid ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            aria-label="グリッドスナップ切替"
            aria-pressed={snapToGrid}
          >
            スナップ
          </button>
        )}
        <button
          onClick={() => setShowRuler(!showRuler)}
          className={`px-2 py-1 text-xs rounded ${showRuler ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
          title="ルーラー表示"
        >
          📏
        </button>
      </div>

      {/* Alignment toolbar */}
      {selectedIds.size > 1 && (
        <div className="mb-2">
          <AlignmentToolbar
            elements={slide.elements}
            selectedIds={selectedIds}
            onUpdatePosition={(elementId, x, y) =>
              dispatch({ type: 'UPDATE_ELEMENT_POSITION', slideId: slide.id, elementId, x, y })
            }
          />
        </div>
      )}

      {/* Format toolbar for text */}
      {showFormatToolbar && editingTextId && (
        <div className="mb-2">
          <SlideFormatToolbar
            onExecCommand={(cmd, val) => document.execCommand(cmd, false, val)}
            onAlign={(align) => {
              const el = slide.elements.find((e) => e.id === editingTextId)
              if (el && el.type !== 'image' && el.type !== 'shape' && el.type !== 'table' && el.type !== 'connector') {
                dispatch({
                  type: 'UPDATE_ELEMENT_PROPS',
                  slideId: slide.id,
                  elementId: editingTextId,
                  props: { align },
                })
              }
            }}
            currentAlign={(slide.elements.find((e) => e.id === editingTextId) as any)?.align}
            onUpdateProps={(props) => {
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: editingTextId!, props })
            }}
            currentElement={
              slide.elements.find(
                (e) =>
                  e.id === editingTextId &&
                  e.type !== 'image' &&
                  e.type !== 'shape' &&
                  e.type !== 'table' &&
                  e.type !== 'connector',
              ) as any
            }
          />
        </div>
      )}

      {showRuler && (
        <SlideRuler
          width={960}
          height={540}
          zoom={zoom}
          showHorizontal
          showVertical
          guides={guides}
          onAddGuide={(o, p) => setGuides([...guides, { orientation: o, position: p }])}
        />
      )}

      {rulerVisible && (
        <div className="relative">
          <CanvasRuler width={960} height={540} zoom={zoom} visible={rulerVisible} />
        </div>
      )}

      <div
        className="w-full max-w-4xl"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
      >
        <div
          ref={canvasRef}
          data-slide-canvas
          role="region"
          aria-label="スライドキャンバス"
          className={`relative w-full shadow-2xl rounded-lg overflow-hidden slide-print-page ${editingTextId ? '' : 'select-none'}`}
          style={{ ...bgStyle, ...(dragOver ? { outline: '3px dashed #3b82f6', outlineOffset: '-3px', boxShadow: 'inset 0 0 30px rgba(59,130,246,0.15)' } : {}), ...(altDragging ? { cursor: 'copy' } : {}) }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Drop zone overlay */}
          {dragOver && (
            <div
              className="absolute inset-0 z-[99999] flex items-center justify-center pointer-events-none"
              style={{ background: 'rgba(59,130,246,0.08)' }}
            >
              <div className="flex flex-col items-center gap-2 text-blue-400">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span className="text-xs font-medium">画像をドロップ</span>
              </div>
            </div>
          )}

          {/* Grid overlay */}
          {showGrid && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {Array.from({ length: Math.floor(100 / gridSize) - 1 }, (_, i) => {
                const pos = (i + 1) * gridSize
                return (
                  <g key={`line-${i}`}>
                    <line
                      x1={`${pos}%`}
                      y1="0"
                      x2={`${pos}%`}
                      y2="100%"
                      stroke="rgba(99,102,241,0.12)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="0"
                      y1={`${pos}%`}
                      x2="100%"
                      y2={`${pos}%`}
                      stroke="rgba(99,102,241,0.12)"
                      strokeWidth="0.5"
                    />
                  </g>
                )
              })}
              {/* Grid dots at intersections */}
              {Array.from({ length: Math.floor(100 / gridSize) - 1 }, (_, i) => {
                const px = (i + 1) * gridSize
                return Array.from({ length: Math.floor(100 / gridSize) - 1 }, (_, j) => {
                  const py = (j + 1) * gridSize
                  return (
                    <circle
                      key={`dot-${i}-${j}`}
                      cx={`${px}%`}
                      cy={`${py}%`}
                      r="1"
                      fill="rgba(99,102,241,0.3)"
                    />
                  )
                })
              })}
            </svg>
          )}

          {/* External grid overlay from props */}
          <CanvasGrid visible={gridVisible} />

          {/* Guide lines */}
          {guides.map((g, i) => (
            <div
              key={`guide-${i}`}
              className="absolute bg-cyan-400/60 z-[100]"
              style={g.orientation === 'h'
                ? { left: 0, right: 0, top: `${g.position}%`, height: '1px' }
                : { top: 0, bottom: 0, left: `${g.position}%`, width: '1px' }
              }
            />
          ))}

          {sortedElements.map(renderElement)}

          {/* Smart guides with snap glow effect */}
          {smartGuides.length > 0 && (
            <>
              <style>{`
                @keyframes snapPulse {
                  0% { stroke-width: 2; opacity: 1; }
                  50% { stroke-width: 3; opacity: 0.8; }
                  100% { stroke-width: 1.5; opacity: 1; }
                }
              `}</style>
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 99998 }}
              >
                {smartGuides.map((g, i) => {
                  const color = g.type === 'center' ? '#00d4ff' : g.type === 'spacing' ? '#10b981' : '#00d4ff'
                  return (
                    <g key={i}>
                      {g.x !== undefined && (
                        <>
                          {/* Glow line */}
                          <line
                            x1={`${g.x}%`}
                            y1="0"
                            x2={`${g.x}%`}
                            y2="100%"
                            stroke={color}
                            strokeWidth="3"
                            strokeDasharray="4,3"
                            opacity="0.3"
                          />
                          <line
                            x1={`${g.x}%`}
                            y1="0"
                            x2={`${g.x}%`}
                            y2="100%"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeDasharray="4,3"
                            style={{ animation: 'snapPulse 0.3s ease-out' }}
                          />
                        </>
                      )}
                      {g.y !== undefined && (
                        <>
                          <line
                            x1="0"
                            y1={`${g.y}%`}
                            x2="100%"
                            y2={`${g.y}%`}
                            stroke={color}
                            strokeWidth="3"
                            strokeDasharray="4,3"
                            opacity="0.3"
                          />
                          <line
                            x1="0"
                            y1={`${g.y}%`}
                            x2="100%"
                            y2={`${g.y}%`}
                            stroke={color}
                            strokeWidth="1.5"
                            strokeDasharray="4,3"
                            style={{ animation: 'snapPulse 0.3s ease-out' }}
                          />
                        </>
                      )}
                    </g>
                  )
                })}
              </svg>
            </>
          )}

          {/* Distance labels on spacing guides */}
          {smartGuides.filter(g => g.type === 'spacing').map((guide, i) => (
            <span key={`dist-${i}`} className="absolute text-[8px] text-green-300 bg-slate-900/80 px-0.5 rounded pointer-events-none z-[99999]"
              style={{ left: `${guide.x ?? 0}%`, top: `${(guide.y ?? 0) - 2}%` }}>
              {Math.abs((guide as any).distance || 0).toFixed(1)}%
            </span>
          ))}

          {/* Snap guide lines (bright cyan) */}
          {snapGuides.map((guide, i) => (
            <div
              key={`snap-guide-${i}`}
              style={{
                position: 'absolute',
                zIndex: 99998,
                pointerEvents: 'none',
                ...(guide.type === 'horizontal'
                  ? { left: 0, right: 0, top: `${guide.position}%`, height: 0, borderTop: '1.5px dashed #00d4ff' }
                  : { top: 0, bottom: 0, left: `${guide.position}%`, width: 0, borderLeft: '1.5px dashed #00d4ff' }
                ),
              }}
            />
          ))}

          {/* Connector anchor points overlay - shown when dragging connector endpoints */}
          {connectorDragId && connectorDragMode && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 99997 }}
            >
              {slide.elements
                .filter((el) => el.type !== 'connector')
                .flatMap((el) =>
                  getAnchorPoints(el).map((anchor) => {
                    const dist = connectorDragPoint
                      ? Math.sqrt((anchor.x - connectorDragPoint.x) ** 2 + (anchor.y - connectorDragPoint.y) ** 2)
                      : Infinity
                    const isNear = dist < ANCHOR_SNAP_THRESHOLD
                    return (
                      <circle
                        key={`anchor-${el.id}-${anchor.label}`}
                        cx={`${anchor.x}%`}
                        cy={`${anchor.y}%`}
                        r={isNear ? 6 : 4}
                        fill={isNear ? '#3b82f6' : 'rgba(59, 130, 246, 0.5)'}
                        stroke={isNear ? '#ffffff' : '#3b82f6'}
                        strokeWidth={isNear ? 2 : 1}
                      />
                    )
                  }),
                )}
            </svg>
          )}

          {/* Multi-selection bounding box with resize handles */}
          {selectedIds.size > 1 && slide && (() => {
            const selEls = slide.elements.filter(el => selectedIds.has(el.id) && el.type !== 'connector') as Exclude<SlideElement, SlideConnectorElement>[]
            if (selEls.length < 2) return null
            const minX = Math.min(...selEls.map(el => el.x))
            const minY = Math.min(...selEls.map(el => el.y))
            const maxX = Math.max(...selEls.map(el => el.x + el.w))
            const maxY = Math.max(...selEls.map(el => el.y + (el as any).h))
            const bbW = maxX - minX
            const bbH = maxY - minY
            return (
              <div className="absolute border-2 border-dashed border-indigo-400/50 z-[90]"
                style={{ left: `${minX}%`, top: `${minY}%`, width: `${bbW}%`, height: `${bbH}%`, pointerEvents: 'none' }}
              >
                <div style={{ pointerEvents: 'auto' }}>
                  <ResizeHandles
                    x={minX}
                    y={minY}
                    w={bbW}
                    h={bbH}
                    canvasRef={canvasRef}
                    onResize={(nx, ny, nw, nh) => {
                      // Scale all selected elements proportionally
                      const scaleX = bbW > 0 ? nw / bbW : 1
                      const scaleY = bbH > 0 ? nh / bbH : 1
                      const moves: { elementId: string; x: number; y: number }[] = []
                      for (const el of selEls) {
                        const relX = el.x - minX
                        const relY = el.y - minY
                        const newElX = nx + relX * scaleX
                        const newElY = ny + relY * scaleY
                        const newElW = el.w * scaleX
                        const newElH = ((el as any).h ?? 0) * scaleY
                        moves.push({ elementId: el.id, x: newElX, y: newElY })
                        dispatch({ type: 'UPDATE_ELEMENT_SIZE', slideId: slide.id, elementId: el.id, w: Math.max(2, newElW), h: Math.max(2, newElH) })
                      }
                      dispatch({ type: 'UPDATE_ELEMENTS_POSITION', slideId: slide.id, moves })
                    }}
                    onRotate={() => {}}
                    snapToGrid={snapToGrid}
                    gridSize={gridSize}
                  />
                </div>
              </div>
            )
          })()}

          {/* Group selection bounding box */}
          {selectedIds.size > 1 && slide && (() => {
            // Find groups among selected elements
            const selEls = slide.elements.filter(el => selectedIds.has(el.id))
            const groupIds = new Set<string>()
            selEls.forEach(el => {
              if ((el as any).groupId) groupIds.add((el as any).groupId)
            })
            if (groupIds.size === 0) return null
            return Array.from(groupIds).map(gid => {
              const groupEls = slide.elements.filter(el => (el as any).groupId === gid && el.type !== 'connector') as Exclude<SlideElement, SlideConnectorElement>[]
              if (groupEls.length < 2) return null
              const gMinX = Math.min(...groupEls.map(el => el.x))
              const gMinY = Math.min(...groupEls.map(el => el.y))
              const gMaxX = Math.max(...groupEls.map(el => el.x + el.w))
              const gMaxY = Math.max(...groupEls.map(el => el.y + ((el as any).h ?? 0)))
              return (
                <div
                  key={`group-${gid}`}
                  className="absolute border-2 border-dashed border-blue-400/60 z-[89] pointer-events-none"
                  style={{ left: `${gMinX - 0.5}%`, top: `${gMinY - 0.5}%`, width: `${gMaxX - gMinX + 1}%`, height: `${gMaxY - gMinY + 1}%` }}
                />
              )
            })
          })()}

          {/* Watermark overlay */}
          {watermarkConfig?.enabled && (() => {
            const wmStyle: React.CSSProperties = {
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 99990,
              color: watermarkConfig.color,
              opacity: watermarkConfig.opacity / 100,
              fontSize: `${watermarkConfig.fontSize * (zoom / 100)}px`,
              fontWeight: 'bold',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }
            if (watermarkConfig.position === 'center') {
              return (
                <div style={{ ...wmStyle, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ transform: `rotate(${watermarkConfig.rotation}deg)` }}>{watermarkConfig.text}</span>
                </div>
              )
            }
            if (watermarkConfig.position === 'bottom-right') {
              return (
                <div style={{ ...wmStyle, bottom: '4%', right: '4%' }}>
                  <span style={{ transform: `rotate(${watermarkConfig.rotation}deg)`, display: 'inline-block' }}>{watermarkConfig.text}</span>
                </div>
              )
            }
            // diagonal: repeat watermark text in a grid pattern
            const items: React.ReactNode[] = []
            for (let row = 0; row < 5; row++) {
              for (let col = 0; col < 3; col++) {
                items.push(
                  <div
                    key={`wm-${row}-${col}`}
                    style={{
                      position: 'absolute',
                      left: `${col * 35 + 5}%`,
                      top: `${row * 22 + 5}%`,
                      transform: `rotate(${watermarkConfig.rotation}deg)`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {watermarkConfig.text}
                  </div>
                )
              }
            }
            return <div style={{ ...wmStyle, inset: 0, overflow: 'hidden' }}>{items}</div>
          })()}

          {/* Slide number overlay */}
          {state.globalFooter?.showSlideNumber && (() => {
            // Hide on title slide: skip if first element is a title-type element or if slide is the first slide with a title
            const hideOnTitle = (state.globalFooter as any)?.hideSlideNumberOnTitle
            if (hideOnTitle) {
              const firstEl = slide.elements[0]
              if (firstEl && (firstEl.type === 'title' || firstEl.type === 'subtitle') && slide.elements.filter(e => e.type === 'body').length === 0) {
                return null
              }
            }
            return (
              <div
                style={{
                  position: 'absolute',
                  bottom: '2%',
                  right: '3%',
                  fontSize: '10px',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  zIndex: 99990,
                  userSelect: 'none',
                }}
              >
                {state.slides.findIndex((s) => s.id === slide.id) + 1} / {state.slides.length}
              </div>
            )
          })()}

          {/* Rubber band selection */}
          {rubberBand && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(rubberBand.startX, rubberBand.endX)}%`,
                top: `${Math.min(rubberBand.startY, rubberBand.endY)}%`,
                width: `${Math.abs(rubberBand.endX - rubberBand.startX)}%`,
                height: `${Math.abs(rubberBand.endY - rubberBand.startY)}%`,
                border: '1px dashed #6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                pointerEvents: 'none',
                zIndex: 99999,
              }}
            />
          )}
        </div>

        {slide.notes && (
          <div className="mt-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-500 truncate">📝 {slide.notes}</p>
          </div>
        )}

        <div className="mt-2 text-center text-slate-600 text-xs">
          {state.slides.findIndex((s) => s.id === slide.id) + 1} / {state.slides.length}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageUpload(file)
          }}
        />
      </div>

      {/* Context menu */}
      {contextMenu && selectedIds.size > 0 && (
        <ElementContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onBringToFront={() => {
            selectedIds.forEach((id) => dispatch({ type: 'BRING_TO_FRONT', slideId: slide.id, elementId: id }))
          }}
          onSendToBack={() => {
            selectedIds.forEach((id) => dispatch({ type: 'SEND_TO_BACK', slideId: slide.id, elementId: id }))
          }}
          onBringForward={() => {
            selectedIds.forEach((id) => dispatch({ type: 'BRING_FORWARD', slideId: slide.id, elementId: id }))
          }}
          onSendBackward={() => {
            selectedIds.forEach((id) => dispatch({ type: 'SEND_BACKWARD', slideId: slide.id, elementId: id }))
          }}
          onDuplicate={() => {
            const toDup = slide.elements.filter((el) => selectedIds.has(el.id))
            const duped = toDup.map((el) => {
              if (el.type === 'connector') return { ...el, id: generateId() }
              return { ...el, id: generateId(), x: el.x + 2, y: el.y + 2 }
            })
            dispatch({ type: 'PASTE_ELEMENTS', slideId: slide.id, elements: duped })
          }}
          onDelete={() => {
            dispatch({ type: 'DELETE_ELEMENTS', slideId: slide.id, elementIds: Array.from(selectedIds) })
            setSelectedIds(new Set())
          }}
          onCopy={() => {
            elementClipboardRef.current = slide.elements.filter((el) => selectedIds.has(el.id)).map((el) => ({ ...el }))
          }}
          onGroup={
            selectedIds.size > 1
              ? () => {
                  dispatch({ type: 'GROUP_ELEMENTS', slideId: slide.id, elementIds: Array.from(selectedIds) })
                }
              : undefined
          }
          onUngroup={() => {
            const el = slide.elements.find((el) => selectedIds.has(el.id) && (el as any).groupId)
            if (el) dispatch({ type: 'UNGROUP_ELEMENTS', slideId: slide.id, groupId: (el as any).groupId })
          }}
          hasGroup={slide.elements.some((el) => selectedIds.has(el.id) && (el as any).groupId)}
          onFlipH={() => {
            selectedIds.forEach((id) => {
              const el = slide.elements.find((e) => e.id === id)
              if (el && 'flipH' in el)
                dispatch({
                  type: 'UPDATE_ELEMENT_PROPS',
                  slideId: slide.id,
                  elementId: id,
                  props: { flipH: !el.flipH },
                })
              else dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: id, props: { flipH: true } })
            })
          }}
          onFlipV={() => {
            selectedIds.forEach((id) => {
              const el = slide.elements.find((e) => e.id === id)
              if (el && 'flipV' in el)
                dispatch({
                  type: 'UPDATE_ELEMENT_PROPS',
                  slideId: slide.id,
                  elementId: id,
                  props: { flipV: !el.flipV },
                })
              else dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: id, props: { flipV: true } })
            })
          }}
          onLock={() => {
            selectedIds.forEach((id) =>
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: id, props: { locked: true } }),
            )
          }}
          onUnlock={() => {
            selectedIds.forEach((id) =>
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: id, props: { locked: false } }),
            )
          }}
          isLocked={slide.elements.some((el) => selectedIds.has(el.id) && 'locked' in el && el.locked)}
          onProperties={selectedIds.size === 1 ? () => setPropertiesPanel(true) : undefined}
          element={selectedIds.size === 1 ? slide.elements.find((el) => selectedIds.has(el.id)) : undefined}
          slideId={slide.id}
          onUpdateProps={(sId, eId, props) => dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: sId, elementId: eId, props })}
          onCrop={
            selectedIds.size === 1 &&
            slide.elements.find((el) => selectedIds.has(el.id))?.type === 'image'
              ? () => {
                  const id = Array.from(selectedIds)[0]
                  if (onCropOverlay) {
                    onCropOverlay(id)
                  } else {
                    setCropModalElementId(id)
                  }
                  setContextMenu(null)
                }
              : undefined
          }
        />
      )}

      {/* Properties panel */}
      {propertiesPanel &&
        selectedIds.size === 1 &&
        (() => {
          const el = slide.elements.find((e) => e.id === Array.from(selectedIds)[0])
          if (!el) return null
          return (
            <ElementPropertiesPanel
              element={el}
              onUpdate={(props) =>
                dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: el.id, props })
              }
              onClose={() => setPropertiesPanel(false)}
            />
          )
        })()}

      {/* Image filters panel */}
      {imageFiltersPanel &&
        selectedIds.size === 1 &&
        (() => {
          const el = slide.elements.find((e) => e.id === Array.from(selectedIds)[0])
          if (!el || el.type !== 'image') return null
          return (
            <ImageFiltersPanel
              element={el}
              onUpdate={(props) =>
                dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: slide.id, elementId: el.id, props })
              }
              onClose={() => setImageFiltersPanel(false)}
              onCrop={() => onCropOverlay ? onCropOverlay(el.id) : setCropModalElementId(el.id)}
            />
          )
        })()}

      {/* Chart data editor */}
      {chartEditorPanel &&
        selectedIds.size === 1 &&
        (() => {
          const el = slide.elements.find((e) => e.id === Array.from(selectedIds)[0])
          if (!el || el.type !== 'chart') return null
          return (
            <ChartDataEditor
              chart={el}
              onUpdate={(data) => dispatch({ type: 'UPDATE_CHART_DATA', slideId: slide.id, elementId: el.id, data })}
              onUpdateProps={(props) => dispatch({ type: 'UPDATE_CHART_PROPS', slideId: slide.id, elementId: el.id, props })}
              onClose={() => setChartEditorPanel(false)}
            />
          )
        })()}

      {/* Image crop modal */}
      {cropModalElementId &&
        (() => {
          const el = slide.elements.find((e) => e.id === cropModalElementId)
          if (!el || el.type !== 'image') return null
          return (
            <ImageCropModal
              src={el.src}
              currentCrop={el.crop}
              onApply={(crop) => {
                dispatch({
                  type: 'UPDATE_ELEMENT_PROPS',
                  slideId: slide.id,
                  elementId: el.id,
                  props: { crop },
                })
                setCropModalElementId(null)
              }}
              onClose={() => setCropModalElementId(null)}
            />
          )
        })()}

      {/* Size tooltip during resize */}
      <ElementSizeTooltip visible={resizeTooltip.visible} x={resizeTooltip.x} y={resizeTooltip.y} width={resizeTooltip.w} height={resizeTooltip.h} />

      {/* Drag position tooltip */}
      {dragTooltip.visible && (
        <div
          className="fixed z-[9999] px-2 py-1 bg-slate-800/90 text-white text-xs font-mono rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: dragTooltip.clientX + 15, top: dragTooltip.clientY + 15 }}
        >
          X: {dragTooltip.elX.toFixed(1)}% Y: {dragTooltip.elY.toFixed(1)}%
        </div>
      )}

      {/* Hidden file input for image replace */}
      <input
        ref={replaceFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file || selectedIds.size !== 1) return
          if (isStorageNearLimit()) {
            addToast('ストレージの容量が不足しています。', 'warning')
            return
          }
          const src = await fileToDataURL(file)
          const id = Array.from(selectedIds)[0]
          dispatch({ type: 'REPLACE_IMAGE', slideId: slide.id, elementId: id, src })
        }}
      />
    </div>
  )
}
