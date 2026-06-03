'use client'

import { useEffect, useState, useMemo } from 'react'
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

interface ShortcutCategory {
  category: string
  icon: string
  sections: { title: string; items: ShortcutItem[] }[]
}

// ── Category: ナビゲーション ──
const NAV_COMMON: ShortcutItem[] = [
  { keys: 'Ctrl + K', desc: 'コマンドパレット' },
  { keys: 'Ctrl + /', desc: 'ショートカット一覧' },
  { keys: 'Ctrl + F', desc: '検索置換' },
]

const NAV_SLIDES: ShortcutItem[] = [
  { keys: 'Tab', desc: '次の要素に切り替え' },
  { keys: 'Shift + Tab', desc: '前の要素に切り替え' },
  { keys: 'Enter / F2', desc: 'テキスト編集開始' },
]

const NAV_DOC: ShortcutItem[] = [
  { keys: '↑ / ↓', desc: 'ブロック間を移動' },
  { keys: 'Ctrl + H', desc: '検索・置換' },
  { keys: 'Ctrl + G', desc: 'ジャンプ' },
  { keys: 'Ctrl + K', desc: 'ドキュメントリンク挿入' },
]

const NAV_SPREADSHEET: ShortcutItem[] = [
  { keys: '矢印キー', desc: 'セル移動' },
  { keys: 'Ctrl + ←/→', desc: 'データ端へジャンプ' },
  { keys: 'Ctrl + Home', desc: 'A1へ移動' },
  { keys: 'Shift + 矢印', desc: '範囲選択' },
]

// ── Category: 編集 ──
const EDIT_COMMON: ShortcutItem[] = [
  { keys: 'Ctrl + Z', desc: '元に戻す' },
  { keys: 'Ctrl + Y', desc: 'やり直し' },
  { keys: 'Ctrl + C', desc: 'コピー' },
  { keys: 'Ctrl + V', desc: '貼り付け' },
  { keys: 'Ctrl + X', desc: '切り取り' },
  { keys: 'Ctrl + A', desc: '全選択' },
  { keys: 'Delete', desc: '要素削除' },
]

const EDIT_SLIDES: ShortcutItem[] = [
  { keys: 'Ctrl + M', desc: '新しいスライド追加' },
  { keys: 'Ctrl + D', desc: 'スライド/要素を複製' },
  { keys: '矢印キー', desc: '要素移動' },
  { keys: 'Shift + 矢印', desc: '要素を大きく移動' },
  { keys: 'Ctrl + G', desc: 'グループ化' },
  { keys: 'Ctrl + Shift + G', desc: 'グループ解除' },
]

const EDIT_DOC: ShortcutItem[] = [
  { keys: '/', desc: 'スラッシュコマンド' },
  { keys: 'Enter', desc: '新しいブロック追加' },
  { keys: 'Backspace', desc: '空ブロックを削除' },
  { keys: 'Tab', desc: 'インデント' },
  { keys: 'Shift + Tab', desc: 'アウトデント' },
]

const EDIT_SPREADSHEET: ShortcutItem[] = [
  { keys: 'Enter', desc: 'セル確定→下へ移動' },
  { keys: 'Tab', desc: 'セル確定→右へ移動' },
  { keys: 'F2', desc: 'セル編集モード' },
  { keys: 'Delete', desc: 'セル内容クリア' },
  { keys: 'Escape', desc: '編集キャンセル' },
  { keys: '= で始める', desc: '数式入力' },
  { keys: '/ で始める', desc: '関数リファレンス' },
]

// ── Category: 書式 ──
const FORMAT_ITEMS: ShortcutItem[] = [
  { keys: 'Ctrl + B', desc: '太字' },
  { keys: 'Ctrl + I', desc: '斜体' },
  { keys: 'Ctrl + U', desc: '下線' },
  { keys: 'Ctrl + Shift + S', desc: '取り消し線' },
  { keys: 'Ctrl + Shift + H', desc: 'ハイライト' },
]

// ── Category: 表示 ──
const VIEW_COMMON: ShortcutItem[] = [
  { keys: 'Ctrl + +', desc: '拡大' },
  { keys: 'Ctrl + -', desc: '縮小' },
  { keys: 'Ctrl + 0', desc: 'リセット (100%)' },
  { keys: 'Ctrl + スクロール', desc: 'ズーム' },
]

const VIEW_DOC: ShortcutItem[] = [
  { keys: 'F11', desc: '閲覧モード' },
]

// ── Category: ファイル (Presentation) ──
const PRESENTATION_ITEMS: ShortcutItem[] = [
  { keys: 'F5', desc: 'プレゼン開始 (最初から)' },
  { keys: 'Shift + F5', desc: '現在のスライドから開始' },
  { keys: '→ / Space', desc: '次のスライド' },
  { keys: '← / ↑', desc: '前のスライド' },
  { keys: 'Home', desc: '最初のスライドへ' },
  { keys: 'End', desc: '最後のスライドへ' },
  { keys: 'Esc', desc: 'プレゼン終了' },
]

