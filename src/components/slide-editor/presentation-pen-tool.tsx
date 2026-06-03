'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  width: number
  tool: 'pen' | 'highlighter' | 'eraser'
}

interface PenToolProps {
  active: boolean
  color: string
  tool: 'pen' | 'highlighter' | 'eraser'
  strokeWidth: number
  onClear: () => void
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const [first, ...rest] = points
  let d = `M ${first.x} ${first.y}`
  for (const p of rest) {
    d += ` L ${p.x} ${p.y}`
  }
  return d
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function strokeIntersects(
  stroke: Stroke,
  eraserPoints: { x: number; y: number }[],
  radius: number
): boolean {
  for (const ep of eraserPoints) {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const a = stroke.points[i]
      const b = stroke.points[i + 1]
      if (distToSegment(ep.x, ep.y, a.x, a.y, b.x, b.y) < radius) {
        return true
      }
    }
  }
  return false
}

export default function PresentationPenTool({
  active,
  color,
  tool,
  strokeWidth,
  onClear,
}: PenToolProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const isDrawing = useRef(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDrawing.current = true
      const point = { x: e.clientX, y: e.clientY }
      if (tool === 'eraser') {
        setCurrentStroke({ points: [point], color: 'transparent', width: strokeWidth, tool })
      } else {
        setCurrentStroke({ points: [point], color, width: strokeWidth, tool })
      }
    },
    [color, strokeWidth, tool]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing.current || !currentStroke) return
      const point = { x: e.clientX, y: e.clientY }
      setCurrentStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, point] } : null
      )
    },
    [currentStroke]
  )

  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false

    if (tool === 'eraser') {
      const eraserRadius = strokeWidth * 2
      setStrokes((prev) =>
        prev.filter((s) => !strokeIntersects(s, currentStroke.points, eraserRadius))
      )
    } else {
      setStrokes((prev) => [...prev, currentStroke])
    }
    setCurrentStroke(null)
  }, [currentStroke, tool, strokeWidth])

  // Clear all strokes when onClear is triggered externally
  useEffect(() => {
    if (!active) {
      setStrokes([])
      setCurrentStroke(null)
      isDrawing.current = false
    }
  }, [active])

  const handleClear = useCallback(() => {
    setStrokes([])
    setCurrentStroke(null)
    onClear()
  }, [onClear])

  if (!active) return null

  const renderStroke = (stroke: Stroke, key: string) => {
    if (stroke.tool === 'eraser' || stroke.points.length < 2) return null
    const opacity = stroke.tool === 'highlighter' ? 0.3 : 1
    return (
      <path
        key={key}
        d={pointsToPath(stroke.points)}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[9997]"
      style={{ cursor: tool === 'eraser' ? 'crosshair' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg className="absolute inset-0 w-full h-full">
        {strokes.map((s, i) => renderStroke(s, `stroke-${i}`))}
        {currentStroke && renderStroke(currentStroke, 'current')}
      </svg>
      {/* Clear button */}
      <button
        onClick={handleClear}
        className="absolute bottom-4 right-4 px-3 py-1.5 bg-slate-900/80 text-white text-sm rounded-lg hover:bg-slate-800 border border-slate-700 backdrop-blur"
      >
        クリア
      </button>
    </div>
  )
}
