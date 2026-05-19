'use client'

import type { SlidesDocument } from '@/types'
import { X } from 'lucide-react'

interface Props {
  footer: SlidesDocument['globalFooter']
  onUpdate: (footer: SlidesDocument['globalFooter']) => void
  onClose: () => void
}

export default function SlideFooterSettings({ footer, onUpdate, onClose }: Props) {
  const f = footer || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm font-medium">フッター設定</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!f.showSlideNumber}
              onChange={(e) => onUpdate({ ...f, showSlideNumber: e.target.checked })}
              className="accent-indigo-500"
            />
            スライド番号を表示
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!f.showDate}
              onChange={(e) => onUpdate({ ...f, showDate: e.target.checked })}
              className="accent-indigo-500"
            />
            日付を表示
          </label>

          <div>
            <label className="text-xs text-slate-400 block mb-1">フッターテキスト</label>
            <input
              type="text"
              value={f.text || ''}
              onChange={(e) => onUpdate({ ...f, text: e.target.value })}
              placeholder="任意のテキスト"
              className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  )
}
