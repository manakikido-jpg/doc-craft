'use client'

import { useState, useMemo, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { generateId } from '@/lib/utils'
import type { SlideElement, SlideShapeElement, SlideTextElement, SlideConnectorElement } from '@/types'

interface SmartArtInserterProps {
  slideId: string
  dispatch: React.Dispatch<any>
  onClose: () => void
}

type DiagramType = 'process' | 'hierarchy' | 'cycle' | 'relationship' | 'matrix' | 'pyramid'

interface DiagramConfig {
  type: DiagramType
  label: string
  description: string
  minItems: number
  maxItems: number
  defaultItems: number
}

const DIAGRAM_CONFIGS: DiagramConfig[] = [
  { type: 'process', label: 'プロセス', description: '直線的なフロー・手順', minItems: 3, maxItems: 6, defaultItems: 3 },
  { type: 'hierarchy', label: '階層', description: '組織図・ツリー構造', minItems: 3, maxItems: 5, defaultItems: 4 },
  { type: 'cycle', label: 'サイクル', description: '循環フロー', minItems: 3, maxItems: 6, defaultItems: 4 },
  { type: 'relationship', label: '関係', description: 'ベン図・重なり', minItems: 2, maxItems: 3, defaultItems: 2 },
  { type: 'matrix', label: 'マトリクス', description: '2x2 グリッド', minItems: 4, maxItems: 4, defaultItems: 4 },
  { type: 'pyramid', label: 'ピラミッド', description: '三角形レイヤー', minItems: 3, maxItems: 4, defaultItems: 3 },
]

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4',
]

function makeShape(
  overrides: Partial<SlideShapeElement> & Pick<SlideShapeElement, 'x' | 'y' | 'w' | 'h' | 'shape' | 'fill'>,
): SlideShapeElement {
  return {
    id: generateId(),
    type: 'shape',
    x: overrides.x,
    y: overrides.y,
    w: overrides.w,
    h: overrides.h,
    shape: overrides.shape,
    fill: overrides.fill,
    stroke: overrides.stroke,
    strokeWidth: overrides.strokeWidth,
    textContent: overrides.textContent,
    textColor: overrides.textColor ?? '#ffffff',
    textFontSize: overrides.textFontSize ?? 12,
    cornerRadius: overrides.cornerRadius,
    opacity: overrides.opacity,
    zIndex: overrides.zIndex,
  }
}

function makeText(
  overrides: Partial<SlideTextElement> & Pick<SlideTextElement, 'x' | 'y' | 'w' | 'h' | 'content'>,
): SlideTextElement {
  return {
    id: generateId(),
    type: 'label',
    x: overrides.x,
    y: overrides.y,
    w: overrides.w,
    h: overrides.h,
    content: overrides.content,
    fontSize: overrides.fontSize ?? 11,
    fontWeight: overrides.fontWeight ?? '500',
    align: overrides.align ?? 'center',
    color: overrides.color ?? '#ffffff',
  }
}

function makeConnector(
  from: { x: number; y: number },
  to: { x: number; y: number },
  stroke: string,
): SlideConnectorElement {
  return {
    id: generateId(),
    type: 'connector',
    fromPoint: from,
    toPoint: to,
    style: 'straight',
    stroke,
    strokeWidth: 2,
    arrowHead: true,
    arrowHeadType: 'triangle',
  }
}

// ── Element generators ──

function generateProcess(count: number, labels: string[], color: string): SlideElement[] {
  const elements: SlideElement[] = []
  const boxW = 16
  const boxH = 10
  const gap = (80 - boxW * count) / (count - 1 + 2)
  const startX = 10
  const y = 40

  for (let i = 0; i < count; i++) {
    const x = startX + i * (boxW + gap)
    elements.push(
      makeShape({ x, y, w: boxW, h: boxH, shape: 'rect', fill: color, cornerRadius: 8, textContent: labels[i], textColor: '#ffffff', textFontSize: 11 }),
    )
    if (i < count - 1) {
      elements.push(
        makeShape({
          x: x + boxW + (gap - 4) / 2,
          y: y + boxH / 2 - 2,
          w: 4,
          h: 4,
          shape: 'arrow-right',
          fill: color,
          opacity: 0.6,
        }),
      )
    }
  }
  return elements
}

