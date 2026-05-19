'use client'

import { useRef, useEffect } from 'react'
import type { CalloutVariant } from '@/types'

interface Props {
  content: string
  variant: CalloutVariant
  onUpdate: (content: string) => void
  onVariantChange: (variant: CalloutVariant) => void
  inputRef: (el: HTMLDivElement | null) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

const VARIANTS: Record<CalloutVariant, { icon: string; bg: string; border: string; text: string }> = {
  info: { icon: 'ℹ️', bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-300' },
  warning: { icon: '⚠️', bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-300' },
  success: { icon: '✅', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  error: { icon: '❌', bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-300' },
}

const VARIANT_LIST: CalloutVariant[] = ['info', 'warning', 'success', 'error']

export default function CalloutBlock({ content, variant, onUpdate, onVariantChange, inputRef, onKeyDown }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const v = VARIANTS[variant] || VARIANTS.info

  useEffect(() => {
    if (ref.current && ref.current.innerText !== content) {
      ref.current.innerText = content
    }
  }, [content])

  return (
    <div className={`my-3 rounded-lg border ${v.border} ${v.bg} p-4`}>
      <div className="flex items-start gap-3">
        <button
          className="text-lg flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
          onClick={() => {
            const idx = VARIANT_LIST.indexOf(variant)
            onVariantChange(VARIANT_LIST[(idx + 1) % VARIANT_LIST.length])
          }}
          title="タイプを切替"
        >
          {v.icon}
        </button>
        <div
          ref={(el) => {
            ref.current = el
            inputRef(el)
          }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="コールアウトのテキスト..."
          className={`flex-1 focus:outline-none text-sm ${v.text} min-h-[1.5em]`}
          onBlur={(e) => onUpdate(e.currentTarget.innerText)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  )
}
