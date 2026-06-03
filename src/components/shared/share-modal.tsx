'use client'

import { useState, useEffect } from 'react'
import { Share2, Globe, Check, X, Lock, Clock, Copy, Eye, EyeOff } from 'lucide-react'
import type { SlidesDocument, DocDocument } from '@/types'
import { exportSlidesToHTML, exportDocToHTML } from '@/lib/export/export-utils'

interface ShareSettings {
  id: string
  password?: string
  expiresAt?: string // ISO date string
  createdAt: string
}

function generateShareId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

function saveShareSettings(docId: string, settings: ShareSettings) {
  try {
    const allShares = JSON.parse(localStorage.getItem('doccraft-shares') || '{}')
    allShares[docId] = settings
    localStorage.setItem('doccraft-shares', JSON.stringify(allShares))
  } catch { /* ignore */ }
}

function loadShareSettings(docId: string): ShareSettings | null {
  try {
    const allShares = JSON.parse(localStorage.getItem('doccraft-shares') || '{}')
    return allShares[docId] || null
  } catch {
    return null
  }
}

interface Props {
  doc: SlidesDocument | DocDocument
  open: boolean
  onClose: () => void
}

export default function ShareModal({ doc, open, onClose }: Props) {
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [passwordEnabled, setPasswordEnabled] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [expiry, setExpiry] = useState<'1d' | '7d' | '30d' | 'none'>('none')
  const [shareId, setShareId] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setShareUrl('')
      setSettingsSaved(false)
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

    // Load existing share settings
    const existing = loadShareSettings(doc.meta.id)
    if (existing) {
      setShareId(existing.id)
      setPasswordEnabled(!!existing.password)
      setPassword(existing.password || '')
      if (existing.expiresAt) {
        const now = new Date()
        const exp = new Date(existing.expiresAt)
        const diffDays = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) setExpiry('1d')
        else if (diffDays <= 7) setExpiry('7d')
        else if (diffDays <= 30) setExpiry('30d')
        else setExpiry('none')
      } else {
        setExpiry('none')
      }
    } else {
      setShareId(generateShareId())
      setPasswordEnabled(false)
      setPassword('')
      setExpiry('none')
    }
  }, [open, doc])

  function getExpiryDate(): string | undefined {
    if (expiry === 'none') return undefined
    const now = new Date()
    const days = expiry === '1d' ? 1 : expiry === '7d' ? 7 : 30
    now.setDate(now.getDate() + days)
    return now.toISOString()
  }

  function getShareUrl(): string {
    const base = window.location.href.split('?')[0]
    return `${base}?share=${shareId}`
  }

  function handleSaveSettings() {
    const settings: ShareSettings = {
      id: shareId,
      password: passwordEnabled && password ? password : undefined,
      expiresAt: getExpiryDate(),
      createdAt: new Date().toISOString(),
    }
    saveShareSettings(doc.meta.id, settings)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  function handleCopyLink() {
    const url = getShareUrl()
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

  function getExpiryLabel(): string {
    const existing = loadShareSettings(doc.meta.id)
    if (!existing?.expiresAt) return ''
    const exp = new Date(existing.expiresAt)
    const now = new Date()
    if (exp < now) return '(期限切れ)'
    return `(${exp.toLocaleDateString('ja-JP')} まで)`
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
          {/* Share Link */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">共有リンク</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getShareUrl()}
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
                  <>
                    <Copy size={14} /> コピー
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              ※ ローカルストレージ保存のため、同じブラウザでのみ閲覧可能です
            </p>
          </div>

          {/* Password Protection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Lock size={12} /> パスワード保護
              </label>
              <button
                onClick={() => setPasswordEnabled(!passwordEnabled)}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  passwordEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                    passwordEnabled ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            {passwordEnabled && (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Expiry */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Clock size={12} /> 有効期限 <span className="text-slate-600">{getExpiryLabel()}</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { value: '1d', label: '1日' },
                { value: '7d', label: '7日' },
                { value: '30d', label: '30日' },
                { value: 'none', label: '無期限' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExpiry(opt.value)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors border ${
                    expiry === opt.value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save Settings Button */}
          <button
            onClick={handleSaveSettings}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            {settingsSaved ? (
              <>
                <Check size={14} className="text-emerald-400" /> 設定を保存しました
              </>
            ) : (
              '共有設定を保存'
            )}
          </button>

          {/* HTML Preview */}
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
