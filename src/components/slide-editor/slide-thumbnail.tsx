'use client'

import type { Slide, SlideShapeElement, SlideTableElement } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface Props {
  slide: Slide
  index: number
  isActive: boolean
  onClick: () => void
  isDragging?: boolean
}

function ShapeSvg({ shape, fill }: { shape: string; fill: string }) {
  switch (shape) {
    case 'circle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill={fill} />
        </svg>
      )
    case 'triangle':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,2 98,98 2,98" fill={fill} />
        </svg>
      )
    case 'diamond':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,2 98,50 50,98 2,50" fill={fill} />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,2 61,38 98,38 68,60 79,96 50,74 21,96 32,60 2,38 39,38" fill={fill} />
        </svg>
      )
    case 'hexagon':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,2 93,25 93,75 50,98 7,75 7,25" fill={fill} />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="0,25 65,25 65,5 100,50 65,95 65,75 0,75" fill={fill} />
        </svg>
      )
    case 'line':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <line x1="2" y1="50" x2="98" y2="50" stroke={fill} strokeWidth="4" />
        </svg>
      )
    default: // rect and fallback
      return (
        <div className="w-full h-full rounded-sm" style={{ background: fill }} />
      )
  }
}

export default function SlideThumbnail({ slide, index, isActive, onClick, isDragging }: Props) {
  const theme = SLIDE_THEMES[slide.themeKey]
  const bg = slide.customTheme?.background || theme?.background || '#1e293b'
  const bgStyle = slide.backgroundImage
    ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: slide.backgroundFit || 'cover', backgroundPosition: 'center' as const }
    : { background: bg }

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg overflow-hidden transition-all select-none ${
        isActive ? 'ring-2 ring-indigo-500' : 'ring-1 ring-slate-700 hover:ring-slate-500'
      } ${isDragging ? 'ring-2 ring-indigo-400' : ''}`}
    >
      <div className="relative w-full" style={{ ...bgStyle, aspectRatio: '16/9' }}>
        {slide.elements.slice(0, 5).map((el) => {
          if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
            const color = el.type === 'title' ? (theme?.titleColor || '#fff') : (theme?.bodyColor || '#ccc')
            return (
              <div key={el.id} className="absolute overflow-hidden pointer-events-none" style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
                fontSize: '4px', color, fontWeight: el.type === 'title' ? 700 : 400,
                lineHeight: 1.2,
              }}>
                {el.content?.replace(/<[^>]*>/g, '').slice(0, 60)}
              </div>
            )
          }
          if (el.type === 'image') {
            return <div key={el.id} className="absolute bg-slate-600/50 rounded-sm" style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }} />
          }
          if (el.type === 'shape') {
            const shape = el as SlideShapeElement
            const fill = shape.fill || '#6366f1'
            return (
              <div key={el.id} className="absolute" style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`, opacity: 0.7,
              }}>
                <ShapeSvg shape={shape.shape} fill={fill} />
              </div>
            )
          }
          if (el.type === 'table') {
            const table = el as SlideTableElement
            const rows = Math.min(table.rows.length, 4)
            const cols = Math.min(table.rows[0]?.length ?? 0, 5)
            return (
              <div key={el.id} className="absolute" style={{
                left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
              }}>
                <div
                  className="w-full h-full grid gap-px bg-slate-500/30 rounded-sm overflow-hidden"
                  style={{
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  }}
                >
                  {Array.from({ length: rows * cols }).map((_, i) => (
                    <div
                      key={i}
                      className={i < cols && table.headerRow ? 'bg-slate-500/40' : 'bg-slate-700/30'}
                    />
                  ))}
                </div>
              </div>
            )
          }
          return null
        })}

        {/* Transition icon */}
        {slide.transition && slide.transition !== 'none' && (
          <div
            className="absolute top-0.5 right-0.5 w-3 h-3 rounded-sm bg-black/50 flex items-center justify-center"
            title={`Transition: ${slide.transition}`}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        )}

        {/* Section name badge */}
        {slide.sectionName && (
          <div
            className="absolute bottom-0.5 left-0.5 max-w-[80%] truncate rounded-sm px-1 py-px text-[3.5px] font-medium text-white/90 leading-tight"
            style={{ background: slide.sectionColor || '#6366f1cc' }}
          >
            {slide.sectionName}
          </div>
        )}
      </div>
      <div className="bg-slate-900 px-2 py-1 flex items-center justify-between">
        <span className="text-slate-500 text-xs">{index + 1}</span>
      </div>
    </div>
  )
}
