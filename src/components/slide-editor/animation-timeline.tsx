'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type { Slide, SlideElement, ElementAnimation } from '@/types'
import {
  X,
  Play,
  GripVertical,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Type,
  Image,
  Square,
  Table,
  BarChart3,
  Video,
  Music,
  Link2,
} from 'lucide-react'

// ── Types ──

interface AnimationTimelineProps {
  slide: Slide
  slideId: string
  dispatch: React.Dispatch<any>
  onClose: () => void
  onPreview?: () => void
}

// ── Constants ──

const ANIMATION_GROUPS: {
  category: string
  label: string
  items: { type: ElementAnimation['type']; label: string; cat: NonNullable<ElementAnimation['category']> }[]
}[] = [
  {
    category: 'entrance',
    label: '入場',
    items: [
      { type: 'fadeIn', label: 'フェードイン', cat: 'entrance' },
      { type: 'slideInLeft', label: '左からスライド', cat: 'entrance' },
      { type: 'slideInRight', label: '右からスライド', cat: 'entrance' },
      { type: 'slideInUp', label: '下からスライド', cat: 'entrance' },
      { type: 'slideInDown', label: '上からスライド', cat: 'entrance' },
      { type: 'zoomIn', label: 'ズームイン', cat: 'entrance' },
      { type: 'bounceIn', label: 'バウンスイン', cat: 'entrance' },
    ],
  },
  {
    category: 'exit',
    label: '退場',
    items: [
      { type: 'fadeOut', label: 'フェードアウト', cat: 'exit' },
      { type: 'slideOutLeft', label: '左へスライド', cat: 'exit' },
      { type: 'slideOutRight', label: '右へスライド', cat: 'exit' },
      { type: 'slideOutUp', label: '上へスライド', cat: 'exit' },
      { type: 'slideOutDown', label: '下へスライド', cat: 'exit' },
      { type: 'zoomOut', label: 'ズームアウト', cat: 'exit' },
    ],
  },
  {
    category: 'emphasis',
    label: '強調',
    items: [
      { type: 'pulse', label: 'パルス', cat: 'emphasis' },
      { type: 'bounce', label: 'バウンス', cat: 'emphasis' },
      { type: 'shake', label: 'シェイク', cat: 'emphasis' },
      { type: 'spin', label: 'スピン', cat: 'emphasis' },
    ],
  },
]

const TRIGGERS: { value: NonNullable<ElementAnimation['trigger']>; label: string }[] = [
  { value: 'on-click', label: 'クリック時' },
  { value: 'with-previous', label: '前と同時' },
  { value: 'after-previous', label: '前の後' },
]

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  entrance: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  exit: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', bar: 'bg-red-500' },
  emphasis: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', bar: 'bg-blue-500' },
}

const ELEMENT_ICONS: Record<string, typeof Type> = {
  title: Type,
  subtitle: Type,
  body: Type,
  label: Type,
  image: Image,
  shape: Square,
  table: Table,
  chart: BarChart3,
  video: Video,
  audio: Music,
  connector: Link2,
}

// ── Helpers ──

function getElementLabel(el: SlideElement): string {
  if ('content' in el && el.content) {
    const text = el.content.replace(/<[^>]*>/g, '').slice(0, 16)
    return text || el.type
  }
  return el.type
}

function getAnimLabel(type: ElementAnimation['type']): string {
  for (const g of ANIMATION_GROUPS) {
    const found = g.items.find((i) => i.type === type)
    if (found) return found.label
  }
  return type
}

function getCategoryForType(type: ElementAnimation['type']): NonNullable<ElementAnimation['category']> {
  if (type.startsWith('fadeIn') || type.startsWith('slideIn') || type === 'zoomIn' || type === 'bounceIn') return 'entrance'
  if (type.startsWith('fadeOut') || type.startsWith('slideOut') || type === 'zoomOut') return 'exit'
  return 'emphasis'
}

// ── Component ──

