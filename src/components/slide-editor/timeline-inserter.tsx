'use client'

import { useState, useMemo, useCallback } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { generateId } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (svgDataUrl: string) => void
}

type TimelineStyle = 'horizontal' | 'gantt'

interface TimelineItem {
  id: string
  title: string
  date: string
  color: string
}

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

function createDefaultItems(): TimelineItem[] {
  return [
    { id: generateId(), title: '企画', date: '2025年1月', color: '#6366f1' },
    { id: generateId(), title: '設計', date: '2025年3月', color: '#8b5cf6' },
    { id: generateId(), title: '開発', date: '2025年5月', color: '#06b6d4' },
    { id: generateId(), title: 'テスト', date: '2025年7月', color: '#22c55e' },
    { id: generateId(), title: 'リリース', date: '2025年9月', color: '#f97316' },
  ]
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderHorizontalTimeline(items: TimelineItem[]): string {
  const width = 800
  const height = 200
  const lineY = 100
  const padding = 60
  const usableWidth = width - padding * 2
  const spacing = items.length > 1 ? usableWidth / (items.length - 1) : 0

  const parts: string[] = []

  // Background
  parts.push(`<rect width="${width}" height="${height}" rx="12" ry="12" fill="#1e293b"/>`)

  // Timeline line
  parts.push(`<line x1="${padding}" y1="${lineY}" x2="${width - padding}" y2="${lineY}" stroke="#475569" stroke-width="3" stroke-linecap="round"/>`)

  items.forEach((item, idx) => {
    const x = items.length === 1 ? width / 2 : padding + idx * spacing
    const isAbove = idx % 2 === 0
    const dotRadius = 10

    // Connector line from dot to label
    const labelOffset = 40
    if (isAbove) {
      parts.push(`<line x1="${x}" y1="${lineY - dotRadius}" x2="${x}" y2="${lineY - labelOffset + 8}" stroke="${item.color}" stroke-width="2" stroke-dasharray="3,3"/>`)
    } else {
      parts.push(`<line x1="${x}" y1="${lineY + dotRadius}" x2="${x}" y2="${lineY + labelOffset - 8}" stroke="${item.color}" stroke-width="2" stroke-dasharray="3,3"/>`)
    }

    // Dot
    parts.push(`<circle cx="${x}" cy="${lineY}" r="${dotRadius}" fill="${item.color}" stroke="#1e293b" stroke-width="3"/>`)
    parts.push(`<circle cx="${x}" cy="${lineY}" r="4" fill="white"/>`)

    // Title
    const titleY = isAbove ? lineY - labelOffset - 14 : lineY + labelOffset + 6
    parts.push(`<text x="${x}" y="${titleY}" text-anchor="middle" font-size="13" font-weight="600" fill="#e2e8f0" font-family="system-ui,sans-serif">${escapeXml(item.title)}</text>`)

    // Date
    const dateY = isAbove ? lineY - labelOffset : lineY + labelOffset + 22
    parts.push(`<text x="${x}" y="${dateY}" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui,sans-serif">${escapeXml(item.date)}</text>`)
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${parts.join('\n  ')}
</svg>`

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

function renderGanttChart(items: TimelineItem[]): string {
  const barHeight = 32
  const barGap = 12
  const labelWidth = 120
  const padding = 24
  const chartWidth = 500
  const width = labelWidth + chartWidth + padding * 2
  const height = items.length * (barHeight + barGap) + padding * 2 + 30

  const parts: string[] = []

  // Background
  parts.push(`<rect width="${width}" height="${height}" rx="12" ry="12" fill="#1e293b"/>`)

  // Header
  const headerY = padding
  const months = items.length > 0 ? items.length + 1 : 4
  const colWidth = chartWidth / months
  for (let m = 0; m < months; m++) {
    const mx = labelWidth + padding + m * colWidth
    parts.push(`<text x="${mx + colWidth / 2}" y="${headerY + 12}" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="system-ui,sans-serif">Phase ${m + 1}</text>`)
    // Vertical grid line
    parts.push(`<line x1="${mx}" y1="${headerY + 18}" x2="${mx}" y2="${height - padding}" stroke="#334155" stroke-width="1"/>`)
  }
  // Last grid line
  parts.push(`<line x1="${labelWidth + padding + chartWidth}" y1="${headerY + 18}" x2="${labelWidth + padding + chartWidth}" y2="${height - padding}" stroke="#334155" stroke-width="1"/>`)

  items.forEach((item, idx) => {
    const y = padding + 28 + idx * (barHeight + barGap)

    // Label
    parts.push(`<text x="${padding + labelWidth - 8}" y="${y + barHeight / 2 + 5}" text-anchor="end" font-size="12" font-weight="500" fill="#e2e8f0" font-family="system-ui,sans-serif">${escapeXml(item.title)}</text>`)

    // Bar - stagger start and vary width for visual interest
    const barStart = labelWidth + padding + idx * colWidth * 0.3
    const barWidth = colWidth * (1.2 + Math.random() * 0.6)
    const clampedEnd = Math.min(barStart + barWidth, labelWidth + padding + chartWidth)
    const actualWidth = clampedEnd - barStart

    parts.push(`<rect x="${barStart}" y="${y}" width="${actualWidth}" height="${barHeight}" rx="6" ry="6" fill="${item.color}" opacity="0.85"/>`)

    // Date label on bar
    parts.push(`<text x="${barStart + actualWidth / 2}" y="${y + barHeight / 2 + 4}" text-anchor="middle" font-size="10" fill="white" font-weight="500" font-family="system-ui,sans-serif">${escapeXml(item.date)}</text>`)
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${parts.join('\n  ')}
</svg>`

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

export default function TimelineInserter({ open, onClose, onInsert }: Props) {
  const [style, setStyle] = useState<TimelineStyle>('horizontal')
  const [items, setItems] = useState<TimelineItem[]>(createDefaultItems)

  const previewDataUrl = useMemo(() => {
    if (items.length === 0) return null
    try {
      return style === 'horizontal'
        ? renderHorizontalTimeline(items)
        : renderGanttChart(items)
    } catch {
      return null
    }
  }, [items, style])

  const handleAddItem = useCallback(() => {
    if (items.length >= 8) return
    setItems(prev => [
      ...prev,
      {
        id: generateId(),
        title: `項目${prev.length + 1}`,
        date: '2025年',
        color: COLOR_PALETTE[prev.length % COLOR_PALETTE.length],
      },
    ])
  }, [items.length])

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
  }, [])

  const handleUpdateItem = useCallback((id: string, field: keyof TimelineItem, value: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it))
  }, [])

  const handleInsert = useCallback(() => {
    if (items.length === 0 || !previewDataUrl) return
    onInsert(previewDataUrl)
    onClose()
  }, [items, previewDataUrl, onInsert, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[700px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h2 className="text-base font-semibold text-slate-100">タイムライン</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Style selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">スタイル</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStyle('horizontal')}
                className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                  style === 'horizontal'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                横型タイムライン
              </button>
              <button
                onClick={() => setStyle('gantt')}
                className={`px-4 py-1.5 text-sm rounded-lg border transition-colors ${
                  style === 'gantt'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ガントチャート
              </button>
            </div>
          </div>

          {/* Items list */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400">項目</label>
              <button
                onClick={handleAddItem}
                disabled={items.length >= 8}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} />
                追加
              </button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2">
                  {/* Color picker */}
                  <input
                    type="color"
                    value={item.color}
                    onChange={e => handleUpdateItem(item.id, 'color', e.target.value)}
                    className="w-7 h-7 rounded border border-slate-600 cursor-pointer bg-transparent"
                  />
                  {/* Title */}
                  <input
                    type="text"
                    value={item.title}
                    onChange={e => handleUpdateItem(item.id, 'title', e.target.value)}
                    placeholder="タイトル"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {/* Date */}
                  <input
                    type="text"
                    value={item.date}
                    onChange={e => handleUpdateItem(item.id, 'date', e.target.value)}
                    placeholder="日付/期間"
                    className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length <= 2}
                    className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">プレビュー</label>
            <div className="w-full min-h-[120px] bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center p-4 overflow-auto">
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="タイムラインプレビュー" className="max-w-full" />
              ) : (
                <span className="text-slate-500 text-sm">項目を追加するとプレビューされます</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleInsert}
            disabled={items.length === 0 || !previewDataUrl}
            className="px-4 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            挿入
          </button>
        </div>
      </div>
    </div>
  )
}
