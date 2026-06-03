'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Block } from '@/types'

interface Props {
  blocks: Block[]
  docId: string
}

export default function WordCountGoal({ blocks, docId }: Props) {
  const [target, setTarget] = useState<number | null>(null)
  const [showInput, setShowInput] = useState(false)

  // Load target from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`doccraft:wordgoal:${docId}`)
      if (stored) {
        const val = parseInt(stored)
        if (val > 0) setTarget(val)
      }
    } catch { /* ignore */ }
  }, [docId])

  // Save target to localStorage
  useEffect(() => {
    try {
      if (target && target > 0) {
        localStorage.setItem(`doccraft:wordgoal:${docId}`, String(target))
      } else {
        localStorage.removeItem(`doccraft:wordgoal:${docId}`)
      }
    } catch { /* ignore */ }
  }, [target, docId])

  const currentCount = useMemo(() => {
    let chars = 0
    blocks.forEach(b => {
      if (['divider', 'toc', 'page-break', 'image', 'table'].includes(b.type)) return
      const text = b.content.replace(/<[^>]*>/g, '').trim()
      chars += text.length
    })
    return chars
  }, [blocks])

  if (!target) {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={() => setShowInput(!showInput)}
          className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors"
          title="目標文字数を設定"
        >
          目標設定
        </button>
        {showInput && (
          <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl z-50">
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="目標文字数"
                className="w-24 px-2 py-1 text-xs bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value)
                    if (val > 0) setTarget(val)
                    setShowInput(false)
                  }
                  if (e.key === 'Escape') setShowInput(false)
                }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const percent = Math.min(100, Math.round((currentCount / target) * 100))
  const colorClass = percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  const textColorClass = percent >= 80 ? 'text-green-400' : percent >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button
        onClick={() => setShowInput(!showInput)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        title="目標文字数を変更"
      >
        <span className={`text-xs font-medium ${textColorClass}`}>{percent}%</span>
        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-[10px] text-slate-500">{currentCount.toLocaleString()}/{target.toLocaleString()}</span>
      </button>
      {showInput && (
        <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl z-50">
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="目標文字数"
              defaultValue={target}
              className="w-24 px-2 py-1 text-xs bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:border-indigo-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt((e.target as HTMLInputElement).value)
                  setTarget(val > 0 ? val : null)
                  setShowInput(false)
                }
                if (e.key === 'Escape') setShowInput(false)
              }}
            />
            <button
              onClick={() => { setTarget(null); setShowInput(false) }}
              className="text-[10px] text-red-400 hover:text-red-300 px-1"
            >
              解除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
