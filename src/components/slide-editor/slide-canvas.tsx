'use client'

import { useState, useRef, useEffect } from 'react'
import type {
  SlidesDocument,
  SlideElement,
  SlideTableElement,
  SlideConnectorElement,
} from '@/types'
import type { SlideAction } from '@/hooks/use-slides'
import type { UndoableAction } from '@/lib/undoable'
import ChartRenderer from './chart-renderer'
import { SLIDE_THEMES } from '@/lib/themes'
import SlideTextBlock from './slide-text-block'
import ResizeHandles from './resize-handles'
import ElementContextMenu from './element-context-menu'
import SlideFormatToolbar from './slide-format-toolbar'
import AlignmentToolbar from './alignment-toolbar'
import ElementPropertiesPanel from './element-properties-panel'
import ImageFiltersPanel from './image-filters-panel'
import ChartDataEditor from './chart-data-editor'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import { generateId } from '@/lib/utils'

interface Props {
  state: SlidesDocument
  dispatch: React.Dispatch<UndoableAction<SlideAction>>
  onSelectionChange?: (ids: string[]) => void
}

export default function SlideCanvas({ state, dispatch, onSelectionChange }: Props) {
  const elementClipboardRef = useRef<SlideElement[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
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
  const [zoom, setZoom] = useState(100)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize] = useState(5)
  const [smartGuides, setSmartGuides] = useState<{ x?: number; y?: number }[]>([])
  const [propertiesPanel, setPropertiesPanel] = useState(false)
  const [imageFiltersPanel, setImageFiltersPanel] = useState(false)
  const [chartEditorPanel, setChartEditorPanel] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceFileRef = useRef<HTMLInputElement>(null)

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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault()
        const el = slide.elements.find((el) => selectedIds.has(el.id) && (el as any).groupId)
        if (el) dispatch({ type: 'UNGROUP_ELEMENTS', slideId: slide.id, groupId: (el as any).groupId })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slideOrNull, selectedIds, editingTextId, dispatch])

  if (!slideOrNull) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <span className="text-slate-500">スライドが選択されていません</span>
      </div>
    )
  }

  const slide = slideOrNull
  const baseTheme = SLIDE_THEMES[slide.themeKey]
  const theme = slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme
  const sortedElements = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

  function selectElement(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (e.shiftKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]))
    }
    setContextMenu(null)
  }

  function handleElementMouseDown(e: React.MouseEvent, el: SlideElement) {
    if (el.type === 'connector') return
    if ('locked' in el && el.locked) {
      e.stopPropagation()
      setSelectedIds(new Set([el.id]))
      return
    }
    e.stopPropagation()

    // Alt+drag = duplicate
    if (e.altKey) {
      const duped = { ...el, id: generateId(), x: el.x, y: el.y }
      dispatch({ type: 'PASTE_ELEMENTS', slideId: slide.id, elements: [duped] })
      setSelectedIds(new Set([duped.id]))
      setDraggingId(duped.id)
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
    if (!snapToGrid) return val
    return Math.round(val / gridSize) * gridSize
  }

  function computeSmartGuides(
    movingIds: string[],
    newPositions: { elementId: string; x: number; y: number }[],
  ): { x?: number; y?: number }[] {
    const guides: { x?: number; y?: number }[] = []
    const others = slide.elements.filter((el) => !movingIds.includes(el.id) && el.type !== 'connector')
    const threshold = 1

    for (const pos of newPositions) {
      const moving = slide.elements.find((e) => e.id === pos.elementId)
      if (!moving || moving.type === 'connector') continue
      const mw = moving.w ?? 0
      const mh = 'h' in moving ? (moving.h ?? 0) : 0
      const mCx = pos.x + mw / 2
      const mCy = pos.y + mh / 2

      for (const other of others) {
        if (other.type === 'connector') continue
        const ow = other.w ?? 0
        const oh = 'h' in other ? ((other as any).h ?? 0) : 0
        const oCx = other.x + ow / 2
        const oCy = other.y + oh / 2

        if (Math.abs(mCx - oCx) < threshold) guides.push({ x: oCx })
        if (Math.abs(mCy - oCy) < threshold) guides.push({ y: oCy })
        if (Math.abs(pos.x - other.x) < threshold) guides.push({ x: other.x })
        if (Math.abs(pos.y - other.y) < threshold) guides.push({ y: other.y })
      }
    }
    return guides
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!canvasRef.current) return

    if (draggingId && dragStart) {
      const rect = canvasRef.current.getBoundingClientRect()
      const dx = ((e.clientX - dragStart.mx) / rect.width) * 100
      const dy = ((e.clientY - dragStart.my) / rect.height) * 100
      const moves = dragStart.positions.map((p) => ({
        elementId: p.id,
        x: snapValue(Math.max(0, Math.min(90, p.x + dx))),
        y: snapValue(Math.max(0, Math.min(90, p.y + dy))),
      }))
      setSmartGuides(
        computeSmartGuides(
          moves.map((m) => m.elementId),
          moves,
        ),
      )
      dispatch({ type: 'UPDATE_ELEMENTS_POSITION', slideId: slide.id, moves })
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
    setSmartGuides([])
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    // Don't deselect/cancel editing if clicking inside an actively-edited text element
    if (editingTextId) {
      const editEl = document.querySelector<HTMLElement>('[contenteditable="true"]')
      if (editEl && editEl.contains(e.target as Node)) return
    }
    setSelectedIds(new Set())
    setEditingTextId(null)
    setContextMenu(null)
    setShowFormatToolbar(false)

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
    dispatch({ type: 'UPDATE_ELEMENT_POSITION', slideId: slide.id, elementId, x, y })
    dispatch({ type: 'UPDATE_ELEMENT_SIZE', slideId: slide.id, elementId, w, h })
  }

  function handleRotate(elementId: string, rotation: number) {
    dispatch({ type: 'UPDATE_ELEMENT_ROTATION', slideId: slide.id, elementId, rotation })
  }

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith('image/') || !slide) return
    if (isStorageNearLimit()) {
      alert('ストレージの容量が不足しています。')
      return
    }
    const dataUrl = await fileToDataURL(file)
    dispatch({ type: 'ADD_IMAGE_ELEMENT', slideId: slide.id, src: dataUrl, alt: file.name })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageUpload(file)
  }

  function handleTextFocus(id: string) {
    setEditingTextId(id)
    setSelectedIds(new Set([id]))
    setShowFormatToolbar(true)
  }

  function handleTextBlur(id: string, content: string) {
    setEditingTextId(null)
    setShowFormatToolbar(false)
    dispatch({ type: 'UPDATE_ELEMENT', slideId: slide.id, elementId: id, content })
  }

  function getTransform(el: SlideElement): string | undefined {
    if (el.type === 'connector') return undefined
    const parts: string[] = []
    if ('rotation' in el && el.rotation) parts.push(`rotate(${el.rotation}deg)`)
    if ('flipH' in el && el.flipH) parts.push('scaleX(-1)')
    if ('flipV' in el && el.flipV) parts.push('scaleY(-1)')
    return parts.length > 0 ? parts.join(' ') : undefined
  }

  function getFilterStyle(el: SlideElement): React.CSSProperties {
    const style: React.CSSProperties = {}
    if ('opacity' in el && el.opacity !== undefined && el.opacity !== 100) {
      style.opacity = el.opacity / 100
    }
    if ('shadow' in el && el.shadow) {
      style.filter = `drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color})`
    }
    return style
  }

  function renderElement(el: SlideElement) {
    const isSelected = selectedIds.has(el.id)
    const singleSelected = isSelected && selectedIds.size === 1

    if (el.type === 'connector') {
      const conn = el as SlideConnectorElement
      return (
        <svg
          key={el.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: conn.zIndex ?? 0,
          }}
        >
          <defs>
            {conn.arrowHead && (
              <marker id={`arrow-${conn.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={conn.stroke} />
              </marker>
            )}
          </defs>
          <line
            x1={`${conn.fromPoint.x}%`}
            y1={`${conn.fromPoint.y}%`}
            x2={`${conn.toPoint.x}%`}
            y2={`${conn.toPoint.y}%`}
            stroke={conn.stroke}
            strokeWidth={conn.strokeWidth || 2}
            markerEnd={conn.arrowHead ? `url(#arrow-${conn.id})` : undefined}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onClick={(e) => selectElement(el.id, e as any)}
          />
        </svg>
      )
    }

    if (el.type === 'table') {
      const tableEl = el as SlideTableElement
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
            overflow: 'auto',
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el)}
          onClick={(e) => selectElement(el.id, e)}
          onContextMenu={handleContextMenu}
        >
          <table className="w-full h-full border-collapse" style={{ fontSize: 'clamp(8px, 1.2vw, 14px)' }}>
            <tbody>
              {tableEl.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border border-slate-500/50 px-1 py-0.5 ${ri === 0 && tableEl.headerRow ? 'font-semibold bg-white/10' : ''}`}
                      style={{ color: theme.bodyColor }}
                      contentEditable={isSelected}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        dispatch({
                          type: 'UPDATE_TABLE_CELL',
                          slideId: slide.id,
                          elementId: el.id,
                          row: ri,
                          col: ci,
                          value: e.currentTarget.innerText,
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
            />
          )}
        </div>
      )
    }

    if (el.type === 'image') {
      const imgFilter =
        [
          el.brightness !== undefined && el.brightness !== 100 ? `brightness(${el.brightness}%)` : '',
          el.contrast !== undefined && el.contrast !== 100 ? `contrast(${el.contrast}%)` : '',
          el.blur ? `blur(${el.blur}px)` : '',
        ]
          .filter(Boolean)
          .join(' ') || undefined
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            cursor: draggingId === el.id ? 'grabbing' : 'grab',
            outline: isSelected ? `2px solid ${theme.accentColor}` : 'none',
            borderRadius: '4px',
            overflow: 'hidden',
            zIndex: el.zIndex ?? 0,
            transform: getTransform(el),
            ...getFilterStyle(el),
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el)}
          onClick={(e) => selectElement(el.id, e)}
          onDoubleClick={() => setImageFiltersPanel(true)}
          onContextMenu={handleContextMenu}
        >
          <img
            src={el.src}
            alt={el.alt || ''}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
            style={{ filter: imgFilter }}
          />
          {isSelected && 'locked' in el && el.locked && (
            <div className="absolute top-1 right-1 text-xs bg-black/50 text-white/60 rounded px-1">🔒</div>
          )}
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
            />
          )}
        </div>
      )
    }

    if (el.type === 'shape') {
      const fillId = `grad-${el.id}`
      const useFill = el.gradientFill ? `url(#${fillId})` : el.fill
      const sw = el.strokeWidth ?? 2
      const dashArray = el.strokeDash === 'dashed' ? '8,4' : el.strokeDash === 'dotted' ? '2,4' : undefined
      const shapeMap: Record<string, React.ReactNode> = {
        rect: (
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="4"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        circle: (
          <ellipse
            cx="50"
            cy="50"
            rx="48"
            ry="48"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        triangle: (
          <polygon
            points="50,5 95,95 5,95"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        'arrow-right': (
          <polygon
            points="0,25 65,25 65,5 100,50 65,95 65,75 0,75"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        'arrow-left': (
          <polygon
            points="100,25 35,25 35,5 0,50 35,95 35,75 100,75"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        'arrow-up': (
          <polygon
            points="25,100 25,35 5,35 50,0 95,35 75,35 75,100"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        'arrow-down': (
          <polygon
            points="25,0 25,65 5,65 50,100 95,65 75,65 75,0"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        line: <line x1="0" y1="50" x2="100" y2="50" stroke={el.fill} strokeWidth="4" strokeDasharray={dashArray} />,
        star: (
          <polygon
            points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        diamond: (
          <polygon
            points="50,2 98,50 50,98 2,50"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        hexagon: (
          <polygon
            points="25,5 75,5 98,50 75,95 25,95 2,50"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        pentagon: (
          <polygon
            points="50,5 97,38 80,95 20,95 3,38"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        heart: (
          <path
            d="M50,88 C25,65 2,45 2,28 C2,12 15,2 28,2 C38,2 46,8 50,18 C54,8 62,2 72,2 C85,2 98,12 98,28 C98,45 75,65 50,88Z"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
        callout: (
          <>
            <rect
              x="2"
              y="2"
              width="96"
              height="70"
              rx="8"
              fill={useFill}
              stroke={el.stroke || 'none'}
              strokeWidth={sw}
              strokeDasharray={dashArray}
            />
            <polygon points="20,72 35,95 45,72" fill={useFill} />
          </>
        ),
        cross: (
          <polygon
            points="35,2 65,2 65,35 98,35 98,65 65,65 65,98 35,98 35,65 2,65 2,35 35,35"
            fill={useFill}
            stroke={el.stroke || 'none'}
            strokeWidth={sw}
            strokeDasharray={dashArray}
          />
        ),
      }

      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            cursor: draggingId === el.id ? 'grabbing' : 'grab',
            outline: isSelected ? `2px solid ${theme.accentColor}` : 'none',
            zIndex: el.zIndex ?? 0,
            transform: getTransform(el),
            ...getFilterStyle(el),
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el)}
          onClick={(e) => selectElement(el.id, e)}
          onContextMenu={handleContextMenu}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {el.gradientFill && (
              <defs>
                <linearGradient id={fillId} gradientTransform={`rotate(${el.gradientFill.angle})`}>
                  <stop offset="0%" stopColor={el.gradientFill.color1} />
                  <stop offset="100%" stopColor={el.gradientFill.color2} />
                </linearGradient>
              </defs>
            )}
            {shapeMap[el.shape] || shapeMap.rect}
          </svg>
          {el.textContent && (
            <div
              className="absolute inset-0 flex items-center justify-center p-1"
              style={{
                color: el.textColor || '#ffffff',
                fontSize: `clamp(8px, ${(el.textFontSize || 14) * 0.055}vw, ${el.textFontSize || 14}px)`,
                textAlign: 'center',
                wordBreak: 'break-word',
                overflow: 'hidden',
              }}
            >
              {el.textContent}
            </div>
          )}
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
            />
          )}
        </div>
      )
    }

    // Video element
    if (el.type === 'video') {
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
            transform: getTransform(el),
            outline: isSelected ? `2px solid ${theme.accentColor}` : 'none',
            cursor: draggingId === el.id ? 'grabbing' : 'grab',
            ...getFilterStyle(el),
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el)}
          onClick={(e) => selectElement(el.id, e)}
          onContextMenu={handleContextMenu}
        >
          {el.embedType === 'youtube' ? (
            <iframe src={el.src} className="w-full h-full rounded pointer-events-none" allowFullScreen />
          ) : (
            <video src={el.src} className="w-full h-full rounded object-contain" controls={isSelected} />
          )}
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
            />
          )}
        </div>
      )
    }

    // Audio element
    if (el.type === 'audio') {
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
            outline: isSelected ? `2px solid ${theme.accentColor}` : 'none',
            cursor: draggingId === el.id ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.6)',
            borderRadius: '8px',
            ...getFilterStyle(el),
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el)}
          onClick={(e) => selectElement(el.id, e)}
          onContextMenu={handleContextMenu}
        >
          <audio src={el.src} controls className="w-[90%]" />
          {singleSelected && (
            <ResizeHandles
              x={el.x}
              y={el.y}
              w={el.w}
              h={el.h}
              canvasRef={canvasRef}
              onResize={(nx, ny, nw, nh) => handleResize(el.id, nx, ny, nw, nh)}
              onRotate={() => {}}
            />
          )}
        </div>
      )
    }

    // Chart element
    if (el.type === 'chart') {
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
            transform: getTransform(el),
            outline: isSelected ? `2px solid ${theme.accentColor}` : 'none',
            cursor: draggingId === el.id ? 'grabbing' : 'grab',
            ...getFilterStyle(el),
          }}
          onMouseDown={(e) => handleElementMouseDown(e, el)}
          onClick={(e) => selectElement(el.id, e)}
          onDoubleClick={() => setChartEditorPanel(true)}
          onContextMenu={handleContextMenu}
        >
          <ChartRenderer chart={el} />
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
            />
          )}
        </div>
      )
    }

    // Text element
    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: el.h ? `${el.h}%` : undefined,
          zIndex: el.zIndex ?? 0,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          outline: isSelected && editingTextId !== el.id ? `2px solid ${theme.accentColor}40` : 'none',
        }}
        onMouseDown={(e) => {
          if (editingTextId !== el.id) handleElementMouseDown(e, el)
        }}
        onClick={(e) => selectElement(el.id, e)}
        onDoubleClick={() => handleTextFocus(el.id)}
        onContextMenu={handleContextMenu}
      >
        <SlideTextBlock
          element={el}
          theme={theme}
          isEditing={editingTextId === el.id}
          onFocus={() => handleTextFocus(el.id)}
          onBlur={(content) => handleTextBlur(el.id, content)}
        />
        {singleSelected && editingTextId !== el.id && (
          <ResizeHandles
            x={el.x}
            y={el.y}
            w={el.w}
            h={el.h ?? 10}
            rotation={el.rotation}
            canvasRef={canvasRef}
            onResize={(nx, ny, nw, nh) => handleResize(el.id, nx, ny, nw, nh)}
            onRotate={(r) => handleRotate(el.id, r)}
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
      {/* Zoom & Grid controls */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-700"
        >
          −
        </button>
        <span className="text-xs text-slate-400 w-10 text-center">{zoom}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white text-xs border border-slate-700"
        >
          +
        </button>
        <button
          onClick={() => setZoom(100)}
          className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-[10px] border border-slate-700"
        >
          100%
        </button>
        <div className="w-px h-4 bg-slate-700" />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${showGrid ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
        >
          グリッド
        </button>
        {showGrid && (
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${snapToGrid ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
          >
            スナップ
          </button>
        )}
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

      <div
        className="w-full max-w-4xl"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
      >
        <div
          ref={canvasRef}
          className={`relative w-full shadow-2xl rounded-lg overflow-hidden slide-print-page ${editingTextId ? '' : 'select-none'}`}
          style={bgStyle}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={handleContextMenu}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Grid overlay */}
          {showGrid && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {Array.from({ length: Math.floor(100 / gridSize) - 1 }, (_, i) => {
                const pos = (i + 1) * gridSize
                return (
                  <g key={i}>
                    <line
                      x1={`${pos}%`}
                      y1="0"
                      x2={`${pos}%`}
                      y2="100%"
                      stroke="rgba(99,102,241,0.15)"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="0"
                      y1={`${pos}%`}
                      x2="100%"
                      y2={`${pos}%`}
                      stroke="rgba(99,102,241,0.15)"
                      strokeWidth="0.5"
                    />
                  </g>
                )
              })}
            </svg>
          )}

          {sortedElements.map(renderElement)}

          {/* Smart guides */}
          {smartGuides.map((g, i) => (
            <div key={i}>
              {g.x !== undefined && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${g.x}%`,
                    top: 0,
                    width: '1px',
                    height: '100%',
                    background: '#f97316',
                    pointerEvents: 'none',
                    zIndex: 99998,
                  }}
                />
              )}
              {g.y !== undefined && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: `${g.y}%`,
                    width: '100%',
                    height: '1px',
                    background: '#f97316',
                    pointerEvents: 'none',
                    zIndex: 99998,
                  }}
                />
              )}
            </div>
          ))}

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
              onClose={() => setChartEditorPanel(false)}
            />
          )
        })()}

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
            alert('ストレージ不足')
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