export default function AnimationTimeline({ slide, slideId, dispatch, onClose, onPreview }: AnimationTimelineProps) {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [timelineZoom, setTimelineZoom] = useState(1) // 1 = 10s total
  const [previewing, setPreviewing] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const dragRef = useRef<{ elementId: string; startIdx: number } | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const totalDuration = 10 / timelineZoom // seconds visible

  // Sorted animated elements
  const animatedElements = useMemo(() => {
    return slide.elements
      .filter((el): el is SlideElement & { animation: ElementAnimation } => !!el.animation)
      .sort((a, b) => (a.animation.order ?? 0) - (b.animation.order ?? 0))
  }, [slide.elements])

  const selectedElement = animatedElements.find((el) => el.id === selectedElementId) ?? null
  const selectedAnim = selectedElement?.animation ?? null

  // ── Dispatch helpers ──

  const updateAnimation = useCallback(
    (elementId: string, updates: Partial<ElementAnimation>) => {
      const el = slide.elements.find((e) => e.id === elementId)
      if (!el?.animation) return
      dispatch({
        type: 'SET_ELEMENT_ANIMATION',
        slideId,
        elementId,
        animation: { ...el.animation, ...updates },
      })
    },
    [dispatch, slideId, slide.elements],
  )

  const removeAnimation = useCallback(
    (elementId: string) => {
      dispatch({ type: 'SET_ELEMENT_ANIMATION', slideId, elementId, animation: undefined })
      if (selectedElementId === elementId) setSelectedElementId(null)
    },
    [dispatch, slideId, selectedElementId],
  )

  // ── Drag reorder ──

  const handleDragStart = useCallback((elementId: string, index: number) => {
    dragRef.current = { elementId, startIdx: index }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (!dragRef.current) return
      const { elementId } = dragRef.current
      // Reorder: set the dropped element to targetIndex, shift others
      const ordered = [...animatedElements]
      const fromIdx = ordered.findIndex((el) => el.id === elementId)
      if (fromIdx < 0) return
      const [moved] = ordered.splice(fromIdx, 1)
      ordered.splice(targetIndex, 0, moved)
      ordered.forEach((el, i) => {
        dispatch({ type: 'REORDER_ANIMATIONS', slideId, elementId: el.id, order: i })
      })
      dragRef.current = null
      setDragOverIndex(null)
    },
    [animatedElements, dispatch, slideId],
  )

  const handleDragEnd = useCallback(() => {
    dragRef.current = null
    setDragOverIndex(null)
  }, [])

  // ── Preview ──

  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview()
      return
    }
    setPreviewing(true)
    const totalMs = animatedElements.reduce((acc, el) => {
      const d = (el.animation.delay ?? 0) + (el.animation.duration ?? 0.5)
      return Math.max(acc, d)
    }, 0)
    setTimeout(() => setPreviewing(false), (totalMs + 0.5) * 1000)
  }, [animatedElements, onPreview])

  // ── Elements without animation (for add panel) ──

  const unanimatedElements = slide.elements.filter((el) => !el.animation)

  // ── Render ──

  const IconComp = selectedElement ? ELEMENT_ICONS[selectedElement.type] ?? Square : Square

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 h-full flex flex-col flex-shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white text-sm font-medium">アニメーション</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={animatedElements.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={12} />
            プレビュー
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Timeline zoom controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">タイムライン</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="ズームアウト"
          >
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] text-slate-500 w-8 text-center">{totalDuration.toFixed(0)}s</span>
          <button
            onClick={() => setTimelineZoom((z) => Math.min(4, z + 0.25))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="ズームイン"
          >
            <ZoomIn size={12} />
          </button>
        </div>
      </div>

      {/* Timeline list */}
      <div className="flex-1 overflow-y-auto">
        {animatedElements.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            アニメーションがありません。
            <br />
            下の「+」ボタンで追加してください。
          </div>
        ) : (
          <div className="py-2">
            {/* Time ruler */}
            <div className="px-4 mb-1 flex items-end">
              <div className="w-28 flex-shrink-0" />
              <div className="flex-1 relative h-4">
                {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => {
                  const pct = (i / totalDuration) * 100
                  if (pct > 100) return null
                  return (
                    <span
                      key={i}
                      className="absolute text-[9px] text-slate-600 -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      {i}s
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Animation rows */}
            {animatedElements.map((el, idx) => {
              const anim = el.animation
              const cat = anim.category ?? getCategoryForType(anim.type)
              const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.entrance
              const EIcon = ELEMENT_ICONS[el.type] ?? Square
              const delay = anim.delay ?? 0
              const duration = anim.duration ?? 0.5
              const barLeft = (delay / totalDuration) * 100
              const barWidth = Math.max((duration / totalDuration) * 100, 1)
              const isSelected = selectedElementId === el.id
              const isDragOver = dragOverIndex === idx

              return (
                <div
                  key={el.id}
                  draggable
                  onDragStart={() => handleDragStart(el.id, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(idx)}
                  onClick={() => setSelectedElementId(el.id)}
                  className={`relative flex items-center px-2 py-1.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* Drag-over indicator line */}
                  {isDragOver && (
                    <div className="absolute top-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full z-10 pointer-events-none" />
                  )}
                  {/* Drag handle */}
                  <div className="w-5 flex-shrink-0 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing">
                    <GripVertical size={12} />
                  </div>

                  {/* Element info */}
                  <div className="w-24 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                    <EIcon size={12} className="text-slate-500 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300 truncate">{getElementLabel(el)}</span>
                  </div>

                  {/* Animation badge */}
                  <span
                    className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium border ${colors.bg} ${colors.border} ${colors.text} mr-2`}
                  >
                    {getAnimLabel(anim.type)}
                  </span>

                  {/* Timeline bar */}
                  <div className="flex-1 relative h-5 bg-slate-800/50 rounded overflow-hidden">
                    <div
                      className={`absolute top-1 bottom-1 rounded ${colors.bar} opacity-80`}
                      style={{ left: `${Math.min(barLeft, 100)}%`, width: `${Math.min(barWidth, 100 - barLeft)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel for selected animation */}
      {selectedElement && selectedAnim && (
        <div className="border-t border-slate-700 px-4 py-3 space-y-3 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <IconComp size={14} className="text-slate-400" />
            <span className="text-xs text-white font-medium truncate">{getElementLabel(selectedElement)}</span>
            <span className="text-[10px] text-slate-500">&#8212;</span>
            <span className="text-[10px] text-slate-400">{getAnimLabel(selectedAnim.type)}</span>
          </div>

          {/* Animation type selector */}
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">アニメーション種類</label>
            <select
              value={selectedAnim.type}
              onChange={(e) => {
                const newType = e.target.value as ElementAnimation['type']
                const newCat = getCategoryForType(newType)
                updateAnimation(selectedElement.id, { type: newType, category: newCat })
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {ANIMATION_GROUPS.map((g) => (
                <optgroup key={g.category} label={g.label}>
                  {g.items.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Trigger */}
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">トリガー</label>
            <select
              value={selectedAnim.trigger ?? 'on-click'}
              onChange={(e) =>
                dispatch({
                  type: 'SET_ANIMATION_TRIGGER',
                  slideId,
                  elementId: selectedElement.id,
                  trigger: e.target.value,
                })
              }
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Delay slider */}
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">遅延</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={selectedAnim.delay ?? 0}
                onChange={(e) => updateAnimation(selectedElement.id, { delay: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-indigo-500"
              />
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={selectedAnim.delay ?? 0}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v >= 0 && v <= 5) updateAnimation(selectedElement.id, { delay: v })
                }}
                className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-300 text-right focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">s</span>
            </div>
          </div>

          {/* Duration slider */}
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">持続時間</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.1}
                value={selectedAnim.duration ?? 0.5}
                onChange={(e) => updateAnimation(selectedElement.id, { duration: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-indigo-500"
              />
              <input
                type="number"
                min={0.1}
                max={5}
                step={0.1}
                value={selectedAnim.duration ?? 0.5}
                onChange={(e) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v >= 0.1 && v <= 5) updateAnimation(selectedElement.id, { duration: v })
                }}
                className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-300 text-right focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">s</span>
            </div>
          </div>

          {/* Direction options for slide animations */}
          {(selectedAnim.type.startsWith('slideIn') || selectedAnim.type.startsWith('slideOut')) && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">方向</label>
              <select
                value={selectedAnim.type}
                onChange={(e) => {
                  const newType = e.target.value as ElementAnimation['type']
                  updateAnimation(selectedElement.id, { type: newType })
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                {selectedAnim.type.startsWith('slideIn') ? (
                  <>
                    <option value="slideInLeft">左から</option>
                    <option value="slideInRight">右から</option>
                    <option value="slideInUp">下から</option>
                    <option value="slideInDown">上から</option>
                  </>
                ) : (
                  <>
                    <option value="slideOutLeft">左へ</option>
                    <option value="slideOutRight">右へ</option>
                    <option value="slideOutUp">上へ</option>
                    <option value="slideOutDown">下へ</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="border-t border-slate-700 px-4 py-2 flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            disabled={unanimatedElements.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus size={12} />
            アニメーション追加
          </button>

          {/* Add animation dropdown */}
          {showAddPanel && unanimatedElements.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2">
                <p className="text-[10px] text-slate-500 mb-1.5 px-1">要素を選択</p>
                {unanimatedElements.map((el) => {
                  const EIcon = ELEMENT_ICONS[el.type] ?? Square
                  return (
                    <button
                      key={el.id}
                      onClick={() => {
                        dispatch({
                          type: 'SET_ELEMENT_ANIMATION',
                          slideId,
                          elementId: el.id,
                          animation: {
                            type: 'fadeIn' as const,
                            category: 'entrance' as const,
                            duration: 0.5,
                            delay: animatedElements.length * 0.3,
                            trigger: 'on-click' as const,
                            order: animatedElements.length,
                          },
                        })
                        setSelectedElementId(el.id)
                        setShowAddPanel(false)
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <EIcon size={12} className="text-slate-500" />
                      <span className="truncate">{getElementLabel(el)}</span>
                      <span className="text-[10px] text-slate-600 ml-auto">{el.type}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {selectedElementId && (
          <button
            onClick={() => removeAnimation(selectedElementId)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 hover:border-red-700 transition-colors"
          >
            <Trash2 size={12} />
            削除
          </button>
        )}
      </div>

      {/* Mini preview overlay */}
      {previewing && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative w-[480px] h-[270px] bg-slate-800 rounded-lg overflow-hidden shadow-2xl border border-slate-600">
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs">
              プレビュー再生中...
            </div>
            {animatedElements.map((el) => {
              const anim = el.animation
              const delay = anim.delay ?? 0
              const duration = anim.duration ?? 0.5
              const scaleX = 480 / 960
              const scaleY = 270 / 540
              const x = (el as any).x * scaleX
              const y = (el as any).y * scaleY
              const w = (el as any).w * scaleX
              const h = (el as any).h * scaleY
              const cat = anim.category ?? getCategoryForType(anim.type)
              const barColor = cat === 'entrance' ? '#10b981' : cat === 'exit' ? '#ef4444' : '#3b82f6'

              return (
                <div
                  key={el.id}
                  className="absolute rounded"
                  style={{
                    left: x,
                    top: y,
                    width: w,
                    height: h,
                    backgroundColor: barColor + '33',
                    border: `1px solid ${barColor}`,
                    animation: `preview-${anim.type} ${duration}s ease ${delay}s both`,
                    opacity: 0,
                  }}
                >
                  <span className="text-[8px] text-white/70 p-0.5 truncate block">{getElementLabel(el)}</span>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => setPreviewing(false)}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X size={20} />
          </button>

          {/* Inline keyframes for preview */}
          <style>{`
            @keyframes preview-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes preview-fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes preview-slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes preview-slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes preview-slideInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes preview-slideInDown { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes preview-zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
            @keyframes preview-bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { opacity: 1; transform: scale(1.05); } 70% { transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
            @keyframes preview-slideOutLeft { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-40px); } }
            @keyframes preview-slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
            @keyframes preview-slideOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-40px); } }
            @keyframes preview-slideOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(40px); } }
            @keyframes preview-zoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.5); } }
            @keyframes preview-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
            @keyframes preview-bounce { 0%, 100% { opacity: 1; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-10px); } }
            @keyframes preview-shake { 0%, 100% { opacity: 1; transform: translateX(0); } 25% { opacity: 1; transform: translateX(-5px); } 75% { opacity: 1; transform: translateX(5px); } }
            @keyframes preview-spin { from { opacity: 1; transform: rotate(0deg); } to { opacity: 1; transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </div>
  )
}
