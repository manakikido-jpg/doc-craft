'use client'

import { useState } from 'react'
import type { SlidesDocument, SlideTextElement } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'
import { X } from 'lucide-react'

interface Props {
  state: SlidesDocument
  dispatch: React.Dispatch<any>
  onClose: () => void
}

export default function SlideSorter({ state, dispatch, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function handleClick(id: string, e: React.MouseEvent) {
    if (e.shiftKey) {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelected(new Set([id]))
    }
  }

  function handleDoubleClick(id: string) {
    dispatch({ type: 'SET_ACTIVE', id })
    onClose()
  }

  function handleDeleteSelected() {
    if (selected.size === 0 || selected.size >= state.slides.length) return
    selected.forEach((id) => dispatch({ type: 'DELETE_SLIDE', id }))
    setSelected(new Set())
  }

  function handleDuplicateSelected() {
    selected.forEach((id) => dispatch({ type: 'DUPLICATE_SLIDE', id }))
    setSelected(new Set())
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      <div className="h-12 flex items-center justify-between px-6 border-b border-slate-800">
        <h2 className="text-white text-sm font-medium">スライド一覧 ({state.slides.length}枚)</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-xs text-slate-400">{selected.size}枚選択</span>
              <button
                onClick={handleDuplicateSelected}
                className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                複製
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-slate-800 hover:bg-red-500/10 rounded transition-colors"
              >
                削除
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {state.slides.map((slide, i) => {
            const isSelected = selected.has(slide.id)
            const baseTheme = SLIDE_THEMES[slide.themeKey]
            const theme = slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme
            return (
              <div
                key={slide.id}
                className={`cursor-pointer rounded-lg overflow-hidden transition-all ${isSelected ? 'ring-2 ring-indigo-500 scale-[1.02]' : 'hover:ring-1 hover:ring-slate-600'}`}
                onClick={(e) => handleClick(slide.id, e)}
                onDoubleClick={() => handleDoubleClick(slide.id)}
              >
                <div className="aspect-video relative overflow-hidden" style={{ background: theme.background }}>
                  {slide.backgroundImage && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${slide.backgroundImage})`,
                        backgroundSize: slide.backgroundFit || 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  )}
                  {slide.elements
                    .filter(
                      (e): e is SlideTextElement => e.type === 'title' || e.type === 'subtitle' || e.type === 'body',
                    )
                    .slice(0, 2)
                    .map((el) => (
                      <div
                        key={el.id}
                        className="px-2 py-0.5 truncate"
                        style={{
                          position: 'absolute',
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: `${el.w}%`,
                          color: el.type === 'title' ? theme.titleColor : theme.bodyColor,
                          fontSize: `${Math.max(6, el.fontSize * 0.2)}px`,
                          fontWeight: el.fontWeight,
                          textAlign: el.align,
                        }}
                      >
                        {el.content}
                      </div>
                    ))}
                </div>
                <div className="bg-slate-800 px-2 py-1 text-xs text-slate-400 text-center">{i + 1}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
