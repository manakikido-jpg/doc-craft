'use client'

import { useState, useEffect } from 'react'
import { Share2, Globe, Check, X } from 'lucide-react'
import type { SlidesDocument, DocDocument } from '@/types'
import { exportSlidesToHTML, exportDocToHTML } from '@/lib/export-utils'

interface Props {
  doc: SlidesDocument | DocDocument
  open: boolean
  onClose: () => void
}

export default function ShareModal({ doc, open, onClose }: Props) {
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setShareUrl('')
      return
    }
    try {
      const isSlides = doc.meta.type === 'slides'
      const html = isSlides ? exportSlidesToHTML(doc as SlidesDocument) : exportDocToHTML(doc as DocDocument)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      setShareUrl(url)
    } catch {
      setShareUrl('')
    }
  }, [open, doc])

  function handleCopyLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleOpenPreview() {
    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 id="share-title" className="text-lg font-semibold text-white flex items-center gap-2">
            <Share2 size={18} className="text-slate-400" /> 共有
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
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">共有リンク</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all active:scale-95 flex-shrink-0 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check size={14} /> コピー済み
                  </>
                ) : (
                  'コピー'
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              ※ ローカルストレージ保存のため、同じブラウザでのみ閲覧可能です
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">閲覧用エクスポート</label>
            <button
              onClick={handleOpenPreview}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Globe size={16} /> HTMLプレビューを開く
            </button>
            <p className="text-[10px] text-slate-500 mt-1">
              独立したHTMLファイルとしてプレビューできます。印刷/PDF保存も可能です。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
