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
  const useCSS = data?.cssColumns === 'true'

  // Content is stored as JSON array of column contents
  const [cols, setCols] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) return parsed
    } catch (e) { console.warn('Failed to parse column content JSON:', e) }
    return Array(colCount).fill('')
  })

  const refs = useRef<(HTMLDivElement | null)[]>([])
  const cssRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) setCols(parsed)
    } catch (e) { console.warn('Failed to parse column content JSON on update:', e) }
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

  function handleCSSBlur(html: string) {
    // For CSS columns mode, store as single content string
    onUpdate(JSON.stringify([html]))
  }

  useEffect(() => {
    if (useCSS) {
      if (cssRef.current) {
        const stored = cols[0] || ''
        if (cssRef.current.innerHTML !== stored) {
          cssRef.current.innerHTML = stored
        }
      }
    } else {
      refs.current.forEach((el, i) => {
        if (el && el.innerHTML !== cols[i]) {
          el.innerHTML = cols[i]
        }
      })
    }
  }, [cols, useCSS])

  return (
    <div className="my-3">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          {[2, 3].map((n) => (
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
        <button
          onClick={() => onUpdateData?.({ cssColumns: useCSS ? 'false' : 'true' })}
          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
            useCSS
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
              : 'border-slate-700 text-slate-500 hover:text-white'
          }`}
          title="CSS段組みモード（自動折り返し）"
        >
          自動段組み
        </button>
      </div>

      {useCSS ? (
        /* CSS columns mode: single editable area with CSS columns property */
        <div
          ref={cssRef}
          contentEditable
          suppressContentEditableWarning
          className="focus:outline-none text-slate-300 text-base leading-7 min-h-[3em] focus:ring-1 focus:ring-indigo-500/30 rounded px-2 py-1"
          style={{
            columnCount: colCount,
            columnGap: gap,
            columnRule: divider ? '1px solid rgba(148,163,184,0.2)' : 'none',
          }}
          data-placeholder="テキストを入力..."
          onBlur={(e) => handleCSSBlur(e.currentTarget.innerHTML)}
        />
      ) : (
        /* Manual columns mode: separate editable areas */
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
      )}
    </div>
  )
}
