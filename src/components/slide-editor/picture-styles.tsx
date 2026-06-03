'use client'

import { X } from 'lucide-react'

interface PictureStyle {
  label: string
  borderRadius: string
  boxShadow: string
  border: string
  transform?: string
}

const PICTURE_STYLES: PictureStyle[] = [
  { label: 'シンプル枠', borderRadius: '0', boxShadow: 'none', border: '3px solid #ffffff' },
  { label: '角丸', borderRadius: '12px', boxShadow: 'none', border: 'none' },
  { label: '影付き', borderRadius: '4px', boxShadow: '4px 4px 12px rgba(0,0,0,0.5)', border: 'none' },
  { label: 'ソフト影', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', border: 'none' },
  { label: '白枠+影', borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', border: '4px solid #ffffff' },
  { label: '回転風', borderRadius: '4px', boxShadow: '4px 4px 12px rgba(0,0,0,0.4)', border: '3px solid #ffffff', transform: 'rotate(-3deg)' },
  { label: 'モダン枠', borderRadius: '0', boxShadow: 'none', border: '2px solid #6366f1' },
  { label: '円形', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '3px solid #ffffff' },
  { label: 'ぼかし影', borderRadius: '8px', boxShadow: '0 0 20px rgba(99,102,241,0.3)', border: 'none' },
  { label: 'ダーク枠', borderRadius: '4px', boxShadow: 'none', border: '3px solid #1e293b' },
  { label: '金枠', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '3px solid #d4a867' },
  { label: 'グラデ枠', borderRadius: '8px', boxShadow: '0 0 0 3px rgba(99,102,241,0.5)', border: 'none' },
]

interface Props {
  open: boolean
  onClose: () => void
  onApply: (style: { borderRadius?: string; boxShadow?: string; border?: string; rotation?: number }) => void
  currentImageSrc?: string
}

export default function PictureStyles({ open, onClose, onApply, currentImageSrc }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[560px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100">画像スタイル</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {PICTURE_STYLES.map((style, i) => (
              <button
                key={i}
                onClick={() => {
                  onApply({
                    borderRadius: style.borderRadius,
                    boxShadow: style.boxShadow,
                    border: style.border,
                    rotation: style.transform?.includes('rotate') ? -3 : undefined,
                  })
                  onClose()
                }}
                className="flex flex-col items-center gap-2 rounded-lg p-2 hover:bg-slate-800 transition group"
              >
                <div
                  className="w-20 h-14 bg-cover bg-center flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{
                    backgroundImage: currentImageSrc ? `url(${currentImageSrc})` : 'linear-gradient(135deg, #6366f1, #a855f7)',
                    borderRadius: style.borderRadius,
                    boxShadow: style.boxShadow,
                    border: style.border,
                    transform: style.transform,
                    overflow: 'hidden',
                  }}
                />
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300">{style.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
