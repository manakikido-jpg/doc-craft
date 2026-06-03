'use client'

import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (svgDataUrl: string, name: string) => void
}

interface IconDef {
  name: string
  label: string
  path: string
}

const CATEGORIES: { key: string; label: string; icons: IconDef[] }[] = [
  {
    key: 'business',
    label: 'ビジネス',
    icons: [
      { name: 'building', label: 'ビル', path: 'M3 21V3h7v4h4V3h7v18H3zm2-2h3v-3H5v3zm0-5h3v-3H5v3zm0-5h3V6H5v3zm5 10h4v-3h-4v3zm0-5h4v-3h-4v3zm0-5h4V6h-4v3zm5 10h4v-3h-4v3zm0-5h4v-3h-4v3zm0-5h4V6h-4v3z' },
      { name: 'briefcase', label: 'ブリーフケース', path: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z' },
      { name: 'chart-bar', label: '棒グラフ', path: 'M4 20h16M4 20V10m0 10h4V4h4v16h4v-8h4v8' },
      { name: 'dollar', label: 'ドル', path: 'M12 2v20m-4-4a4 4 0 004 4 4 4 0 004-4c0-2-2-3-4-4S8 12 8 10a4 4 0 014-4 4 4 0 014 4' },
      { name: 'handshake', label: '握手', path: 'M2 14l6-6 4 4 8-8m-6 16l3-3 3 3M7 21l-5-5m14-8h5v5' },
      { name: 'trophy', label: 'トロフィー', path: 'M8 21h8m-4-4v4M5 3h14v4a7 7 0 01-14 0V3zm-3 1h3m16 0h3M5 7H2m20 0h-3' },
      { name: 'target', label: 'ターゲット', path: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-5a5 5 0 100-10 5 5 0 000 10zm0-3a2 2 0 100-4 2 2 0 000 4z' },
      { name: 'lightbulb', label: '電球', path: 'M9 21h6m-6-2h6m-3-7v4m-4.5 0a5.5 5.5 0 119 0c0 2-1.5 3-1.5 3H9S7.5 14 7.5 12z' },
      { name: 'calendar', label: 'カレンダー', path: 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4-4v4m8-4v4M4 9h16m-12 4h2m4 0h2m-8 4h2m4 0h2' },
      { name: 'clock', label: '時計', path: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v6l4 2' },
    ],
  },
  {
    key: 'technology',
    label: 'テクノロジー',
    icons: [
      { name: 'laptop', label: 'ノートPC', path: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v8H4V6zm0 10h16l1 2H3l1-2z' },
      { name: 'smartphone', label: 'スマホ', path: 'M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zm5 18h.01' },
      { name: 'cloud', label: 'クラウド', path: 'M18 10a6 6 0 00-11.18-3A4 4 0 004 15h14a3 3 0 001-6z' },
      { name: 'wifi', label: 'Wi-Fi', path: 'M12 20h.01M8.53 16.11a6 6 0 016.95 0M5.64 12.5a10 10 0 0112.73 0M2.1 8.82a14 14 0 0119.8 0' },
      { name: 'database', label: 'データベース', path: 'M12 2C6.48 2 2 3.79 2 6v12c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4zm0 4c5.52 0 10-1.79 10-4M2 12c0 2.21 4.48 4 10 4s10-1.79 10-4' },
      { name: 'code', label: 'コード', path: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
      { name: 'globe', label: '地球', path: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-8-10h16m-8-10a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z' },
      { name: 'lock', label: 'ロック', path: 'M5 11V7a7 7 0 0114 0v4m-16 0h18a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1z' },
      { name: 'shield', label: 'シールド', path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
      { name: 'settings', label: '設定', path: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.94-2.06a1.98 1.98 0 00.4 2.18l.07.07a2.4 2.4 0 01-3.4 3.4l-.06-.07a1.98 1.98 0 00-2.18-.4 2 2 0 00-1.2 1.83V21a2.4 2.4 0 01-4.8 0v-.11a2 2 0 00-1.31-1.83 1.98 1.98 0 00-2.18.4l-.07.07a2.4 2.4 0 01-3.4-3.4l.07-.07a1.98 1.98 0 00.4-2.18A2 2 0 003.05 12.8H3a2.4 2.4 0 010-4.8h.11A2 2 0 004.94 6.7a1.98 1.98 0 00-.4-2.18l-.07-.07a2.4 2.4 0 013.4-3.4l.07.07a1.98 1.98 0 002.18.4h.1A2 2 0 0012 3.45V3a2.4 2.4 0 014.8 0v.11a2 2 0 001.31 1.83 1.98 1.98 0 002.18-.4l.07-.07a2.4 2.4 0 013.4 3.4' },
    ],
  },
  {
    key: 'arrows',
    label: '矢印',
    icons: [
      { name: 'arrow-right', label: '右矢印', path: 'M5 12h14m-7-7l7 7-7 7' },
      { name: 'arrow-left', label: '左矢印', path: 'M19 12H5m7 7l-7-7 7-7' },
      { name: 'arrow-up', label: '上矢印', path: 'M12 19V5m7 7l-7-7-7 7' },
      { name: 'arrow-down', label: '下矢印', path: 'M12 5v14m-7-7l7 7 7-7' },
      { name: 'chevron-right', label: '右シェブロン', path: 'M9 18l6-6-6-6' },
      { name: 'chevron-left', label: '左シェブロン', path: 'M15 18l-6-6 6-6' },
      { name: 'refresh', label: '更新', path: 'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15' },
      { name: 'external-link', label: '外部リンク', path: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6m4-3h6v6m-11 5L21 3' },
    ],
  },
  {
    key: 'people',
    label: '人物',
    icons: [
      { name: 'user', label: 'ユーザー', path: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8z' },
      { name: 'users', label: 'ユーザー複数', path: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8zm8 10v-2a4 4 0 00-3-3.87m-1-12.13a4 4 0 010 7.75' },
      { name: 'team', label: 'チーム', path: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { name: 'person-standing', label: '立つ人', path: 'M12 6a2 2 0 100-4 2 2 0 000 4zm0 0v6m-4 4l4-4 4 4m-4-4v6' },
      { name: 'heart', label: 'ハート', path: 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' },
      { name: 'thumbs-up', label: 'いいね', path: 'M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3' },
    ],
  },
  {
    key: 'general',
    label: '一般',
    icons: [
      { name: 'check', label: 'チェック', path: 'M20 6L9 17l-5-5' },
      { name: 'x-mark', label: 'バツ', path: 'M18 6L6 18M6 6l12 12' },
      { name: 'star', label: '星', path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
      { name: 'flag', label: '旗', path: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zm0 7v-7' },
      { name: 'bookmark', label: 'ブックマーク', path: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z' },
      { name: 'pin', label: 'ピン', path: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zm-9-3a3 3 0 100 6 3 3 0 000-6z' },
      { name: 'search', label: '検索', path: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35' },
      { name: 'mail', label: 'メール', path: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5' },
      { name: 'phone', label: '電話', path: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' },
      { name: 'home', label: 'ホーム', path: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zm6 12V12h6v9' },
    ],
  },
]

function iconToDataUrl(path: string, color: string = '#000000'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="200" height="200" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" /></svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

export default function IconLibrary({ open, onClose, onInsert }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('business')
  const [iconColor, setIconColor] = useState('#000000')

  const filteredIcons = useMemo(() => {
    if (!search.trim()) {
      const cat = CATEGORIES.find((c) => c.key === activeCategory)
      return cat ? cat.icons : []
    }
    const q = search.toLowerCase()
    const all: IconDef[] = []
    for (const cat of CATEGORIES) {
      for (const icon of cat.icons) {
        if (icon.name.includes(q) || icon.label.includes(q)) {
          all.push(icon)
        }
      }
    }
    return all
  }, [search, activeCategory])

  function handleInsertIcon(icon: IconDef) {
    const dataUrl = iconToDataUrl(icon.path, iconColor)
    onInsert(dataUrl, icon.label)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">アイコンライブラリ</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="アイコンを検索..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm text-slate-400">アイコン色:</label>
          <input
            type="color"
            value={iconColor}
            onChange={(e) => setIconColor(e.target.value)}
            className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent"
          />
          <span className="text-xs text-slate-500">{iconColor}</span>
        </div>

        {/* Category Tabs */}
        {!search.trim() && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  activeCategory === cat.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Icon Grid */}
        <div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {filteredIcons.map((icon) => (
            <button
              key={icon.name}
              onClick={() => handleInsertIcon(icon)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-all group"
              title={icon.label}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7"
                fill="none"
                stroke={iconColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={icon.path} />
              </svg>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate w-full text-center">
                {icon.label}
              </span>
            </button>
          ))}
          {filteredIcons.length === 0 && (
            <div className="col-span-6 text-center py-8 text-slate-500 text-sm">
              アイコンが見つかりません
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
