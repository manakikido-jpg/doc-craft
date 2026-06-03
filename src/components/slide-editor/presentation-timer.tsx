'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, ChevronDown, Settings, AlertTriangle } from 'lucide-react'

interface SectionTiming {
  name: string
  seconds: number
}

interface TimerProps {
  visible: boolean
  mode: 'stopwatch' | 'countdown'
  countdownMinutes?: number
  sections?: SectionTiming[]
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(Math.abs(totalSeconds) / 60)
  const s = Math.abs(totalSeconds) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTimeDetailed(totalSeconds: number): string {
  const h = Math.floor(Math.abs(totalSeconds) / 3600)
  const m = Math.floor((Math.abs(totalSeconds) % 3600) / 60)
  const s = Math.abs(totalSeconds) % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PresentationTimer({
  visible,
  mode,
  countdownMinutes = 5,
  sections = [],
}: TimerProps) {
  const initialSeconds = mode === 'countdown' ? countdownMinutes * 60 : 0
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [warningFlash, setWarningFlash] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [sectionElapsed, setSectionElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningShownRef = useRef<Set<number>>(new Set())

  const tick = useCallback(() => {
    setSeconds((prev) => {
      const next = mode === 'stopwatch' ? prev + 1 : prev > 0 ? prev - 1 : 0

      // Check for warnings at 5 min and 1 min remaining (countdown mode)
      if (mode === 'countdown') {
        const remaining = next
        if (remaining === 300 && !warningShownRef.current.has(300)) {
          warningShownRef.current.add(300)
          triggerWarning()
        }
        if (remaining === 60 && !warningShownRef.current.has(60)) {
          warningShownRef.current.add(60)
          triggerWarning()
        }
      }

      return next
    })
    setSectionElapsed((prev) => prev + 1)
  }, [mode])

  function triggerWarning() {
    setWarningFlash(true)
    setTimeout(() => setWarningFlash(false), 3000)
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, tick])

  // Reset state when mode or countdownMinutes change
  useEffect(() => {
    setSeconds(mode === 'countdown' ? countdownMinutes * 60 : 0)
    setRunning(false)
    setSectionElapsed(0)
    setCurrentSectionIndex(0)
    warningShownRef.current = new Set()
  }, [mode, countdownMinutes])

  const handleReset = () => {
    setRunning(false)
    setSeconds(mode === 'countdown' ? countdownMinutes * 60 : 0)
    setSectionElapsed(0)
    setCurrentSectionIndex(0)
    warningShownRef.current = new Set()
  }

  const handleToggle = () => {
    setRunning((r) => !r)
  }

  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex((i) => i + 1)
      setSectionElapsed(0)
    }
  }

  if (!visible) return null

  const isExpired = mode === 'countdown' && seconds === 0
  const remaining = mode === 'countdown' ? seconds : undefined
  const elapsed = mode === 'stopwatch' ? seconds : countdownMinutes * 60 - seconds
  const totalTime = mode === 'countdown' ? countdownMinutes * 60 : undefined
  const progressPct = totalTime ? ((totalTime - seconds) / totalTime) * 100 : undefined

  const currentSection = sections.length > 0 ? sections[currentSectionIndex] : null
  const sectionProgressPct = currentSection
    ? Math.min(100, (sectionElapsed / currentSection.seconds) * 100)
    : undefined
  const sectionOvertime = currentSection && sectionElapsed > currentSection.seconds

  return (
    <div
      className={`fixed top-4 right-4 z-[9996] flex flex-col items-end gap-1 select-none transition-all ${
        warningFlash ? 'animate-pulse' : ''
      }`}
    >
      {/* Main timer bar */}
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur shadow-lg transition-colors cursor-pointer ${
          isExpired
            ? 'bg-red-900/80'
            : warningFlash
            ? 'bg-amber-900/80'
            : 'bg-slate-900/70'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Warning icon */}
        {(warningFlash || isExpired) && (
          <AlertTriangle size={14} className={isExpired ? 'text-red-300' : 'text-amber-300'} />
        )}

        {/* Time display */}
        <span
          className={`font-mono text-lg tabular-nums ${
            isExpired
              ? 'text-red-300'
              : warningFlash
              ? 'text-amber-300'
              : 'text-white'
          }`}
        >
          {formatTimeDetailed(seconds)}
        </span>

        {/* Elapsed / remaining indicator */}
        {mode === 'countdown' && (
          <span className="text-xs text-slate-400">
            / {formatTime(countdownMinutes * 60)}
          </span>
        )}

        {/* Play/Pause */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          className="p-1 rounded hover:bg-white/10 text-white"
          title={running ? 'Pause' : 'Start'}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Reset */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReset()
          }}
          className="p-1 rounded hover:bg-white/10 text-white"
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>

        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Progress bar for countdown */}
      {mode === 'countdown' && progressPct !== undefined && (
        <div className="w-full h-1 bg-slate-800/50 rounded-full overflow-hidden mr-2">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isExpired
                ? 'bg-red-500'
                : progressPct > 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl shadow-2xl p-4 w-64 mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mode indicator */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {mode === 'countdown' ? 'Countdown' : 'Stopwatch'}
            </span>
            <span className="text-xs text-slate-500">
              Elapsed: {formatTimeDetailed(elapsed)}
            </span>
          </div>

          {/* Large time display */}
          <div className="text-center mb-3">
            <span
              className={`font-mono text-3xl tabular-nums ${
                isExpired ? 'text-red-400' : 'text-white'
              }`}
            >
              {formatTimeDetailed(seconds)}
            </span>
            {mode === 'countdown' && remaining !== undefined && remaining <= 300 && remaining > 0 && (
              <p className="text-xs text-amber-400 mt-1">
                {remaining <= 60 ? 'Less than 1 minute!' : `${Math.ceil(remaining / 60)} min remaining`}
              </p>
            )}
          </div>

          {/* Section timing */}
          {sections.length > 0 && (
            <div className="mb-3 border-t border-slate-700 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Sections</span>
                <span className="text-[10px] text-slate-500">
                  {currentSectionIndex + 1} / {sections.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {sections.map((sec, i) => {
                  const isCurrent = i === currentSectionIndex
                  const isPast = i < currentSectionIndex
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors ${
                        isCurrent
                          ? 'bg-indigo-500/15 text-indigo-300'
                          : isPast
                          ? 'text-slate-500 line-through'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          isCurrent
                            ? sectionOvertime
                              ? 'bg-red-400'
                              : 'bg-indigo-400'
                            : isPast
                            ? 'bg-slate-600'
                            : 'bg-slate-500'
                        }`}
                      />
                      <span className="flex-1 truncate">{sec.name}</span>
                      <span className="text-[10px] tabular-nums">
                        {isCurrent
                          ? `${formatTime(sectionElapsed)} / ${formatTime(sec.seconds)}`
                          : formatTime(sec.seconds)}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Section progress */}
              {currentSection && sectionProgressPct !== undefined && (
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      sectionOvertime ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, sectionProgressPct)}%` }}
                  />
                </div>
              )}
              {currentSectionIndex < sections.length - 1 && (
                <button
                  onClick={handleNextSection}
                  className="mt-2 w-full text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Next Section &rarr;
                </button>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-700">
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                running
                  ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                  : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
              }`}
            >
              {running ? <Pause size={12} /> : <Play size={12} />}
              {running ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