const PRESENTATION_TOOLS: ShortcutItem[] = [
  { keys: 'B', desc: 'ブラックアウト' },
  { keys: 'W', desc: 'ホワイトアウト' },
  { keys: 'G', desc: 'スライドジャンプ' },
  { keys: 'T', desc: 'タイマー' },
  { keys: 'Q', desc: 'Q&Aタイマー' },
  { keys: 'P', desc: 'ポインタ切替' },
]

function buildCategories(context: 'slides' | 'doc' | 'spreadsheet'): ShortcutCategory[] {
  const categories: ShortcutCategory[] = []

  // ナビゲーション
  const navItems = [...NAV_COMMON]
  if (context === 'slides') navItems.push(...NAV_SLIDES)
  else if (context === 'doc') navItems.push(...NAV_DOC)
  else navItems.push(...NAV_SPREADSHEET)
  categories.push({ category: 'ナビゲーション', icon: '🧭', sections: [{ title: 'ナビゲーション', items: navItems }] })

  // 編集
  const editSections: { title: string; items: ShortcutItem[] }[] = [
    { title: '共通', items: EDIT_COMMON },
  ]
  if (context === 'slides') editSections.push({ title: 'スライド編集', items: EDIT_SLIDES })
  else if (context === 'doc') editSections.push({ title: 'ドキュメント編集', items: EDIT_DOC })
  else editSections.push({ title: 'セル編集', items: EDIT_SPREADSHEET })
  categories.push({ category: '編集', icon: '✏️', sections: editSections })

  // 書式
  categories.push({ category: '書式', icon: '🎨', sections: [{ title: '書式設定', items: FORMAT_ITEMS }] })

  // 表示
  const viewItems = [...VIEW_COMMON]
  if (context === 'doc') viewItems.push(...VIEW_DOC)
  categories.push({ category: '表示', icon: '👁', sections: [{ title: '表示', items: viewItems }] })

  // ファイル / プレゼンテーション
  if (context === 'slides') {
    categories.push({
      category: 'プレゼンテーション',
      icon: '🎬',
      sections: [
        { title: 'プレゼン操作', items: PRESENTATION_ITEMS },
        { title: 'プレゼン中のツール', items: PRESENTATION_TOOLS },
      ],
    })
  }

  return categories
}

export default function ShortcutsHelp({ open, onClose, context }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) { setSearchQuery(''); setActiveCategory(null) }
  }, [open])

  const categories = useMemo(() => buildCategories(context), [context])

  const totalCount = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.sections.reduce((s, sec) => s + sec.items.length, 0), 0),
    [categories],
  )

  // Filter by search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let cats = categories

    // Category tab filter
    if (activeCategory) {
      cats = cats.filter(c => c.category === activeCategory)
    }

    if (!q) return cats

    return cats
      .map(cat => ({
        ...cat,
        sections: cat.sections
          .map(sec => ({
            ...sec,
            items: sec.items.filter(
              item => item.desc.toLowerCase().includes(q) || item.keys.toLowerCase().includes(q),
            ),
          }))
          .filter(sec => sec.items.length > 0),
      }))
      .filter(cat => cat.sections.length > 0)
  }, [categories, searchQuery, activeCategory])

  const filteredCount = filteredCategories.reduce(
    (sum, cat) => sum + cat.sections.reduce((s, sec) => s + sec.items.length, 0),
    0,
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-scale-in max-h-[85vh] flex flex-col">
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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-5 pt-2 pb-1 flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
              !activeCategory
                ? 'bg-indigo-500/15 text-indigo-400'
                : 'text-slate-500 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            すべて
          </button>
          {categories.map(cat => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.category
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {/* Shortcuts grid */}
        <div className="flex-1 overflow-y-auto p-5 pt-2 custom-scrollbar">
          {filteredCategories.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">一致するショートカットがありません</p>
          ) : (
            <div className="space-y-5">
              {filteredCategories.map((cat) => (
                <div key={cat.category}>
                  <h3 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    {cat.category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
                    {cat.sections.map(sec => (
                      <div key={sec.title} className="mb-3">
                        {cat.sections.length > 1 && (
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 mt-1">
                            {sec.title}
                          </p>
                        )}
                        <div className="space-y-0">
                          {sec.items.map((s) => (
                            <ShortcutRow key={s.keys + s.desc} keys={s.keys} desc={s.desc} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            {searchQuery.trim() ? `${filteredCount}/${totalCount} 件表示中` : `${totalCount} 件のショートカット`}
          </span>
          <span className="text-[10px] text-slate-600">
            macOS では Ctrl → ⌘ (Command)
          </span>
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  const keyParts = keys.split(/(\s*\+\s*|\s*\/\s*)/)

  return (
    <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-800/50 group">
      <span className="text-[13px] text-slate-300 group-hover:text-white transition-colors truncate mr-2">{desc}</span>
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
              className="text-[10px] font-mono bg-slate-800 border border-slate-600 text-slate-400 px-1.5 py-0.5 rounded min-w-[22px] text-center"
            >
              {trimmed}
            </kbd>
          )
        })}
      </div>
    </div>
  )
}
