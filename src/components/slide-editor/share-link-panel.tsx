'use client'

import { useState, useMemo } from 'react'
import { X, Copy, Check, Link, QrCode, Lock, Clock } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  docId: string
  title: string
}

const EXPIRATION_OPTIONS = [
  { key: 'none' as const, label: 'なし' },
  { key: '24h' as const, label: '24時間' },
  { key: '7d' as const, label: '7日' },
  { key: '30d' as const, label: '30日' },
] as const

export default function ShareLinkPanel({ open, onClose, docId, title }: Props) {
  const [copied, setCopied] = useState(false)
  const [expiration, setExpiration] = useState<'none' | '24h' | '7d' | '30d'>('none')
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [password, setPassword] = useState('')

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/slides/${docId}?view=readonly`
  }, [docId])

  if (!open) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Simple QR code SVG generator (using a basic visual representation)
  function renderQrPlaceholder() {
    // Generate a deterministic pattern from the URL for a visual QR-like display
    const size = 21
    const moduleSize = 5
    const totalSize = size * moduleSize
    const modules: boolean[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => false),
    )

    // Finder patterns (top-left, top-right, bottom-left)
    function setFinderPattern(startR: number, startC: number) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            modules[startR + r][startC + c] = true
          }
        }
      }
    }

    setFinderPattern(0, 0)
    setFinderPattern(0, size - 7)
    setFinderPattern(size - 7, 0)

    // Fill in data area with a hash-based pattern
    let hash = 0
    for (let i = 0; i < shareUrl.length; i++) {
      hash = ((hash << 5) - hash + shareUrl.charCodeAt(i)) | 0
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!modules[r][c]) {
          hash = ((hash << 5) - hash + r * size + c) | 0
          modules[r][c] = (Math.abs(hash) % 3) === 0
        }
      }
    }

    const rects: string[] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c]) {
          rects.push(
            `<rect x="${c * moduleSize}" y="${r * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#e2e8f0"/>`
          )
        }
      }
    }

    return `<svg viewBox="0 0 ${totalSize} ${totalSize}" width="120" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="${totalSize}" height="${totalSize}" fill="#1e293b"/>${rects.join('')}</svg>`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[480px] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
            <Link size={18} />
            共有リンク
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Title display */}
        <div className="mb-4 text-sm text-slate-400">
          <span className="text-slate-500">タイトル:</span> {title}
        </div>

        {/* Share URL with copy */}
        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-slate-500">共有URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 font-mono truncate"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 flex-shrink-0"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="mb-4 flex flex-col items-center rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="mb-2 flex items-center gap-1 text-xs text-slate-500">
            <QrCode size={12} />
            QRコード
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: renderQrPlaceholder() }}
          />
        </div>

        {/* Expiration */}
        <div className="mb-4">
          <label className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-500">
            <Clock size={12} />
            有効期限
          </label>
          <div className="flex gap-2">
            {EXPIRATION_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setExpiration(opt.key)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs transition ${
                  expiration === opt.key
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Password protection */}
        <div className="mb-5">
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={passwordEnabled}
              onChange={(e) => setPasswordEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-blue-500"
            />
            <Lock size={14} />
            パスワード保護
          </label>
          {passwordEnabled && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              className="mt-2 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
