'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  SkipForward,
  Pause,
  Play,
  RotateCcw,
  Square,
  Save,
  X,
  Timer,
} from 'lucide-react'
import type { Slide } from '@/types'

interface RehearsalTimerProps {
  slides: Slide[]
  onSave: (timings: { slideId: string; seconds: number }[]) => void
  onCancel: () => void
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getSlideTitle(slide: Slide): string {
  const titleEl = slide.elements.find(
    (el) => el.type === 'title' || el.type === 'subtitle',
  )
  if (titleEl && 'content' in titleEl && titleEl.content) {
    return titleEl.content
  }
  return '(無題)'
}

export default function RehearsalTimer({ slides, onSave, onCancel }: RehearsalTimerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [finished, setFinished] = useState(false)
  const [slideSeconds, setSlideSeconds] = useState<number[]>(() =>
    slides.map(() => 0),
  )
  const [totalSeconds, setTotalSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    setTotalSeconds((t) => t + 1)
    setSlideSeconds((prev) => {
      const next = [...prev]
      next[currentIndex] = (next[currentIndex] ?? 0) + 1
      return next
    })
  }, [currentIndex])

  useEffect(() => {
    if (running && !finished) {
      intervalRef.current = setInterval(tick, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, finished, tick])

  function nextSlide() {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      endRehearsal()
    }
  }

  function togglePause() {
    setRunning((r) => !r)
  }

  function restart() {
    setCurrentIndex(0)
    setSlideSeconds(slides.map(() => 0))
    setTotalSeconds(0)
    setRunning(true)
    setFinished(false)
  }

  function endRehearsal() {
    setRunning(false)
    setFinished(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function handleSave() {
    const timings = slides.map((slide, i) => ({
      slideId: slide.id,
      seconds: slideSeconds[i] ?? 0,
    }))
    onSave(timings)
  }

  // ── Summary view ──
  if (finished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95">
        <div className="w-full max-w-lg rounded-xl bg-slate-800 p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Timer size={20} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">リハーサル結果</h2>
          </div>

          <div className="mb-4 rounded-lg bg-slate-900 p-3 text-center">
            <p className="text-sm text-slate-400">合計時間</p>
            <p className="text-3xl font-bold text-white">{formatTime(totalSeconds)}</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">スライド</th>
                  <th className="pb-2 text-right">時間</th>
                </tr>
              </thead>
              <tbody>
                {slides.map((slide, i) => (
                  <tr
                    key={slide.id}
                    className="border-b border-slate-700/50"
                  >
                    <td className="py-2 pr-4 text-slate-500">{i + 1}</td>
                    <td className="py-2 pr-4 text-slate-200 truncate max-w-[240px]">
                      {getSlideTitle(slide)}
                    </td>
                    <td className="py-2 text-right font-mono text-white">
                      {formatTime(slideSeconds[i] ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={restart}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              やり直す
            </button>
            <button
              onClick={onCancel}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Save size={14} />
              タイミングを保存
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Rehearsal view ──
  const currentSlide = slides[currentIndex]!

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-slate-900 px-6 py-3">
        <div className="flex items-center gap-6">
          {/* Current slide timer */}
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              スライド
            </p>
            <p className="text-2xl font-bold tabular-nums text-white">
              {formatTime(slideSeconds[currentIndex] ?? 0)}
            </p>
          </div>

          {/* Total timer */}
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              合計
            </p>
            <p className="text-2xl font-bold tabular-nums text-indigo-400">
              {formatTime(totalSeconds)}
            </p>
          </div>

          {/* Slide number */}
          <div className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300">
            {currentIndex + 1} / {slides.length}
          </div>
        </div>

        <button
          onClick={onCancel}
          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Current slide display */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-64 w-[460px] flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800">
            <p className="text-5xl font-bold text-indigo-400">
              {currentIndex + 1}
            </p>
            <p className="mt-3 text-lg text-slate-200">
              {getSlideTitle(currentSlide)}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 bg-slate-900 px-6 py-4">
        <button
          onClick={togglePause}
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? '一時停止' : '再開'}
        </button>

        <button
          onClick={nextSlide}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <SkipForward size={16} />
          {currentIndex < slides.length - 1 ? '次のスライド' : '終了'}
        </button>

        <button
          onClick={restart}
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        >
          <RotateCcw size={16} />
          最初から
        </button>

        <button
          onClick={endRehearsal}
          className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-4 py-2 text-sm text-white hover:bg-red-600"
        >
          <Square size={16} />
          終了
        </button>
      </div>
    </div>
  )
}
