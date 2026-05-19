'use client'

import { useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  context: 'slides' | 'doc'
}

const COMMON_SHORTCUTS = [
  { keys: 'Ctrl + Z', desc: '元に戻す' },
  { keys: 'Ctrl + Y', desc: 'やり直し' },
  { keys: 'Ctrl + B', desc: '太字' },
  { keys: 'Ctrl + I', desc: '斜体' },
  { keys: 'Ctrl + U', desc: '下線' },
  { keys: 'Ctrl + ?', desc: 'ショートカット一覧' },
]

const SLIDE_SHORTCUTS = [
  { keys: 'F5', desc: '発表モード開始' },
  { keys: '→ / Space', desc: '次のスライド (発表中)' },
  { keys: '← / ↑', desc: '前のスライド (発表中)' },
  { keys: 'Esc', desc: '発表モード終了' },
]

const DOC_SHORTCUTS = [
  { keys: '/', desc: 'スラッシュコマンド' },
  { keys: 'Enter', desc: '新しいブロックを追加' },
  { keys: 'Backspace', desc: '空のブロックを削除' },
  { keys: '↑ / ↓', desc: 'ブロック間を移動' },
]

export default function ShortcutsHelp({ open, onClose, context }: Props) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  const contextShortcuts = context === 'slides' ? SLIDE_SHORTCUTS : DOC_SHORTCUTS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard size={18} className="text-slate-400" /> キーボードショートカット
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">共通</h3>
            <div className="space-y-1">
              {COMMON_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.keys} keys={s.keys} desc={s.desc} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              {context === 'slides' ? 'スライド' : 'ドキュメント'}
            </h3>
            <div className="space-y-1">
              {contextShortcuts.map((s) => (
                <ShortcutRow key={s.keys} keys={s.keys} desc={s.desc} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50">
      <span className="text-sm text-slate-300">{desc}</span>
      <kbd className="text-xs font-mono bg-slate-800 border border-slate-600 text-slate-400 px-2 py-0.5 rounded">
        {keys}
      </kbd>
    </div>
  )
}
