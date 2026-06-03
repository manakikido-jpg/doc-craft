'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, X, Plus, Trash2, PlusCircle, ArrowUp, ArrowDown, ClipboardPaste, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import type { Slide, SlideElement, SlidesDocument } from '@/types'
import { generateId } from '@/lib/utils'
import SlideThumbnail from './slide-thumbnail'
import VirtualizedSlideList from './virtualized-slide-list'

interface Props {
  state: SlidesDocument
  dispatch: React.Dispatch<
    | { type: 'SET_ACTIVE'; id: string }
    | { type: 'ADD_SLIDE'; afterId?: string }
    | { type: 'DELETE_SLIDE'; id: string }
    | { type: 'DUPLICATE_SLIDE'; id: string }
    | { type: 'REORDER_SLIDES'; fromIndex: number; toIndex: number }
    | { type: 'PASTE_ELEMENTS'; slideId: string; elements: SlideElement[] }
    | { type: 'TOGGLE_SLIDE_HIDDEN'; slideId: string }
  >
}

function SortableSlide({
  slide,
  index,
  isActive,
  isHidden,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleHide,
  onContextMenu,
  dropIndicator,
}: {
  slide: Slide
  index: number
  isActive: boolean
  isHidden: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleHide: () => void
  onContextMenu: (e: React.MouseEvent) => void
  dropIndicator?: 'before' | 'after' | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
    animateLayoutChanges: () => true,
  })

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
    ...(isDragging ? {
      scale: '1.05',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 2px rgba(99,102,241,0.5)',
      borderRadius: '8px',
    } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`group relative ${isHidden ? 'opacity-40' : ''} ${isDragging ? 'opacity-90' : ''}`}
      {...attributes}
      {...listeners}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect()
        onContextMenu(e)
      }}
    >
      {/* Drop indicator line - before */}
      {dropIndicator === 'before' && (
        <div className="absolute -top-1 left-1 right-1 h-0.5 bg-indigo-500 rounded-full z-10 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
      )}

      <div className="relative">
        <SlideThumbnail slide={slide} index={index} isActive={isActive} onClick={onSelect} isDragging={isDragging} />
        {/* Notes indicator icon */}
        {slide.notes && slide.notes.trim().length > 0 && (
          <div
            className="absolute bottom-1 right-1 z-10 cursor-default"
            title={slide.notes.slice(0, 50) + (slide.notes.length > 50 ? '...' : '')}
          >
            <span className="text-[10px] bg-slate-900/70 rounded px-0.5">{'📝'}</span>
          </div>
        )}
      </div>

      {/* Hide/Show toggle - visible on hover, top-right area offset from action buttons */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onToggleHide()
        }}
        className="absolute top-1 left-1 w-5 h-5 rounded bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title={isHidden ? '表示' : '非表示'}
      >
        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>

      {/* Slide number with strikethrough if hidden */}
      {isHidden && (
        <div className="absolute bottom-1 left-1 text-[9px] text-slate-400 line-through z-10">
          {index + 1}
        </div>
      )}

      {isActive && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            className="w-5 h-5 rounded bg-black/50 text-white text-xs flex items-center justify-center hover:bg-black/70"
            title="複製"
          >
            <Copy size={12} />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="w-5 h-5 rounded bg-black/50 text-red-300 text-xs flex items-center justify-center hover:bg-red-900/70"
            title="削除"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Drop indicator line - after */}
      {dropIndicator === 'after' && (
        <div className="absolute -bottom-1 left-1 right-1 h-0.5 bg-indigo-500 rounded-full z-10 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
      )}
    </div>
  )
}

