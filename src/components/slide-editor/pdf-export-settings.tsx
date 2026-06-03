'use client'

import { useState } from 'react'
import { X, FileText, Zap, Feather } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onExport: (quality: 'high' | 'standard' | 'light') => void
}

const QUALITY_OPTIONS = [
  {
    key: 'high' as const,
    label: '高品質',
    desc: '印刷向け・ファイルサイズ大',
    icon: FileText,
    estimate: '約 5〜15 MB',
  },
  {
    key: 'standard' as const,
    label: '標準',
    desc: 'バランス重視',
    icon: Zap,
    estimate: '約 2〜8 MB',
  },
  {
    key: 'light' as const,
    label: '軽量',
    desc: 'メール送付向け・ファイルサイズ小',
    icon: Feather,
    estimate: '約 0.5〜3 MB',
  },
] as const

export default function PdfExportSettings({ open, onClose, onExport }: Props) {
  const [selected, setSelected] = useState<'high' | 'standard' | 'light'>('standard')

  if (!open) return null

  const activeOption = QUALITY_OPTIONS.find((o) => o.key === selected)!

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[440px] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">PDFエクスポート設定</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          {QUALITY_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isActive = selected === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  isActive
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isActive ? 'border-blue-500' : 'border-slate-600'
                  }`}
                >
                  {isActive && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                </div>
                <Icon size={18} className="flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-slate-500">{opt.desc}</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mb-5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center">
          <span className="text-xs text-slate-500">推定ファイルサイズ</span>
          <div className="text-sm font-medium text-slate-300">{activeOption.estimate}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onExport(selected)
              onClose()
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            エクスポート
          </button>
        </div>
      </div>
    </div>
  )
}
