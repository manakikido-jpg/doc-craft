'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { Slide } from '@/types'
import SlideThumbnail from './slide-thumbnail'

interface Props {
  slides: Slide[]
  activeSlideId: string
  onSelect: (id: string) => void
  onContextMenu?: (id: string, e: React.MouseEvent) => void
  itemHeight?: number
  containerHeight: number
}

const OVERSCAN = 3

export default function VirtualizedSlideList({
  slides,
  activeSlideId,
  onSelect,
  onContextMenu,
  itemHeight = 80,
  containerHeight,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const totalHeight = slides.length * itemHeight

  // Calculate visible range with overscan
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(slides.length - 1, start + visibleCount + OVERSCAN * 2)
    return { startIndex: start, endIndex: end }
  }, [scrollTop, itemHeight, containerHeight, slides.length])

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop)
    }
  }, [])

  // Auto-scroll active slide into view
  useEffect(() => {
    if (!scrollRef.current) return
    const activeIndex = slides.findIndex((s) => s.id === activeSlideId)
    if (activeIndex < 0) return

    const itemTop = activeIndex * itemHeight
    const itemBottom = itemTop + itemHeight
    const viewTop = scrollRef.current.scrollTop
    const viewBottom = viewTop + containerHeight

    if (itemTop < viewTop) {
      scrollRef.current.scrollTo({ top: itemTop, behavior: 'smooth' })
    } else if (itemBottom > viewBottom) {
      scrollRef.current.scrollTo({ top: itemBottom - containerHeight, behavior: 'smooth' })
    }
  }, [activeSlideId, slides, itemHeight, containerHeight])

  const visibleSlides = useMemo(() => {
    const items: { slide: Slide; index: number }[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      if (slides[i]) {
        items.push({ slide: slides[i], index: i })
      }
    }
    return items
  }, [slides, startIndex, endIndex])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="overflow-y-auto"
      style={{ height: containerHeight }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleSlides.map(({ slide, index }) => (
          <div
            key={slide.id}
            className="absolute left-0 right-0 px-2"
            style={{
              top: index * itemHeight,
              height: itemHeight,
            }}
          >
            <div
              className={`h-full flex items-center ${slide.id === activeSlideId ? '' : ''}`}
              onContextMenu={(e) => {
                if (onContextMenu) {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelect(slide.id)
                  onContextMenu(slide.id, e)
                }
              }}
            >
              <SlideThumbnail
                slide={slide}
                index={index}
                isActive={slide.id === activeSlideId}
                onClick={() => onSelect(slide.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
