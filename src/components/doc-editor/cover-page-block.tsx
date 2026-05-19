'use client'

import { useState } from 'react'

interface Props {
  data?: Record<string, string>
  onUpdateData?: (data: Record<string, string>) => void
}

const TEMPLATES = [
  {
    id: 'minimal',
    label: 'ミニマル',
    colors: { bg: 'from-slate-900 to-slate-800', title: 'text-white', accent: 'border-indigo-500' },
  },
  {
    id: 'corporate',
    label: 'ビジネス',
    colors: { bg: 'from-slate-950 to-slate-900', title: 'text-white', accent: 'border-blue-500' },
  },
  {
    id: 'creative',
    label: 'クリエイティブ',
    colors: { bg: 'from-indigo-950 to-purple-950', title: 'text-white', accent: 'border-violet-500' },
  },
  {
    id: 'elegant',
    label: 'エレガント',
    colors: { bg: 'from-amber-950 to-stone-900', title: 'text-amber-100', accent: 'border-amber-500' },
  },
  {
    id: 'modern',
    label: 'モダン',
    colors: { bg: 'from-emerald-950 to-teal-900', title: 'text-emerald-100', accent: 'border-emerald-500' },
  },
]

export default function CoverPageBlock({ data, onUpdateData }: Props) {
  const [editing, setEditing] = useState(false)
  const template = data?.template || 'minimal'
  const title = data?.coverTitle || ''
  const subtitle = data?.coverSubtitle || ''
  const author = data?.coverAuthor || ''
  const date = data?.coverDate || new Date().toLocaleDateString('ja-JP')
  const organization = data?.coverOrg || ''

  const tmpl = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0]

  function save(field: string, value: string) {
    onUpdateData?.({ ...data, [field]: value } as Record<string, string>)
  }

  if (editing) {
    return (
      <div className="my-4 p-6 border border-slate-700 rounded-xl bg-slate-800/50 space-y-3">
        <h3 className="text-sm font-semibold text-white mb-3">表紙を編集</h3>
        <div className="flex items-center gap-2 mb-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => save('template', t.id)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${template === t.id ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => save('coverTitle', e.target.value)}
          placeholder="タイトル"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-lg focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={subtitle}
          onChange={(e) => save('coverSubtitle', e.target.value)}
          placeholder="サブタイトル"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={author}
          onChange={(e) => save('coverAuthor', e.target.value)}
          placeholder="著者名"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={organization}
          onChange={(e) => save('coverOrg', e.target.value)}
          placeholder="組織名"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={date}
          onChange={(e) => save('coverDate', e.target.value)}
          placeholder="日付"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
        />
        <button onClick={() => setEditing(false)} className="text-xs text-indigo-400 hover:text-indigo-300">
          完了
        </button>
      </div>
    )
  }

  return (
    <div
      className={`my-4 rounded-xl overflow-hidden cursor-pointer bg-gradient-to-br ${tmpl.colors.bg} border border-slate-700/50`}
      onClick={() => setEditing(true)}
      style={{ pageBreakAfter: 'always' }}
    >
      <div className="px-12 py-16 flex flex-col min-h-[400px]">
        {/* Accent line */}
        <div
          className={`w-16 h-1 ${tmpl.colors.accent} bg-current rounded mb-8`}
          style={{ borderColor: 'currentColor' }}
        />

        <div className="flex-1 flex flex-col justify-center">
          <h1 className={`text-3xl font-bold ${tmpl.colors.title} leading-tight mb-3`}>
            {title || <span className="opacity-30">タイトルを入力</span>}
          </h1>
          {(subtitle || !title) && (
            <p className="text-lg text-slate-400 mb-8">
              {subtitle || <span className="opacity-30">サブタイトル</span>}
            </p>
          )}
        </div>

        <div className="mt-auto pt-8 border-t border-slate-700/50">
          <div className="flex items-end justify-between">
            <div>
              {author && <div className="text-sm text-slate-300 font-medium">{author}</div>}
              {organization && <div className="text-xs text-slate-500">{organization}</div>}
            </div>
            {date && <div className="text-xs text-slate-500">{date}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
