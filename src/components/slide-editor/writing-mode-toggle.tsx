'use client'

import { Type } from 'lucide-react'

interface Props {
  writingMode: 'horizontal' | 'vertical'
  onToggle: (mode: 'horizontal' | 'vertical') => void
}

export default function WritingModeToggle({ writingMode, onToggle }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onToggle('horizontal')}
        className={`p-1.5 rounded text-[10px] transition ${
          writingMode === 'horizontal' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
        }`}
        title="横書き"
      >
        横
      </button>
      <button
        onClick={() => onToggle('vertical')}
        className={`p-1.5 rounded text-[10px] transition ${
          writingMode === 'vertical' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
        }`}
        title="縦書き"
      >
        縦
      </button>
    </div>
  )
}
