'use client'

import { useState } from 'react'

interface Props {
  data?: Record<string, string>
  onUpdateData?: (data: Record<string, string>) => void
}

export default function SignatureBlock({ data, onUpdateData }: Props) {
  const [editing, setEditing] = useState(false)
  const name = data?.name || ''
  const title = data?.title || ''
  const date = data?.date || ''
  const company = data?.company || ''

  function handleSave(field: string, value: string) {
    onUpdateData?.({ ...data, [field]: value } as Record<string, string>)
  }

  return (
    <div className="my-6 max-w-sm" onClick={() => setEditing(true)}>
      <div className="border-t-2 border-slate-600 pt-3">
        <div className="mb-8 h-12 border-b border-dashed border-slate-600 flex items-end pb-1">
          <span className="text-xs text-slate-600 italic">署名欄</span>
        </div>
        {editing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={name}
              onChange={(e) => handleSave('name', e.target.value)}
              placeholder="氏名"
              className="w-full bg-transparent text-sm text-white border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <input
              type="text"
              value={title}
              onChange={(e) => handleSave('title', e.target.value)}
              placeholder="役職"
              className="w-full bg-transparent text-xs text-slate-400 border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <input
              type="text"
              value={company}
              onChange={(e) => handleSave('company', e.target.value)}
              placeholder="会社名"
              className="w-full bg-transparent text-xs text-slate-400 border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <input
              type="text"
              value={date}
              onChange={(e) => handleSave('date', e.target.value)}
              placeholder="日付 (例: 2026年5月18日)"
              className="w-full bg-transparent text-xs text-slate-500 border-b border-slate-700 focus:border-indigo-500 focus:outline-none pb-1"
            />
            <button onClick={() => setEditing(false)} className="text-[10px] text-indigo-400 hover:text-indigo-300">
              完了
            </button>
          </div>
        ) : (
          <div className="cursor-text">
            <div className="text-sm text-white font-medium">
              {name || <span className="text-slate-600 italic">氏名を入力</span>}
            </div>
            {title && <div className="text-xs text-slate-400">{title}</div>}
            {company && <div className="text-xs text-slate-400">{company}</div>}
            {date && <div className="text-xs text-slate-500 mt-1">{date}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
