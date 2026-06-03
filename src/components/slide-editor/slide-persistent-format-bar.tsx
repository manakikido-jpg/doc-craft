'use client'

import { useState } from 'react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Type,
  CaseSensitive,
  Minus,
  Plus,
  Palette,
  ChevronDown,
  Underline,
  Strikethrough,
} from 'lucide-react'
import type { SlideElement, SlideTextElement } from '@/types'

interface Props {
  activeSlideId: string | undefined
  elements: SlideElement[]
  selectedIds: string[]
  onUpdateProps: (slideId: string, elementId: string, props: Partial<SlideTextElement>) => void
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96]

const FONT_FAMILIES = [
  { label: 'ゴシック', value: 'sans-serif' },
  { label: '明朝', value: 'serif' },
  { label: '等幅', value: 'monospace' },
  { label: 'Yu Gothic', value: '"Yu Gothic", sans-serif' },
  { label: 'Yu Mincho', value: '"Yu Mincho", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
]

const FONT_WEIGHTS: { label: string; value: SlideTextElement['fontWeight'] }[] = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black', value: '900' },
]

const COLOR_ROWS = [
  // Grayscale
  { label: 'グレー系', colors: ['#ffffff', '#f1f5f9', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#000000'] },
  // Warm
  { label: '暖色系', colors: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'] },
  { label: 'オレンジ', colors: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'] },
  { label: '黄色系', colors: ['#fefce8', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'] },
  // Cool
  { label: '緑系', colors: ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'] },
  { label: '青系', colors: ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'] },
  { label: '紫系', colors: ['#f5f3ff', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'] },
  { label: 'ピンク', colors: ['#fdf2f8', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'] },
]

export default function SlidePersistentFormatBar({ activeSlideId, elements, selectedIds, onUpdateProps }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Get selected text element
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const selectedEl = selectedId
    ? elements.find(
        (e) =>
          e.id === selectedId &&
          e.type !== 'image' &&
          e.type !== 'shape' &&
          e.type !== 'table' &&
          e.type !== 'connector' &&
          e.type !== 'video' &&
          e.type !== 'audio' &&
          e.type !== 'chart',
      )
    : null
  const textEl = selectedEl as SlideTextElement | undefined
  const disabled = !textEl || !activeSlideId

  function update(props: Partial<SlideTextElement>) {
    if (!activeSlideId || !selectedId) return
    onUpdateProps(activeSlideId, selectedId, props)
  }

  function btnClass(active?: boolean) {
    return `w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
      disabled
        ? 'text-slate-600 cursor-not-allowed'
        : active
          ? 'bg-indigo-500 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`
  }

  const currentFontSize = textEl?.fontSize ?? 32
  const currentFontFamily = textEl?.fontFamily ?? 'sans-serif'
  const currentFontWeight = textEl?.fontWeight ?? '400'
  const currentAlign = textEl?.align ?? 'left'
  const currentColor = textEl?.color ?? '#ffffff'
  const isBold = Number(currentFontWeight) >= 700

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-800 bg-slate-900/80 shrink-0 relative">
      {/* Font family dropdown */}
      <div className="relative">
        <button
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors min-w-[80px] ${
            disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={() => !disabled && setOpenMenu(openMenu === 'font' ? null : 'font')}
          disabled={disabled}
        >
          <CaseSensitive size={13} />
          <span className="truncate max-w-[60px]">
            {FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label ?? 'ゴシック'}
          </span>
          <ChevronDown size={10} />
        </button>
        {openMenu === 'font' && (
          <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-40 max-h-56 overflow-y-auto z-50">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.value}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 ${
                  currentFontFamily === f.value ? 'text-indigo-400' : 'text-slate-300'
                } hover:text-white`}
                style={{ fontFamily: f.value }}
                onClick={() => {
                  update({ fontFamily: f.value })
                  setOpenMenu(null)
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-700" />

      {/* Font size: decrease / value / increase */}
      <button
        className={btnClass()}
        disabled={disabled}
        onClick={() => {
          const idx = FONT_SIZES.findIndex((s) => s >= currentFontSize)
          const prev = FONT_SIZES[Math.max(0, (idx > 0 ? idx : FONT_SIZES.length) - 1)]
          update({ fontSize: prev })
        }}
        title="フォントサイズを小さく"
      >
        <Minus size={13} />
      </button>
      <div className="relative">
        <button
          className={`h-7 px-1.5 flex items-center justify-center rounded text-xs min-w-[42px] transition-colors ${
            disabled ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-slate-700'
          }`}
          onClick={() => !disabled && setOpenMenu(openMenu === 'size' ? null : 'size')}
          disabled={disabled}
        >
          {currentFontSize}px
        </button>
        {openMenu === 'size' && (
          <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-20 max-h-48 overflow-y-auto z-50">
            {FONT_SIZES.map((s) => (
              <button
                key={s}
                className={`w-full text-left px-3 py-1 text-xs hover:bg-slate-800 ${
                  currentFontSize === s ? 'text-indigo-400' : 'text-slate-300'
                } hover:text-white`}
                onClick={() => {
                  update({ fontSize: s })
                  setOpenMenu(null)
                }}
              >
                {s}px
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        className={btnClass()}
        disabled={disabled}
        onClick={() => {
          const idx = FONT_SIZES.findIndex((s) => s > currentFontSize)
          const next = FONT_SIZES[idx >= 0 ? idx : FONT_SIZES.length - 1]
          update({ fontSize: next })
        }}
        title="フォントサイズを大きく"
      >
        <Plus size={13} />
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Font weight dropdown */}
      <div className="relative">
        <button
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors ${
            disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={() => !disabled && setOpenMenu(openMenu === 'weight' ? null : 'weight')}
          disabled={disabled}
        >
          <Bold size={13} className={isBold ? 'text-indigo-400' : ''} />
          <span className="max-lg:hidden">
            {FONT_WEIGHTS.find((w) => w.value === currentFontWeight)?.label ?? 'Regular'}
          </span>
          <ChevronDown size={10} />
        </button>
        {openMenu === 'weight' && (
          <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-32 z-50">
            {FONT_WEIGHTS.map((w) => (
              <button
                key={w.value}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 ${
                  currentFontWeight === w.value ? 'text-indigo-400' : 'text-slate-300'
                } hover:text-white`}
                style={{ fontWeight: Number(w.value) }}
                onClick={() => {
                  update({ fontWeight: w.value })
                  setOpenMenu(null)
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-700" />

      {/* Alignment */}
      <button
        className={btnClass(currentAlign === 'left')}
        disabled={disabled}
        onClick={() => update({ align: 'left' })}
        title="左揃え"
      >
        <AlignLeft size={13} />
      </button>
      <button
        className={btnClass(currentAlign === 'center')}
        disabled={disabled}
        onClick={() => update({ align: 'center' })}
        title="中央揃え"
      >
        <AlignCenter size={13} />
      </button>
      <button
        className={btnClass(currentAlign === 'right')}
        disabled={disabled}
        onClick={() => update({ align: 'right' })}
        title="右揃え"
      >
        <AlignRight size={13} />
      </button>
      <button
        onClick={() => {
          if (!activeSlideId || !selectedId) return
          onUpdateProps(activeSlideId, selectedId, { align: 'justify' } as any)
        }}
        className={`p-1 rounded ${(textEl?.align as string) === 'justify' ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
        disabled={disabled}
        title="両端揃え"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Text color */}
      <div className="relative">
        <button
          className={`h-7 px-2 flex items-center gap-1.5 rounded text-xs transition-colors ${
            disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={() => !disabled && setOpenMenu(openMenu === 'color' ? null : 'color')}
          disabled={disabled}
          title="テキスト色"
        >
          <Palette size={13} />
          <span
            className="w-4 h-3 rounded-sm border border-slate-600"
            style={{ background: currentColor }}
          />
        </button>
        {openMenu === 'color' && (
          <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">テキスト色</p>
            <div className="space-y-1">
              {COLOR_ROWS.map((row) => (
                <div key={row.label} className="flex items-center gap-0.5">
                  {row.colors.map((c) => (
                    <button
                      key={c}
                      className={`w-6 h-6 rounded-md border-2 hover:scale-125 transition-all ${
                        currentColor === c ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-110' : 'border-transparent hover:border-slate-400'
                      }`}
                      style={{ background: c }}
                      title={c}
                      onClick={() => {
                        update({ color: c })
                        setOpenMenu(null)
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-2">
              <label className="text-[10px] text-slate-400">カスタム:</label>
              <input
                type="color"
                value={currentColor}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-600 bg-transparent"
                onChange={(e) => update({ color: e.target.value })}
              />
              <span className="text-xs text-slate-400 font-mono">{currentColor}</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-700" />

      {/* Underline */}
      <button
        className={btnClass(textEl?.underline)}
        disabled={disabled}
        onClick={() => update({ underline: !textEl?.underline })}
        title="下線"
      >
        <Underline size={13} />
      </button>

      {/* Strikethrough */}
      <button
        className={btnClass(textEl?.strikethrough)}
        disabled={disabled}
        onClick={() => update({ strikethrough: !textEl?.strikethrough })}
        title="取り消し線"
      >
        <Strikethrough size={13} />
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Line height */}
      <div className="relative">
        <button
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors ${
            disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={() => !disabled && setOpenMenu(openMenu === 'lineHeight' ? null : 'lineHeight')}
          disabled={disabled}
          title="行間"
        >
          <span className="text-[10px] font-mono">行間</span>
          <ChevronDown size={10} />
        </button>
        {openMenu === 'lineHeight' && (
          <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-24 z-50">
            {[1.0, 1.15, 1.3, 1.5, 1.8, 2.0].map((lh) => (
              <button
                key={lh}
                className={`w-full text-left px-3 py-1 text-xs hover:bg-slate-800 ${
                  (textEl?.lineHeight ?? 1.3) === lh ? 'text-indigo-400' : 'text-slate-300'
                } hover:text-white`}
                onClick={() => {
                  update({ lineHeight: lh })
                  setOpenMenu(null)
                }}
              >
                {lh.toFixed(lh % 1 === 0 ? 1 : 2)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Letter spacing */}
      <div className="relative">
        <button
          className={`h-7 px-2 flex items-center gap-1 rounded text-xs transition-colors ${
            disabled ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          onClick={() => !disabled && setOpenMenu(openMenu === 'spacing' ? null : 'spacing')}
          disabled={disabled}
          title="文字間隔"
        >
          <span className="text-[10px] font-mono">字間</span>
          <ChevronDown size={10} />
        </button>
        {openMenu === 'spacing' && (
          <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2.5 z-50 w-36">
            <label className="text-[10px] text-slate-400 block mb-1.5">文字間隔 (em)</label>
            <input
              type="range"
              min="-0.05"
              max="0.3"
              step="0.01"
              value={textEl?.letterSpacing ?? 0}
              className="w-full accent-indigo-500"
              onChange={(e) => update({ letterSpacing: parseFloat(e.target.value) })}
            />
            <div className="text-[10px] text-slate-400 text-center mt-1">
              {(textEl?.letterSpacing ?? 0).toFixed(2)}em
            </div>
          </div>
        )}
      </div>

      {/* Paragraph spacing */}
      <div className="flex items-center border-l border-slate-700 pl-2 ml-1 gap-1">
        <span className="text-[9px] text-slate-500">段落</span>
        <div className="flex items-center gap-0.5">
          <label className="text-[8px] text-slate-500">前</label>
          <input
            type="number"
            min={0}
            max={48}
            step={4}
            value={(textEl as any)?.paragraphSpacingBefore || 0}
            onChange={(e) => {
              if (!activeSlideId || !selectedId) return
              onUpdateProps(activeSlideId, selectedId, { paragraphSpacingBefore: Number(e.target.value) } as any)
            }}
            className="w-8 bg-slate-800 border border-slate-700 rounded text-[10px] text-center text-slate-300 px-0.5"
            disabled={disabled}
          />
          <label className="text-[8px] text-slate-500">後</label>
          <input
            type="number"
            min={0}
            max={48}
            step={4}
            value={(textEl as any)?.paragraphSpacingAfter || 0}
            onChange={(e) => {
              if (!activeSlideId || !selectedId) return
              onUpdateProps(activeSlideId, selectedId, { paragraphSpacingAfter: Number(e.target.value) } as any)
            }}
            className="w-8 bg-slate-800 border border-slate-700 rounded text-[10px] text-center text-slate-300 px-0.5"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Vertical text toggle */}
      <div className="flex items-center border-l border-slate-700 pl-2 ml-1">
        <button
          onClick={() => {
            if (!activeSlideId || !textEl) return
            const current = (textEl as any).writingMode || 'horizontal'
            onUpdateProps(activeSlideId, textEl.id, {
              writingMode: current === 'horizontal' ? 'vertical' : 'horizontal'
            } as any)
          }}
          className={`p-1 rounded text-xs ${(textEl as any)?.writingMode === 'vertical' ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
          disabled={disabled}
          title="縦書き/横書き"
        >
          縦
        </button>
      </div>

      {/* Text columns selector */}
      <div className="flex items-center border-l border-slate-700 pl-2 ml-1 gap-0.5">
        {[1, 2, 3].map(cols => (
          <button
            key={cols}
            onClick={() => {
              if (!activeSlideId || !textEl) return
              onUpdateProps(activeSlideId, textEl.id, { textColumns: cols } as any)
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] ${((textEl as any)?.textColumns || 1) === cols ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
            disabled={disabled}
            title={`${cols}段組`}
          >
            {cols}段
          </button>
        ))}
      </div>

      {/* Auto-size selector */}
      <div className="flex items-center border-l border-slate-700 pl-2 ml-1 gap-0.5">
        <select
          className="bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 px-1 py-0.5"
          value={(textEl as any)?.autoSize || 'shrink'}
          onChange={(e) => {
            if (!activeSlideId || !textEl) return
            onUpdateProps(activeSlideId, textEl.id, { autoSize: e.target.value } as any)
          }}
          disabled={disabled}
          title="テキストサイズ調整"
        >
          <option value="none">固定</option>
          <option value="shrink">縮小</option>
          <option value="grow">拡張</option>
        </select>
      </div>

      {/* Superscript/Subscript buttons */}
      <div className="flex items-center border-l border-slate-700 pl-2 ml-1 gap-0.5">
        <button
          onClick={() => {
            if (!activeSlideId || !textEl) return
            onUpdateProps(activeSlideId, textEl.id, { superscript: !(textEl as any).superscript, subscript: false } as any)
          }}
          className={`p-1 rounded text-[10px] font-bold ${(textEl as any)?.superscript ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
          disabled={disabled}
          title="上付き"
        >
          X²
        </button>
        <button
          onClick={() => {
            if (!activeSlideId || !textEl) return
            onUpdateProps(activeSlideId, textEl.id, { subscript: !(textEl as any).subscript, superscript: false } as any)
          }}
          className={`p-1 rounded text-[10px] font-bold ${(textEl as any)?.subscript ? 'bg-indigo-500/30 text-indigo-300' : 'text-slate-400 hover:text-white'}`}
          disabled={disabled}
          title="下付き"
        >
          X₂
        </button>
      </div>

      {/* Hint when no element selected */}
      {disabled && (
        <span className="text-[10px] text-slate-600 ml-2 whitespace-nowrap">
          テキスト要素を選択して書式を変更
        </span>
      )}
    </div>
  )
}
