'use client'

import { useRef, useEffect } from 'react'

interface Props {
  content: string
  footnoteIndex: number
  onUpdate: (content: string) => void
  inputRef: (el: HTMLDivElement | null) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

export default function FootnoteBlock({ content, footnoteIndex, onUpdate, inputRef, onKeyDown }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerText !== content) {
      ref.current.innerText = content
    }
  }, [content])

  return (
    <div className="my-2 pt-2">
      {/* Footnote separator line (Word-style) */}
      <div className="border-t border-slate-600 mb-2 w-1/3" />
      <div className="flex items-start gap-2 pl-2">
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs flex items-center justify-center font-bold mt-0.5 cursor-pointer hover:bg-indigo-500/30 transition-colors"
          title={`脚注 ${footnoteIndex}`}
          onClick={() => {
            // Scroll footnote into view
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }}
        >
          {footnoteIndex}
        </span>
        <div
          ref={(el) => {
            ref.current = el
            inputRef(el)
          }}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="脚注テキスト..."
          className="flex-1 focus:outline-none text-xs text-slate-400 min-h-[1.2em] leading-5"
          onBlur={(e) => onUpdate(e.currentTarget.innerText)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  )
}
