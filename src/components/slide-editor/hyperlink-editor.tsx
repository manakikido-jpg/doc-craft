'use client'

import { useState } from 'react'
import { X, Link2, ExternalLink, Trash2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  currentUrl?: string
  onApply: (url: string | undefined) => void
}

export default function HyperlinkEditor({ open, onClose, currentUrl, onApply }: Props) {
  const [url, setUrl] = useState(currentUrl || '')
  const [urlType, setUrlType] = useState<'web' | 'slide' | 'email'>('web')

  if (!open) return null

  function handleApply() {
    let finalUrl = url.trim()
    if (!finalUrl) {
      onApply(undefined)
      onClose()
      return
    }
    if (urlType === 'email' && !finalUrl.startsWith('mailto:')) {
      finalUrl = `mailto:${finalUrl}`
    }
    if (urlType === 'web' && !finalUrl.startsWith('http') && !finalUrl.startsWith('//')) {
      finalUrl = `https://${finalUrl}`
    }
    onApply(finalUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[440px] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Link2 size={18} /> ハイパーリンク
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Link type tabs */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {([
              { key: 'web', label: 'Webサイト' },
              { key: 'email', label: 'メール' },
              { key: 'slide', label: 'スライド' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setUrlType(t.key)}
                className={`flex-1 px-3 py-1.5 text-sm transition ${
                  urlType === t.key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* URL input */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              {urlType === 'web' ? 'URL' : urlType === 'email' ? 'メールアドレス' : 'スライド番号'}
            </label>
            <input
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              placeholder={urlType === 'web' ? 'https://example.com' : urlType === 'email' ? 'user@example.com' : '#3'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>

          {/* Preview */}
          {url.trim() && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ExternalLink size={12} />
              <span className="truncate">{url}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-700 px-5 py-3">
          {currentUrl ? (
            <button
              onClick={() => { onApply(undefined); onClose() }}
              className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 size={14} /> リンクを削除
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              キャンセル
            </button>
            <button onClick={handleApply} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-500">
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
