'use client'

import { useState } from 'react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Type,
  Strikethrough,
  Superscript,
  Subscript,
  Highlighter,
  List,
  ListOrdered,
  Link,
  Minus,
  CaseSensitive,
} from 'lucide-react'
import type { SlideTextElement } from '@/types'

interface Props {
  onExecCommand: (command: string, value?: string) => void
  onAlign?: (align: 'left' | 'center' | 'right') => void
  currentAlign?: 'left' | 'center' | 'right'
  onUpdateProps?: (props: Partial<SlideTextElement>) => void
  currentElement?: SlideTextElement
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72]
const FONT_FAMILIES = [
  { label: 'ゴシック', value: 'sans-serif' },
  { label: '明朝', value: 'serif' },
  { label: '等幅', value: 'monospace' },
  { label: 'Yu Gothic', value: '"Yu Gothic", sans-serif' },
  { label: 'Yu Mincho', value: '"Yu Mincho", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
]
const LINE_HEIGHTS = [1.0, 1.15, 1.3, 1.5, 2.0]
const HIGHLIGHT_COLORS = ['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa']

export default function SlideFormatToolbar({
  onExecCommand,
  onAlign,
  currentAlign,
  onUpdateProps,
  currentElement,
}: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')

  const COLORS = [
    '#ffffff',
    '#f87171',
    '#fb923c',
    '#fbbf24',
    '#34d399',
    '#60a5fa',
    '#a78bfa',
    '#f472b6',
    '#000000',
    '#6b7280',
  ]

  function toggleMenu(name: string) {
    setOpenMenu(openMenu === name ? null : name)
  }

  function btnClass(active?: boolean) {
    return `w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
      active ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`
  }

  return (
    <div
      className="flex items-center gap-0.5 px-1.5 py-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl flex-wrap"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Font family */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleMenu('font')} title="フォント">
          <CaseSensitive size={13} />
        </button>
        {openMenu === 'font' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-36 max-h-56 overflow-y-auto z-50">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.value}
                className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                style={{ fontFamily: f.value }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onExecCommand('fontName', f.value)
                  setOpenMenu(null)
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font size */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleMenu('size')} title="フォントサイズ">
          <Type size={13} />
        </button>
        {openMenu === 'size' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-16 max-h-48 overflow-y-auto z-50">
            {FONT_SIZES.map((s) => (
              <button
                key={s}
                className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onExecCommand('fontSize', String(s))
                  setOpenMenu(null)
                }}
              >
                {s}px
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* Basic formatting */}
      <button className={btnClass()} onClick={() => onExecCommand('bold')} title="太字">
        <Bold size={13} />
      </button>
      <button className={btnClass()} onClick={() => onExecCommand('italic')} title="斜体">
        <Italic size={13} />
      </button>
      <button className={btnClass()} onClick={() => onExecCommand('underline')} title="下線">
        <Underline size={13} />
      </button>
      <button className={btnClass()} onClick={() => onExecCommand('strikeThrough')} title="取り消し線">
        <Strikethrough size={13} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* Superscript / Subscript */}
      <button className={btnClass()} onClick={() => onExecCommand('superscript')} title="上付き">
        <Superscript size={13} />
      </button>
      <button className={btnClass()} onClick={() => onExecCommand('subscript')} title="下付き">
        <Subscript size={13} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* Alignment */}
      {onAlign && (
        <>
          <button className={btnClass(currentAlign === 'left')} onClick={() => onAlign('left')} title="左揃え">
            <AlignLeft size={13} />
          </button>
          <button className={btnClass(currentAlign === 'center')} onClick={() => onAlign('center')} title="中央揃え">
            <AlignCenter size={13} />
          </button>
          <button className={btnClass(currentAlign === 'right')} onClick={() => onAlign('right')} title="右揃え">
            <AlignRight size={13} />
          </button>
          <div className="w-px h-4 bg-slate-600 mx-0.5" />
        </>
      )}

      {/* Lists */}
      <button className={btnClass()} onClick={() => onExecCommand('insertUnorderedList')} title="箇条書き">
        <List size={13} />
      </button>
      <button className={btnClass()} onClick={() => onExecCommand('insertOrderedList')} title="番号リスト">
        <ListOrdered size={13} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* Text color */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleMenu('color')} title="テキスト色">
          <span className="w-3.5 h-3.5 rounded-sm border border-slate-500 bg-gradient-to-br from-red-400 via-blue-400 to-green-400" />
        </button>
        {openMenu === 'color' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-sm border border-slate-600 hover:scale-110 transition-transform"
                  style={{ background: c }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onExecCommand('foreColor', c)
                    setOpenMenu(null)
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              className="w-full h-5 mt-1 rounded cursor-pointer border-0"
              onChange={(e) => {
                onExecCommand('foreColor', e.target.value)
                setOpenMenu(null)
              }}
            />
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleMenu('highlight')} title="ハイライト">
          <Highlighter size={13} />
        </button>
        {openMenu === 'highlight' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-sm border border-slate-600 hover:scale-110 transition-transform"
                  style={{
                    background:
                      c === 'transparent'
                        ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                        : c,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onExecCommand('hiliteColor', c)
                    setOpenMenu(null)
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* Hyperlink */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleMenu('link')} title="ハイパーリンク">
          <Link size={13} />
        </button>
        {openMenu === 'link' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50 w-52">
            <input
              type="url"
              placeholder="URLを入力..."
              className="w-full px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && linkUrl) {
                  onExecCommand('createLink', linkUrl)
                  setLinkUrl('')
                  setOpenMenu(null)
                }
              }}
            />
            <button
              className="w-full mt-1 px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded"
              onMouseDown={(e) => {
                e.preventDefault()
                if (linkUrl) {
                  onExecCommand('createLink', linkUrl)
                  setLinkUrl('')
                  setOpenMenu(null)
                }
              }}
            >
              リンクを挿入
            </button>
          </div>
        )}
      </div>

      {/* Element-level props (letterSpacing, lineHeight, textShadow) */}
      {onUpdateProps && currentElement && (
        <>
          <div className="w-px h-4 bg-slate-600 mx-0.5" />

          {/* Line height */}
          <div className="relative">
            <button className={btnClass()} onClick={() => toggleMenu('lineHeight')} title="行間">
              <Minus size={13} />
            </button>
            {openMenu === 'lineHeight' && (
              <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-20 z-50">
                {LINE_HEIGHTS.map((lh) => (
                  <button
                    key={lh}
                    className={`w-full text-left px-2 py-1 text-xs hover:bg-slate-800 ${(currentElement.lineHeight ?? 1.3) === lh ? 'text-indigo-400' : 'text-slate-300'} hover:text-white`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onUpdateProps({ lineHeight: lh })
                      setOpenMenu(null)
                    }}
                  >
                    {lh.toFixed(lh === 1 ? 1 : 2)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Letter spacing */}
          <div className="relative">
            <button className={btnClass()} onClick={() => toggleMenu('spacing')} title="文字間隔">
              <span className="text-[10px] font-mono">A⇔</span>
            </button>
            {openMenu === 'spacing' && (
              <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50 w-32">
                <label className="text-[10px] text-slate-400 block mb-1">文字間隔 (em)</label>
                <input
                  type="range"
                  min="-0.05"
                  max="0.3"
                  step="0.01"
                  value={currentElement.letterSpacing ?? 0}
                  className="w-full"
                  onChange={(e) => onUpdateProps({ letterSpacing: parseFloat(e.target.value) })}
                />
                <div className="text-[10px] text-slate-400 text-center">
                  {(currentElement.letterSpacing ?? 0).toFixed(2)}em
                </div>
              </div>
            )}
          </div>

          {/* Text shadow */}
          <button
            className={btnClass(currentElement.textShadow)}
            onClick={() => onUpdateProps({ textShadow: !currentElement.textShadow })}
            title="テキスト影"
          >
            <span className="text-[10px] font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              S
            </span>
          </button>
        </>
      )}
    </div>
  )
}
