'use client'

import { useRef, useState, useCallback } from 'react'

interface Props {
  pageWidthPx: number
  marginLeftMm: number
  marginRightMm: number
  indentEm?: number
  onMarginChange?: (left: number, right: number) => void
}

const MM_TO_PX = 96 / 25.4

export default function PageRuler({ pageWidthPx, marginLeftMm, marginRightMm, indentEm, onMarginChange }: Props) {
  const rulerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'left' | 'right' | 'indent' | null>(null)
  const startX = useRef(0)
  const startVal = useRef(0)

  const pageWidthMm = pageWidthPx / MM_TO_PX
  // Total mm shown on ruler
  const totalMm = Math.ceil(pageWidthMm)

  const marginLeftPx = marginLeftMm * MM_TO_PX
  const marginRightPx = marginRightMm * MM_TO_PX

  const handleDragStart = useCallback((e: React.MouseEvent, type: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(type)
    startX.current = e.clientX
    startVal.current = type === 'left' ? marginLeftMm : marginRightMm

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX.current
      const dMm = dx / MM_TO_PX
      if (type === 'left') {
        const newLeft = Math.max(5, Math.min(pageWidthMm / 2, startVal.current + dMm))
        onMarginChange?.(Math.round(newLeft), marginRightMm)
      } else {
        const newRight = Math.max(5, Math.min(pageWidthMm / 2, startVal.current - dMm))
        onMarginChange?.(marginLeftMm, Math.round(newRight))
      }
    }

    function onUp() {
      setDragging(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [marginLeftMm, marginRightMm, pageWidthMm, onMarginChange])

  // Generate tick marks
  const ticks: { pos: number; isMajor: boolean; label?: string }[] = []
  for (let mm = 0; mm <= totalMm; mm += 5) {
    const isMajor = mm % 10 === 0
    ticks.push({
      pos: mm * MM_TO_PX,
      isMajor,
      label: isMajor ? `${mm / 10}` : undefined,
    })
  }

  return (
    <div
      ref={rulerRef}
      className="relative bg-slate-200 border-b border-slate-300 select-none"
      style={{ width: pageWidthPx, height: 20, overflow: 'hidden' }}
    >
      {/* Margin shading */}
      <div
        className="absolute top-0 bottom-0 bg-slate-300/60"
        style={{ left: 0, width: marginLeftPx }}
      />
      <div
        className="absolute top-0 bottom-0 bg-slate-300/60"
        style={{ right: 0, width: marginRightPx }}
      />

      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <div key={i} className="absolute top-0" style={{ left: tick.pos }}>
          <div
            className="bg-slate-500"
            style={{
              width: 1,
              height: tick.isMajor ? 10 : 5,
              position: 'absolute',
              top: tick.isMajor ? 10 : 15,
            }}
          />
          {tick.label && (
            <span
              className="absolute text-slate-600 font-mono"
              style={{ fontSize: 8, top: 1, left: 2 }}
            >
              {tick.label}
            </span>
          )}
        </div>
      ))}

      {/* Left margin marker (draggable triangle) */}
      <div
        className={`absolute top-0 cursor-ew-resize z-10 ${dragging === 'left' ? 'opacity-80' : ''}`}
        style={{ left: marginLeftPx - 5 }}
        onMouseDown={(e) => handleDragStart(e, 'left')}
        title={`左余白: ${marginLeftMm}mm`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <polygon points="5,0 10,10 0,10" fill="#6366f1" />
        </svg>
      </div>

      {/* Right margin marker (draggable triangle) */}
      <div
        className={`absolute top-0 cursor-ew-resize z-10 ${dragging === 'right' ? 'opacity-80' : ''}`}
        style={{ left: pageWidthPx - marginRightPx - 5 }}
        onMouseDown={(e) => handleDragStart(e, 'right')}
        title={`右余白: ${marginRightMm}mm`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <polygon points="5,0 10,10 0,10" fill="#6366f1" />
        </svg>
      </div>

      {/* First-line indent marker (green triangle) */}
      {indentEm !== undefined && indentEm > 0 && (
        <div
          className="absolute bottom-0 z-10"
          style={{ left: marginLeftPx + indentEm * 16 - 4 }}
          title={`字下げ: ${indentEm}em`}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <polygon points="4,8 8,0 0,0" fill="#22c55e" />
          </svg>
        </div>
      )}
    </div>
  )
}
