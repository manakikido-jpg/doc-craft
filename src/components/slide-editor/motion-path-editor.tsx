'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ElementAnimation } from '@/types'
import { X, Play, MoveRight, MoveLeft, MoveUp, MoveDown, ZoomIn, Sparkles, Trash2, MousePointer } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  animation: ElementAnimation | undefined
  onSetAnimation: (anim: ElementAnimation) => void
}

interface PathPoint {
  x: number
  y: number
}

const MOTION_PATHS: {
  type: ElementAnimation['type']
  label: string
  icon: React.ReactNode
}[] = [
  { type: 'fadeIn', label: 'Fade In', icon: <Sparkles size={20} /> },
  { type: 'slideInLeft', label: 'Slide from Left', icon: <MoveRight size={20} /> },
  { type: 'slideInRight', label: 'Slide from Right', icon: <MoveLeft size={20} /> },
  { type: 'slideInUp', label: 'Slide from Bottom', icon: <MoveUp size={20} /> },
  { type: 'slideInDown', label: 'Slide from Top', icon: <MoveDown size={20} /> },
  { type: 'zoomIn', label: 'Zoom In', icon: <ZoomIn size={20} /> },
  { type: 'bounceIn', label: 'Bounce In', icon: <Sparkles size={20} /> },
]

const ANIM_KEYFRAMES: Record<string, string> = {
  fadeIn: 'from { opacity: 0 } to { opacity: 1 }',
  slideInLeft: 'from { opacity: 0; transform: translateX(-40px) } to { opacity: 1; transform: translateX(0) }',
  slideInRight: 'from { opacity: 0; transform: translateX(40px) } to { opacity: 1; transform: translateX(0) }',
  slideInUp: 'from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) }',
  slideInDown: 'from { opacity: 0; transform: translateY(-40px) } to { opacity: 1; transform: translateY(0) }',
  zoomIn: 'from { opacity: 0; transform: scale(0.5) } to { opacity: 1; transform: scale(1) }',
  bounceIn: '0% { opacity: 0; transform: scale(0.3) } 50% { opacity: 1; transform: scale(1.1) } 70% { transform: scale(0.9) } 100% { opacity: 1; transform: scale(1) }',
}

