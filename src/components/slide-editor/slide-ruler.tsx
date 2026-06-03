'use client'

import { useState, useCallback, useRef } from 'react'

interface Guide {
  orientation: 'h' | 'v'
  position: number
}

interface Props {
  width: number
  height: number
  zoom: number
  showHorizontal?: boolean
  showVertical?: boolean
  guides?: Guide[]
  onAddGuide?: (orientation: 'h' | 'v', position: number) => void
}

const RULER_SIZE = 20
const MAJOR_INTERVAL = 10
const MINOR_INTERVAL = 5

export default function SlideRuler({
  width,
  height,
  zoom,
  showHorizontal = true,
  showVertical = true,
  guides = [],
  onAddGuide,
}: Props) {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<'h' | 'v' | null>(null)
  const hRulerRef = useRef<HTMLDivElement>(null)
  const vRulerRef = useRef<HTMLDivElement>(null)

  const handleMouseMoveOnCanvas = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setCursorPos({ x, y })
  }, [])

  const handleRulerMouseDown = useCallback(
    (orientation: 'h' | 'v') => {
      if (!onAddGuide) return
      setDragging(orientation)
    },
    [onAddGuide],
  )

  const handleRulerMouseUp = useCallback(
    (orientation: 'h' | 'v', e: React.MouseEvent) => {
      if (!onAddGuide || !dragging) return
      const rect = e.currentTarget.getBoundingClientRect()
      const pos =
        orientation === 'h'
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100
      onAddGuide(orientation, Math.round(pos))
      setDragging(null)
    },
    [onAddGuide, dragging],
  )

  const renderTicks = (length: number, orientation: 'h' | 'v') => {
    const ticks: React.ReactNode[] = []
    for (let i = 0; i <= 100; i += MINOR_INTERVAL) {
      const isMajor = i % MAJOR_INTERVAL === 0
      const pos = `${(i / 100) * 100}%`
      if (orientation === 'h') {
        ticks.push(
          <div key={i} className="absolute top-0" style={{ left: pos }}>
            <div
              className="bg-slate-600"
              style={{ width: 1, height: isMajor ? RULER_SIZE * 0.6 : RULER_SIZE * 0.3 }}
            />
            {isMajor && (
              <span className="absolute top-[1px] left-[3px] text-[7px] text-slate-500 select-none">
                {i}
              </span>
            )}
          </div>,
        )
      } else {
        ticks.push(
          <div key={i} className="absolute left-0" style={{ top: pos }}>
            <div
              className="bg-slate-600"
              style={{ height: 1, width: isMajor ? RULER_SIZE * 0.6 : RULER_SIZE * 0.3 }}
            />
            {isMajor && (
              <span
                className="absolute left-[2px] top-[2px] text-[7px] text-slate-500 select-none"
                style={{ writingMode: 'vertical-lr' }}
              >
                {i}
              </span>
            )}
          </div>,
        )
      }
    }
    return ticks
  }

  return (
    <>
      {/* Horizontal ruler */}
      {showHorizontal && (
        <div
          ref={hRulerRef}
          className="absolute top-0 left-5 bg-slate-800 border-b border-slate-700 select-none cursor-crosshair overflow-hidden"
          style={{ width: width * zoom, height: RULER_SIZE, zIndex: 50 }}
          onMouseDown={() => handleRulerMouseDown('h')}
          onMouseUp={(e) => handleRulerMouseUp('h', e)}
        >
          <div className="relative w-full h-full">{renderTicks(width, 'h')}</div>
          {cursorPos && (
            <div
              className="absolute top-0 w-[1px] h-full bg-blue-400/60 pointer-events-none"
              style={{ left: `${cursorPos.x}%` }}
            />
          )}
        </div>
      )}

      {/* Vertical ruler */}
      {showVertical && (
        <div
          ref={vRulerRef}
          className="absolute top-5 left-0 bg-slate-800 border-r border-slate-700 select-none cursor-crosshair overflow-hidden"
          style={{ height: height * zoom, width: RULER_SIZE, zIndex: 50 }}
          onMouseDown={() => handleRulerMouseDown('v')}
          onMouseUp={(e) => handleRulerMouseUp('v', e)}
        >
          <div className="relative w-full h-full">{renderTicks(height, 'v')}</div>
          {cursorPos && (
            <div
              className="absolute left-0 h-[1px] w-full bg-blue-400/60 pointer-events-none"
              style={{ top: `${cursorPos.y}%` }}
            />
          )}
        </div>
      )}

      {/* Guide lines */}
      {guides.map((guide, i) =>
        guide.orientation === 'h' ? (
          <div
            key={`guide-h-${i}`}
            className="absolute left-5 pointer-events-none"
            style={{
              top: `${guide.position}%`,
              width: width * zoom,
              height: 1,
              background: 'rgba(59,130,246,0.5)',
              zIndex: 45,
            }}
          />
        ) : (
          <div
            key={`guide-v-${i}`}
            className="absolute top-5 pointer-events-none"
            style={{
              left: `${guide.position}%`,
              height: height * zoom,
              width: 1,
              background: 'rgba(59,130,246,0.5)',
              zIndex: 45,
            }}
          />
        ),
      )}

      {/* Corner square */}
      {showHorizontal && showVertical && (
        <div
          className="absolute top-0 left-0 bg-slate-800 border-r border-b border-slate-700"
          style={{ width: RULER_SIZE, height: RULER_SIZE, zIndex: 51 }}
        />
      )}
    </>
  )
}
