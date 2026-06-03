'use client'

import { useState, useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'

export default function ShortcutsHint({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = 'doccraft:shortcutsHintSeen'
    if (!localStorage.getItem(key)) {
      // Show after 3 seconds on first visit
      const timer = setTimeout(() => setVisible(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem('doccraft:shortcutsHintSeen', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-16 right-4 z-50 bg-indigo-600/95 backdrop-blur border border-indigo-500 rounded-xl shadow-2xl p-3 w-64 animate-slide-up">
      <button onClick={dismiss} className="absolute top-2 right-2 text-indigo-200 hover:text-white">
        <X size={14} />
      </button>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
          <Keyboard size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-0.5">ショートカットキー</p>
          <p className="text-xs text-indigo-200 mb-2">Ctrl+/ でショートカット一覧を表示できます</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onOpenShortcuts(); dismiss() }}
              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-2.5 py-1 rounded transition-colors"
            >
              一覧を見る
            </button>
            <button
              onClick={dismiss}
              className="text-xs text-indigo-200 hover:text-white transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