// Context menu for slides
function SlideContextMenu({
  x,
  y,
  slideId,
  slideIndex,
  totalSlides,
  onClose,
  onDuplicate,
  onDelete,
  onAddAfter,
  onPaste,
  onMoveUp,
  onMoveDown,
  hasCopiedSlide,
}: {
  x: number
  y: number
  slideId: string
  slideIndex: number
  totalSlides: number
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAddAfter: () => void
  onPaste: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  hasCopiedSlide: boolean
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const items = [
    { label: '新しいスライド', icon: <PlusCircle size={14} />, action: onAddAfter },
    { label: '複製', icon: <Copy size={14} />, action: onDuplicate },
    { label: '貼り付け', icon: <ClipboardPaste size={14} />, action: onPaste, disabled: !hasCopiedSlide },
    null, // separator
    { label: '上へ移動', icon: <ArrowUp size={14} />, action: onMoveUp, disabled: slideIndex === 0 },
    { label: '下へ移動', icon: <ArrowDown size={14} />, action: onMoveDown, disabled: slideIndex >= totalSlides - 1 },
    null,
    { label: '削除', icon: <Trash2 size={14} />, action: onDelete, danger: true, disabled: totalSlides <= 1 },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={`sep-${i}`} className="my-1 border-t border-slate-700" />
        ) : (
          <button
            key={item.label}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
              item.disabled
                ? 'text-slate-600 cursor-not-allowed'
                : item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-slate-300 hover:bg-slate-700'
            }`}
            disabled={item.disabled}
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}

export default function SlidePanel({ state, dispatch }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; slideId: string; slideIndex: number } | null>(null)
  const [copiedSlide, setCopiedSlide] = useState<Slide | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)
  const pendingPasteRef = useRef<SlideElement[] | null>(null)

  // Virtualized list: measure container height
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [listContainerHeight, setListContainerHeight] = useState(400)
  useEffect(() => {
    const el = listContainerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setListContainerHeight(entry.contentRect.height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 1A: Resizable panel width
  const [panelWidth, setPanelWidth] = useState(140)
  const isResizingRef = useRef(false)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    const startX = e.clientX
    const startWidth = panelWidth

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.min(300, Math.max(100, startWidth + delta))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizingRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [panelWidth])

  // 1B: Slide hide/show — uses reducer-backed hidden field on each Slide
  const toggleSlideHidden = useCallback((slideId: string) => {
    dispatch({ type: 'TOGGLE_SLIDE_HIDDEN', slideId })
  }, [dispatch])

  // 1C: Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSectionCollapsed = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // After ADD_SLIDE, the new slide becomes active. Paste pending elements into it.
  useEffect(() => {
    if (pendingPasteRef.current && state.activeSlideId) {
      const elements = pendingPasteRef.current
      pendingPasteRef.current = null
      dispatch({
        type: 'PASTE_ELEMENTS',
        slideId: state.activeSlideId,
        elements,
      })
    }
  }, [state.activeSlideId, dispatch])

  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    setDragOverId(over ? (over.id as string) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDragOverId(null)
    setDragActiveId(null)
    if (!over || active.id === over.id) return
    const fromIndex = state.slides.findIndex((s) => s.id === active.id)
    const toIndex = state.slides.findIndex((s) => s.id === over.id)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return
    dispatch({ type: 'REORDER_SLIDES', fromIndex, toIndex })
  }

  function handleDragCancel() {
    setDragOverId(null)
    setDragActiveId(null)
  }

  // Copy the active slide for paste
  const handleCopySlide = useCallback((slideId: string) => {
    const slide = state.slides.find((s) => s.id === slideId)
    if (slide) setCopiedSlide(slide)
  }, [state.slides])

  // Paste copied slide after a given slide
  const handlePasteSlide = useCallback((afterSlideId: string) => {
    if (!copiedSlide) return
    // Store elements to paste, then add a blank slide.
    // The useEffect above will paste elements once the new slide becomes active.
    pendingPasteRef.current = copiedSlide.elements.map((el) => ({ ...el, id: generateId() }))
    dispatch({ type: 'ADD_SLIDE', afterId: afterSlideId })
  }, [copiedSlide, dispatch])

  const handleSlideContextMenu = useCallback((e: React.MouseEvent, slideId: string, slideIndex: number) => {
    // Also copy the slide when right-clicking (so "複製" and "貼り付け" have context)
    handleCopySlide(slideId)
    setContextMenu({ x: e.clientX, y: e.clientY, slideId, slideIndex })
  }, [handleCopySlide])

  // Compute drop indicator position for each slide
  function getDropIndicator(slideId: string): 'before' | 'after' | null {
    if (!dragActiveId || !dragOverId || dragActiveId === dragOverId) return null
    if (slideId !== dragOverId) return null
    const activeIdx = state.slides.findIndex((s) => s.id === dragActiveId)
    const overIdx = state.slides.findIndex((s) => s.id === dragOverId)
    return activeIdx < overIdx ? 'after' : 'before'
  }

  // Build a mapping from section id to the range of slide indices it covers
  const sections = state.sections || []
  const sectionRanges: { section: typeof sections[number]; startIndex: number; endIndex: number }[] = sections
    .slice()
    .sort((a, b) => a.startSlideIndex - b.startSlideIndex)
    .map((sec, idx, arr) => ({
      section: sec,
      startIndex: sec.startSlideIndex,
      endIndex: idx < arr.length - 1 ? arr[idx + 1].startSlideIndex - 1 : state.slides.length - 1,
    }))

  // Determine which section (if any) each slide belongs to, and if that section is collapsed
  function isSlideSectionCollapsed(slideIndex: number): boolean {
    const range = sectionRanges.find((r) => slideIndex >= r.startIndex && slideIndex <= r.endIndex)
    if (!range) return false
    // The first slide in a section is always visible (section header is shown above it)
    if (slideIndex === range.startIndex) return false
    return collapsedSections.has(range.section.id)
  }

  return (
    <div className="relative flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden no-print" style={{ width: panelWidth }}>
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 z-10"
        onMouseDown={handleResizeMouseDown}
      />

      <div ref={listContainerRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {state.slides.length > 50 ? (
          <VirtualizedSlideList
            slides={state.slides}
            activeSlideId={state.activeSlideId}
            onSelect={(id) => dispatch({ type: 'SET_ACTIVE', id })}
            onContextMenu={(id, e) => {
              const idx = state.slides.findIndex((s) => s.id === id)
              if (idx >= 0) handleSlideContextMenu(e, id, idx)
            }}
            itemHeight={80}
            containerHeight={listContainerHeight}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={state.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {state.slides.map((slide, i) => {
                if (!slide) return null
                const section = sections.find(s => s.startSlideIndex === i)
                const isCollapsed = isSlideSectionCollapsed(i)

                // If this slide's section is collapsed and it's not the first slide in the section, hide it
                if (isCollapsed) return null

                return (
                  <Fragment key={slide.id}>
                    {section && (
                      <button
                        className="px-2 py-1 flex items-center gap-1 mt-1 mb-0.5 w-full text-left hover:bg-slate-800/50 rounded transition-colors"
                        onClick={() => toggleSectionCollapsed(section.id)}
                      >
                        {collapsedSections.has(section.id) ? (
                          <ChevronRight size={10} className="text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={10} className="text-slate-500 flex-shrink-0" />
                        )}
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: section.color || '#6366f1' }} />
                        <span className="text-[9px] text-slate-400 font-medium truncate">{section.name}</span>
                      </button>
                    )}
                    <SortableSlide
                      slide={slide}
                      index={i}
                      isActive={slide.id === state.activeSlideId}
                      isHidden={!!slide.hidden}
                      onSelect={() => dispatch({ type: 'SET_ACTIVE', id: slide.id })}
                      onDelete={() => dispatch({ type: 'DELETE_SLIDE', id: slide.id })}
                      onDuplicate={() => dispatch({ type: 'DUPLICATE_SLIDE', id: slide.id })}
                      onToggleHide={() => toggleSlideHidden(slide.id)}
                      onContextMenu={(e) => handleSlideContextMenu(e, slide.id, i)}
                      dropIndicator={getDropIndicator(slide.id)}
                    />
                  </Fragment>
                )
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => dispatch({ type: 'ADD_SLIDE', afterId: state.activeSlideId })}
          className="w-full py-2 rounded-lg border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 text-sm transition-colors"
        >
          <Plus size={12} /> スライド追加
        </button>
      </div>

      {contextMenu && (
        <SlideContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          slideId={contextMenu.slideId}
          slideIndex={contextMenu.slideIndex}
          totalSlides={state.slides.length}
          hasCopiedSlide={!!copiedSlide}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => dispatch({ type: 'DUPLICATE_SLIDE', id: contextMenu.slideId })}
          onDelete={() => dispatch({ type: 'DELETE_SLIDE', id: contextMenu.slideId })}
          onAddAfter={() => dispatch({ type: 'ADD_SLIDE', afterId: contextMenu.slideId })}
          onPaste={() => handlePasteSlide(contextMenu.slideId)}
          onMoveUp={() => {
            if (contextMenu.slideIndex > 0) {
              dispatch({ type: 'REORDER_SLIDES', fromIndex: contextMenu.slideIndex, toIndex: contextMenu.slideIndex - 1 })
            }
          }}
          onMoveDown={() => {
            if (contextMenu.slideIndex < state.slides.length - 1) {
              dispatch({ type: 'REORDER_SLIDES', fromIndex: contextMenu.slideIndex, toIndex: contextMenu.slideIndex + 1 })
            }
          }}
        />
      )}
    </div>
  )
}