export default function MotionPathEditor({ open, onClose, animation, onSetAnimation }: Props) {
  const [selected, setSelected] = useState<ElementAnimation['type'] | null>(animation?.type ?? null)
  const [previewKey, setPreviewKey] = useState(0)
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')
  const [pathPoints, setPathPoints] = useState<PathPoint[]>(
    (animation as any)?.motionPath || []
  )
  const [isDrawing, setIsDrawing] = useState(false)
  const [pathPreviewKey, setPathPreviewKey] = useState(0)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelected(animation?.type ?? null)
    setPathPoints((animation as any)?.motionPath || [])
  }, [animation?.type, animation])

  if (!open) return null

  function handleSelect(type: ElementAnimation['type']) {
    setSelected(type)
    onSetAnimation({
      type,
      category: 'entrance',
      trigger: animation?.trigger ?? 'on-click',
      delay: animation?.delay ?? 0,
      duration: animation?.duration ?? 0.5,
      order: animation?.order ?? 0,
    })
  }

  function handlePreview() {
    setPreviewKey((k) => k + 1)
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDrawing) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newPoints = [...pathPoints, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }]
    setPathPoints(newPoints)
    // Save motionPath to animation
    onSetAnimation({
      type: animation?.type ?? 'fadeIn',
      category: animation?.category ?? 'entrance',
      trigger: animation?.trigger ?? 'on-click',
      delay: animation?.delay ?? 0,
      duration: animation?.duration ?? 1,
      order: animation?.order ?? 0,
      ...(({ motionPath: newPoints }) as any),
    })
  }

  function handleClearPath() {
    setPathPoints([])
    if (animation) {
      const { ...rest } = animation
      onSetAnimation({
        ...rest,
        ...(({ motionPath: [] }) as any),
      })
    }
  }

  function handlePreviewPath() {
    setPathPreviewKey((k) => k + 1)
  }

  function generatePathKeyframes(): string {
    if (pathPoints.length < 2) return 'from { transform: translate(0,0) } to { transform: translate(0,0) }'
    const steps = pathPoints.map((p, i) => {
      const pct = Math.round((i / (pathPoints.length - 1)) * 100)
      const dx = p.x - pathPoints[0].x
      const dy = p.y - pathPoints[0].y
      return `${pct}% { transform: translate(${dx * 2}px, ${dy * 2}px) }`
    })
    return steps.join(' ')
  }

  const previewAnimName = selected ? `mpe-preview-${selected}` : ''
  const pathAnimName = `mpe-path-${pathPreviewKey}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[540px] max-h-[85vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <span className="text-white text-sm font-semibold">Motion Path Editor</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'presets'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Preset Animations
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'custom'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Path
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'presets' && (
            <>
              {/* Motion path grid */}
              <div>
                <p className="text-xs text-slate-400 mb-3">Select animation type</p>
                <div className="grid grid-cols-3 gap-2">
                  {MOTION_PATHS.map((path) => (
                    <button
                      key={path.type}
                      onClick={() => handleSelect(path.type)}
                      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-xl border transition-all ${
                        selected === path.type
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                          : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <div className="text-indigo-400">{path.icon}</div>
                      <span className="text-xs">{path.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {selected && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">Preview</p>
                    <button
                      onClick={handlePreview}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                      <Play size={12} />
                      Play
                    </button>
                  </div>
                  <div className="relative h-24 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden">
                    <style>{`
                      @keyframes ${previewAnimName} {
                        ${ANIM_KEYFRAMES[selected] || ANIM_KEYFRAMES.fadeIn}
                      }
                    `}</style>
                    <div
                      key={previewKey}
                      className="w-12 h-12 bg-indigo-500 rounded-lg"
                      style={{
                        animation: `${previewAnimName} 0.6s ease forwards`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Currently selected info */}
              {selected && (
                <div className="text-xs text-slate-500 text-center">
                  Selected: {MOTION_PATHS.find((p) => p.type === selected)?.label}
                </div>
              )}
            </>
          )}

          {activeTab === 'custom' && (
            <>
              {/* Instructions */}
              <div className="text-xs text-slate-400">
                Click on the canvas below to define a path. The element will move along these points during the presentation.
              </div>

              {/* Drawing controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDrawing(!isDrawing)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    isDrawing
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <MousePointer size={12} />
                  {isDrawing ? 'Drawing...' : 'Start Drawing'}
                </button>
                {pathPoints.length > 0 && (
                  <>
                    <button
                      onClick={handleClearPath}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-700 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                      Clear
                    </button>
                    <button
                      onClick={handlePreviewPath}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                      <Play size={12} />
                      Preview
                    </button>
                    <span className="text-xs text-slate-500">
                      {pathPoints.length} points
                    </span>
                  </>
                )}
              </div>

              {/* Canvas for path drawing */}
              <div
                ref={canvasRef}
                className={`relative h-48 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden ${
                  isDrawing ? 'cursor-crosshair' : 'cursor-default'
                }`}
                onClick={handleCanvasClick}
              >
                {/* Path visualization */}
                {pathPoints.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Path lines */}
                    {pathPoints.length > 1 && (
                      <polyline
                        points={pathPoints
                          .map((p) => `${p.x}%,${p.y}%`)
                          .join(' ')}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="4,3"
                      />
                    )}
                    {/* Path points */}
                    {pathPoints.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={`${p.x}%`}
                          cy={`${p.y}%`}
                          r={i === 0 ? 6 : i === pathPoints.length - 1 ? 6 : 4}
                          fill={
                            i === 0
                              ? '#22c55e'
                              : i === pathPoints.length - 1
                              ? '#ef4444'
                              : '#6366f1'
                          }
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <text
                          x={`${p.x}%`}
                          y={`${p.y - 4}%`}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize="9"
                        >
                          {i + 1}
                        </text>
                      </g>
                    ))}
                    {/* Direction arrows */}
                    {pathPoints.length > 1 &&
                      pathPoints.slice(0, -1).map((p, i) => {
                        const next = pathPoints[i + 1]
                        const midX = (p.x + next.x) / 2
                        const midY = (p.y + next.y) / 2
                        const angle =
                          Math.atan2(next.y - p.y, next.x - p.x) *
                          (180 / Math.PI)
                        return (
                          <polygon
                            key={`arrow-${i}`}
                            points="0,-3 6,0 0,3"
                            fill="#6366f1"
                            transform={`translate(${midX}%, ${midY}%) rotate(${angle})`}
                            style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
                          />
                        )
                      })}
                  </svg>
                )}

                {/* Path preview animation */}
                {pathPoints.length >= 2 && (
                  <>
                    <style>{`
                      @keyframes ${pathAnimName} {
                        ${generatePathKeyframes()}
                      }
                    `}</style>
                    <div
                      key={pathPreviewKey}
                      className="absolute w-6 h-6 bg-indigo-500 rounded"
                      style={{
                        left: `${pathPoints[0].x}%`,
                        top: `${pathPoints[0].y}%`,
                        transform: 'translate(-50%, -50%)',
                        animation: `${pathAnimName} ${Math.max(1, pathPoints.length * 0.3)}s ease-in-out forwards`,
                      }}
                    />
                  </>
                )}

                {/* Empty state */}
                {pathPoints.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs text-slate-600">
                      {isDrawing
                        ? 'Click to add path points'
                        : 'Click "Start Drawing" to begin'}
                    </p>
                  </div>
                )}
              </div>

              {/* Point list */}
              {pathPoints.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Path Points</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pathPoints.map((p, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                          i === 0
                            ? 'bg-green-500/15 text-green-400'
                            : i === pathPoints.length - 1
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {i + 1}: ({p.x.toFixed(0)}, {p.y.toFixed(0)})
                        <button
                          onClick={() => {
                            const next = pathPoints.filter((_, j) => j !== i)
                            setPathPoints(next)
                            if (animation) {
                              onSetAnimation({
                                ...animation,
                                ...(({ motionPath: next }) as any),
                              })
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 ml-0.5"
                        >
                          <X size={8} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
