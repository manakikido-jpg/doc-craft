'use client'

import { useState, useRef, useEffect } from 'react'
import { SLIDE_TEMPLATES } from '@/lib/templates/slide-templates'
import { SLIDE_THEMES } from '@/lib/themes'
import type { SlideTextElement } from '@/types'
import type { SlideThemeKey } from '@/types'

interface Props {
  currentTheme: SlideThemeKey
  onApply: (templateId: string) => void
}

export default function TemplatePicker({ currentTheme, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    let top = rect.bottom + 4
    let left = rect.right - 288 // w-72 = 288px, align right

    requestAnimationFrame(() => {
      if (!panelRef.current) return
      const dd = panelRef.current.getBoundingClientRect()
      if (top + dd.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - dd.height - 4)
      }
      if (left < 8) left = 8
      if (left + dd.width > window.innerWidth - 8) {
        left = window.innerWidth - dd.width - 8
      }
      setPos({ top, left })
    })

    setPos({ top, left })
  }, [open])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800 text-white text-sm transition-colors"
      >
        テンプレート
        <span className="text-slate-400 text-xs">▾</span>
      </button>

      {open && pos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="fixed z-[9999] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-72"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="text-slate-400 text-xs mb-3 px-1">レイアウトを選択（現在のスライドに適用）</p>
            <div className="grid grid-cols-2 gap-2">
              {SLIDE_TEMPLATES.filter((t) => !t.buildSlides).map((tmpl) => {
                const preview = tmpl.buildSlide(currentTheme)
                const theme = SLIDE_THEMES[preview.themeKey]
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      onApply(tmpl.id)
                      setOpen(false)
                    }}
                    className="group flex flex-col gap-1.5 p-2 rounded-lg border border-slate-700 hover:border-indigo-500 bg-slate-800 hover:bg-slate-700 transition-all text-left"
                  >
                    <div
                      className="w-full rounded overflow-hidden relative"
                      style={{ background: theme.background, aspectRatio: '16/9' }}
                    >
                      {preview.elements
                        .filter(
                          (el): el is SlideTextElement =>
                            el.type !== 'image' &&
                            el.type !== 'shape' &&
                            el.type !== 'table' &&
                            el.type !== 'connector' &&
                            el.type !== 'video' &&
                            el.type !== 'audio' &&
                            el.type !== 'chart',
                        )
                        .map((el) => (
                          <div
                            key={el.id}
                            style={{
                              position: 'absolute',
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${el.w}%`,
                              color: el.type === 'title' ? theme.titleColor : theme.bodyColor,
                              fontSize: '4px',
                              fontWeight: el.fontWeight,
                              textAlign: el.align,
                              lineHeight: 1.2,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {el.content.slice(0, 30)}
                          </div>
                        ))}
                    </div>
                    <div>
                      <div className="text-white text-xs font-medium">{tmpl.name}</div>
                      <div className="text-slate-500 text-xs">{tmpl.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
