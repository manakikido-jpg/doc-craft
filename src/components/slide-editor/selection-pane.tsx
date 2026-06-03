'use client'

import { useState, useCallback } from 'react'
import { X, Eye, EyeOff, Lock, Unlock, GripVertical, CheckSquare, Square } from 'lucide-react'
import type { Slide, SlideElement } from '@/types'
import type { SlideAction } from '@/hooks/use-slides'

interface SelectionPaneProps {
  slide: Slide
  slideId: string
  selectedIds: string[]
  dispatch: React.Dispatch<SlideAction>
  onSelectElement: (id: string) => void
  onClose: () => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

function getElementIcon(el: SlideElement): string {
  switch (el.type) {
    case 'title':
    case 'subtitle':
    case 'body':
    case 'label':
      return 'T'
    case 'image':
      return '🖼'
    case 'shape':
      return '◆'
    case 'chart':
      return '📊'
    case 'table':
      return '📋'
    case 'connector':
      return '🔗'
    case 'video':
      return '🎬'
    case 'audio':
      return '🔊'
    default:
      return '?'
  }
}

function getElementLabel(el: SlideElement): string {
  switch (el.type) {
    case 'title':
    case 'subtitle':
    case 'body':
    case 'label': {
      const text = stripHtml(el.content)
      return text ? text.slice(0, 20) : `(${el.type})`
    }
    case 'image':
      return el.alt ? el.alt.slice(0, 20) : '画像'
    case 'shape':
      if (el.textContent) {
        const text = stripHtml(el.textContent)
        return text ? text.slice(0, 20) : el.shape
      }
      return el.shape
    case 'chart':
      return el.title ? el.title.slice(0, 20) : `${el.chartType}チャート`
    case 'table':
      return `表 (${el.rows.length}×${el.rows[0]?.length ?? 0})`
    case 'connector':
      return `コネクタ (${el.style})`
    case 'video':
      return 'ビデオ'
    case 'audio':
      return 'オーディオ'
    default:
      return '要素'
  }
}

export default function SelectionPane({
  slide,
  slideId,
  selectedIds,
  dispatch,
  onSelectElement,
  onClose,
}: SelectionPaneProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Sort elements by z-index descending (highest first)
  const sorted = [...slide.elements].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))

  const handleClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Multi-select: toggle
        onSelectElement(id)
      } else {
        onSelectElement(id)
      }
    },
    [onSelectElement],
  )

  const toggleVisibility = useCallback(
    (el: SlideElement) => {
      const isHidden = el.opacity === 0
      dispatch({
        type: 'UPDATE_ELEMENT_PROPS',
        slideId,
        elementId: el.id,
        props: { opacity: isHidden ? 1 : 0 },
      })
    },
    [dispatch, slideId],
  )

  const toggleLock = useCallback(
    (el: SlideElement) => {
      dispatch({
        type: 'UPDATE_ELEMENT_PROPS',
        slideId,
        elementId: el.id,
        props: { locked: !el.locked },
      })
    },
    [dispatch, slideId],
  )

  const selectAll = useCallback(() => {
    for (const el of slide.elements) {
      onSelectElement(el.id)
    }
  }, [slide.elements, onSelectElement])

  const deselectAll = useCallback(() => {
    // Select nothing by selecting an invalid id, or just call onSelectElement with empty
    // We select the first element then deselect — simplest: trigger with empty string
    onSelectElement('')
  }, [onSelectElement])

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }, [])

  const handleDrop = useCallback(
    (dropIdx: number) => {
      if (dragIdx === null || dragIdx === dropIdx) {
        setDragIdx(null)
        setDragOverIdx(null)
        return
      }
      const draggedEl = sorted[dragIdx]
      const targetEl = sorted[dropIdx]
      if (!draggedEl || !targetEl) return

      // If dragged above (lower index = higher z), bring to front relative
      if (dropIdx < dragIdx) {
        dispatch({ type: 'BRING_TO_FRONT', slideId, elementId: draggedEl.id })
      } else {
        dispatch({ type: 'SEND_TO_BACK', slideId, elementId: draggedEl.id })
      }
      setDragIdx(null)
      setDragOverIdx(null)
    },
    [dragIdx, sorted, dispatch, slideId],
  )

  const startRename = useCallback((el: SlideElement) => {
    setRenamingId(el.id)
    setRenameText(getElementLabel(el))
  }, [])

  const finishRename = useCallback(() => {
    // Rename is display-only for non-text elements; for text elements we don't change content
    setRenamingId(null)
    setRenameText('')
  }, [])

  return (
    <div className="flex h-full w-56 flex-col border-l border-gray-700 bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <span className="text-sm font-semibold">選択ペイン</span>
        <button onClick={onClose} className="rounded p-0.5 hover:bg-gray-700" aria-label="閉じる">
          <X size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-1 border-b border-gray-700 px-3 py-1.5">
        <button
          onClick={selectAll}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-gray-700"
        >
          <CheckSquare size={12} />
          すべて選択
        </button>
        <button
          onClick={deselectAll}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-gray-700"
        >
          <Square size={12} />
          解除
        </button>
      </div>

      {/* Element list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-gray-500">要素がありません</p>
        )}
        {sorted.map((el, idx) => {
          const isSelected = selectedIds.includes(el.id)
          const isHidden = el.opacity === 0
          const isLocked = !!el.locked

          return (
            <div
              key={el.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => {
                setDragIdx(null)
                setDragOverIdx(null)
              }}
              onClick={(e) => handleClick(el.id, e)}
              onDoubleClick={() => startRename(el)}
              className={`flex cursor-pointer items-center gap-1.5 border-b border-gray-800 px-2 py-1.5 text-xs transition-colors ${
                isSelected ? 'bg-blue-900/60 text-white' : 'hover:bg-gray-800'
              } ${dragOverIdx === idx ? 'border-t-2 border-t-blue-400' : ''} ${
                isHidden ? 'opacity-50' : ''
              }`}
            >
              {/* Drag handle */}
              <span className="cursor-grab text-gray-500 hover:text-gray-300">
                <GripVertical size={12} />
              </span>

              {/* Icon */}
              <span className="w-5 text-center text-sm">{getElementIcon(el)}</span>

              {/* Name / Rename */}
              <span className="min-w-0 flex-1 truncate">
                {renamingId === el.id ? (
                  <input
                    className="w-full rounded bg-gray-700 px-1 text-xs text-white outline-none"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishRename()
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  getElementLabel(el)
                )}
              </span>

              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleVisibility(el)
                }}
                className="rounded p-0.5 hover:bg-gray-700"
                aria-label={isHidden ? '表示' : '非表示'}
              >
                {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>

              {/* Lock toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLock(el)
                }}
                className="rounded p-0.5 hover:bg-gray-700"
                aria-label={isLocked ? 'ロック解除' : 'ロック'}
              >
                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
