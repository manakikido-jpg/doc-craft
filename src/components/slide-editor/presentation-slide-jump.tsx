'use client'
import { useEffect, useCallback } from 'react'
import type { Slide } from '@/types'

interface SlideJumpProps {
  slides: Slide[]
  currentIndex: number
  onJump: (index: number) => void
  onClose: () => void
}

function getSlideTitle(slide: Slide): string {
  for (const el of slide.elements) {
    if (el.type === 'title' || el.type === 'subtitle') {
      const text = el.content.replace(/<[^>]*>/g, '').trim()
      if (text) return text.length > 30 ? text.slice(0, 30) + '...' : text
    }
  }
  return ''
}

export default function PresentationSlideJump({
  slides,
  currentIndex,
  onJump,
  onClose,
}: SlideJumpProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-4">スライド一覧</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {slides.map((slide, i) => {
            const isCurrent = i === currentIndex
            const title = getSlideTitle(slide)
            return (
              <button
                key={slide.id}
                onClick={() => {
                  onJump(i)
                  onClose()
                }}
                className={`relative flex flex-col items-center rounded-lg border-2 p-2 transition-colors hover:border-blue-400 ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-750'
                }`}
              >
                {/* Thumbnail placeholder */}
                <div className="w-full aspect-video bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs mb-1">
                  {i + 1}
                </div>
                <span className="text-xs text-slate-300 truncate w-full text-center">
                  {title || `スライド ${i + 1}`}
                </span>
                {isCurrent && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
