'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  content: string
  data?: Record<string, string>
  onUpdate: (content: string) => void
  onUpdateData?: (data: Record<string, string>) => void
}

export default function ColumnsBlock({ content, data, onUpdate, onUpdateData }: Props) {
  const colCount = parseInt(data?.colCount || '2')
  const gap = data?.gap || '24px'
  const divider = data?.divider === 'true'

  // Content is stored as JSON array of column contents
  const [cols, setCols] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return Array(colCount).fill('')
  })

  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) setCols(parsed)
    } catch {}
  }, [content])

  // Ensure column count matches
  useEffect(() => {
    if (cols.length !== colCount) {
      const newCols = Array.from({ length: colCount }, (_, i) => cols[i] || '')
      setCols(newCols)
      onUpdate(JSON.stringify(newCols))
    }
  }, [colCount])

  function handleBlur(index: number, html: string) {
    const newCols = [...cols]
    newCols[index] = html
    setCols(newCols)
    onUpdate(JSON.stringify(newCols))
  }

  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (el && el.innerHTML !== cols[i]) {
        el.innerHTML = cols[i]
      }
    })
  }, [cols])

  return (
    <div className="my-3">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => onUpdateData?.({ colCount: String(n) })}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                colCount === n
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : 'border-slate-700 text-slate-500 hover:text-white'
              }`}
            >
              {n}段
            </button>
          ))}
        </div>
        <button
          onClick={() => onUpdateData?.({ divider: divider ? 'false' : 'true' })}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            divider
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
              : 'border-slate-700 text-slate-500 hover:text-white'
          }`}
        >
          区切り線
        </button>
      </div>

      <div className="flex" style={{ gap }}>
        {Array.from({ length: colCount }, (_, i) => (
          <div
            key={i}
            className="flex-1 flex"
            style={divider && i > 0 ? { borderLeft: '1px solid rgba(148,163,184,0.2)', paddingLeft: gap } : {}}
          >
            <div
              ref={(el) => {
                refs.current[i] = el
              }}
              contentEditable
              suppressContentEditableWarning
              className="flex-1 focus:outline-none text-slate-300 text-base leading-7 min-h-[3em] focus:ring-1 focus:ring-indigo-500/30 rounded px-2 py-1"
              data-placeholder={`第${i + 1}段...`}
              onBlur={(e) => handleBlur(i, e.currentTarget.innerHTML)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
