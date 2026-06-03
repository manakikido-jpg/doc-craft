'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Play, RotateCcw, CheckCheck } from 'lucide-react'
import { SLIDE_THEMES } from '@/lib/themes'
import type { Slide } from '@/types'

interface TransitionPreviewProps {
  slide: Slide
  prevSlide?: Slide
  transition: string
  duration?: number
  onApplyToAll?: (transition: string, duration: number) => void
  onClose: () => void
}

const TRANSITIONS = [
  'none', 'fade', 'slide-left', 'slide-up', 'dissolve',
  'zoom', 'flip', 'cube', 'wipe-left', 'wipe-up',
] as const

const DURATIONS = [200, 500, 1000, 2000]

function getTransitionCSS(
  transition: string,
  phase: 'start' | 'end',
  durationMs: number,
): React.CSSProperties {
  const dur = `${durationMs}ms`
  const base: React.CSSProperties = { transition: `all ${dur} ease-in-out` }

  if (phase === 'end') return { ...base }

  switch (transition) {
    case 'fade':
      return { ...base, opacity: 0 }
    case 'slide-left':
      return { ...base, transform: 'translateX(-100%)' }
    case 'slide-up':
      return { ...base, transform: 'translateY(100%)' }
    case 'dissolve':
      return { ...base, opacity: 0, filter: 'blur(4px)' }
    case 'zoom':
      return { ...base, transform: 'scale(0.5)', opacity: 0 }
    case 'flip':
      return { ...base, transform: 'perspective(600px) rotateY(90deg)' }
    case 'cube':
      return { ...base, transform: 'perspective(600px) rotateY(-90deg)', transformOrigin: 'right center' }
    case 'wipe-left':
      return { ...base, clipPath: 'inset(0 100% 0 0)' }
    case 'wipe-up':
      return { ...base, clipPath: 'inset(100% 0 0 0)' }
    case 'none':
    default:
      return {}
  }
}

function MiniSlide({ slide, label }: { slide: Slide; label?: string }) {
  const theme = SLIDE_THEMES[slide.themeKey] ?? SLIDE_THEMES['dark-blue']

  const titleEl = slide.elements.find(
    (e) => e.type === 'title' || e.type === 'subtitle',
  )
  const bodyEl = slide.elements.find((e) => e.type === 'body')
  const titleText = titleEl && 'content' in titleEl ? titleEl.content : ''
  const bodyText = bodyEl && 'content' in bodyEl ? bodyEl.content : ''

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center p-4 overflow-hidden rounded"
      style={{ background: slide.backgroundImage ? `url(${slide.backgroundImage}) center/cover` : theme.background }}
    >
      {titleText && (
        <div
          className="text-[10px] font-bold text-center truncate w-full"
          style={{ color: theme.titleColor }}
        >
          {titleText}
        </div>
      )}
      {bodyText && (
        <div
          className="text-[7px] mt-1 text-center truncate w-full"
          style={{ color: theme.bodyColor }}
        >
          {bodyText}
        </div>
      )}
      {label && (
        <div className="absolute bottom-1 right-1 text-[6px] text-white/40">{label}</div>
      )}
    </div>
  )
}

export default function TransitionPreview({
  slide,
  prevSlide,
  transition: initialTransition,
  duration: initialDuration = 500,
  onApplyToAll,
  onClose,
}: TransitionPreviewProps) {
  const [selectedTransition, setSelectedTransition] = useState(initialTransition)
  const [durationMs, setDurationMs] = useState(initialDuration)
  const [playing, setPlaying] = useState(false)
  const [phase, setPhase] = useState<'start' | 'end'>('end')
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [autoAdvanceSec, setAutoAdvanceSec] = useState(5)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const play = useCallback(() => {
    if (playing) return
    setPlaying(true)
    setPhase('start')

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('end')
      })
    })

    timerRef.current = setTimeout(() => {
      setPlaying(false)
    }, durationMs + 50)
  }, [playing, durationMs])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const replay = useCallback(() => {
    setPlaying(false)
    setPhase('end')
    if (timerRef.current) clearTimeout(timerRef.current)
    setTimeout(() => play(), 50)
  }, [play])

  // Auto-play preview when transition or duration changes
  const isInitialMount = useRef(true)
  useEffect(() => {
    // Skip the initial mount to avoid playing on first render
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    // Reset current playback and auto-play with the new settings
    setPlaying(false)
    setPhase('end')
    if (timerRef.current) clearTimeout(timerRef.current)
    const autoPlayTimer = setTimeout(() => {
      // Inline the play logic to avoid dependency on the play callback
      setPlaying(true)
      setPhase('start')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('end')
        })
      })
      timerRef.current = setTimeout(() => {
        setPlaying(false)
      }, durationMs + 50)
    }, 80)
    return () => clearTimeout(autoPlayTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransition, durationMs])

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 w-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">トランジション プレビュー</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Preview area */}
      <div className="relative mx-auto mb-3" style={{ width: 300, height: 169 }}>
        <div className="absolute inset-0 bg-black rounded overflow-hidden">
          {/* Previous slide (background) */}
          {prevSlide && (
            <div className="absolute inset-0">
              <MiniSlide slide={prevSlide} label="前" />
            </div>
          )}

          {/* Current slide (animated) */}
          <div
            className="absolute inset-0"
            style={getTransitionCSS(selectedTransition, phase, selectedTransition === 'none' ? 0 : durationMs)}
          >
            <MiniSlide slide={slide} />
          </div>
        </div>

        {/* Play overlay */}
        {!playing && (
          <button
            onClick={play}
            className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 hover:opacity-100 transition-opacity"
          >
            <Play size={32} className="text-white drop-shadow" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={play}
          disabled={playing}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors"
        >
          <Play size={12} /> 再生
        </button>
        <button
          onClick={replay}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
        >
          <RotateCcw size={12} /> リプレイ
        </button>
        {onApplyToAll && (
          <button
            onClick={() => onApplyToAll(selectedTransition, durationMs)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white ml-auto transition-colors"
          >
            <CheckCheck size={12} /> 全スライドに適用
          </button>
        )}
      </div>

      {/* Transition selector */}
      <div className="mb-3">
        <label className="block text-[11px] text-slate-400 mb-1">トランジション</label>
        <div className="grid grid-cols-5 gap-1">
          {TRANSITIONS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTransition(t)}
              className={`px-1.5 py-1 text-[10px] rounded border transition-colors ${
                selectedTransition === t
                  ? 'border-blue-500 bg-blue-600/30 text-white'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              {t === 'none' ? 'なし' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Duration selector */}
      <div className="mb-3">
        <label className="block text-[11px] text-slate-400 mb-1">継続時間</label>
        <div className="flex gap-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDurationMs(d)}
              className={`flex-1 px-2 py-1 text-[11px] rounded border transition-colors ${
                durationMs === d
                  ? 'border-blue-500 bg-blue-600/30 text-white'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
              }`}
            >
              {d}ms
            </button>
          ))}
        </div>
      </div>

      {/* Auto-advance */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5"
          />
          自動進行
        </label>
        {autoAdvance && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={60}
              value={autoAdvanceSec}
              onChange={(e) => setAutoAdvanceSec(Math.max(1, Math.min(60, Number(e.target.value))))}
              className="w-12 px-1.5 py-0.5 text-[11px] rounded border border-slate-600 bg-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400">秒</span>
          </div>
        )}
      </div>
    </div>
  )
}
