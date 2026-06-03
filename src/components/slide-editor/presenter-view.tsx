'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Slide, SlideShapeElement, SlideTableElement, SlideChartElement } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Props {
  slides: Slide[]
  startIndex: number
  onExit: () => void
  globalFooter?: { text?: string; showDate?: boolean; showSlideNumber?: boolean }
}

function SlidePreview({ slide, small }: { slide: Slide | undefined; small?: boolean }) {
  if (!slide) {
    return (
      <div
        className="w-full rounded bg-slate-800 flex items-center justify-center text-slate-500 text-sm"
        style={{ aspectRatio: '16/9' }}
      >
        --
      </div>
    )
  }
  const baseTheme = SLIDE_THEMES[slide.themeKey]
  const theme = slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme

  return (
    <div
      className="w-full rounded overflow-hidden relative"
      style={{
        background: theme.background,
        aspectRatio: '16/9',
        backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
        backgroundSize: slide.backgroundFit === 'stretch' ? '100% 100%' : slide.backgroundFit || 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {[...slide.elements]
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((el) => {
          if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
            const color = el.color || (el.type === 'title' ? theme.titleColor : theme.bodyColor)
            const scale = small ? 0.35 : 0.5
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  color,
                  fontSize: `${el.fontSize * scale}px`,
                  fontWeight: el.fontWeight,
                  textAlign: el.align as any,
                  lineHeight: 1.3,
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                }}
                dangerouslySetInnerHTML={{ __html: el.content || '' }}
              />
            )
          }
          if (el.type === 'image') {
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  height: `${el.h}%`,
                }}
              >
                {el.crop && (el.crop.w < 100 || el.crop.h < 100 || el.crop.x > 0 || el.crop.y > 0) ? (
                  <div style={{ overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
                    <img
                      src={el.src}
                      alt=""
                      style={{
                        position: 'absolute',
                        left: `${-el.crop.x * (100 / el.crop.w)}%`,
                        top: `${-el.crop.y * (100 / el.crop.h)}%`,
                        width: `${10000 / el.crop.w}%`,
                        height: `${10000 / el.crop.h}%`,
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                ) : (
                  <img src={el.src} alt="" className="w-full h-full object-contain" />
                )}
              </div>
            )
          }
          if (el.type === 'shape') {
            const shape = el as SlideShapeElement
            const bg = shape.gradientFill
              ? `linear-gradient(${shape.gradientFill.angle}deg, ${shape.gradientFill.color1}, ${shape.gradientFill.color2})`
              : shape.fill
            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  height: `${el.h}%`,
                  background: bg,
                  borderRadius: shape.shape === 'circle' ? '50%' : shape.shape === 'rect' ? '4px' : undefined,
                }}
              >
                {shape.textContent && (
                  <div className="w-full h-full flex items-center justify-center text-center" style={{
                    color: shape.textColor || '#fff',
                    fontSize: '4px',
                    padding: '8%',
                    overflow: 'hidden',
                  }}>
                    {shape.textContent.slice(0, 20)}
                  </div>
                )}
              </div>
            )
          }
          if (el.type === 'table') {
            const table = el as SlideTableElement
            return (
              <div key={el.id} className="absolute overflow-hidden" style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              }}>
                <table className="w-full h-full border-collapse" style={{ fontSize: '4px' }}>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-slate-600/50 px-0.5 text-white/70">
                            {cell.slice(0, 10)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          if (el.type === 'chart') {
            return (
              <div key={el.id} className="absolute flex items-center justify-center bg-slate-700/40 rounded" style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              }}>
                <span className="text-[5px] text-slate-400">📊 {(el as SlideChartElement).chartType}</span>
              </div>
            )
          }
          if (el.type === 'video') {
            return (
              <div key={el.id} className="absolute flex items-center justify-center bg-slate-800/50 rounded" style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              }}>
                <span className="text-[6px] text-slate-400">▶</span>
              </div>
            )
          }
          return null
        })}
    </div>
  )
}

export default function PresenterView({ slides, startIndex, onExit, globalFooter }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const slide = slides[currentIndex]
  const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : undefined

  const progressPercent = slides.length > 1 ? ((currentIndex) / (slides.length - 1)) * 100 : 100

  useEffect(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) setCurrentIndex((i) => i + 1)
  }, [currentIndex, slides.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }, [currentIndex])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          goPrev()
          break
        case 'Escape':
          e.preventDefault()
          onExit()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onExit])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="text-sm text-slate-300 font-medium">
          発表者ビュー
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded px-3 py-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-sm text-slate-200 font-mono tabular-nums">{timeStr}</span>
          </div>
          <span className="text-sm text-slate-400">
            {currentIndex + 1} / {slides.length}
          </span>
          <button
            onClick={onExit}
            className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="終了"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Current slide (large) */}
        <div className="flex-[2] p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="text-xs text-slate-500 mb-2">現在のスライド</div>
            <SlidePreview slide={slide} />
          </div>
        </div>

        {/* Right: Next slide + Notes */}
        <div className="flex-1 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Next slide preview */}
          <div className="p-4 flex-shrink-0">
            <div className="text-xs text-slate-500 mb-2">次のスライド</div>
            <SlidePreview slide={nextSlide} small />
          </div>

          {/* Speaker notes */}
          <div className="flex-1 p-4 pt-0 flex flex-col overflow-hidden">
            <div className="text-xs text-slate-500 mb-2">スピーカーノート</div>
            <div className="flex-1 bg-slate-900 rounded-lg p-4 overflow-y-auto">
              <div className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                {slide?.notes || <span className="text-slate-600 text-sm italic">ノートなし</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar: progress + controls + shortcuts */}
      <div className="flex-shrink-0 bg-slate-900 border-t border-slate-700">
        {/* Progress bar */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-2.5">
          {/* Keyboard shortcuts info */}
          <div className="text-xs text-slate-600 flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500 text-[10px] font-mono">←</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500 text-[10px] font-mono ml-0.5">→</kbd>
              <span className="ml-1">ナビゲーション</span>
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500 text-[10px] font-mono">Esc</kbd>
              <span className="ml-1">終了</span>
            </span>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 text-xs transition-colors"
            >
              <ChevronLeft size={14} /> 前へ
            </button>
            <span className="text-slate-400 text-sm font-mono tabular-nums">
              {currentIndex + 1} / {slides.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === slides.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 text-xs transition-colors"
            >
              次へ <ChevronRight size={14} />
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs transition-colors"
            >
              終了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
