'use client'

import type { Slide, SlideElement, ElementAnimation } from '@/types'
import { X } from 'lucide-react'

interface Props {
  slide: Slide
  dispatch: React.Dispatch<any>
  onClose: () => void
  selectedElementIds?: string[]
}

const ANIMATIONS: {
  category: string
  items: { type: ElementAnimation['type']; label: string; cat: ElementAnimation['category'] }[]
}[] = [
  {
    category: '入場',
    items: [
      { type: 'fadeIn', label: 'フェードイン', cat: 'entrance' },
      { type: 'slideInLeft', label: '左からスライド', cat: 'entrance' },
      { type: 'slideInRight', label: '右からスライド', cat: 'entrance' },
      { type: 'slideInUp', label: '下からスライド', cat: 'entrance' },
      { type: 'slideInDown', label: '上からスライド', cat: 'entrance' },
      { type: 'zoomIn', label: 'ズームイン', cat: 'entrance' },
      { type: 'bounceIn', label: 'バウンスイン', cat: 'entrance' },
    ],
  },
  {
    category: '退場',
    items: [
      { type: 'fadeOut', label: 'フェードアウト', cat: 'exit' },
      { type: 'slideOutLeft', label: '左へスライド', cat: 'exit' },
      { type: 'slideOutRight', label: '右へスライド', cat: 'exit' },
      { type: 'slideOutUp', label: '上へスライド', cat: 'exit' },
      { type: 'slideOutDown', label: '下へスライド', cat: 'exit' },
      { type: 'zoomOut', label: 'ズームアウト', cat: 'exit' },
    ],
  },
  {
    category: '強調',
    items: [
      { type: 'pulse', label: 'パルス', cat: 'emphasis' },
      { type: 'bounce', label: 'バウンス', cat: 'emphasis' },
      { type: 'shake', label: 'シェイク', cat: 'emphasis' },
      { type: 'spin', label: 'スピン', cat: 'emphasis' },
    ],
  },
]

const TRIGGERS: { value: ElementAnimation['trigger']; label: string }[] = [
  { value: 'on-click', label: 'クリック時' },
  { value: 'with-previous', label: '前と同時' },
  { value: 'after-previous', label: '前の後' },
]

export default function AnimationPanel({ slide, dispatch, onClose, selectedElementIds = [] }: Props) {
  const animatedElements = slide.elements
    .filter((el) => 'animation' in el && el.animation)
    .sort((a, b) => ((a as any).animation?.order ?? 0) - ((b as any).animation?.order ?? 0))

  function getLabel(el: SlideElement): string {
    if ('content' in el && el.content) return el.content.replace(/<[^>]*>/g, '').slice(0, 20) || el.type
    return el.type
  }

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-700 h-full overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white text-sm font-medium">アニメーション</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Animated elements list */}
      {animatedElements.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-xs text-slate-500 mb-2">アニメーション順序</p>
          <div className="space-y-1">
            {animatedElements.map((el, i) => {
              const anim = (el as any).animation as ElementAnimation
              return (
                <div key={el.id} className="flex items-center gap-2 p-1.5 rounded bg-slate-800 text-xs">
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-slate-300 flex-1 truncate">{getLabel(el)}</span>
                  <select
                    value={anim.trigger || 'on-click'}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_ANIMATION_TRIGGER',
                        slideId: slide.id,
                        elementId: el.id,
                        trigger: e.target.value,
                      })
                    }
                    className="bg-slate-700 text-slate-300 text-[10px] px-1 py-0.5 rounded border-none"
                  >
                    {TRIGGERS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      dispatch({
                        type: 'SET_ELEMENT_ANIMATION',
                        slideId: slide.id,
                        elementId: el.id,
                        animation: undefined,
                      })
                    }
                    className="text-slate-500 hover:text-red-400 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Animation picker */}
      <div className="px-4 py-3">
        <p className="text-xs text-slate-500 mb-2">
          {selectedElementIds.length > 0
            ? `${selectedElementIds.length}個の要素を選択中`
            : '要素を選択してからアニメーションを適用'}
        </p>
        {ANIMATIONS.map((cat) => (
          <div key={cat.category} className="mb-3">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">{cat.category}</p>
            <div className="grid grid-cols-2 gap-1">
              {cat.items.map((anim) => (
                <button
                  key={anim.type}
                  onClick={() => {
                    const targets =
                      selectedElementIds.length > 0
                        ? slide.elements.filter((el) => selectedElementIds.includes(el.id))
                        : []
                    if (targets.length === 0) return
                    const nextOrder = animatedElements.length
                    targets.forEach((el, i) => {
                      dispatch({
                        type: 'SET_ELEMENT_ANIMATION',
                        slideId: slide.id,
                        elementId: el.id,
                        animation: {
                          type: anim.type,
                          category: anim.cat,
                          duration: 0.5,
                          delay: 0,
                          trigger: 'on-click',
                          order: nextOrder + i,
                        },
                      })
                    })
                  }}
                  className="px-2 py-1.5 rounded text-[10px] text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-colors text-left"
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
