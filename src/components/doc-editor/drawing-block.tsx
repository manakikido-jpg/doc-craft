'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Pencil, Minus, ArrowRight, Square, Circle, Highlighter, Trash2, Download, Undo2 } from 'lucide-react'
import type { DrawingTool, DrawingStroke } from '@/types'

interface Props {
  strokes?: DrawingStroke[]
  onUpdate: (strokes: DrawingStroke[]) => void
}

const TOOLS: { tool: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'freehand', icon: <Pencil size={14} />, label: 'ペン' },
  { tool: 'line', icon: <Minus size={14} />, label: '直線' },
  { tool: 'arrow', icon: <ArrowRight size={14} />, label: '矢印' },
  { tool: 'rect', icon: <Square size={14} />, label: '四角形' },
  { tool: 'circle', icon: <Circle size={14} />, label: '円' },
  { tool: 'highlight', icon: <Highlighter size={14} />, label: 'ハイライト' },
]

function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawingStroke) {
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = stroke.tool === 'highlight' ? 0.3 : 1

  const pts = stroke.points
  if (pts.length < 2) {
    ctx.globalAlpha = 1
    return
  }

  if (stroke.tool === 'freehand' || stroke.tool === 'highlight') {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.stroke()
  } else if (stroke.tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.stroke()
  } else if (stroke.tool === 'arrow') {
    const start = pts[0]
    const end = pts[pts.length - 1]
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const headLen = 12
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  } else if (stroke.tool === 'rect') {
    const x = Math.min(pts[0].x, pts[pts.length - 1].x)
    const y = Math.min(pts[0].y, pts[pts.length - 1].y)
    const w = Math.abs(pts[pts.length - 1].x - pts[0].x)
    const h = Math.abs(pts[pts.length - 1].y - pts[0].y)
    if (stroke.fill) {
      ctx.fillStyle = stroke.fill
      ctx.fillRect(x, y, w, h)
    }
    ctx.strokeRect(x, y, w, h)
  } else if (stroke.tool === 'circle') {
    const cx = (pts[0].x + pts[pts.length - 1].x) / 2
    const cy = (pts[0].y + pts[pts.length - 1].y) / 2
    const rx = Math.abs(pts[pts.length - 1].x - pts[0].x) / 2
    const ry = Math.abs(pts[pts.length - 1].y - pts[0].y) / 2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    if (stroke.fill) {
      ctx.fillStyle = stroke.fill
      ctx.fill()
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const COLORS = ['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#000000']
const WIDTHS = [1, 2, 3, 5, 8]

export default function DrawingBlock({ strokes = [], onUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<DrawingTool>('freehand')
  const [color, setColor] = useState('#ffffff')
  const [width, setWidth] = useState(2)
  const [fill, setFill] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([])
  const [localStrokes, setLocalStrokes] = useState<DrawingStroke[]>(strokes)

  const canvasWidth = 700
  const canvasHeight = 300

  // Redraw all strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Background grid
    ctx.strokeStyle = 'rgba(148,163,184,0.1)'
    ctx.lineWidth = 0.5
    for (let x = 0; x < canvasWidth; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }
    for (let y = 0; y < canvasHeight; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }

    // Draw all strokes
    ;[
      ...localStrokes,
      ...(drawing && currentPoints.length > 0 ? [{ tool, points: currentPoints, color, width, fill }] : []),
    ].forEach((stroke) => {
      drawStroke(ctx, stroke)
    })
  }, [localStrokes, drawing, currentPoints, tool, color, width, fill])

  useEffect(() => {
    redraw()
  }, [redraw])

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true)
    setCurrentPoints([getPos(e)])
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const pos = getPos(e)
    if (tool === 'freehand' || tool === 'highlight') {
      setCurrentPoints((prev) => [...prev, pos])
    } else {
      setCurrentPoints((prev) => [prev[0], pos])
    }
  }

  function handleMouseUp() {
    if (!drawing || currentPoints.length < 2) {
      setDrawing(false)
      setCurrentPoints([])
      return
    }
    const newStroke: DrawingStroke = {
      tool,
      points: currentPoints,
      color,
      width: tool === 'highlight' ? width * 4 : width,
      fill: fill || undefined,
    }
    const updated = [...localStrokes, newStroke]
    setLocalStrokes(updated)
    onUpdate(updated)
    setDrawing(false)
    setCurrentPoints([])
  }

  function handleUndo() {
    const updated = localStrokes.slice(0, -1)
    setLocalStrokes(updated)
    onUpdate(updated)
  }

  function handleClear() {
    setLocalStrokes([])
    onUpdate([])
  }

  function handleExport() {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'drawing.png'
    a.click()
  }

  return (
    <div className="my-3 border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 border-b border-slate-700 flex-wrap">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            onClick={() => setTool(t.tool)}
            className={`p-1.5 rounded transition-colors ${tool === t.tool ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-0.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border transition-transform ${color === c ? 'border-indigo-400 scale-125' : 'border-slate-600'}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Width */}
        <div className="flex items-center gap-0.5">
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${width === w ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-white'}`}
              title={`${w}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: Math.min(w * 2, 12), height: Math.min(w * 2, 12) }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Fill for shapes */}
        {(tool === 'rect' || tool === 'circle') && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">塗り:</span>
            <input
              type="color"
              value={fill || '#334155'}
              onChange={(e) => setFill(e.target.value)}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
            />
            <button onClick={() => setFill('')} className="text-[10px] text-slate-500 hover:text-white">
              なし
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleUndo}
            className="p-1 text-slate-500 hover:text-white transition-colors"
            title="元に戻す"
            disabled={localStrokes.length === 0}
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={handleClear}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
            title="全消去"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={handleExport}
            className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
            title="PNG保存"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="w-full cursor-crosshair"
        style={{ height: canvasHeight }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}
