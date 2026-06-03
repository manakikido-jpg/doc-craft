'use client'

import { useState } from 'react'
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react'
import type { SlideElement } from '@/types'

interface Props {
  selectedElements: SlideElement[]
  slideId: string
  dispatch: React.Dispatch<any>
  onClose?: () => void
}

type AlignRef = 'slide' | 'selection'

function getBox(el: SlideElement) {
  if (el.type === 'connector') return null
  return { x: el.x, y: el.y, w: el.w, h: el.h }
}

function getSelectionBounds(elements: SlideElement[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const el of elements) {
    const box = getBox(el)
    if (!box) continue
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.w)
    maxY = Math.max(maxY, box.y + box.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export default function EnhancedAlignmentToolbar({
  selectedElements,
  slideId,
  dispatch,
  onClose,
}: Props) {
  const [alignRef, setAlignRef] = useState<AlignRef>('slide')

  const usable = selectedElements.filter((el) => el.type !== 'connector')
  if (usable.length === 0) return null

  const bounds =
    alignRef === 'slide'
      ? { x: 0, y: 0, w: 100, h: 100 }
      : getSelectionBounds(usable)

  function updatePositions(updates: { id: string; x: number; y: number }[]) {
    dispatch({
      type: 'UPDATE_ELEMENTS_POSITION',
      slideId,
      updates,
    })
  }

  function alignLeft() {
    updatePositions(
      usable.map((el) => ({ id: el.id, x: bounds.x, y: el.y })),
    )
  }

  function alignCenter() {
    const cx = bounds.x + bounds.w / 2
    updatePositions(
      usable.map((el) => {
        const box = getBox(el)!
        return { id: el.id, x: cx - box.w / 2, y: el.y }
      }),
    )
  }

  function alignRight() {
    const right = bounds.x + bounds.w
    updatePositions(
      usable.map((el) => {
        const box = getBox(el)!
        return { id: el.id, x: right - box.w, y: el.y }
      }),
    )
  }

  function alignTop() {
    updatePositions(
      usable.map((el) => ({ id: el.id, x: el.x, y: bounds.y })),
    )
  }

  function alignMiddle() {
    const cy = bounds.y + bounds.h / 2
    updatePositions(
      usable.map((el) => {
        const box = getBox(el)!
        return { id: el.id, x: el.x, y: cy - box.h / 2 }
      }),
    )
  }

  function alignBottom() {
    const bottom = bounds.y + bounds.h
    updatePositions(
      usable.map((el) => {
        const box = getBox(el)!
        return { id: el.id, x: el.x, y: bottom - box.h }
      }),
    )
  }

  function distributeH() {
    if (usable.length < 3) return
    const sorted = [...usable].sort((a, b) => a.x - b.x)
    const totalW = sorted.reduce((sum, el) => sum + (getBox(el)?.w ?? 0), 0)
    const space = (bounds.w - totalW) / (sorted.length - 1)
    let cx = bounds.x
    const updates = sorted.map((el) => {
      const box = getBox(el)!
      const update = { id: el.id, x: cx, y: el.y }
      cx += box.w + space
      return update
    })
    updatePositions(updates)
  }

  function distributeV() {
    if (usable.length < 3) return
    const sorted = [...usable].sort((a, b) => a.y - b.y)
    const totalH = sorted.reduce((sum, el) => sum + (getBox(el)?.h ?? 0), 0)
    const space = (bounds.h - totalH) / (sorted.length - 1)
    let cy = bounds.y
    const updates = sorted.map((el) => {
      const box = getBox(el)!
      const update = { id: el.id, x: el.x, y: cy }
      cy += box.h + space
      return update
    })
    updatePositions(updates)
  }

  const btnClass =
    'p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors'

  const actions = [
    { icon: AlignStartVertical, label: 'Align Left', fn: alignLeft },
    { icon: AlignCenterVertical, label: 'Align Center', fn: alignCenter },
    { icon: AlignEndVertical, label: 'Align Right', fn: alignRight },
    { icon: AlignStartHorizontal, label: 'Align Top', fn: alignTop },
    { icon: AlignCenterHorizontal, label: 'Align Middle', fn: alignMiddle },
    { icon: AlignEndHorizontal, label: 'Align Bottom', fn: alignBottom },
  ]

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
      {actions.map(({ icon: Icon, label, fn }) => (
        <button
          key={label}
          title={label}
          className={btnClass}
          onClick={fn}
        >
          <Icon size={16} />
        </button>
      ))}

      <div className="w-px h-5 bg-slate-700 mx-1" />

      <button
        title="Distribute Horizontally"
        className={btnClass}
        onClick={distributeH}
        disabled={usable.length < 3}
      >
        <AlignHorizontalDistributeCenter size={16} />
      </button>
      <button
        title="Distribute Vertically"
        className={btnClass}
        onClick={distributeV}
        disabled={usable.length < 3}
      >
        <AlignVerticalDistributeCenter size={16} />
      </button>

      <div className="w-px h-5 bg-slate-700 mx-1" />

      <button
        className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        onClick={() => setAlignRef(alignRef === 'slide' ? 'selection' : 'slide')}
        title={`Align relative to: ${alignRef === 'slide' ? 'Slide' : 'Selection'}`}
      >
        {alignRef === 'slide' ? 'To Slide' : 'To Selection'}
      </button>

      {onClose && (
        <button
          className="ml-1 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
          onClick={onClose}
          title="Close"
        >
          ×
        </button>
      )}
    </div>
  )
}
