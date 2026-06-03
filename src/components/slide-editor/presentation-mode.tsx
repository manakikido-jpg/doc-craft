'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  Slide,
  SlideElement,
  SlideTableElement,
  SlideConnectorElement,
  SlideShapeElement,
  SlideVideoElement,
  SlideChartElement,
} from '@/types'
import ChartRenderer from './chart-renderer'
import MorphTransition from './morph-transition'
import { SLIDE_THEMES } from '@/lib/themes'
import { sanitizeHtml } from '@/lib/sanitize'
import { exportSlideToImage, downloadBlob } from '@/lib/export/slide-image-export'
import {
  renderSlideElement,
  type PresentationCallbacks,
} from './element-renderer'

interface Props {
  slides: Slide[]
  startIndex: number
  onExit: () => void
  globalFooter?: { text?: string; showDate?: boolean; showSlideNumber?: boolean }
  hiddenSlideIds?: string[]
}

type PointerMode = 'none' | 'laser' | 'spotlight' | 'arrow'

type TransitionState = 'idle' | 'exit' | 'enter'

export default function PresentationMode({ slides, startIndex, onExit, globalFooter, hiddenSlideIds = [] }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [transState, setTransState] = useState<TransitionState>('idle')
  const [showUI, setShowUI] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const presentationStartRef = useRef(Date.now())
  const [laserPointer, setLaserPointer] = useState(false)
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 })
  const [penMode, setPenMode] = useState(false)
  const [qaMode, setQaMode] = useState(false)
  const [qaElapsed, setQaElapsed] = useState(0)
  const [pointerMode, setPointerMode] = useState<PointerMode>('none')
  const [pointerModeLabel, setPointerModeLabel] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [penColor, setPenColor] = useState('#ef4444')
  const [penWidth, setPenWidth] = useState(3)
  const [penTool, setPenTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen')
  const [slideStrokes, setSlideStrokes] = useState<Record<string, { points: { x: number; y: number }[]; color: string; width: number; opacity: number }[]>>({})
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [slideZoom, setSlideZoom] = useState<{ active: boolean; x: number; y: number; scale: number }>({ active: false, x: 50, y: 50, scale: 1 })
  // Feature 1: Laser pointer trail
  const [laserTrail, setLaserTrail] = useState<{ x: number; y: number }[]>([])
  const laserTrailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Feature 2: Keyboard shortcuts help overlay
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  // Feature 3: Magnifying glass
  const [magnifyMode, setMagnifyMode] = useState(false)
  const [magnifyPos, setMagnifyPos] = useState({ x: 0, y: 0 })
  // Feature 5: Screenshot flash
  const [screenshotFlash, setScreenshotFlash] = useState(false)
  // Morph transition state
  const [morphActive, setMorphActive] = useState(false)
  const [morphPrevElements, setMorphPrevElements] = useState<SlideElement[]>([])
  const [morphNextElements, setMorphNextElements] = useState<SlideElement[]>([])
  // Auto-advance progress
  const [autoAdvanceProgress, setAutoAdvanceProgress] = useState(0)
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoAdvanceAnimRef = useRef<number>(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRef = useRef<HTMLDivElement>(null)

  const hiddenSet = new Set(hiddenSlideIds)
  const visibleSlides = slides.filter(s => !hiddenSet.has(s.id) && !s.hidden)
  const visibleIndices = slides.map((s, i) => (hiddenSet.has(s.id) || s.hidden) ? -1 : i).filter(i => i >= 0)

  const slide = slides[currentIndex]
  const baseTheme = slide ? SLIDE_THEMES[slide.themeKey] : null
  const theme = slide && baseTheme && slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme
  const transition = slide?.transition || 'fade'

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    function handleFullscreenChange() {
      if (!document.fullscreenElement) onExit()
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [onExit])

  useEffect(() => {
    resetHideTimer()
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  // Elapsed time timer for presenter view
  useEffect(() => {
    if (!showNotes) return
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - presentationStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [showNotes])

  function resetHideTimer() {
    setShowUI(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowUI(false), 2500)
  }

  // Feature 1: Clear laser trail when pointer mode changes
  useEffect(() => {
    if (!laserPointer && pointerMode !== 'laser') {
      setLaserTrail([])
    }
  }, [laserPointer, pointerMode])

  // Auto-advance support with progress bar
  useEffect(() => {
    const currentSlide = slides[currentIndex]
    if (currentSlide?.autoAdvance && currentSlide.autoAdvance > 0) {
      const durationMs = currentSlide.autoAdvance * 1000
      const startTime = Date.now()
      setAutoAdvanceProgress(0)

      // Animate progress bar
      function animateProgress() {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        setAutoAdvanceProgress(progress)
        if (progress < 1) {
          autoAdvanceAnimRef.current = requestAnimationFrame(animateProgress)
        }
      }
      autoAdvanceAnimRef.current = requestAnimationFrame(animateProgress)

      // Set timer for auto-advance
      autoAdvanceTimerRef.current = setTimeout(() => {
        const nextVisible = visibleIndices.find(i => i > currentIndex)
        if (nextVisible !== undefined) {
          navigateTo(nextVisible)
        }
      }, durationMs)

      return () => {
        if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
        if (autoAdvanceAnimRef.current) cancelAnimationFrame(autoAdvanceAnimRef.current)
        setAutoAdvanceProgress(0)
      }
    } else {
      setAutoAdvanceProgress(0)
    }
  }, [currentIndex, slides])

  // Q&A timer count-up
  useEffect(() => {
    if (!qaMode) return
    const interval = setInterval(() => {
      setQaElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [qaMode])

  function navigateTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === currentIndex) return
    // Clear auto-advance timer on manual navigation
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current)
    if (autoAdvanceAnimRef.current) cancelAnimationFrame(autoAdvanceAnimRef.current)
    setAutoAdvanceProgress(0)

    const currentSlide = slides[currentIndex]
    const nextSlide = slides[nextIndex]
    const currentTransition = currentSlide?.transition || 'fade'

    // Handle morph transition
    if (currentTransition === 'morph' && currentSlide && nextSlide) {
      setMorphPrevElements(currentSlide.elements)
      setMorphNextElements(nextSlide.elements)
      setMorphActive(true)
      setCurrentIndex(nextIndex)
      // MorphTransition will call onComplete when done
      resetHideTimer()
      return
    }

    setTransState('exit')
    setTimeout(() => {
      setCurrentIndex(nextIndex)
      setTransState('enter')
      setTimeout(() => setTransState('idle'), 300)
    }, 200)
    resetHideTimer()
  }

  const goNext = useCallback(() => {
    // Find the next visible slide index after currentIndex
    const nextVisible = visibleIndices.find(i => i > currentIndex)
    if (nextVisible !== undefined) navigateTo(nextVisible)
  }, [currentIndex, visibleIndices])
  const goPrev = useCallback(() => {
    // Find the previous visible slide index before currentIndex
    const prevVisible = [...visibleIndices].reverse().find(i => i < currentIndex)
    if (prevVisible !== undefined) navigateTo(prevVisible)
  }, [currentIndex, visibleIndices])

  // Feature 5: Screenshot handler
  const handleScreenshot = useCallback(async () => {
    const slideEl = slideRef.current
    if (!slideEl) return
    try {
      setScreenshotFlash(true)
      setTimeout(() => setScreenshotFlash(false), 400)
      const blob = await exportSlideToImage(slideEl)
      const slideNum = visibleIndices.indexOf(currentIndex) + 1
      downloadBlob(blob, `slide-${slideNum}-screenshot.png`)
    } catch (err) {
      console.error('Screenshot failed:', err)
    }
  }, [currentIndex, visibleIndices])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Feature 2: Dismiss shortcuts help on any key press when visible
      if (showShortcutsHelp) {
        setShowShortcutsHelp(false)
        e.preventDefault()
        return
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'Enter':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          goPrev()
          break
        case 'Escape':
          if (magnifyMode) {
            setMagnifyMode(false)
            break
          }
          if (qaMode) {
            setQaMode(false)
            break
          }
          if (showThumbnails) {
            setShowThumbnails(false)
            break
          }
          e.preventDefault()
          onExit()
          break
        case 'q':
        case 'Q':
          setQaMode(prev => {
            if (!prev) setQaElapsed(0)
            return !prev
          })
          break
        case 'n':
          setShowNotes((v) => !v)
          break
        case 'l':
        case 'L':
          setLaserPointer((v) => !v)
          setPenMode(false)
          setPointerMode('none')
          break
        case 'p':
        case 'P':
          // Cycle pointer modes: none -> laser -> spotlight -> arrow -> none
          setPointerMode(prev => {
            const modes: PointerMode[] = ['none', 'laser', 'spotlight', 'arrow']
            const next = modes[(modes.indexOf(prev) + 1) % modes.length]
            const labels: Record<PointerMode, string> = { none: 'ポインター OFF', laser: 'レーザー', spotlight: 'スポットライト', arrow: 'アロー' }
            setPointerModeLabel(labels[next])
            if (pointerLabelTimerRef.current) clearTimeout(pointerLabelTimerRef.current)
            pointerLabelTimerRef.current = setTimeout(() => setPointerModeLabel(null), 1500)
            // Disable legacy laser when using pointer modes
            setLaserPointer(false)
            setPenMode(false)
            return next
          })
          break
        case 'g':
        case 'G':
          setShowThumbnails((v) => !v)
          break
        case 'c':
        case 'C':
          setSlideStrokes(prev => ({ ...prev, [slide!.id]: [] }))
          break
        case 'z':
          // Feature 3: Magnifying glass toggle
          setMagnifyMode(prev => !prev)
          break
        case 'Z':
          // Shift+Z: slide zoom (original behavior)
          setSlideZoom(prev => prev.active ? { active: false, x: 50, y: 50, scale: 1 } : { ...prev, active: true, scale: 2 })
          break
        case 's':
          // Feature 5: Screenshot
          e.preventDefault()
          handleScreenshot()
          break
        case '?':
        case 'h':
          // Feature 2: Show shortcuts help
          setShowShortcutsHelp(true)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onExit, showShortcutsHelp, magnifyMode, handleScreenshot])

  if (!slide || !theme) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
        <p className="text-white text-2xl mb-6">スライドがありません</p>
        <button
          onClick={onExit}
          className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
        >
          戻る
        </button>
      </div>
    )
  }

  function getTransitionStyle(): React.CSSProperties {
    const base: React.CSSProperties = { transition: 'all 0.4s ease' }
    if (transState === 'idle') return { ...base, opacity: 1, transform: 'none' }
    if (transState === 'exit') {
      switch (transition) {
        case 'slide-left':
          return { ...base, opacity: 0, transform: 'translateX(-100%)' }
        case 'slide-up':
          return { ...base, opacity: 0, transform: 'translateY(-100%)' }
        case 'zoom':
          return { ...base, opacity: 0, transform: 'scale(0.8)' }
        case 'dissolve':
          return { ...base, opacity: 0, transition: 'opacity 0.6s ease' }
        case 'wipe-left':
          return { ...base, clipPath: 'inset(0 100% 0 0)', transition: 'clip-path 0.5s ease' }
        case 'wipe-up':
          return { ...base, clipPath: 'inset(100% 0 0 0)', transition: 'clip-path 0.5s ease' }
        case 'flip':
          return { ...base, opacity: 0, transform: 'perspective(1000px) rotateY(90deg)' }
        case 'cube':
          return { ...base, opacity: 0, transform: 'perspective(1000px) rotateY(-90deg) translateZ(50%)' }
        default:
          return { ...base, opacity: 0 }
      }
    }
    switch (transition) {
      case 'slide-left':
        return { ...base, opacity: 0, transform: 'translateX(100%)', animation: 'slideInLeft 0.4s forwards' }
      case 'slide-up':
        return { ...base, opacity: 0, transform: 'translateY(100%)', animation: 'slideInUp 0.4s forwards' }
      case 'zoom':
        return { ...base, opacity: 0, transform: 'scale(1.2)', animation: 'zoomIn 0.4s forwards' }
      case 'dissolve':
        return { ...base, opacity: 0, animation: 'fadeIn 0.6s forwards' }
      case 'wipe-left':
        return { ...base, clipPath: 'inset(0 100% 0 0)', animation: 'wipeLeft 0.5s forwards' }
      case 'wipe-up':
        return { ...base, clipPath: 'inset(100% 0 0 0)', animation: 'wipeUp 0.5s forwards' }
      case 'flip':
        return {
          ...base,
          opacity: 0,
          transform: 'perspective(1000px) rotateY(-90deg)',
          animation: 'flipIn 0.5s forwards',
        }
      case 'cube':
        return {
          ...base,
          opacity: 0,
          transform: 'perspective(1000px) rotateY(90deg) translateZ(50%)',
          animation: 'cubeIn 0.5s forwards',
        }
      default:
        return { ...base, opacity: 0, animation: 'fadeIn 0.4s forwards' }
    }
  }

  const presentationCallbacks: PresentationCallbacks = {
    theme: theme!,
    transitionIdle: transState === 'idle',
  }

  function renderElement(el: SlideElement) {
    return renderSlideElement(el, 'presentation', presentationCallbacks)
  }

  const sortedElements = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

  const bgStyle: React.CSSProperties = { background: theme.background }
  if (slide.backgroundImage) {
    bgStyle.backgroundImage = `url(${slide.backgroundImage})`
    bgStyle.backgroundSize = slide.backgroundFit === 'stretch' ? '100% 100%' : slide.backgroundFit || 'cover'
    bgStyle.backgroundPosition = 'center'
    bgStyle.backgroundRepeat = 'no-repeat'
  }

  const lastTrailTimeRef = useRef(0)

  function handleSlideMouseMove(e: React.MouseEvent) {
    if (laserPointer && slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect()
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setLaserPos(pos)
      // Feature 1: Track trail positions throttled to ~30fps
      const now = Date.now()
      if (now - lastTrailTimeRef.current > 33) {
        lastTrailTimeRef.current = now
        setLaserTrail(prev => [...prev.slice(-17), pos])
      }
    }
    if (pointerMode !== 'none' && slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect()
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setCursorPos(pos)
      // Feature 1: Track trail for pointer laser mode too
      if (pointerMode === 'laser') {
        const now = Date.now()
        if (now - lastTrailTimeRef.current > 33) {
          lastTrailTimeRef.current = now
          setLaserTrail(prev => [...prev.slice(-17), pos])
        }
      }
    }
    // Feature 3: Track magnify position
    if (magnifyMode && slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect()
      setMagnifyPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    if (penMode && currentStroke.length > 0 && slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect()
      setCurrentStroke((prev) => [
        ...prev,
        { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 },
      ])
    }
    resetHideTimer()
  }

  function handleSlideMouseDown(e: React.MouseEvent) {
    if (penMode && slideRef.current) {
      e.stopPropagation()
      if (penTool === 'eraser') {
        // Eraser: remove stroke under cursor
        const rect = slideRef.current.getBoundingClientRect()
        const px = ((e.clientX - rect.left) / rect.width) * 100
        const py = ((e.clientY - rect.top) / rect.height) * 100
        const currentSlideStrokes = slideStrokes[slide.id] || []
        const filtered = currentSlideStrokes.filter(stroke =>
          !stroke.points.some(p => Math.abs(p.x - px) < 3 && Math.abs(p.y - py) < 3)
        )
        setSlideStrokes(prev => ({ ...prev, [slide.id]: filtered }))
        return
      }
      const rect = slideRef.current.getBoundingClientRect()
      setCurrentStroke([
        { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 },
      ])
    }
    if (slideZoom.active && slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setSlideZoom(prev => prev.scale > 1 ? { active: false, x: 50, y: 50, scale: 1 } : { active: true, x, y, scale: 2 })
    }
  }

  function handleSlideMouseUp() {
    if (penMode && currentStroke.length > 1) {
      const newStroke = {
        points: currentStroke,
        color: penColor,
        width: penWidth,
        opacity: penTool === 'highlighter' ? 0.3 : 1,
      }
      setSlideStrokes(prev => ({
        ...prev,
        [slide.id]: [...(prev[slide.id] || []), newStroke],
      }))
      setCurrentStroke([])
    }
  }

  const footerDate = globalFooter?.showDate ? new Date().toLocaleDateString('ja-JP') : null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
      onClick={!penMode && !laserPointer && pointerMode === 'none' && !qaMode ? goNext : undefined}
      onMouseMove={handleSlideMouseMove}
      onMouseUp={handleSlideMouseUp}
      style={{ cursor: laserPointer || pointerMode === 'laser' || pointerMode === 'spotlight' || pointerMode === 'arrow' ? 'none' : penMode ? 'crosshair' : showUI ? 'default' : 'none' }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(100%) } to { opacity: 1; transform: translateX(0) } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(-100%) } to { opacity: 1; transform: translateX(0) } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(100%) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideInDown { from { opacity: 0; transform: translateY(-100%) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slideOutLeft { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(-100%) } }
        @keyframes slideOutRight { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(100%) } }
        @keyframes slideOutUp { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-100%) } }
        @keyframes slideOutDown { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(100%) } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(1.2) } to { opacity: 1; transform: scale(1) } }
        @keyframes zoomOut { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.5) } }
        @keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3) } 50% { opacity: 1; transform: scale(1.05) } 70% { transform: scale(0.9) } 100% { opacity: 1; transform: scale(1) } }
        @keyframes pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.08) } }
        @keyframes bounceEmphasis { 0%, 100% { transform: translateY(0) } 30% { transform: translateY(-15px) } 60% { transform: translateY(-7px) } }
        @keyframes shake { 0%, 100% { transform: translateX(0) } 20% { transform: translateX(-8px) } 40% { transform: translateX(8px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(4px) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes wipeLeft { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
        @keyframes wipeUp { from { clip-path: inset(100% 0 0 0) } to { clip-path: inset(0 0 0 0) } }
        @keyframes flipIn { from { opacity: 0; transform: perspective(1000px) rotateY(-90deg) } to { opacity: 1; transform: perspective(1000px) rotateY(0) } }
        @keyframes cubeIn { from { opacity: 0; transform: perspective(1000px) rotateY(90deg) translateZ(50%) } to { opacity: 1; transform: perspective(1000px) rotateY(0) translateZ(0) } }
      `}</style>

      <div
        className="relative flex-1 flex items-center justify-center w-full"
        style={showNotes ? { maxHeight: '75vh' } : {}}
      >
        <div
          ref={slideRef}
          data-presentation-slide
          className="relative w-full h-full"
          style={{
            ...bgStyle,
            ...getTransitionStyle(),
            maxWidth: `${((window.innerHeight * (showNotes ? 0.75 : 1)) / 9) * 16}px`,
            maxHeight: `${(window.innerWidth / 16) * 9}px`,
            aspectRatio: '16/9',
            overflow: slideZoom.active ? 'hidden' : undefined,
            transform: slideZoom.active ? `scale(${slideZoom.scale})` : undefined,
            transformOrigin: slideZoom.active ? `${slideZoom.x}% ${slideZoom.y}%` : undefined,
          }}
          onMouseDown={handleSlideMouseDown}
        >
          {sortedElements.map(renderElement)}

          {/* Pen strokes */}
          {((slideStrokes[slide.id] || []).length > 0 || currentStroke.length > 0) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 99999 }}>
              {(slideStrokes[slide.id] || []).map((stroke, si) => (
                <polyline
                  key={si}
                  points={stroke.points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={stroke.opacity}
                />
              ))}
              {currentStroke.length > 1 && (
                <polyline
                  points={currentStroke.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke={penColor}
                  strokeWidth={penWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={penTool === 'highlighter' ? 0.3 : 1}
                />
              )}
            </svg>
          )}

          {/* Feature 1: Laser pointer trail */}
          {(laserPointer || pointerMode === 'laser') && laserTrail.length > 0 && (
            <>
              {laserTrail.map((pos, i) => {
                const opacity = (i + 1) / laserTrail.length
                const size = 6 + (opacity * 6)
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: pos.x - size / 2,
                      top: pos.y - size / 2,
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      background: '#ef4444',
                      opacity: opacity * 0.6,
                      boxShadow: `0 0 ${4 + opacity * 8}px ${opacity * 3}px rgba(239,68,68,${opacity * 0.4})`,
                      pointerEvents: 'none',
                      zIndex: 99998,
                    }}
                  />
                )
              })}
            </>
          )}

          {/* Legacy laser pointer (L key) */}
          {laserPointer && (
            <div
              style={{
                position: 'absolute',
                left: laserPos.x - 8,
                top: laserPos.y - 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ef4444 30%, transparent 70%)',
                boxShadow: '0 0 12px 4px rgba(239,68,68,0.6)',
                pointerEvents: 'none',
                zIndex: 99999,
              }}
            />
          )}

          {/* Feature 3: Magnifying glass */}
          {magnifyMode && (
            <div
              style={{
                position: 'absolute',
                left: magnifyPos.x - 100,
                top: magnifyPos.y - 100,
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.6)',
                boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 100000,
                background: 'transparent',
              }}
            >
              <div
                style={{
                  transform: 'scale(2)',
                  transformOrigin: `${magnifyPos.x}px ${magnifyPos.y}px`,
                  position: 'absolute',
                  left: -(magnifyPos.x * 2 - 100),
                  top: -(magnifyPos.y * 2 - 100),
                  width: slideRef.current?.offsetWidth || 0,
                  height: slideRef.current?.offsetHeight || 0,
                  background: theme.background,
                  backgroundImage: slide.backgroundImage ? `url(${slide.backgroundImage})` : undefined,
                  backgroundSize: slide.backgroundFit === 'stretch' ? '100% 100%' : slide.backgroundFit || 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            </div>
          )}
          {/* Feature 3: Magnification level indicator */}
          {magnifyMode && (
            <div
              style={{
                position: 'absolute',
                left: magnifyPos.x - 100,
                top: magnifyPos.y + 108,
                width: 200,
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 100000,
              }}
            >
              <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                2x
              </span>
            </div>
          )}

          {/* Pointer mode: laser */}
          {pointerMode === 'laser' && (
            <div
              style={{
                position: 'absolute',
                left: cursorPos.x - 8,
                top: cursorPos.y - 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ef4444 30%, transparent 70%)',
                boxShadow: '0 0 12px 4px rgba(239,68,68,0.6)',
                pointerEvents: 'none',
                zIndex: 99999,
              }}
            />
          )}

          {/* Pointer mode: spotlight */}
          {pointerMode === 'spotlight' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle 80px at ${cursorPos.x}px ${cursorPos.y}px, transparent 50%, rgba(0,0,0,0.7) 100%)`,
                pointerEvents: 'none',
                zIndex: 99999,
              }}
            />
          )}

          {/* Pointer mode: arrow */}
          {pointerMode === 'arrow' && (
            <svg
              style={{
                position: 'absolute',
                left: cursorPos.x - 4,
                top: cursorPos.y - 4,
                width: 40,
                height: 40,
                pointerEvents: 'none',
                zIndex: 99999,
                filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.5))',
              }}
              viewBox="0 0 40 40"
            >
              <polygon
                points="2,2 2,32 10,24 18,38 24,34 16,20 28,20"
                fill="#f97316"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </svg>
          )}

          {/* Morph transition overlay */}
          {morphActive && (
            <MorphTransition
              prevElements={morphPrevElements}
              nextElements={morphNextElements}
              duration={800}
              onComplete={() => {
                setMorphActive(false)
                setMorphPrevElements([])
                setMorphNextElements([])
              }}
            />
          )}

          {/* Auto-advance progress bar */}
          {slide?.autoAdvance && slide.autoAdvance > 0 && autoAdvanceProgress > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '3px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                zIndex: 99997,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${autoAdvanceProgress * 100}%`,
                  backgroundColor: 'rgba(99,102,241,0.8)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          )}

          {/* Footer */}
          {globalFooter && (globalFooter.showSlideNumber || globalFooter.showDate || globalFooter.text) && (
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-1.5"
              style={{ zIndex: 99998, color: theme!.bodyColor, fontSize: '0.7vw', opacity: 0.5 }}
            >
              <span>{globalFooter.text || ''}</span>
              <span>
                {footerDate && <span className="mr-4">{footerDate}</span>}
                {globalFooter.showSlideNumber && (
                  <span>
                    {visibleIndices.indexOf(currentIndex) + 1} / {visibleSlides.length}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {showNotes && (
        <div
          className="w-full bg-slate-900 border-t border-slate-700 text-slate-300 text-sm overflow-hidden"
          style={{ height: '25vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full">
            {/* Notes section */}
            <div className="flex-1 px-6 py-3 overflow-y-auto border-r border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">スピーカーノート</span>
                <span className="text-xs text-slate-400 font-mono">
                  スライド {visibleIndices.indexOf(currentIndex) + 1} / {visibleSlides.length}
                </span>
              </div>
              {slide.notes ? (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{slide.notes}</p>
              ) : (
                <p className="text-slate-600 italic text-xs">ノートはありません</p>
              )}
            </div>
            {/* Right panel: timer + next slide preview */}
            <div className="w-56 flex flex-col shrink-0">
              {/* Elapsed timer */}
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-[10px] text-slate-500 mb-1">経過時間</p>
                <p className="text-2xl font-mono text-white tabular-nums">
                  {String(Math.floor(elapsedTime / 3600)).padStart(2, '0')}:
                  {String(Math.floor((elapsedTime % 3600) / 60)).padStart(2, '0')}:
                  {String(elapsedTime % 60).padStart(2, '0')}
                </p>
              </div>
              {/* Next slide preview */}
              <div className="flex-1 px-4 py-3 overflow-hidden">
                <p className="text-[10px] text-slate-500 mb-1.5">次のスライド</p>
                {(() => {
                  const nextVisibleIdx = visibleIndices.find(i => i > currentIndex)
                  if (nextVisibleIdx === undefined) {
                    return <p className="text-slate-600 text-xs italic">最後のスライド</p>
                  }
                  const nextSlide = slides[nextVisibleIdx]
                  const nextThemeBase = SLIDE_THEMES[nextSlide.themeKey]
                  const nextTheme = nextSlide.customTheme ? { ...nextThemeBase, ...nextSlide.customTheme } : nextThemeBase
                  return (
                    <div
                      className="rounded border border-slate-700 overflow-hidden"
                      style={{
                        background: nextTheme.background,
                        aspectRatio: '16/9',
                        maxHeight: '100%',
                        position: 'relative',
                        fontSize: '3px',
                      }}
                    >
                      {nextSlide.elements.slice(0, 6).map(el => {
                        if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
                          const color = el.color || (el.type === 'title' ? nextTheme.titleColor : nextTheme.bodyColor)
                          return (
                            <div
                              key={el.id}
                              style={{
                                position: 'absolute',
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.w}%`,
                                color,
                                fontSize: `${el.fontSize * 0.013}vw`,
                                fontWeight: el.fontWeight,
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {el.content?.replace(/<[^>]*>/g, '').slice(0, 30)}
                            </div>
                          )
                        }
                        if (el.type === 'shape') {
                          return (
                            <div
                              key={el.id}
                              style={{
                                position: 'absolute',
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.w}%`,
                                height: `${el.h}%`,
                                backgroundColor: (el as any).fill || '#6366f1',
                                borderRadius: '2px',
                                opacity: 0.7,
                              }}
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
                                backgroundColor: 'rgba(100,100,100,0.3)',
                                borderRadius: '2px',
                              }}
                            />
                          )
                        }
                        return null
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail grid with slide previews */}
      {showThumbnails && (
        <div
          className="absolute inset-0 bg-black/90 z-[99998] flex flex-col items-center justify-center p-8 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-white/70 text-sm font-medium mb-4">スライドジャンプ &mdash; クリックで移動 / Escape で閉じる</h2>
          <div className="grid grid-cols-4 gap-3 max-w-4xl w-full">
            {slides.map((s, i) => {
              const t = SLIDE_THEMES[s.themeKey]
              const th = s.customTheme ? { ...t, ...s.customTheme } : t
              const isHidden = hiddenSet.has(s.id) || s.hidden
              const bgPreview: React.CSSProperties = {
                background: th.background,
                aspectRatio: '16/9',
                opacity: isHidden ? 0.35 : 1,
                position: 'relative',
                overflow: 'hidden',
              }
              if (s.backgroundImage) {
                bgPreview.backgroundImage = `url(${s.backgroundImage})`
                bgPreview.backgroundSize = s.backgroundFit === 'stretch' ? '100% 100%' : s.backgroundFit || 'cover'
                bgPreview.backgroundPosition = 'center'
                bgPreview.backgroundRepeat = 'no-repeat'
              }
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentIndex(i)
                    setShowThumbnails(false)
                  }}
                  className={`relative rounded overflow-hidden border-2 transition-colors ${i === currentIndex ? 'border-indigo-500' : 'border-transparent hover:border-slate-500'}`}
                  style={bgPreview}
                >
                  {/* Thumbnail element previews */}
                  {s.elements.slice(0, 8).map(el => {
                    if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
                      const color = el.color || (el.type === 'title' ? th.titleColor : th.bodyColor)
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            color,
                            fontSize: `${Math.max(el.fontSize * 0.012, 0.3)}vw`,
                            fontWeight: el.fontWeight,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                          }}
                        >
                          {el.content?.replace(/<[^>]*>/g, '').slice(0, 40)}
                        </div>
                      )
                    }
                    if (el.type === 'shape') {
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            backgroundColor: (el as SlideShapeElement).fill || '#6366f1',
                            borderRadius: (el as SlideShapeElement).shape === 'circle' ? '50%' : '2px',
                            opacity: 0.7,
                          }}
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
                            backgroundImage: `url(${el.src})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '2px',
                          }}
                        />
                      )
                    }
                    if (el.type === 'chart') {
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            backgroundColor: 'rgba(99,102,241,0.15)',
                            borderRadius: '2px',
                            border: '1px solid rgba(99,102,241,0.3)',
                          }}
                        />
                      )
                    }
                    return null
                  })}
                  {isHidden && (
                    <span className="absolute top-1 left-2 bg-black/50 text-white/70 text-[0.55rem] px-1.5 py-0.5 rounded">
                      非表示
                    </span>
                  )}
                  <span className="absolute bottom-1 right-2 text-white/50 text-xs font-mono">{i + 1}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Slide counter (visible slides only) */}
      <div
        className="absolute bottom-4 right-6 text-white/60 text-sm font-mono px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm transition-opacity duration-500"
        style={{ opacity: showUI ? 1 : 0, bottom: showNotes ? 'calc(25vh + 16px)' : '16px' }}
      >
        {visibleIndices.indexOf(currentIndex) + 1} / {visibleSlides.length}
      </div>

      {/* Pen color picker toolbar */}
      {penMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 bg-black/80 rounded-full px-4 py-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setPenTool('pen')} className={penTool === 'pen' ? 'text-white' : 'text-slate-400'} title="ペン">🖊</button>
          <button onClick={() => setPenTool('highlighter')} className={penTool === 'highlighter' ? 'text-yellow-300' : 'text-slate-400'} title="蛍光ペン">🖍</button>
          <button onClick={() => setPenTool('eraser')} className={penTool === 'eraser' ? 'text-white' : 'text-slate-400'} title="消しゴム">⌫</button>
          <div className="w-px h-4 bg-slate-600" />
          {['#ef4444','#3b82f6','#22c55e','#000000','#ffffff','#eab308','#a855f7','#f97316'].map(c => (
            <button key={c} onClick={() => setPenColor(c)} className={`w-5 h-5 rounded-full border-2 ${penColor === c ? 'border-white scale-125' : 'border-transparent'}`} style={{ background: c }} />
          ))}
          <div className="w-px h-4 bg-slate-600" />
          <input type="range" min={1} max={10} value={penWidth} onChange={e => setPenWidth(Number(e.target.value))} className="w-16 accent-white" />
          <button onClick={() => setSlideStrokes(prev => ({ ...prev, [slide.id]: [] }))} className="text-slate-400 hover:text-white text-xs">クリア</button>
        </div>
      )}

      {/* Pointer mode label toast */}
      {pointerModeLabel && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] bg-black/70 text-white text-lg font-semibold px-6 py-3 rounded-xl backdrop-blur-sm pointer-events-none">
          {pointerModeLabel}
        </div>
      )}

      {/* Q&A timer pill (bottom-right corner) */}
      {qaMode && (
        <div
          className="absolute bottom-20 right-6 z-[10002] flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-green-400 text-sm font-semibold">Q&A</span>
          <span className="text-white text-lg font-mono tabular-nums">
            {String(Math.floor(qaElapsed / 60)).padStart(2, '0')}:{String(qaElapsed % 60).padStart(2, '0')}
          </span>
          <span className="text-white/40 text-xs ml-1">Q で停止</span>
        </div>
      )}

      {/* Tool indicators */}
      <div
        className="absolute bottom-4 left-6 text-white/40 text-xs transition-opacity duration-500 flex items-center gap-3"
        style={{ opacity: showUI ? 1 : 0, bottom: showNotes ? 'calc(25vh + 16px)' : '16px' }}
      >
        <span>← → 移動</span>
        <span>N ノート</span>
        <span className={laserPointer ? 'text-red-400' : ''}>L レーザー</span>
        <span className={pointerMode !== 'none' ? 'text-orange-400' : ''}>P ポインター</span>
        <span className={slideZoom.active ? 'text-blue-400' : ''}>Z ズーム</span>
        <span>G 一覧</span>
        <span className={qaMode ? 'text-green-400' : ''}>Q Q&A</span>
        <span>ESC 終了</span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onExit()
        }}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-all text-xl backdrop-blur-sm"
        style={{ opacity: showUI ? 1 : 0 }}
      >
        ✕
      </button>

      {/* Feature 2: Keyboard shortcuts help overlay */}
      {showShortcutsHelp && (
        <div
          className="absolute inset-0 z-[10003] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation()
            setShowShortcutsHelp(false)
          }}
        >
          <div className="bg-slate-900/95 rounded-2xl p-8 max-w-xl w-full mx-4 border border-slate-700 shadow-2xl">
            <h2 className="text-white text-xl font-bold mb-6 text-center">キーボードショートカット</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                { keys: '← → / Space', desc: '前/次のスライド' },
                { keys: 'B', desc: '画面を黒くする' },
                { keys: 'W', desc: '画面を白くする' },
                { keys: 'L', desc: 'レーザーポインタ' },
                { keys: 'P', desc: 'ポインタモード切替' },
                { keys: 'G', desc: 'スライドジャンプ' },
                { keys: 'T', desc: 'タイマー表示' },
                { keys: 'N', desc: 'ノート表示' },
                { keys: 'Q', desc: 'Q&Aタイマー' },
                { keys: 'Z', desc: '拡大鏡' },
                { keys: 'S', desc: 'スクリーンショット' },
                { keys: 'Esc', desc: 'プレゼン終了' },
                { keys: '?', desc: 'このヘルプ' },
              ].map(({ keys, desc }) => (
                <div key={keys} className="flex items-center gap-3">
                  <kbd className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 bg-slate-800 border border-slate-600 rounded text-slate-300 text-xs font-mono whitespace-nowrap">
                    {keys}
                  </kbd>
                  <span className="text-slate-400 text-sm">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-slate-600 text-xs text-center mt-6">
              任意のキーまたはクリックで閉じる
            </p>
          </div>
        </div>
      )}

      {/* Feature 5: Screenshot flash */}
      {screenshotFlash && (
        <div
          className="absolute inset-0 z-[10004] pointer-events-none flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.3)',
            animation: 'screenshotFlash 0.4s ease-out forwards',
          }}
        >
          <span className="text-6xl" style={{ animation: 'screenshotEmoji 0.4s ease-out forwards' }}>
            {'📸'}
          </span>
        </div>
      )}

      {/* Feature 3: Magnify mode cursor indicator */}
      {magnifyMode && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10001] bg-blue-600/80 text-white text-xs font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm pointer-events-none"
        >
          拡大鏡 ON (Z で解除)
        </div>
      )}
    </div>
  )
}
