'use client'

import type { Slide } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface Props {
  slide: Slide
  index: number
  isActive: boolean
  onClick: () => void
  isDragging?: boolean
}

export default function SlideThumbnail({ slide, index, isActive, onClick, isDragging }: Props) {
  const theme = SLIDE_THEMES[slide.themeKey]
  const titleEl = slide.elements.find((e) => e.type === 'title')
  const title = titleEl && 'content' in titleEl ? titleEl.content : ''

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg overflow-hidden transition-all select-none ${
        isActive ? 'ring-2 ring-indigo-500' : 'ring-1 ring-slate-700 hover:ring-slate-500'
      } ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
    >
      <div className="relative w-full" style={{ background: theme.background, aspectRatio: '16/9' }}>
        {title && (
          <div
            className="absolute inset-0 flex items-center justify-center p-2 text-center"
            style={{
              color: theme.titleColor,
              fontSize: '5px',
              fontWeight: '700',
              lineHeight: 1.3,
            }}
          >
            {title.slice(0, 40)}
          </div>
        )}
      </div>
      <div className="bg-slate-900 px-2 py-1 flex items-center justify-between">
        <span className="text-slate-500 text-xs">{index + 1}</span>
      </div>
    </div>
  )
}