function generateHierarchy(count: number, labels: string[], color: string): SlideElement[] {
  const elements: SlideElement[] = []
  const topX = 40
  const topY = 20
  const topW = 20
  const topH = 10

  elements.push(
    makeShape({ x: topX, y: topY, w: topW, h: topH, shape: 'rect', fill: color, cornerRadius: 6, textContent: labels[0], textColor: '#ffffff', textFontSize: 12 }),
  )

  const children = count - 1
  const childW = 16
  const childH = 9
  const totalChildWidth = children * childW + (children - 1) * 4
  const childStartX = 50 - totalChildWidth / 2
  const childY = 50

  for (let i = 0; i < children; i++) {
    const cx = childStartX + i * (childW + 4)
    elements.push(
      makeShape({ x: cx, y: childY, w: childW, h: childH, shape: 'rect', fill: color, opacity: 0.75, cornerRadius: 6, textContent: labels[i + 1], textColor: '#ffffff', textFontSize: 10 }),
    )
    elements.push(
      makeConnector(
        { x: topX + topW / 2, y: topY + topH },
        { x: cx + childW / 2, y: childY },
        color,
      ),
    )
  }
  return elements
}

function generateCycle(count: number, labels: string[], color: string): SlideElement[] {
  const elements: SlideElement[] = []
  const centerX = 50
  const centerY = 45
  const radius = 20
  const circleSize = 14

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius - circleSize / 2
    const y = centerY + Math.sin(angle) * radius - circleSize / 2

    const hueShift = (i / count) * 30
    const itemColor = i === 0 ? color : adjustBrightness(color, hueShift)

    elements.push(
      makeShape({ x, y, w: circleSize, h: circleSize, shape: 'circle', fill: itemColor, textContent: labels[i], textColor: '#ffffff', textFontSize: 9 }),
    )

    const nextIdx = (i + 1) % count
    const nextAngle = (nextIdx / count) * Math.PI * 2 - Math.PI / 2
    const arrowFromX = centerX + Math.cos(angle + 0.3) * radius
    const arrowFromY = centerY + Math.sin(angle + 0.3) * radius
    const arrowToX = centerX + Math.cos(nextAngle - 0.3) * radius
    const arrowToY = centerY + Math.sin(nextAngle - 0.3) * radius

    elements.push(
      makeConnector(
        { x: arrowFromX, y: arrowFromY },
        { x: arrowToX, y: arrowToY },
        itemColor,
      ),
    )
  }
  return elements
}

function generateRelationship(count: number, labels: string[], color: string): SlideElement[] {
  const elements: SlideElement[] = []
  const circleSize = 28
  const centerY = 38

  if (count === 2) {
    elements.push(
      makeShape({ x: 28, y: centerY, w: circleSize, h: circleSize, shape: 'circle', fill: color, opacity: 0.55, textContent: labels[0], textColor: '#ffffff', textFontSize: 11 }),
    )
    elements.push(
      makeShape({ x: 44, y: centerY, w: circleSize, h: circleSize, shape: 'circle', fill: adjustBrightness(color, 30), opacity: 0.55, textContent: labels[1], textColor: '#ffffff', textFontSize: 11 }),
    )
  } else {
    elements.push(
      makeShape({ x: 28, y: 28, w: 26, h: 26, shape: 'circle', fill: color, opacity: 0.5, textContent: labels[0], textColor: '#ffffff', textFontSize: 10 }),
    )
    elements.push(
      makeShape({ x: 46, y: 28, w: 26, h: 26, shape: 'circle', fill: adjustBrightness(color, 30), opacity: 0.5, textContent: labels[1], textColor: '#ffffff', textFontSize: 10 }),
    )
    elements.push(
      makeShape({ x: 37, y: 44, w: 26, h: 26, shape: 'circle', fill: adjustBrightness(color, 60), opacity: 0.5, textContent: labels[2], textColor: '#ffffff', textFontSize: 10 }),
    )
  }
  return elements
}

