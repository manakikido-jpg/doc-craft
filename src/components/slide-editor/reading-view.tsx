'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { sanitizeHtml } from '@/lib/sanitize'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  slides: Slide[]
  startIndex: number
  onClose: () => void
  globalFooter?: { text?: string; showDate?: boolean; showSlideNumber?: boolean }
}

export default function ReadingView({ slides, startIndex, onClose, globalFooter }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)

  const slide = slides[currentIndex]
  const baseTheme = slide ? SLIDE_THEMES[slide.themeKey] : null
  const theme = slide && baseTheme && slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, slides.length - 1))
  }, [slides.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }, [])

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
          onClose()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onClose])

  if (!slide || !theme) return null

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

  function getMaskClipPath(mask?: string): string | undefined {
    switch (mask) {
      case 'circle': return 'circle(50% at 50% 50%)'
      case 'triangle': return 'polygon(50% 0%, 0% 100%, 100% 100%)'
      case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
      case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
      case 'rounded-rect': return 'inset(0 round 15%)'
      default: return undefined
    }
  }

  function getColorFilterCSS(filter?: string): string {
    switch (filter) {
      case 'grayscale': return 'grayscale(100%)'
      case 'sepia': return 'sepia(100%)'
      case 'high-contrast': return 'contrast(150%) saturate(130%)'
      case 'washout': return 'brightness(130%) opacity(70%)'
      case 'cool': return 'hue-rotate(180deg) saturate(80%)'
      case 'warm': return 'sepia(30%) saturate(140%)'
      case 'vintage': return 'sepia(40%) contrast(90%) brightness(110%)'
      case 'duotone': return 'grayscale(100%) sepia(100%) hue-rotate(180deg)'
      default: return ''
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

  function renderElement(el: SlideElement) {
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
              <marker id={`rv-arrow-${conn.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
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
            markerEnd={conn.arrowHead ? `url(#rv-arrow-${conn.id})` : undefined}
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
          }}
        >
          <table className="w-full h-full border-collapse" style={{ fontSize: '1.2vw' }}>
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
      const colorFilterVal = getColorFilterCSS(el.colorFilter)
      if (colorFilterVal) imgFilters.push(colorFilterVal)
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
            clipPath: getMaskClipPath(el.maskShape),
            ...filterStyle,
          }}
        >
          {el.crop && (el.crop.w < 100 || el.crop.h < 100 || el.crop.x > 0 || el.crop.y > 0) ? (
            <div style={{ overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={el.src}
                alt={el.alt || ''}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: `${-el.crop.x * (100 / el.crop.w)}%`,
                  top: `${-el.crop.y * (100 / el.crop.h)}%`,
                  width: `${10000 / el.crop.w}%`,
                  height: `${10000 / el.crop.h}%`,
                  objectFit: 'cover',
                  filter: imgFilters.length ? imgFilters.join(' ') : undefined,
                }}
              />
            </div>
          ) : (
            <img
              src={el.src}
              alt={el.alt || ''}
              className="w-full h-full object-contain"
              draggable={false}
              style={{ filter: imgFilters.length ? imgFilters.join(' ') : undefined }}
            />
          )}
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
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              <line
                x1="0" y1="50" x2="100" y2="50"
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
      const rawSvgPath = shapeMap[shapeEl.shape] || shapeMap.rect
      const svgPath = rawSvgPath.replace('__CORNER_RADIUS__', String(shapeEl.cornerRadius ?? 4))
      const gradId = `rv-grad-${el.id}`
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
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {shapeEl.gradientFill && (
              <defs>
                {shapeEl.gradientType === 'radial' ? (
                  <radialGradient id={gradId}>
                    <stop offset="0%" stopColor={shapeEl.gradientFill.color1} />
                    <stop offset="100%" stopColor={shapeEl.gradientFill.color2} />
                  </radialGradient>
                ) : (
                  <linearGradient id={gradId} gradientTransform={`rotate(${shapeEl.gradientFill.angle})`}>
                    <stop offset="0%" stopColor={shapeEl.gradientFill.color1} />
                    <stop offset="100%" stopColor={shapeEl.gradientFill.color2} />
                  </linearGradient>
                )}
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
          }}
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
          }}
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
          }}
        >
          <ChartRenderer chart={chartEl} />
        </div>
      )
    }

    // Text element
    const color = el.color || (el.type === 'title' ? theme!.titleColor : theme!.bodyColor)
    const bullet = el.bulletType
    const bulletChar =
      bullet === 'disc' ? '● ' :
      bullet === 'circle' ? '○ ' :
      bullet === 'square' ? '■ ' :
      bullet === 'decimal' ? '1. ' :
      bullet === 'alpha' ? 'a. ' :
      bullet === 'roman' ? 'i. ' : ''
    const textContent = bulletChar + (el.content || (el.type === 'title' ? 'タイトル' : ''))
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
          textAlign: el.align as React.CSSProperties['textAlign'],
          lineHeight: el.lineHeight ?? 1.3,
          letterSpacing: el.letterSpacing ? `${el.letterSpacing}em` : undefined,
          textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          writingMode: el.writingMode === 'vertical' ? 'vertical-rl' : undefined,
          zIndex: el.zIndex ?? 0,
          transform,
          ...filterStyle,
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent) }}
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

  const footerDate = globalFooter?.showDate ? new Date().toLocaleDateString('ja-JP') : null

  return (
    <div className="fixed inset-0 z-[9998] bg-slate-950 flex flex-col items-center justify-center">
      {/* Slide area */}
      <div className="flex-1 flex items-center justify-center w-full px-16 py-8 relative">
        {/* Left nav arrow */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Slide */}
        <div
          className="relative w-full h-full"
          style={{
            ...bgStyle,
            maxWidth: '900px',
            maxHeight: '506px',
            aspectRatio: '16/9',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
          }}
        >
          {sortedElements.map(renderElement)}

          {/* Footer */}
          {globalFooter && (globalFooter.showSlideNumber || globalFooter.showDate || globalFooter.text) && (
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-1.5"
              style={{ zIndex: 99998, color: theme.bodyColor, fontSize: '0.7vw', opacity: 0.5 }}
            >
              <span>{globalFooter.text || ''}</span>
              <span>
                {footerDate && <span className="mr-4">{footerDate}</span>}
                {globalFooter.showSlideNumber && (
                  <span>{currentIndex + 1} / {slides.length}</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Right nav arrow */}
        <button
          onClick={goNext}
          disabled={currentIndex === slides.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Bottom bar */}
      <div className="w-full px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm font-mono">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <button
            onClick={goNext}
            disabled={currentIndex === slides.length - 1}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={14} />
          閉じる
        </button>
      </div>
    </div>
  )
}
