'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Check, RotateCcw } from 'lucide-react'

interface Props {
  src: string
  currentCrop?: { x: number; y: number; w: number; h: number }
  onApply: (crop: { x: number; y: number; w: number; h: number }) => void
  onClose: () => void
}

export default function ImageCropModal({ src, currentCrop, onApply, onClose }: Props) {
  const [crop, setCrop] = useState(currentCrop || { x: 0, y: 0, w: 100, h: 100 })
  const [dragging, setDragging] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null)
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, crop: crop })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(type)
    setDragStart({ mx: e.clientX, my: e.clientY, crop: { ...crop } })
  }

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const dx = ((e.clientX - dragStart.mx) / rect.width) * 100
      const dy = ((e.clientY - dragStart.my) / rect.height) * 100
      const c = dragStart.crop

      const newCrop = { ...c }
      if (dragging === 'move') {
        newCrop.x = Math.max(0, Math.min(100 - c.w, c.x + dx))
        newCrop.y = Math.max(0, Math.min(100 - c.h, c.y + dy))
      } else if (dragging === 'se') {
        newCrop.w = Math.max(10, Math.min(100 - c.x, c.w + dx))
        newCrop.h = Math.max(10, Math.min(100 - c.y, c.h + dy))
      } else if (dragging === 'sw') {
        const newX = Math.max(0, c.x + dx)
        newCrop.x = newX
        newCrop.w = Math.max(10, c.w - (newX - c.x))
        newCrop.h = Math.max(10, Math.min(100 - c.y, c.h + dy))
      } else if (dragging === 'ne') {
        newCrop.w = Math.max(10, Math.min(100 - c.x, c.w + dx))
        const newY = Math.max(0, c.y + dy)
        newCrop.y = newY
        newCrop.h = Math.max(10, c.h - (newY - c.y))
      } else if (dragging === 'nw') {
        const newX = Math.max(0, c.x + dx)
        const newY = Math.max(0, c.y + dy)
        newCrop.x = newX
        newCrop.y = newY
        newCrop.w = Math.max(10, c.w - (newX - c.x))
        newCrop.h = Math.max(10, c.h - (newY - c.y))
      }
      setCrop(newCrop)
    }
    const handleMouseUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, dragStart])

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">画像をクロップ</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-lg overflow-hidden select-none">
          <img src={src} alt="" className="w-full h-full object-contain" draggable={false} />

          {/* Dark overlay outside crop */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: `${crop.y}%` }} />
            <div className="absolute bg-black/60" style={{ top: `${crop.y + crop.h}%`, left: 0, right: 0, bottom: 0 }} />
            <div className="absolute bg-black/60" style={{ top: `${crop.y}%`, left: 0, width: `${crop.x}%`, height: `${crop.h}%` }} />
            <div className="absolute bg-black/60" style={{ top: `${crop.y}%`, left: `${crop.x + crop.w}%`, right: 0, height: `${crop.h}%` }} />
          </div>

          {/* Crop area */}
          <div
            className="absolute border-2 border-white/80 cursor-move"
            style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
            </div>

            {/* Corner handles */}
            {(['nw', 'ne', 'sw', 'se'] as const).map(corner => (
              <div
                key={corner}
                className={`absolute w-3 h-3 bg-white rounded-full border border-slate-400 ${
                  corner === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' :
                  corner === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' :
                  corner === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' :
                  '-bottom-1.5 -right-1.5 cursor-se-resize'
                }`}
                onMouseDown={(e) => handleMouseDown(e, corner)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw size={12} /> リセット
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">キャンセル</button>
            <button
              onClick={() => onApply(crop)}
              className="flex items-center gap-1 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
            >
              <Check size={12} /> 適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