function generateMatrix(labels: string[], color: string): SlideElement[] {
  const elements: SlideElement[] = []
  const gridX = 25
  const gridY = 22
  const cellW = 24
  const cellH = 20
  const gap = 2

  const positions = [
    [gridX, gridY],
    [gridX + cellW + gap, gridY],
    [gridX, gridY + cellH + gap],
    [gridX + cellW + gap, gridY + cellH + gap],
  ]

  positions.forEach(([x, y], i) => {
    const brightness = (i % 2 === 0 ? 0 : 20) + (i >= 2 ? 10 : 0)
    elements.push(
      makeShape({ x, y, w: cellW, h: cellH, shape: 'rect', fill: adjustBrightness(color, brightness), cornerRadius: 4, textContent: labels[i], textColor: '#ffffff', textFontSize: 10 }),
    )
  })

  // Axis labels
  elements.push(makeText({ x: gridX, y: gridY - 6, w: cellW * 2 + gap, h: 5, content: '← 軸1 →', fontSize: 9, color: '#94a3b8' }))
  elements.push(makeText({ x: gridX - 10, y: gridY, w: 9, h: cellH * 2 + gap, content: '↑ 軸2 ↓', fontSize: 9, color: '#94a3b8' }))

  return elements
}

function generatePyramid(count: number, labels: string[], color: string): SlideElement[] {
  const elements: SlideElement[] = []
  const baseY = 20
  const totalH = 55
  const layerH = totalH / count
  const baseW = 60
  const startX = 20

  for (let i = 0; i < count; i++) {
    const topRatio = i / count
    const bottomRatio = (i + 1) / count
    const wTop = baseW * (1 - topRatio * 0.7)
    const wBottom = baseW * (1 - bottomRatio * 0.7)
    const w = (wTop + wBottom) / 2
    const x = startX + (baseW - w) / 2
    const y = baseY + i * layerH

    const brightness = i * 15
    elements.push(
      makeShape({
        x,
        y,
        w,
        h: layerH - 1,
        shape: 'rect',
        fill: adjustBrightness(color, brightness),
        textContent: labels[i],
        textColor: '#ffffff',
        textFontSize: 10,
      }),
    )
  }
  return elements
}

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ── Mini preview SVG for each type ──

function DiagramPreview({ type, color }: { type: DiagramType; color: string }) {
  const w = 120
  const h = 68

  switch (type) {
    case 'process':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={8 + i * 40} y={24} width={28} height={20} rx={4} fill={color} opacity={0.8} />
              <text x={22 + i * 40} y={37} fontSize="7" fill="white" textAnchor="middle">
                {i + 1}
              </text>
              {i < 2 && <polygon points={`${38 + i * 40},32 ${44 + i * 40},34 ${38 + i * 40},36`} fill={color} opacity={0.5} />}
            </g>
          ))}
        </svg>
      )
    case 'hierarchy':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <rect x={45} y={8} width={30} height={16} rx={3} fill={color} />
          <line x1={60} y1={24} x2={35} y2={40} stroke={color} strokeWidth={1.5} />
          <line x1={60} y1={24} x2={85} y2={40} stroke={color} strokeWidth={1.5} />
          <rect x={20} y={40} width={30} height={16} rx={3} fill={color} opacity={0.7} />
          <rect x={70} y={40} width={30} height={16} rx={3} fill={color} opacity={0.7} />
        </svg>
      )
    case 'cycle':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          {[0, 1, 2, 3].map((i) => {
            const angle = (i / 4) * Math.PI * 2 - Math.PI / 2
            const cx = 60 + Math.cos(angle) * 22
            const cy = 34 + Math.sin(angle) * 20
            return <circle key={i} cx={cx} cy={cy} r={10} fill={color} opacity={0.7 + i * 0.05} />
          })}
        </svg>
      )
    case 'relationship':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <circle cx={48} cy={34} r={20} fill={color} opacity={0.4} />
          <circle cx={72} cy={34} r={20} fill={color} opacity={0.4} />
        </svg>
      )
    case 'matrix':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <rect x={22} y={10} width={34} height={22} rx={3} fill={color} opacity={0.8} />
          <rect x={60} y={10} width={34} height={22} rx={3} fill={color} opacity={0.6} />
          <rect x={22} y={36} width={34} height={22} rx={3} fill={color} opacity={0.65} />
          <rect x={60} y={36} width={34} height={22} rx={3} fill={color} opacity={0.5} />
        </svg>
      )
    case 'pyramid':
      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <rect x={42} y={8} width={36} height={16} rx={2} fill={color} opacity={0.9} />
          <rect x={32} y={27} width={56} height={16} rx={2} fill={color} opacity={0.7} />
          <rect x={22} y={46} width={76} height={16} rx={2} fill={color} opacity={0.5} />
        </svg>
      )
  }
}

