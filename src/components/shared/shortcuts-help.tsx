'use client'

import { useEffect, useState } from 'react'
import { Keyboard, X, Search } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  context: 'slides' | 'doc' | 'spreadsheet'
}

interface ShortcutItem {
  keys: string
  desc: string
}

interface ShortcutSection {
  title: string
  items: ShortcutItem[]
}

const COMMON_SHORTCUTS: ShortcutSection = {
  title: '共通',
  items: [
    { keys: 'Ctrl + Z', desc: '元に戻す' },
    { keys: 'Ctrl + Y', desc: 'やり直し' },
    { keys: 'Ctrl + /', desc: 'ショートカット一覧' },
  ],
}

const FORMAT_SHORTCUTS: ShortcutSection = {
  title: '書式設定',
  items: [
    { keys: 'Ctrl + B', desc: '太字' },
    { keys: 'Ctrl + I', desc: '斜体' },
    { keys: 'Ctrl + U', desc: '下線' },
    { keys: 'Ctrl + Shift + S', desc: '取り消し線' },
    { keys: 'Ctrl + Shift + H', desc: 'ハイライト' },
  ],
}

const SLIDE_SECTIONS: ShortcutSection[] = [
  {
    title: 'プレゼンテーション',
    items: [
      { keys: 'F5', desc: '発表モード開始' },
      { keys: '→ / Space', desc: '次のスライド' },
      { keys: '← / ↑', desc: '前のスライド' },
      { keys: 'Esc', desc: '発表モード終了' },
      { keys: 'Home', desc: '最初のスライドへ' },
      { keys: 'End', desc: '最後のスライドへ' },
    ],
  },
  {
    title: 'スライド操作',
    items: [
      { keys: 'Ctrl + M', desc: '新しいスライド追加' },
      { keys: 'Ctrl + D', desc: 'スライドを複製' },
      { keys: 'Delete', desc: 'スライドを削除' },
    ],
  },
]

const DOC_SECTIONS: ShortcutSection[] = [
  {
    title: 'ブロック操作',
    items: [
      { keys: '/', desc: 'スラッシュコマンド' },
      { keys: 'Enter', desc: '新しいブロック追加' },
      { keys: 'Backspace', desc: '空ブロックを削除' },
      { keys: '↑ / ↓', desc: 'ブロック間を移動' },
      { keys: 'Tab', desc: 'インデント' },
      { keys: 'Shift + Tab', desc: 'アウトデント' },
    ],
  },
  {
    title: 'ナビゲーション',
    items: [
      { keys: 'Ctrl + F', desc: '検索' },
      { keys: 'Ctrl + H', desc: '検索・置換' },
      { keys: 'Ctrl + G', desc: 'ジャンプ' },
      { keys: 'Ctrl + K', desc: 'ドキュメントリンク挿入' },
      { keys: 'F11', desc: '閲覧モード' },
    ],
  },
  {
    title: 'ズーム',
    items: [
      { keys: 'Ctrl + +', desc: '拡大' },
      { keys: 'Ctrl + -', desc: '縮小' },
      { keys: 'Ctrl + 0', desc: 'リセット (100%)' },
      { keys: 'Ctrl + スクロール', desc: 'ズーム' },
    ],
  },
]

const SPREADSHEET_SECTIONS: ShortcutSection[] = [
  {
    title: 'セル操作',
    items: [
      { keys: 'Enter', desc: 'セル確定→下へ移動' },
      { keys: 'Tab', desc: 'セル確定→右へ移動' },
      { keys: 'F2', desc: 'セル編集モード' },
      { keys: 'Delete', desc: 'セル内容クリア' },
      { keys: 'Escape', desc: '編集キャンセル' },
    ],
  },
  {
    title: 'ナビゲーション',
    items: [
      { keys: '矢印キー', desc: 'セル移動' },
      { keys: 'Ctrl + ←/→', desc: 'データ端へジャンプ' },
      { keys: 'Ctrl + Home', desc: 'A1へ移動' },
      { keys: 'Ctrl + A', desc: '全選択' },
      { keys: 'Shift + 矢印', desc: '範囲選択' },
    ],
  },
  {
    title: 'クリップボード',
    items: [
      { keys: 'Ctrl + C', desc: 'コピー (TSV対応)' },
      { keys: 'Ctrl + X', desc: '切り取り' },
      { keys: 'Ctrl + V', desc: '貼り付け (TSV対応)' },
    ],
  },
  {
    title: '数式',
    items: [
      { keys: '= で始める', desc: '数式入力' },
      { keys: '/ で始める', desc: '関数リファレンス' },
      { keys: 'Ctrl + F', desc: '検索' },
      { keys: 'Ctrl + G', desc: 'セル移動ダイアログ' },
    ],
  },
  FORMAT_SHORTCUTS,
]

export default function ShortcutsHelp({ open, onClose, context }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setSearchQuery('')
  }, [open])

  if (!open) return null

  const contextSections =
    context === 'slides'
      ? SLIDE_SECTIONS
      : context === 'spreadsheet'
        ? SPREADSHEET_SECTIONS
        : DOC_SECTIONS

  const allSections = [COMMON_SHORTCUTS, ...(context !== 'spreadsheet' ? [FORMAT_SHORTCUTS] : []), ...contextSections]

  // Filter by search
  const filteredSections = searchQuery.trim()
    ? allSections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.keys.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((section) => section.items.length > 0)
    : allSections

  const totalCount = allSections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard size={18} className="text-indigo-400" />
            キーボードショートカット
            <span className="text-xs text-slate-500 font-normal ml-1">({totalCount})</span>
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ショートカットを検索..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-4 custom-scrollbar">
          {filteredSections.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">一致するショートカットがありません</p>
          ) : (
            filteredSections.map((section) => (
              <section key={section.title}>
                <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((s) => (
                    <ShortcutRow key={s.keys + s.desc} keys={s.keys} desc={s.desc} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 text-[10px] text-slate-600 text-center">
          macOS では Ctrl → ⌘ (Command)
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  const keyParts = keys.split(/(\s*\+\s*|\s*\/\s*)/)

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50 group">
      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{desc}</span>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {keyParts.map((part, i) => {
          const trimmed = part.trim()
          if (trimmed === '+' || trimmed === '/') {
            return (
              <span key={i} className="text-[10px] text-slate-600 mx-0.5">
                {trimmed}
              </span>
            )
          }
          if (!trimmed) return null
          return (
            <kbd
              key={i}
              className="text-[11px] font-mono bg-slate-800 border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded min-w-[24px] text-center"
            >
              {trimmed}
            </kbd>
          )
        })}
      </div>
    </div>
  )
}
