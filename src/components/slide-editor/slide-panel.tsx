'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, X, Plus } from 'lucide-react'
import type { Slide, SlidesDocument } from '@/types'
import SlideThumbnail from './slide-thumbnail'

interface Props {
  state: SlidesDocument
  dispatch: React.Dispatch<
    | { type: 'SET_ACTIVE'; id: string }
    | { type: 'ADD_SLIDE'; afterId?: string }
    | { type: 'DELETE_SLIDE'; id: string }
    | { type: 'DUPLICATE_SLIDE'; id: string }
    | { type: 'REORDER_SLIDES'; fromIndex: number; toIndex: number }
  >
}

function SortableSlide({
  slide,
  index,
  isActive,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  slide: Slide
  index: number
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="group relative"
      {...attributes}
      {...listeners}
    >
      <SlideThumbnail slide={slide} index={index} isActive={isActive} onClick={onSelect} isDragging={isDragging} />
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
    </div>
  )
}

export default function SlidePanel({ state, dispatch }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = state.slides.findIndex((s) => s.id === active.id)
    const toIndex = state.slides.findIndex((s) => s.id === over.id)
    dispatch({ type: 'REORDER_SLIDES', fromIndex, toIndex })
  }

  return (
    <div className="w-44 flex flex-col bg-slate-950 border-r border-slate-800 overflow-hidden no-print">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={state.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {state.slides.map((slide, i) => (
              <SortableSlide
                key={slide.id}
                slide={slide}
                index={i}
                isActive={slide.id === state.activeSlideId}
                onSelect={() => dispatch({ type: 'SET_ACTIVE', id: slide.id })}
                onDelete={() => dispatch({ type: 'DELETE_SLIDE', id: slide.id })}
                onDuplicate={() => dispatch({ type: 'DUPLICATE_SLIDE', id: slide.id })}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => dispatch({ type: 'ADD_SLIDE', afterId: state.activeSlideId })}
          className="w-full py-2 rounded-lg border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 text-sm transition-colors"
        >
          <Plus size={12} /> スライド追加
        </button>
      </div>
    </div>
  )
}
