'use client'

import { useState, useMemo } from 'react'
import { X, Copy, Check } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  presentationUrl: string
  title: string
}

export default function EmbedCodeGenerator({ open, onClose, presentationUrl, title }: Props) {
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(450)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [copied, setCopied] = useState(false)

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (autoPlay) params.set('autoplay', '1')
    if (!showControls) params.set('controls', '0')
    const qs = params.toString()
    return qs ? `${presentationUrl}?${qs}` : presentationUrl
  }, [presentationUrl, autoPlay, showControls])

  const embedCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen title="${title}"></iframe>`

  if (!open) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = embedCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[520px] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">埋め込みコード</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="mb-2 text-xs text-slate-500">プレビュー</div>
          <div className="flex items-center justify-center">
            <div
              className="rounded border border-slate-600 bg-slate-700 flex items-center justify-center"
              style={{
                width: Math.min(width * 0.4, 300),
                height: Math.min(height * 0.4, 200),
              }}
            >
              <span className="text-[10px] text-slate-500">
                {width} x {height}
              </span>
            </div>
          </div>
        </div>

        {/* Width / Height */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            幅
            <input
              type="number"
              min={200}
              max={1920}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            />
          </label>
          <span className="text-slate-500">x</span>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            高さ
            <input
              type="number"
              min={100}
              max={1080}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
            />
          </label>
        </div>

        {/* Toggles */}
        <div className="mb-4 flex flex-col gap-2">
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            自動再生
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showControls}
              onChange={(e) => setShowControls(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            コントロール表示
          </label>
        </div>

        {/* Generated code */}
        <div className="mb-4">
          <div className="mb-1 text-xs text-slate-500">埋め込みコード</div>
          <textarea
            readOnly
            value={embedCode}
            className="w-full h-20 resize-none rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 font-mono"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            閉じる
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'コピー済み' : 'コピー'}
          </button>
        </div>
      </div>
    </div>
  )
}
