'use client'

import { X, Grid3X3, Palette } from 'lucide-react'
import type { SlideTableElement } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  element: SlideTableElement
  slideId: string
  dispatch: React.Dispatch<any>
}

interface TablePreset {
  name: string
  headerBg: string
  headerText: string
  evenRowBg: string
  oddRowBg: string
  cellText: string
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none'
  borderColor: string
  headerRow: boolean
}

const PRESETS: TablePreset[] = [
  {
    name: 'プロフェッショナル',
    headerBg: '#1e293b',
    headerText: '#ffffff',
    evenRowBg: '#f8fafc',
    oddRowBg: '#ffffff',
    cellText: '#1e293b',
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
    headerRow: true,
  },
  {
    name: 'ストライプ',
    headerBg: '#4f46e5',
    headerText: '#ffffff',
    evenRowBg: '#eef2ff',
    oddRowBg: '#ffffff',
    cellText: '#1e293b',
    borderStyle: 'solid',
    borderColor: '#c7d2fe',
    headerRow: true,
  },
  {
    name: 'ボーダーレス',
    headerBg: '#f1f5f9',
    headerText: '#334155',
    evenRowBg: '#f8fafc',
    oddRowBg: '#ffffff',
    cellText: '#475569',
    borderStyle: 'none',
    borderColor: 'transparent',
    headerRow: false,
  },
  {
    name: 'カラフル',
    headerBg: '#7c3aed',
    headerText: '#ffffff',
    evenRowBg: '#ffffff',
    oddRowBg: '#ffffff',
    cellText: '#1e293b',
    borderStyle: 'solid',
    borderColor: '#ddd6fe',
    headerRow: true,
  },
  {
    name: 'モノクロ',
    headerBg: '#374151',
    headerText: '#f9fafb',
    evenRowBg: '#f3f4f6',
    oddRowBg: '#ffffff',
    cellText: '#111827',
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    headerRow: true,
  },
]

const BORDER_STYLES: { value: 'solid' | 'dashed' | 'dotted' | 'none'; label: string }[] = [
  { value: 'solid', label: '実線' },
  { value: 'dashed', label: '破線' },
  { value: 'dotted', label: '点線' },
  { value: 'none', label: 'なし' },
]

function PreviewGrid({ preset }: { preset: TablePreset }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded" style={{ width: 54, height: 36 }}>
      {Array.from({ length: 9 }, (_, i) => {
        const row = Math.floor(i / 3)
        const isHeader = row === 0 && preset.headerRow
        const isEvenRow = row % 2 === 0
        const bg = isHeader
          ? preset.headerBg
          : isEvenRow
            ? preset.evenRowBg
            : preset.oddRowBg
        const border = preset.borderStyle !== 'none' ? `1px ${preset.borderStyle} ${preset.borderColor}` : 'none'
        return (
          <div
            key={i}
            style={{ background: bg, border, width: 18, height: 12 }}
          />
        )
      })}
    </div>
  )
}

export default function TableStylePanel({ open, onClose, element, slideId, dispatch }: Props) {
  if (!open) return null

  const applyPreset = (preset: TablePreset) => {
    const rows = element.rows
    const cellStyles: Record<string, { bgColor?: string; textColor?: string }> = {}

    rows.forEach((row, ri) => {
      row.forEach((_, ci) => {
        const key = `${ri}-${ci}`
        const isHeader = ri === 0 && preset.headerRow
        const isEvenRow = ri % 2 === 0
        cellStyles[key] = {
          bgColor: isHeader ? preset.headerBg : isEvenRow ? preset.evenRowBg : preset.oddRowBg,
          textColor: isHeader ? preset.headerText : preset.cellText,
        }
      })
    })

    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: {
        cellStyles,
        headerRow: preset.headerRow,
        borderStyle: preset.borderStyle,
        borderColor: preset.borderColor,
      },
    })
  }

  const updateBorderStyle = (borderStyle: 'solid' | 'dashed' | 'dotted' | 'none') => {
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: { borderStyle },
    })
  }

  const updateBorderColor = (borderColor: string) => {
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: { borderColor },
    })
  }

  const toggleHeaderRow = () => {
    dispatch({
      type: 'UPDATE_ELEMENT_PROPS',
      slideId,
      elementId: element.id,
      props: { headerRow: !element.headerRow },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[420px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-indigo-400" />
            <span className="text-white font-medium">テーブルスタイル</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Presets */}
          <div>
            <h3 className="text-sm text-slate-300 font-medium mb-3 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-400" />
              プリセット
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-600 hover:border-indigo-500 hover:bg-slate-700/50 transition-colors text-left group"
                >
                  <PreviewGrid preset={preset} />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Border style */}
          <div>
            <h3 className="text-sm text-slate-300 font-medium mb-3">ボーダースタイル</h3>
            <div className="flex gap-2">
              {BORDER_STYLES.map((bs) => (
                <button
                  key={bs.value}
                  onClick={() => updateBorderStyle(bs.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs transition-colors ${
                    element.borderStyle === bs.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {bs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Border color */}
          <div>
            <h3 className="text-sm text-slate-300 font-medium mb-2">ボーダーカラー</h3>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={element.borderColor || '#cbd5e1'}
                onChange={(e) => updateBorderColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent"
              />
              <span className="text-xs text-slate-400">{element.borderColor || '#cbd5e1'}</span>
            </div>
          </div>

          {/* Header row toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">ヘッダー行</span>
            <button
              onClick={toggleHeaderRow}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                element.headerRow ? 'bg-indigo-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  element.headerRow ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
