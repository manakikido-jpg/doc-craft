'use client'

import { StickyNote } from 'lucide-react'
import type { Slide } from '@/types'

interface Props {
  slide: Slide
  onUpdate: (notes: string) => void
}

export default function NotesPanel({ slide, onUpdate }: Props) {
  return (
    <div className="h-32 border-t border-slate-800 bg-slate-950 flex flex-col flex-shrink-0 no-print">
      <div className="px-4 py-2 border-b border-slate-800/50 flex items-center gap-2">
        <StickyNote size={12} className="text-slate-500" />
        <span className="text-xs text-slate-500 font-medium">スピーカーノート</span>
      </div>
      <textarea
        value={slide.notes || ''}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder="発表用のメモをここに入力... (発表者のみ表示)"
        className="flex-1 bg-transparent px-4 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none resize-none"
      />
    </div>
  )
}
