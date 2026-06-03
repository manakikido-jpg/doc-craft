'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SlideElement } from '@/types'

interface Props {
  prevElements: SlideElement[]
  nextElements: SlideElement[]
  duration?: number
  onComplete: () => void
}

interface ElementRect {
  id: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  opacity?: number
}

function getElementRect(el: SlideElement): ElementRect {
  if (el.type === 'connector') {
    // Connectors don't have standard x/y/w/h — use fromPoint/toPoint bounding box
    const minX = Math.min(el.fromPoint.x, el.toPoint.x)
    const minY = Math.min(el.fromPoint.y, el.toPoint.y)
    const maxX = Math.max(el.fromPoint.x, el.toPoint.x)
    const maxY = Math.max(el.fromPoint.y, el.toPoint.y)
    return {
      id: el.id,
      x: minX,
      y: minY,
      w: maxX - minX || 1,
      h: maxY - minY || 1,
      rotation: el.rotation,
      opacity: el.opacity,
    }
  }
  return {
    id: el.id,
    x: el.x,
    y: el.y,
    w: el.w,
    h: el.h,
    rotation: el.rotation,
    opacity: el.opacity,
  }
}

function getElementPreview(el: SlideElement): { bg: string; border: string; label: string } {
  switch (el.type) {
    case 'title':
    case 'subtitle':
    case 'body':
    case 'label':
      return { bg: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', label: el.content.slice(0, 20) }
    case 'image':
      return { bg: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.5)', label: 'IMG' }
    case 'shape':
      return { bg: el.fill || 'rgba(249,115,22,0.3)', border: '1px solid rgba(249,115,22,0.5)', label: '' }
    case 'chart':
      return { bg: 'rgba(236,72,153,0.3)', border: '1px solid rgba(236,72,153,0.5)', label: 'CHART' }
    case 'table':
      return { bg: 'rgba(6,182,212,0.3)', border: '1px solid rgba(6,182,212,0.5)', label: 'TABLE' }
    default:
      return { bg: 'rgba(148,163,184,0.2)', border: '1px solid rgba(148,163,184,0.3)', label: '' }
  }
}

export default function MorphTransition({ prevElements, nextElements, duration = 800, onComplete }: Props) {
  const [phase, setPhase] = useState<'start' | 'end'>('start')
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevMap = new Map(prevElements.map(el => [el.id, el]))
  const nextMap = new Map(nextElements.map(el => [el.id, el]))

  // Elements matched by ID (present in both slides)
  const matchedIds = prevElements.filter(el => nextMap.has(el.id)).map(el => el.id)
  // Elements only in prev (fade out)
  const exitIds = prevElements.filter(el => !nextMap.has(el.id)).map(el => el.id)
  // Elements only in next (fade in)
  const enterIds = nextElements.filter(el => !prevMap.has(el.id)).map(el => el.id)

  const startAnimation = useCallback(() => {
    // Use requestAnimationFrame to ensure the initial styles are painted before transitioning
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase('end')
      })
    })
  }, [])

  useEffect(() => {
    startAnimation()
    timerRef.current = setTimeout(() => {
      onComplete()
    }, duration + 50) // small buffer for safety

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [duration, onComplete, startAnimation])

  const transitionStyle = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`

  // The container covers the entire slide area
  // We render placeholder boxes for each element and animate them
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
      style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
    >
      {/* Matched elements: morph from prev position/size to next position/size */}
      {matchedIds.map(id => {
        const prevEl = prevMap.get(id)!
        const nextEl = nextMap.get(id)!
        const prevRect = getElementRect(prevEl)
        const nextRect = getElementRect(nextEl)
        const preview = getElementPreview(phase === 'start' ? prevEl : nextEl)

        const rect = phase === 'start' ? prevRect : nextRect
        const prevOpacity = prevRect.opacity ?? 1
        const nextOpacity = nextRect.opacity ?? 1
        const currentOpacity = phase === 'start' ? prevOpacity : nextOpacity
        const rotation = phase === 'start' ? (prevRect.rotation ?? 0) : (nextRect.rotation ?? 0)

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
              transform: `rotate(${rotation}deg)`,
              opacity: currentOpacity,
              transition: transitionStyle,
              backgroundColor: preview.bg,
              border: preview.border,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.7)',
              overflow: 'hidden',
            }}
          >
            {preview.label}
          </div>
        )
      })}

      {/* Exit elements: fade out */}
      {exitIds.map(id => {
        const el = prevMap.get(id)!
        const rect = getElementRect(el)
        const preview = getElementPreview(el)

        return (
          <div
            key={`exit-${id}`}
            style={{
              position: 'absolute',
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
              transform: `rotate(${rect.rotation ?? 0}deg)`,
              opacity: phase === 'start' ? (rect.opacity ?? 1) : 0,
              transition: transitionStyle,
              backgroundColor: preview.bg,
              border: preview.border,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.7)',
              overflow: 'hidden',
            }}
          >
            {preview.label}
          </div>
        )
      })}

      {/* Enter elements: fade in */}
      {enterIds.map(id => {
        const el = nextMap.get(id)!
        const rect = getElementRect(el)
        const preview = getElementPreview(el)

        return (
          <div
            key={`enter-${id}`}
            style={{
              position: 'absolute',
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
              transform: `rotate(${rect.rotation ?? 0}deg)`,
              opacity: phase === 'start' ? 0 : (rect.opacity ?? 1),
              transition: transitionStyle,
              backgroundColor: preview.bg,
              border: preview.border,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.7)',
              overflow: 'hidden',
            }}
          >
            {preview.label}
          </div>
        )
      })}
    </div>
  )
}