export default function SmartArtInserter({ slideId, dispatch, onClose }: SmartArtInserterProps) {
  const [selectedType, setSelectedType] = useState<DiagramType | null>(null)
  const [itemCount, setItemCount] = useState(3)
  const [accentColor, setAccentColor] = useState(COLOR_PRESETS[0])
  const [labels, setLabels] = useState<string[]>([])

  const config = useMemo(
    () => DIAGRAM_CONFIGS.find((c) => c.type === selectedType),
    [selectedType],
  )

  const handleSelectType = useCallback((type: DiagramType) => {
    const cfg = DIAGRAM_CONFIGS.find((c) => c.type === type)!
    setSelectedType(type)
    setItemCount(cfg.defaultItems)
    setLabels(
      Array.from({ length: cfg.maxItems }, (_, i) => `項目${i + 1}`),
    )
  }, [])

  const handleLabelChange = useCallback((index: number, value: string) => {
    setLabels((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const handleInsert = useCallback(() => {
    if (!selectedType) return

    let elements: SlideElement[]

    switch (selectedType) {
      case 'process':
        elements = generateProcess(itemCount, labels.slice(0, itemCount), accentColor)
        break
      case 'hierarchy':
        elements = generateHierarchy(itemCount, labels.slice(0, itemCount), accentColor)
        break
      case 'cycle':
        elements = generateCycle(itemCount, labels.slice(0, itemCount), accentColor)
        break
      case 'relationship':
        elements = generateRelationship(itemCount, labels.slice(0, itemCount), accentColor)
        break
      case 'matrix':
        elements = generateMatrix(labels.slice(0, 4), accentColor)
        break
      case 'pyramid':
        elements = generatePyramid(itemCount, labels.slice(0, itemCount), accentColor)
        break
      default:
        return
    }

    dispatch({ type: 'PASTE_ELEMENTS', slideId, elements })
    onClose()
  }, [selectedType, itemCount, labels, accentColor, slideId, dispatch, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[580px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">SmartArt を挿入</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          {/* Diagram type grid */}
          <label className="block text-xs text-slate-400 mb-2">図表タイプを選択</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {DIAGRAM_CONFIGS.map((cfg) => (
              <button
                key={cfg.type}
                onClick={() => handleSelectType(cfg.type)}
                className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                  selectedType === cfg.type
                    ? 'border-blue-500 bg-blue-600/20'
                    : 'border-slate-600 bg-slate-700/40 hover:border-slate-500'
                }`}
              >
                <div className="w-full h-[52px] mb-2">
                  <DiagramPreview type={cfg.type} color={accentColor} />
                </div>
                <span className="text-xs font-medium text-white">{cfg.label}</span>
                <span className="text-[10px] text-slate-400">{cfg.description}</span>
              </button>
            ))}
          </div>

          {/* Configuration (shown when a type is selected) */}
          {selectedType && config && (
            <div className="space-y-4 border-t border-slate-700 pt-4">
              {/* Item count */}
              {selectedType !== 'matrix' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">項目数</label>
                  <div className="flex gap-1">
                    {Array.from(
                      { length: config.maxItems - config.minItems + 1 },
                      (_, i) => config.minItems + i,
                    ).map((n) => (
                      <button
                        key={n}
                        onClick={() => setItemCount(n)}
                        className={`w-9 h-8 text-xs rounded border transition-colors ${
                          itemCount === n
                            ? 'border-blue-500 bg-blue-600/30 text-white'
                            : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color preset */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">カラー</label>
                <div className="flex gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccentColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-colors ${
                        accentColor === c ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Label editing */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">ラベル</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Array.from({ length: selectedType === 'matrix' ? 4 : itemCount }).map((_, i) => (
                    <input
                      key={i}
                      value={labels[i] ?? ''}
                      onChange={(e) => handleLabelChange(i, e.target.value)}
                      placeholder={`項目${i + 1}`}
                      className="px-2 py-1.5 text-xs rounded border border-slate-600 bg-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  ))}
                </div>
              </div>

              {/* Insert button */}
              <button
                onClick={handleInsert}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} /> 挿入
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
