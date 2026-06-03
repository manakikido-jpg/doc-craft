'use client'

import { useState, useRef, useCallback } from 'react'
import { Pen, Trash2, Check, X } from 'lucide-react'

interface FreehandDrawingToolProps {
  active: boolean
  slideId: string
  dispatch: React.Dispatch<any>
  onDeactivate: () => void
}

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  width: number
}

const PRESET_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#000000',
  '#ffffff', '#eab308', '#a855f7', '#f97316',
]

function pointsToSvgPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

function strokesToDataUrl(strokes: Stroke[], width: number, height: number): string {
  const paths = strokes
    .map(
      (s) =>
        `<path d="${pointsToSvgPath(s.points)}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

export default function FreehandDrawingTool({
  active,
  slideId,
  dispatch,
  onDeactivate,
}: FreehandDrawingToolProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [color, setColor] = useState('#ef4444')
  const [width, setWidth] = useState(3)
  const svgRef = useRef<SVGSVGElement>(null)
  const drawing = useRef(false)

  const getPoint = useCallback((e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      e.preventDefault()
      drawing.current = true
      const pt = getPoint(e)
      setCurrentStroke({ points: [pt], color, width })
    },
    [color, width, getPoint],
  )

  const handlePointerMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      if (!drawing.current || !currentStroke) return
      e.preventDefault()
      const pt = getPoint(e)
      setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, pt] } : null))
    },
    [currentStroke, getPoint],
  )

  const handlePointerUp = useCallback(() => {
    if (!drawing.current || !currentStroke) return
    drawing.current = false
    if (currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke])
    }
    setCurrentStroke(null)
  }, [currentStroke])

  const handleClear = useCallback(() => {
    setStrokes([])
    setCurrentStroke(null)
  }, [])

  const handleFinish = useCallback(() => {
    if (strokes.length === 0) {
      onDeactivate()
      return
    }
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const dataUrl = strokesToDataUrl(strokes, rect.width, rect.height)
    dispatch({
      type: 'ADD_IMAGE_ELEMENT',
      slideId,
      src: dataUrl,
      alt: 'フリーハンド描画',
    })
    setStrokes([])
    setCurrentStroke(null)
    onDeactivate()
  }, [strokes, slideId, dispatch, onDeactivate])

  const handleCancel = useCallback(() => {
    setStrokes([])
    setCurrentStroke(null)
    onDeactivate()
  }, [onDeactivate])

  if (!active) return null

  const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes

  return (
    <div className="absolute inset-0 z-50">
      {/* SVG overlay */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {allStrokes.map((s, i) => (
          <path
            key={i}
            d={pointsToSvgPath(s.points)}
            stroke={s.color}
            strokeWidth={s.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <Pen className="w-4 h-4 text-slate-400" />

        {/* Color swatches */}
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                color === c ? 'border-white scale-110' : 'border-slate-600 hover:border-slate-400'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-slate-600" />

        {/* Width slider */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">{width}px</span>
          <input
            type="range"
            min={1}
            max={8}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-16 h-1 accent-indigo-500"
          />
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-slate-600" />

        {/* Action buttons */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors"
          title="クリア"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>クリア</span>
        </button>
        <button
          onClick={handleFinish}
          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors"
          title="完了"
        >
          <Check className="w-3.5 h-3.5" />
          <span>完了</span>
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-slate-700 transition-colors"
          title="キャンセル"
        >
          <X className="w-3.5 h-3.5" />
          <span>キャンセル</span>
        </button>
      </div>
    </div>
  )
}
