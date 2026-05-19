'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Link,
  Highlighter,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Eraser,
  AArrowUp,
  AArrowDown,
  Space,
} from 'lucide-react'

interface Props {
  containerRef: React.RefObject<HTMLElement | null>
  showFormattingMarks?: boolean
  onToggleFormattingMarks?: () => void
}

const FONT_FAMILIES = [
  { label: 'ゴシック', value: 'system-ui, -apple-system, sans-serif' },
  { label: '明朝', value: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
  { label: '等幅', value: '"SF Mono", "Consolas", monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
]

const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72]

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#bbf7d0',
  '#bfdbfe',
  '#fecaca',
  '#e9d5ff',
  '#fed7aa',
  '#fce7f3',
  '#ccfbf1',
  'transparent',
]

const TEXT_COLORS = [
  '#ffffff',
  '#f8fafc',
  '#94a3b8',
  '#64748b',
  '#0f172a',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#6366f1',
]

const UNDERLINE_STYLES = [
  { label: '下線', value: 'underline' },
  { label: '二重下線', value: 'underline double' },
  { label: '波線', value: 'underline wavy' },
  { label: '点線', value: 'underline dotted' },
  { label: '破線', value: 'underline dashed' },
]

const LINE_HEIGHTS = [
  { label: '1.0', value: '1.0' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' },
]

const ENCLOSED_CHARS = [
  '①',
  '②',
  '③',
  '④',
  '⑤',
  '⑥',
  '⑦',
  '⑧',
  '⑨',
  '⑩',
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
  '⑰',
  '⑱',
  '⑲',
  '⑳',
  'Ⓐ',
  'Ⓑ',
  'Ⓒ',
  'Ⓓ',
  'Ⓔ',
  'Ⓕ',
  '㋐',
  '㋑',
  '㋒',
  '㋓',
  '㋔',
  '㊀',
  '㊁',
  '㊂',
  '㊃',
  '㊄',
]

export default function FormatToolbar({ containerRef, showFormattingMarks, onToggleFormattingMarks }: Props) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setShow(false)
        return
      }
      const range = sel.getRangeAt(0)
      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        setShow(false)
        return
      }
      const text = sel.toString().trim()
      if (!text) {
        setShow(false)
        return
      }
      const rect = range.getBoundingClientRect()
      setPos({ top: rect.top + window.scrollY - 44, left: rect.left + rect.width / 2 })
      setShow(true)
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [containerRef])

  function exec(command: string, value?: string) {
    document.execCommand(command, false, value)
  }

  function handleLink() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const url = prompt('URLを入力', 'https://')
    if (url) exec('createLink', url)
  }

  function handleRuby() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString()
    const reading = prompt(`「${text}」のふりがなを入力:`, '')
    if (reading === null) return
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const ruby = document.createElement('ruby')
    ruby.textContent = text
    const rt = document.createElement('rt')
    rt.textContent = reading
    ruby.appendChild(rt)
    range.insertNode(ruby)
  }

  function handleTextBorder() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    // Check if already bordered
    const parent = range.commonAncestorContainer.parentElement
    if (parent?.style.border) {
      parent.style.border = ''
      parent.style.padding = ''
      parent.style.borderRadius = ''
      return
    }
    const content = range.extractContents()
    const span = document.createElement('span')
    span.style.border = '1px solid currentColor'
    span.style.padding = '0 3px'
    span.style.borderRadius = '2px'
    span.appendChild(content)
    range.insertNode(span)
  }

  function handleGrowFont() {
    // Use fontSize command to increase
    exec('fontSize', '5') // medium-large
  }

  function handleShrinkFont() {
    exec('fontSize', '2') // small
  }

  function handleLineHeight(value: string) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    let block = range.commonAncestorContainer as HTMLElement
    if (block.nodeType === Node.TEXT_NODE) block = block.parentElement!
    // Walk up to contentEditable block
    while (block && !block.hasAttribute('contenteditable') && block.parentElement) {
      block = block.parentElement
    }
    if (block?.hasAttribute('contenteditable')) {
      block.style.lineHeight = value
    }
  }

  function insertEnclosedChar(char: string) {
    exec('insertText', char)
    setActiveDropdown(null)
  }

  function handleUnderlineStyle(style: string) {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return
    const range = sel.getRangeAt(0)
    const content = range.extractContents()
    const span = document.createElement('span')
    span.style.textDecoration = style
    span.appendChild(content)
    range.insertNode(span)
    setActiveDropdown(null)
  }

  function isActive(command: string) {
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }

  function toggleDropdown(name: string) {
    setActiveDropdown(activeDropdown === name ? null : name)
  }

  if (!show) return null

  const btnClass = (cmd?: string, active?: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
      (cmd && isActive(cmd)) || active
        ? 'bg-indigo-500 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 px-1.5 py-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl flex-wrap max-w-[600px]"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* ===== フォント / Font family ===== */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleDropdown('fontFamily')} title="フォント">
          <span className="text-[10px] font-bold">F</span>
        </button>
        {activeDropdown === 'fontFamily' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-40 z-50">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.label}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                style={{ fontFamily: f.value }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  exec('fontName', f.value)
                  setActiveDropdown(null)
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== 文字サイズ / Font size ===== */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleDropdown('fontSize')} title="サイズ">
          <span className="text-[10px]">A↕</span>
        </button>
        {activeDropdown === 'fontSize' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-16 max-h-48 overflow-y-auto z-50">
            {FONT_SIZES.map((s) => (
              <button
                key={s}
                className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                onMouseDown={(e) => {
                  e.preventDefault()
                  exec('fontSize', String(Math.min(7, Math.max(1, Math.round(s / 12)))))
                  setActiveDropdown(null)
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== 文字の拡大/縮小 / Grow/Shrink Font ===== */}
      <button className={btnClass()} onClick={handleGrowFont} title="文字の拡大">
        <AArrowUp size={14} />
      </button>
      <button className={btnClass()} onClick={handleShrinkFont} title="文字の縮小">
        <AArrowDown size={14} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== 太字・斜体・下線・取り消し線 ===== */}
      <button className={btnClass('bold')} onClick={() => exec('bold')} title="太字 (Ctrl+B)">
        <strong>B</strong>
      </button>
      <button className={btnClass('italic')} onClick={() => exec('italic')} title="斜体 (Ctrl+I)">
        <em>I</em>
      </button>

      {/* 下線 with style dropdown */}
      <div className="relative flex">
        <button className={btnClass('underline')} onClick={() => exec('underline')} title="下線 (Ctrl+U)">
          <span className="underline">U</span>
        </button>
        <button
          className="w-3 h-7 flex items-center justify-center text-slate-500 hover:text-white text-[8px]"
          onClick={() => toggleDropdown('underline')}
          title="下線スタイル"
        >
          ▾
        </button>
        {activeDropdown === 'underline' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-28 z-50">
            {UNDERLINE_STYLES.map((u) => (
              <button
                key={u.value}
                className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleUnderlineStyle(u.value)
                }}
              >
                <span style={{ textDecoration: u.value }}>{u.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button className={btnClass('strikeThrough')} onClick={() => exec('strikeThrough')} title="取り消し線">
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== ルビ/ふりがな / Ruby ===== */}
      <button className={btnClass()} onClick={handleRuby} title="ルビ/ふりがな">
        <span className="text-[9px] leading-none flex flex-col items-center">
          <span className="text-[6px] text-indigo-300">あ</span>
          <span>亜</span>
        </span>
      </button>

      {/* ===== 囲み線 / Text border ===== */}
      <button className={btnClass()} onClick={handleTextBorder} title="囲み線">
        <span className="text-[10px] border border-current px-0.5 leading-tight">A</span>
      </button>

      {/* ===== 囲い文字 / Enclosed characters ===== */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleDropdown('enclosed')} title="囲い文字">
          <span className="text-[11px]">①</span>
        </button>
        {activeDropdown === 'enclosed' && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
            <div className="flex flex-wrap gap-0.5 w-[180px]">
              {ENCLOSED_CHARS.map((c) => (
                <button
                  key={c}
                  className="w-6 h-6 flex items-center justify-center rounded text-sm text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertEnclosedChar(c)
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== 上付き・下付き / Superscript / Subscript ===== */}
      <button className={btnClass('superscript')} onClick={() => exec('superscript')} title="上付き">
        <Superscript size={14} />
      </button>
      <button className={btnClass('subscript')} onClick={() => exec('subscript')} title="下付き">
        <Subscript size={14} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== フォントの色 / Text color ===== */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleDropdown('textColor')} title="フォントの色">
          <span className="text-[11px] font-bold" style={{ borderBottom: '2px solid #ef4444' }}>
            A
          </span>
        </button>
        {activeDropdown === 'textColor' && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
            <div className="flex flex-wrap gap-1 w-[130px]">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                  style={{ background: c }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    exec('foreColor', c)
                    setActiveDropdown(null)
                  }}
                />
              ))}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-700">
              <input
                type="color"
                className="w-full h-5 rounded cursor-pointer border-0 bg-transparent"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  exec('foreColor', e.target.value)
                  setActiveDropdown(null)
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ===== 網かけ・ハイライト / Highlight ===== */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleDropdown('highlight')} title="網かけ/ハイライト">
          <Highlighter size={14} />
        </button>
        {activeDropdown === 'highlight' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50">
            <div className="flex flex-wrap gap-1 w-[100px]">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition-transform"
                  style={{ background: c === 'transparent' ? 'linear-gradient(45deg, #f00 50%, transparent 50%)' : c }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    exec('hiliteColor', c)
                    setActiveDropdown(null)
                  }}
                  title={c === 'transparent' ? 'ハイライト解除' : ''}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== リンク / Link ===== */}
      <button className={btnClass()} onClick={handleLink} title="リンク">
        <Link size={14} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== 左揃え・中央揃え・右揃え・均等割り付け ===== */}
      <button className={btnClass()} onClick={() => exec('justifyLeft')} title="左揃え">
        <AlignLeft size={14} />
      </button>
      <button className={btnClass()} onClick={() => exec('justifyCenter')} title="中央揃え">
        <AlignCenter size={14} />
      </button>
      <button className={btnClass()} onClick={() => exec('justifyRight')} title="右揃え">
        <AlignRight size={14} />
      </button>
      <button className={btnClass()} onClick={() => exec('justifyFull')} title="均等割り付け">
        <AlignJustify size={14} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== 段落番号・箇条書き ===== */}
      <button className={btnClass('insertUnorderedList')} onClick={() => exec('insertUnorderedList')} title="箇条書き">
        <List size={14} />
      </button>
      <button className={btnClass('insertOrderedList')} onClick={() => exec('insertOrderedList')} title="段落番号">
        <ListOrdered size={14} />
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== 行間 / Line spacing ===== */}
      <div className="relative">
        <button className={btnClass()} onClick={() => toggleDropdown('lineHeight')} title="行間">
          <Space size={14} />
        </button>
        {activeDropdown === 'lineHeight' && (
          <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 w-20 z-50">
            {LINE_HEIGHTS.map((lh) => (
              <button
                key={lh.value}
                className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleLineHeight(lh.value)
                  setActiveDropdown(null)
                }}
              >
                {lh.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== インデント / Indent ===== */}
      <button className={btnClass()} onClick={() => exec('indent')} title="インデント">
        <span className="text-[10px]">→⌐</span>
      </button>
      <button className={btnClass()} onClick={() => exec('outdent')} title="インデント解除">
        <span className="text-[10px]">←⌐</span>
      </button>

      <div className="w-px h-4 bg-slate-600 mx-0.5" />

      {/* ===== 編集記号の表示 / Show formatting marks ===== */}
      {onToggleFormattingMarks && (
        <button
          className={btnClass(undefined, showFormattingMarks)}
          onClick={onToggleFormattingMarks}
          title="編集記号の表示"
        >
          <span className="text-[12px] font-bold">¶</span>
        </button>
      )}

      {/* ===== 書式クリア / Clear formatting ===== */}
      <button className={btnClass()} onClick={() => exec('removeFormat')} title="書式をクリア">
        <Eraser size={14} />
      </button>
    </div>
  )
}
