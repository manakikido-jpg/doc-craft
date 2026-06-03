'use client'

import { useCallback } from 'react'
import type { CellFormat } from '@/types'

interface CellStylePreset {
  name: string
  format: Partial<CellFormat>
}

const PRESETS: CellStylePreset[] = [
  { name: 'Normal', format: { bgColor: undefined, textColor: undefined, bold: false, fontSize: undefined } },
  { name: 'Good', format: { bgColor: '#166534', textColor: '#bbf7d0', bold: false } },
  { name: 'Bad', format: { bgColor: '#991b1b', textColor: '#fecaca', bold: false } },
  { name: 'Neutral', format: { bgColor: '#854d0e', textColor: '#fef08a', bold: false } },
  { name: 'Heading 1', format: { bgColor: '#1e3a5f', textColor: '#93c5fd', bold: true, fontSize: 16, borderBottom: '2px solid #3b82f6' } },
  { name: 'Heading 2', format: { bgColor: '#1e293b', textColor: '#a5b4fc', bold: true, fontSize: 14, borderBottom: '1px solid #6366f1' } },
  { name: 'Heading 3', format: { bgColor: undefined, textColor: '#a5b4fc', bold: true, fontSize: 12, borderBottom: '1px solid #4f46e5' } },
  { name: 'Heading 4', format: { bgColor: undefined, textColor: '#818cf8', bold: true, italic: true } },
  { name: 'Title', format: { bgColor: undefined, textColor: '#f8fafc', bold: true, fontSize: 18 } },
  { name: 'Total', format: { bgColor: '#334155', textColor: '#f8fafc', bold: true, borderTop: '2px solid #6366f1', borderBottom: '2px solid #6366f1' } },
  { name: 'Note', format: { bgColor: '#1e1b4b', textColor: '#c4b5fd', italic: true } },
  { name: 'Warning', format: { bgColor: '#7c2d12', textColor: '#fed7aa', bold: true } },
  { name: 'Accent 1', format: { bgColor: '#1e40af', textColor: '#dbeafe', bold: false } },
  { name: 'Accent 2', format: { bgColor: '#166534', textColor: '#dcfce7', bold: false } },
  { name: 'Accent 3', format: { bgColor: '#9333ea', textColor: '#f3e8ff', bold: false } },
  { name: 'Accent 4', format: { bgColor: '#0891b2', textColor: '#e0f2fe', bold: false } },
  { name: 'Accent 5', format: { bgColor: '#be185d', textColor: '#fce7f3', bold: false } },
  { name: 'Accent 6', format: { bgColor: '#a16207', textColor: '#fef9c3', bold: false } },
]

interface Props {
  open: boolean
  onApply: (format: Partial<CellFormat>) => void
  onClose: () => void
}

export default function CellStyleGallery({ open, onApply, onClose }: Props) {
  const handleSelect = useCallback(
    (preset: CellStylePreset) => {
      onApply(preset.format)
      onClose()
    },
    [onApply, onClose],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-[480px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">セルスタイル</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>

        <div className="p-4 grid grid-cols-3 gap-2 max-h-[400px] overflow-auto">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleSelect(preset)}
              className="text-left px-3 py-2 rounded border border-slate-700 hover:border-indigo-500 transition-colors"
              style={{
                backgroundColor: preset.format.bgColor || '#0f172a',
                color: preset.format.textColor || '#cbd5e1',
                fontWeight: preset.format.bold ? 700 : 400,
                fontSize: preset.format.fontSize ? `${preset.format.fontSize}px` : '12px',
                fontStyle: preset.format.italic ? 'italic' : 'normal',
                borderTop: preset.format.borderTop || undefined,
                borderBottom: preset.format.borderBottom || undefined,
              }}
            >
              <span className="block truncate">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
