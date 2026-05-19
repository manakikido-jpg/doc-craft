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
    <div className="my-2 flex items-start gap-2 pl-4 border-l-2 border-slate-600">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold mt-0.5">
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
  )
}
