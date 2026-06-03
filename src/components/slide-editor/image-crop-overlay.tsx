'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { SlideImageElement } from '@/types'

interface Props {
  element: SlideImageElement
  canvasRect: DOMRect
  onCropChange: (crop: { x: number; y: number; w: number; h: number }) => void
  onClose: () => void
}

type HandlePosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br'

export default function ImageCropOverlay({ element, canvasRect, onCropChange, onClose }: Props) {
  const initialCrop = element.crop || { x: 0, y: 0, w: 100, h: 100 }
  const [crop, setCrop] = useState(initialCrop)
  const [dragging, setDragging] = useState<{ type: 'move' | 'resize'; handle?: HandlePosition; startX: number; startY: number; startCrop: typeof crop } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Compute element position on screen based on canvasRect and element percentage positions
  const elLeft = canvasRect.left + (element.x / 100) * canvasRect.width
  const elTop = canvasRect.top + (element.y / 100) * canvasRect.height
  const elWidth = (element.w / 100) * canvasRect.width
  const elHeight = (element.h / 100) * canvasRect.height

  // Crop rect in pixels relative to the element
  const cropPxLeft = (crop.x / 100) * elWidth
  const cropPxTop = (crop.y / 100) * elHeight
  const cropPxWidth = (crop.w / 100) * elWidth
  const cropPxHeight = (crop.h / 100) * elHeight

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize', handle?: HandlePosition) => {
    e.stopPropagation()
    e.preventDefault()
    setDragging({
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    })
  }, [crop])

  useEffect(() => {
    if (!dragging) return

    function handleMouseMove(e: MouseEvent) {
      if (!dragging) return
      const dx = e.clientX - dragging.startX
      const dy = e.clientY - dragging.startY
      const dxPct = (dx / elWidth) * 100
      const dyPct = (dy / elHeight) * 100
      const sc = dragging.startCrop

      if (dragging.type === 'move') {
        const newX = Math.max(0, Math.min(100 - sc.w, sc.x + dxPct))
        const newY = Math.max(0, Math.min(100 - sc.h, sc.y + dyPct))
        setCrop({ ...sc, x: newX, y: newY })
        return
      }

      // Resize
      let newX = sc.x
      let newY = sc.y
      let newW = sc.w
      let newH = sc.h
      const handle = dragging.handle!

      if (handle.includes('l')) {
        newX = Math.max(0, Math.min(sc.x + sc.w - 5, sc.x + dxPct))
        newW = sc.w - (newX - sc.x)
      }
      if (handle.includes('r')) {
        newW = Math.max(5, Math.min(100 - sc.x, sc.w + dxPct))
      }
      if (handle.startsWith('t')) {
        newY = Math.max(0, Math.min(sc.y + sc.h - 5, sc.y + dyPct))
        newH = sc.h - (newY - sc.y)
      }
      if (handle.startsWith('b')) {
        newH = Math.max(5, Math.min(100 - sc.y, sc.h + dyPct))
      }
      // Middle handles only affect one axis
      if (handle === 'ml' || handle === 'mr') {
        newY = sc.y
        newH = sc.h
      }
      if (handle === 'tc' || handle === 'bc') {
        newX = sc.x
        newW = sc.w
      }

      setCrop({ x: newX, y: newY, w: newW, h: newH })
    }

    function handleMouseUp() {
      setDragging(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, elWidth, elHeight])

  const handleApply = () => {
    onCropChange({
      x: Math.round(crop.x * 100) / 100,
      y: Math.round(crop.y * 100) / 100,
      w: Math.round(crop.w * 100) / 100,
      h: Math.round(crop.h * 100) / 100,
    })
  }

  const handles: { pos: HandlePosition; style: React.CSSProperties; cursor: string }[] = [
    { pos: 'tl', style: { left: -4, top: -4 }, cursor: 'nwse-resize' },
    { pos: 'tc', style: { left: '50%', top: -4, transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
    { pos: 'tr', style: { right: -4, top: -4 }, cursor: 'nesw-resize' },
    { pos: 'ml', style: { left: -4, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
    { pos: 'mr', style: { right: -4, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
    { pos: 'bl', style: { left: -4, bottom: -4 }, cursor: 'nesw-resize' },
    { pos: 'bc', style: { left: '50%', bottom: -4, transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
    { pos: 'br', style: { right: -4, bottom: -4 }, cursor: 'nwse-resize' },
  ]

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000]"
      style={{ cursor: dragging?.type === 'move' ? 'grabbing' : undefined }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {/* Dark overlay outside the element area */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Element container */}
      <div
        style={{
          position: 'absolute',
          left: elLeft,
          top: elTop,
          width: elWidth,
          height: elHeight,
        }}
      >
        {/* Full image (dimmed) */}
        <img
          src={element.src}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ opacity: 0.3 }}
        />

        {/* Dark mask outside crop area using clip-path */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(0,0,0,0.5)',
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
              ${crop.x}% ${crop.y}%,
              ${crop.x}% ${crop.y + crop.h}%,
              ${crop.x + crop.w}% ${crop.y + crop.h}%,
              ${crop.x + crop.w}% ${crop.y}%,
              ${crop.x}% ${crop.y}%
            )`,
          }}
        />

        {/* Crop area - shows image normally */}
        <div
          style={{
            position: 'absolute',
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.w}%`,
            height: `${crop.h}%`,
            overflow: 'hidden',
            cursor: dragging?.type === 'move' ? 'grabbing' : 'grab',
            border: '2px solid #3b82f6',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          {/* Image positioned to show the correct portion */}
          <img
            src={element.src}
            alt=""
            draggable={false}
            className="pointer-events-none"
            style={{
              position: 'absolute',
              left: `${(-crop.x / crop.w) * 100}%`,
              top: `${(-crop.y / crop.h) * 100}%`,
              width: `${(100 / crop.w) * 100}%`,
              height: `${(100 / crop.h) * 100}%`,
              objectFit: 'contain',
            }}
          />

          {/* Rule of thirds grid lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
            <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="#ffffff" strokeWidth="0.5" />
            <line x1="66.67%" y1="0" x2="66.67%" y2="100%" stroke="#ffffff" strokeWidth="0.5" />
            <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="#ffffff" strokeWidth="0.5" />
            <line x1="0" y1="66.67%" x2="100%" y2="66.67%" stroke="#ffffff" strokeWidth="0.5" />
          </svg>

          {/* Resize handles */}
          {handles.map((h) => (
            <div
              key={h.pos}
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #3b82f6',
                cursor: h.cursor,
                zIndex: 10,
                ...h.style,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'resize', h.pos)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-[10001]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg transition-colors"
          onClick={handleApply}
        >
          適用
        </button>
        <button
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg shadow-lg transition-colors"
          onClick={onClose}
        >
          キャンセル
        </button>
        <span className="text-xs text-slate-400 ml-2">
          {Math.round(crop.x)}%, {Math.round(crop.y)}% - {Math.round(crop.w)}x{Math.round(crop.h)}%
        </span>
      </div>
    </div>
  )
}
