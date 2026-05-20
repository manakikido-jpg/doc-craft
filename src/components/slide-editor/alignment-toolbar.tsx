'use client'

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
  elements: SlideElement[]
  selectedIds: Set<string>
  onUpdatePosition: (elementId: string, x: number, y: number) => void
}

export default function AlignmentToolbar({ elements, selectedIds, onUpdatePosition }: Props) {
  const selected = elements.filter((e) => selectedIds.has(e.id) && e.type !== 'connector')
  if (selected.length < 1) return null

  function getBox(el: SlideElement) {
    if (el.type === 'connector') return { x: 0, y: 0, w: 0, h: 0 }
    return { x: el.x, y: el.y, w: el.w ?? 0, h: (el as any).h ?? 0 }
  }

  function alignLeft() {
    const minX = Math.min(...selected.map((e) => getBox(e).x))
    selected.forEach((e) => onUpdatePosition(e.id, minX, getBox(e).y))
  }
  function alignCenterH() {
    const boxes = selected.map(getBox)
    const minX = Math.min(...boxes.map((b) => b.x))
    const maxX = Math.max(...boxes.map((b) => b.x + b.w))
    const center = (minX + maxX) / 2
    selected.forEach((e) => {
      const b = getBox(e)
      onUpdatePosition(e.id, center - b.w / 2, b.y)
    })
  }
  function alignRight() {
    const boxes = selected.map(getBox)
    const maxRight = Math.max(...boxes.map((b) => b.x + b.w))
    selected.forEach((e) => {
      const b = getBox(e)
      onUpdatePosition(e.id, maxRight - b.w, b.y)
    })
  }
  function alignTop() {
    const minY = Math.min(...selected.map((e) => getBox(e).y))
    selected.forEach((e) => onUpdatePosition(e.id, getBox(e).x, minY))
  }
  function alignCenterV() {
    const boxes = selected.map(getBox)
    const minY = Math.min(...boxes.map((b) => b.y))
    const maxY = Math.max(...boxes.map((b) => b.y + b.h))
    const center = (minY + maxY) / 2
    selected.forEach((e) => {
      const b = getBox(e)
      onUpdatePosition(e.id, b.x, center - b.h / 2)
    })
  }
  function alignBottom() {
    const boxes = selected.map(getBox)
    const maxBottom = Math.max(...boxes.map((b) => b.y + b.h))
    selected.forEach((e) => {
      const b = getBox(e)
      onUpdatePosition(e.id, b.x, maxBottom - b.h)
    })
  }

  function distributeH() {
    if (selected.length < 3) return
    const boxes = selected.map((e) => ({ id: e.id, ...getBox(e) }))
    boxes.sort((a, b) => a.x - b.x)
    const first = boxes[0]
    const last = boxes[boxes.length - 1]
    const totalWidth = boxes.reduce((sum, b) => sum + b.w, 0)
    const totalSpace = last.x + last.w - first.x - totalWidth
    const gap = totalSpace / (boxes.length - 1)
    let currentX = first.x + first.w + gap
    for (let i = 1; i < boxes.length - 1; i++) {
      onUpdatePosition(boxes[i].id, currentX, boxes[i].y)
      currentX += boxes[i].w + gap
    }
  }

  function distributeV() {
    if (selected.length < 3) return
    const boxes = selected.map((e) => ({ id: e.id, ...getBox(e) }))
    boxes.sort((a, b) => a.y - b.y)
    const first = boxes[0]
    const last = boxes[boxes.length - 1]
    const totalHeight = boxes.reduce((sum, b) => sum + b.h, 0)
    const totalSpace = last.y + last.h - first.y - totalHeight
    const gap = totalSpace / (boxes.length - 1)
    let currentY = first.y + first.h + gap
    for (let i = 1; i < boxes.length - 1; i++) {
      onUpdatePosition(boxes[i].id, boxes[i].x, currentY)
      currentY += boxes[i].h + gap
    }
  }

  const btn =
    'w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors'

  return (
    <div className="flex items-center gap-0.5 px-1.5 py-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
      <button className={btn} onClick={alignLeft} title="左揃え">
        <AlignStartVertical size={14} />
      </button>
      <button className={btn} onClick={alignCenterH} title="中央揃え（水平）">
        <AlignCenterVertical size={14} />
      </button>
      <button className={btn} onClick={alignRight} title="右揃え">
        <AlignEndVertical size={14} />
      </button>
      <div className="w-px h-4 bg-slate-600 mx-0.5" />
      <button className={btn} onClick={alignTop} title="上揃え">
        <AlignStartHorizontal size={14} />
      </button>
      <button className={btn} onClick={alignCenterV} title="中央揃え（垂直）">
        <AlignCenterHorizontal size={14} />
      </button>
      <button className={btn} onClick={alignBottom} title="下揃え">
        <AlignEndHorizontal size={14} />
      </button>
      {selected.length >= 3 && (
        <>
          <div className="w-px h-4 bg-slate-600 mx-0.5" />
          <button className={btn} onClick={distributeH} title="水平に均等配置">
            <AlignHorizontalDistributeCenter size={14} />
          </button>
          <button className={btn} onClick={distributeV} title="垂直に均等配置">
            <AlignVerticalDistributeCenter size={14} />
          </button>
        </>
      )}
    </div>
  )
}
