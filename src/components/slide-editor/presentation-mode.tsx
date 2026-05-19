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
import { SLIDE_THEMES } from '@/lib/themes'

interface Props {
  slides: Slide[]
  startIndex: number
  onExit: () => void
  globalFooter?: { text?: string; showDate?: boolean; showSlideNumber?: boolean }
}

type TransitionState = 'idle' | 'exit' | 'enter'

export default function PresentationMode({ slides, startIndex, onExit, globalFooter }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [transState, setTransState] = useState<TransitionState>('idle')
  const [showUI, setShowUI] = useState(true)
  const [showNotes, setShowNotes] = useState(false)
  const [laserPointer, setLaserPointer] = useState(false)
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 })
  const [penMode, setPenMode] = useState(false)
  const [penStrokes, setPenStrokes] = useState<{ x: number; y: number }[][]>([])
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [showThumbnails, setShowThumbnails] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRef = useRef<HTMLDivElement>(null)

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

  function resetHideTimer() {
    setShowUI(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowUI(false), 2500)
  }

  function navigateTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === currentIndex) return
    setTransState('exit')
    setTimeout(() => {
      setCurrentIndex(nextIndex)
      setTransState('enter')
      setTimeout(() => setTransState('idle'), 300)
    }, 200)
    resetHideTimer()
  }

  const goNext = useCallback(() => {
    navigateTo(currentIndex + 1)
  }, [currentIndex, slides.length])
  const goPrev = useCallback(() => {
    navigateTo(currentIndex - 1)
  }, [currentIndex])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
          if (showThumbnails) {
            setShowThumbnails(false)
            break
          }
          e.preventDefault()
          onExit()
          break
        case 'n':
          setShowNotes((v) => !v)
          break
        case 'l':
        case 'L':
          setLaserPointer((v) => !v)
          setPenMode(false)
          break
        case 'p':
        case 'P':
          setPenMode((v) => !v)
          setLaserPointer(false)
          break
        case 'g':
        case 'G':
          setShowThumbnails((v) => !v)
          break
        case 'c':
        case 'C':
          setPenStrokes([])
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onExit])

  if (!slide || !theme) return null

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

  function getElementAnimationStyle(el: SlideElement): React.CSSProperties {
    if (!('animation' in el) || !el.animation || transState !== 'idle') return {}
    const { type, delay = 0, duration = 0.5 } = el.animation
    const animMap: Record<string, string> = {
      fadeIn: 'fadeIn',
      slideInLeft: 'slideInLeft',
      slideInRight: 'slideInRight',
      slideInUp: 'slideInUp',
      slideInDown: 'slideInDown',
      zoomIn: 'zoomIn',
      bounceIn: 'bounceIn',
      fadeOut: 'fadeOut',
      slideOutLeft: 'slideOutLeft',
      slideOutRight: 'slideOutRight',
      slideOutUp: 'slideOutUp',
      slideOutDown: 'slideOutDown',
      zoomOut: 'zoomOut',
      pulse: 'pulse',
      bounce: 'bounceEmphasis',
      shake: 'shake',
      spin: 'spin',
    }
    const isEntrance = !type.includes('Out') && !['pulse', 'bounce', 'shake', 'spin'].includes(type)
    return {
      opacity: isEntrance ? 0 : 1,
      animation: `${animMap[type] || 'fadeIn'} ${duration}s ${delay}s forwards`,
    }
  }

  function getTransform(el: SlideElement): string {
    const parts: string[] = []
    if ('rotation' in el && el.rotation) parts.push(`rotate(${el.rotation}deg)`)
    if ('flipH' in el && el.flipH) parts.push('scaleX(-1)')
    if ('flipV' in el && el.flipV) parts.push('scaleY(-1)')
    return parts.join(' ') || 'none'
  }

  function getFilterStyle(el: SlideElement): React.CSSProperties {
    const style: React.CSSProperties = {}
    if ('opacity' in el && el.opacity != null && el.opacity < 100) style.opacity = el.opacity / 100
    if ('shadow' in el && el.shadow)
      style.filter = `drop-shadow(${el.shadow.offsetX}px ${el.shadow.offsetY}px ${el.shadow.blur}px ${el.shadow.color})`
    return style
  }

  const shapeMap: Record<string, string> = {
    rect: '<rect x="0" y="0" width="100" height="100" rx="4" />',
    circle: '<ellipse cx="50" cy="50" rx="50" ry="50" />',
    triangle: '<polygon points="50,5 95,95 5,95" />',
    'arrow-right': '<polygon points="0,25 65,25 65,5 100,50 65,95 65,75 0,75" />',
    'arrow-left': '<polygon points="100,25 35,25 35,5 0,50 35,95 35,75 100,75" />',
    'arrow-up': '<polygon points="25,100 25,35 5,35 50,0 95,35 75,35 75,100" />',
    'arrow-down': '<polygon points="25,0 25,65 5,65 50,100 95,65 75,65 75,0" />',
    star: '<polygon points="50,2 63,38 98,38 70,60 80,95 50,74 20,95 30,60 2,38 37,38" />',
    diamond: '<polygon points="50,2 98,50 50,98 2,50" />',
    hexagon: '<polygon points="25,6 75,6 100,50 75,94 25,94 0,50" />',
    pentagon: '<polygon points="50,2 97,38 80,95 20,95 3,38" />',
    heart: '<path d="M50,88 C25,65 2,45 2,28 A22,22,0,0,1,50,20 A22,22,0,0,1,98,28 C98,45 75,65 50,88Z" />',
    callout: '<path d="M5,5 H95 V65 H45 L25,90 L30,65 H5 Z" />',
    cross: '<polygon points="35,0 65,0 65,35 100,35 100,65 65,65 65,100 35,100 35,65 0,65 0,35 35,35" />',
  }

  function renderElement(el: SlideElement) {
    const animStyle = getElementAnimationStyle(el)
    const transform = getTransform(el)
    const filterStyle = getFilterStyle(el)

    if (el.type === 'connector') {
      const conn = el as SlideConnectorElement
      return (
        <svg
          key={el.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: conn.zIndex ?? 0,
            opacity: conn.opacity != null ? conn.opacity / 100 : 1,
          }}
        >
          <defs>
            {conn.arrowHead && (
              <marker id={`pres-arrow-${conn.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={conn.stroke} />
              </marker>
            )}
          </defs>
          <line
            x1={`${conn.fromPoint.x}%`}
            y1={`${conn.fromPoint.y}%`}
            x2={`${conn.toPoint.x}%`}
            y2={`${conn.toPoint.y}%`}
            stroke={conn.stroke}
            strokeWidth={conn.strokeWidth || 2}
            markerEnd={conn.arrowHead ? `url(#pres-arrow-${conn.id})` : undefined}
          />
        </svg>
      )
    }

    if (el.type === 'table') {
      const tableEl = el as SlideTableElement
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform,
            ...filterStyle,
            ...animStyle,
          }}
        >
          <table className="w-full h-full border-collapse" style={{ fontSize: `${1.2}vw` }}>
            <tbody>
              {tableEl.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`border border-white/20 px-2 py-1 ${ri === 0 && tableEl.headerRow ? 'font-semibold bg-white/10' : ''}`}
                      style={{ color: theme!.bodyColor }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (el.type === 'image') {
      const imgFilters: string[] = []
      if (el.brightness != null && el.brightness !== 100) imgFilters.push(`brightness(${el.brightness}%)`)
      if (el.contrast != null && el.contrast !== 100) imgFilters.push(`contrast(${el.contrast}%)`)
      if (el.blur) imgFilters.push(`blur(${el.blur}px)`)
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform,
            ...filterStyle,
            ...animStyle,
          }}
        >
          <img
            src={el.src}
            alt={el.alt || ''}
            className="w-full h-full object-contain"
            draggable={false}
            style={{ filter: imgFilters.length ? imgFilters.join(' ') : undefined }}
          />
        </div>
      )
    }

    if (el.type === 'shape') {
      const shapeEl = el as SlideShapeElement
      if (shapeEl.shape === 'line') {
        return (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.w}%`,
              height: `${el.h}%`,
              zIndex: el.zIndex ?? 0,
              transform,
              ...filterStyle,
              ...animStyle,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <line
                x1="0"
                y1="50"
                x2="100"
                y2="50"
                stroke={shapeEl.fill}
                strokeWidth={shapeEl.strokeWidth || 4}
                strokeDasharray={
                  shapeEl.strokeDash === 'dashed' ? '8,4' : shapeEl.strokeDash === 'dotted' ? '2,3' : undefined
                }
              />
            </svg>
          </div>
        )
      }
      const svgPath = shapeMap[shapeEl.shape] || shapeMap.rect
      const gradId = `pres-grad-${el.id}`
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform,
            ...filterStyle,
            ...animStyle,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {shapeEl.gradientFill && (
              <defs>
                <linearGradient id={gradId} gradientTransform={`rotate(${shapeEl.gradientFill.angle})`}>
                  <stop offset="0%" stopColor={shapeEl.gradientFill.color1} />
                  <stop offset="100%" stopColor={shapeEl.gradientFill.color2} />
                </linearGradient>
              </defs>
            )}
            <g
              fill={shapeEl.gradientFill ? `url(#${gradId})` : shapeEl.fill}
              stroke={shapeEl.stroke || 'none'}
              strokeWidth={shapeEl.strokeWidth || 0}
              strokeDasharray={
                shapeEl.strokeDash === 'dashed' ? '8,4' : shapeEl.strokeDash === 'dotted' ? '2,3' : undefined
              }
              dangerouslySetInnerHTML={{ __html: svgPath }}
            />
          </svg>
          {shapeEl.textContent && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: shapeEl.textColor || '#fff',
                fontSize: shapeEl.textFontSize ? `${shapeEl.textFontSize * 0.065}vw` : '1.2vw',
                textAlign: 'center',
                padding: '8%',
                wordBreak: 'break-word',
              }}
            >
              {shapeEl.textContent}
            </div>
          )}
        </div>
      )
    }

    if (el.type === 'video') {
      const vidEl = el as SlideVideoElement
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform,
            ...filterStyle,
            ...animStyle,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {vidEl.embedType === 'youtube' ? (
            <iframe
              src={vidEl.src}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ border: 'none' }}
            />
          ) : (
            <video src={vidEl.src} className="w-full h-full" controls autoPlay={vidEl.autoplay} />
          )}
        </div>
      )
    }

    if (el.type === 'audio') {
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            ...filterStyle,
            ...animStyle,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <audio src={el.src} controls className="w-full" />
        </div>
      )
    }

    if (el.type === 'chart') {
      const chartEl = el as SlideChartElement
      return (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: `${el.w}%`,
            height: `${el.h}%`,
            zIndex: el.zIndex ?? 0,
            transform,
            ...filterStyle,
            ...animStyle,
          }}
        >
          <ChartRenderer chart={chartEl} />
        </div>
      )
    }

    // Text element
    const color = el.color || (el.type === 'title' ? theme!.titleColor : theme!.bodyColor)
    return (
      <div
        key={el.id}
        style={{
          position: 'absolute',
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          color,
          fontSize: `${el.fontSize * 0.065}vw`,
          fontWeight: el.fontWeight,
          fontFamily: el.fontFamily || 'inherit',
          textAlign: el.align as 'left' | 'center' | 'right',
          lineHeight: el.lineHeight ?? 1.3,
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
          textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          zIndex: el.zIndex ?? 0,
          transform,
          ...filterStyle,
          ...animStyle,
        }}
        dangerouslySetInnerHTML={{ __html: el.content || (el.type === 'title' ? 'タイトル' : '') }}
      />
    )
  }

  const sortedElements = [...slide.elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

  const bgStyle: React.CSSProperties = { background: theme.background }
  if (slide.backgroundImage) {
    bgStyle.backgroundImage = `url(${slide.backgroundImage})`
    bgStyle.backgroundSize = slide.backgroundFit === 'stretch' ? '100% 100%' : slide.backgroundFit || 'cover'
    bgStyle.backgroundPosition = 'center'
    bgStyle.backgroundRepeat = 'no-repeat'
  }

  function handleSlideMouseMove(e: React.MouseEvent) {
    if (laserPointer && slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect()
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
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
      const rect = slideRef.current.getBoundingClientRect()
      setCurrentStroke([
        { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 },
      ])
    }
  }

  function handleSlideMouseUp() {
    if (penMode && currentStroke.length > 1) {
      setPenStrokes((prev) => [...prev, currentStroke])
      setCurrentStroke([])
    }
  }

  const footerDate = globalFooter?.showDate ? new Date().toLocaleDateString('ja-JP') : null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
      onClick={!penMode && !laserPointer ? goNext : undefined}
      onMouseMove={handleSlideMouseMove}
      onMouseUp={handleSlideMouseUp}
      style={{ cursor: laserPointer ? 'none' : penMode ? 'crosshair' : showUI ? 'default' : 'none' }}
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
          className="relative w-full h-full"
          style={{
            ...bgStyle,
            ...getTransitionStyle(),
            maxWidth: `${((window.innerHeight * (showNotes ? 0.75 : 1)) / 9) * 16}px`,
            maxHeight: `${(window.innerWidth / 16) * 9}px`,
            aspectRatio: '16/9',
          }}
          onMouseDown={handleSlideMouseDown}
        >
          {sortedElements.map(renderElement)}

          {/* Pen strokes */}
          {(penStrokes.length > 0 || currentStroke.length > 0) && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 99999 }}>
              {penStrokes.map((stroke, si) => (
                <polyline
                  key={si}
                  points={stroke.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentStroke.length > 1 && (
                <polyline
                  points={currentStroke.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          )}

          {/* Laser pointer */}
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
                    {currentIndex + 1} / {slides.length}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {showNotes && slide.notes && (
        <div
          className="w-full bg-slate-900 border-t border-slate-700 px-8 py-4 text-slate-300 text-sm overflow-y-auto"
          style={{ height: '25vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-slate-500 mb-2 font-medium">📝 スピーカーノート</p>
          <p className="whitespace-pre-wrap leading-relaxed">{slide.notes}</p>
        </div>
      )}

      {/* Thumbnail grid */}
      {showThumbnails && (
        <div
          className="absolute inset-0 bg-black/90 z-[99998] flex items-center justify-center p-8 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-3 max-w-4xl w-full">
            {slides.map((s, i) => {
              const t = SLIDE_THEMES[s.themeKey]
              const th = s.customTheme ? { ...t, ...s.customTheme } : t
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentIndex(i)
                    setShowThumbnails(false)
                  }}
                  className={`relative rounded overflow-hidden border-2 transition-colors ${i === currentIndex ? 'border-indigo-500' : 'border-transparent hover:border-slate-500'}`}
                  style={{ background: th.background, aspectRatio: '16/9' }}
                >
                  <span className="absolute bottom-1 right-2 text-white/50 text-xs font-mono">{i + 1}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Slide counter */}
      <div
        className="absolute bottom-4 right-6 text-white/60 text-sm font-mono px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm transition-opacity duration-500"
        style={{ opacity: showUI ? 1 : 0, bottom: showNotes ? 'calc(25vh + 16px)' : '16px' }}
      >
        {currentIndex + 1} / {slides.length}
      </div>

      {/* Tool indicators */}
      <div
        className="absolute bottom-4 left-6 text-white/40 text-xs transition-opacity duration-500 flex items-center gap-3"
        style={{ opacity: showUI ? 1 : 0, bottom: showNotes ? 'calc(25vh + 16px)' : '16px' }}
      >
        <span>← → 移動</span>
        <span>N ノート</span>
        <span className={laserPointer ? 'text-red-400' : ''}>L レーザー</span>
        <span className={penMode ? 'text-red-400' : ''}>P ペン</span>
        <span>G 一覧</span>
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
    </div>
  )
}
