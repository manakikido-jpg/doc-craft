'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Link,
  Highlighter,
  Type,
  Eraser,
  ChevronDown,
  Paintbrush,
  EyeOff,
} from 'lucide-react'

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>
}

interface ToolbarPosition {
  top: number
  left: number
}

const HIGHLIGHT_COLORS = [
  { label: '黄色', value: '#fef08a' },
  { label: '緑', value: '#bbf7d0' },
  { label: '青', value: '#bfdbfe' },
  { label: '赤', value: '#fecaca' },
  { label: '紫', value: '#e9d5ff' },
  { label: 'クリア', value: 'transparent' },
]

const TEXT_COLORS = [
  { label: '白', value: '#fff' },
  { label: '赤', value: '#ef4444' },
  { label: '青', value: '#3b82f6' },
  { label: '緑', value: '#22c55e' },
  { label: '黄', value: '#eab308' },
  { label: '紫', value: '#8b5cf6' },
]

const FONT_FAMILIES = [
  { label: 'システム標準', value: 'system-ui, sans-serif' },
  { label: 'ゴシック', value: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif' },
  { label: '明朝', value: '"Hiragino Mincho ProN", "Noto Serif JP", serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times', value: '"Times New Roman", serif' },
  { label: 'Courier', value: '"Courier New", monospace' },
]

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]

const TEXT_EFFECTS = [
  { label: '影付き', style: 'text-shadow: 1px 1px 2px rgba(0,0,0,0.5)' },
  { label: '光彩', style: 'text-shadow: 0 0 8px rgba(99,102,241,0.8)' },
  { label: '縁取り', style: '-webkit-text-stroke: 1px currentColor; text-shadow: none' },
  { label: '浮き出し', style: 'text-shadow: 2px 2px 0 rgba(0,0,0,0.3), -1px -1px 0 rgba(255,255,255,0.1)' },
  { label: 'ネオン', style: 'text-shadow: 0 0 4px #818cf8, 0 0 8px #818cf8, 0 0 16px #818cf8' },
  { label: 'なし', style: 'text-shadow: none; -webkit-text-stroke: 0' },
]

const STYLE_PRESETS = [
  { label: '標準', commands: [] as [string, string?][] },
  { label: '強調', commands: [['bold'], ['foreColor', '#818cf8']] as [string, string?][] },
  { label: '控えめ', commands: [['foreColor', '#94a3b8'], ['fontSize', '1']] as [string, string?][] },  // fontSize 1 = small
  { label: '引用風', commands: [['italic'], ['foreColor', '#94a3b8']] as [string, string?][] },
  { label: '見出し風', commands: [['bold'], ['fontSize', '1']] as [string, string?][] },  // will replace with larger
  { label: 'コード風', commands: [['fontName', 'monospace']] as [string, string?][] },
]

export default function FloatingToolbar({ containerRef }: FloatingToolbarProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<ToolbarPosition>({ top: 0, left: 0 })
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontFamily, setShowFontFamily] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showTextTransform, setShowTextTransform] = useState(false)
  const [showStylePresets, setShowStylePresets] = useState(false)
  const [showTextEffects, setShowTextEffects] = useState(false)
  const [formatStates, setFormatStates] = useState({ bold: false, italic: false, underline: false, strikeThrough: false })
  const [formatPainterStyle, setFormatPainterStyle] = useState<Record<string, string> | null>(null)
  const [formatPainterLock, setFormatPainterLock] = useState(false)
  const formatPainterClickCount = useRef(0)
  const formatPainterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recentFonts, setRecentFonts] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('doccraft:recentFonts') || '[]')
    } catch { return [] }
  })
  const toolbarRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setVisible(false)
      return
    }

    const container = containerRef.current
    if (!container) return

    // Check that the selection is within the container
    const anchorNode = selection.anchorNode
    if (!anchorNode || !container.contains(anchorNode)) {
      setVisible(false)
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Position above the selection, centered horizontally
    const toolbarWidth = 500
    let left = rect.left + rect.width / 2 - toolbarWidth / 2 - containerRect.left
    const top = rect.top - containerRect.top - 48

    // Clamp horizontal position within container
    left = Math.max(0, Math.min(left, containerRect.width - toolbarWidth))

    setPosition({ top, left })
    setVisible(true)
    setFormatStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
    })
    setShowHighlightPicker(false)
    setShowColorPicker(false)
    setShowFontFamily(false)
    setShowFontSize(false)
    setShowTextTransform(false)
    setShowStylePresets(false)
    setShowTextEffects(false)
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseUp = () => {
      // Delay slightly so selection is finalized
      requestAnimationFrame(updatePosition)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey || e.key === 'Shift') {
        requestAnimationFrame(updatePosition)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      // If clicking inside the toolbar, don't hide
      if (toolbarRef.current?.contains(e.target as Node)) return
      setVisible(false)
      setShowHighlightPicker(false)
      setShowColorPicker(false)
      setShowFontFamily(false)
      setShowFontSize(false)
      setShowTextTransform(false)
      setShowStylePresets(false)
      setShowTextEffects(false)
    }

    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('keyup', handleKeyUp)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [containerRef, updatePosition])

  // Format Painter: apply stored styles on next selection
  useEffect(() => {
    if (!formatPainterStyle) return
    const container = containerRef.current
    if (!container) return

    container.style.cursor = 'crosshair'

    const handleApply = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) return
      const range = sel.getRangeAt(0)
      const content = range.extractContents()
      const span = document.createElement('span')
      Object.entries(formatPainterStyle).forEach(([k, v]) => {
        span.style.setProperty(k, v)
      })
      span.appendChild(content)
      range.insertNode(span)
      if (!formatPainterLock) {
        setFormatPainterStyle(null)
      }
    }

    container.addEventListener('mouseup', handleApply)
    return () => {
      container.removeEventListener('mouseup', handleApply)
      container.style.cursor = ''
    }
  }, [formatPainterStyle, formatPainterLock, containerRef])

  // Format Painter: Escape to deactivate
  useEffect(() => {
    if (!formatPainterStyle) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormatPainterStyle(null)
        setFormatPainterLock(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [formatPainterStyle])

  const handleFormatPainterClick = useCallback(() => {
    formatPainterClickCount.current++
    if (formatPainterTimer.current) clearTimeout(formatPainterTimer.current)
    formatPainterTimer.current = setTimeout(() => {
      const clicks = formatPainterClickCount.current
      formatPainterClickCount.current = 0

      if (formatPainterStyle && !formatPainterLock) {
        // Already active single mode — deactivate
        setFormatPainterStyle(null)
        return
      }
      if (formatPainterStyle && formatPainterLock) {
        // Locked mode — deactivate
        setFormatPainterStyle(null)
        setFormatPainterLock(false)
        return
      }

      // Capture styles from selection
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const node = sel.anchorNode
      const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement)
      if (!el) return
      const computed = window.getComputedStyle(el)
      const styles: Record<string, string> = {}
      const props = ['font-weight', 'font-style', 'text-decoration', 'color', 'font-size', 'font-family', 'background-color', 'text-transform', 'font-variant']
      props.forEach((p) => {
        const v = computed.getPropertyValue(p)
        if (v) styles[p] = v
      })
      setFormatPainterStyle(styles)
      setFormatPainterLock(clicks >= 2)
    }, 250)
  }, [formatPainterStyle, formatPainterLock])

  const execFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    // Keep focus in the editor so selection persists
    containerRef.current?.focus()
  }, [containerRef])

  const handleBold = () => execFormat('bold')
  const handleItalic = () => execFormat('italic')
  const handleUnderline = () => execFormat('underline')
  const handleStrikethrough = () => execFormat('strikeThrough')

  const handleLink = () => {
    const url = prompt('URLを入力してください')
    if (url) {
      execFormat('createLink', url)
    }
  }

  const handleHighlight = (color: string) => {
    if (color === 'transparent') {
      execFormat('removeFormat')
      // Re-apply without highlight
      execFormat('hiliteColor', 'transparent')
    } else {
      execFormat('hiliteColor', color)
    }
    setShowHighlightPicker(false)
  }

  const handleTextColor = (color: string) => {
    execFormat('foreColor', color)
    setShowColorPicker(false)
  }

  const closeAllDropdowns = useCallback(() => {
    setShowHighlightPicker(false)
    setShowColorPicker(false)
    setShowFontFamily(false)
    setShowFontSize(false)
    setShowTextTransform(false)
    setShowStylePresets(false)
    setShowTextEffects(false)
  }, [])

  const handleFontFamily = (fontFamily: string) => {
    execFormat('fontName', fontFamily)
    setShowFontFamily(false)
    // Save to recent fonts
    const updated = [fontFamily, ...recentFonts.filter(f => f !== fontFamily)].slice(0, 3)
    setRecentFonts(updated)
    try { localStorage.setItem('doccraft:recentFonts', JSON.stringify(updated)) } catch (e) { console.warn('Failed to save recent fonts to localStorage:', e) }
  }

  const handleFontSize = (size: number) => {
    // execCommand fontSize only accepts 1-7, so we use a workaround:
    // Apply fontSize 1 as a marker, then replace the generated <font> elements with styled spans
    document.execCommand('fontSize', false, '1')
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const container = sel.anchorNode?.parentElement?.closest('[contenteditable]')
      if (container) {
        container.querySelectorAll('font[size="1"]').forEach((el) => {
          const span = document.createElement('span')
          span.style.fontSize = `${size}px`
          span.innerHTML = el.innerHTML
          el.replaceWith(span)
        })
      }
    }
    containerRef.current?.focus()
    setShowFontSize(false)
  }

  const handleClearFormatting = () => {
    execFormat('removeFormat')
  }

  if (!visible) return null

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="テキスト書式ツールバー"
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-800 px-1 py-1 shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        animation: 'floatingToolbarFadeIn 0.15s ease-out',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolbarButton onClick={handleBold} title="太字 (Ctrl+B)" active={formatStates.bold}>
        <Bold size={15} />
      </ToolbarButton>

      <ToolbarButton onClick={handleItalic} title="斜体 (Ctrl+I)" active={formatStates.italic}>
        <Italic size={15} />
      </ToolbarButton>

      <ToolbarButton onClick={handleUnderline} title="下線 (Ctrl+U)" active={formatStates.underline}>
        <Underline size={15} />
      </ToolbarButton>

      <ToolbarButton onClick={handleStrikethrough} title="取り消し線" active={formatStates.strikeThrough}>
        <Strikethrough size={15} />
      </ToolbarButton>

      <ToolbarButton onClick={() => execFormat('superscript')} title="上付き">
        <Superscript size={15} />
      </ToolbarButton>

      <ToolbarButton onClick={() => execFormat('subscript')} title="下付き">
        <Subscript size={15} />
      </ToolbarButton>

      <Divider />

      {/* Format Painter */}
      <ToolbarButton onClick={handleFormatPainterClick} title="書式のコピー/貼り付け (ダブルクリックでロック)" active={!!formatPainterStyle}>
        <Paintbrush size={15} />
      </ToolbarButton>

      {/* Small Caps */}
      <ToolbarButton
        onClick={() => {
          const sel = window.getSelection()
          if (sel && !sel.isCollapsed) {
            const text = sel.toString()
            document.execCommand('insertHTML', false,
              `<span style="font-variant: small-caps">${text}</span>`)
          }
          containerRef.current?.focus()
        }}
        title="スモールキャップス"
      >
        <span className="text-[10px] font-bold leading-none">Sc</span>
      </ToolbarButton>

      {/* All Caps */}
      <ToolbarButton
        onClick={() => {
          const sel = window.getSelection()
          if (sel && !sel.isCollapsed) {
            const text = sel.toString()
            document.execCommand('insertHTML', false,
              `<span style="text-transform: uppercase">${text}</span>`)
          }
          containerRef.current?.focus()
        }}
        title="すべて大文字"
      >
        <span className="text-[10px] font-bold leading-none">AA</span>
      </ToolbarButton>

      {/* Double Strikethrough */}
      <ToolbarButton
        onClick={() => {
          const sel = window.getSelection()
          if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            const content = range.extractContents()
            const span = document.createElement('span')
            span.style.textDecoration = 'line-through double'
            span.appendChild(content)
            range.insertNode(span)
          }
          containerRef.current?.focus()
        }}
        title="二重取り消し線"
      >
        <span className="text-[10px] font-bold leading-none" style={{ textDecoration: 'line-through double' }}>S</span>
      </ToolbarButton>

      {/* Character Scaling (均等割り付け) */}
      <ToolbarButton
        onClick={() => {
          const sel = window.getSelection()
          if (sel && !sel.isCollapsed) {
            const width = prompt('文字幅を入力してください (例: 5em)', '5em')
            if (width) {
              const text = sel.toString()
              document.execCommand('insertHTML', false,
                `<span style="display: inline-block; width: ${width}; text-align: justify; text-align-last: justify;">${text}</span>`)
            }
          }
          containerRef.current?.focus()
        }}
        title="均等割り付け"
      >
        <span className="text-[10px] font-bold leading-none">均</span>
      </ToolbarButton>

      {/* Hidden Text */}
      <ToolbarButton
        onClick={() => {
          const sel = window.getSelection()
          if (sel && !sel.isCollapsed) {
            const text = sel.toString()
            document.execCommand('insertHTML', false,
              `<span class="hidden-text" style="display: none">${text}</span>`)
          }
          containerRef.current?.focus()
        }}
        title="隠し文字"
      >
        <EyeOff size={15} />
      </ToolbarButton>

      <Divider />

      {/* Font family dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            const wasOpen = showFontFamily
            closeAllDropdowns()
            setShowFontFamily(!wasOpen)
          }}
          title="フォント"
          active={showFontFamily}
        >
          <span className="text-[10px] font-medium leading-none">フォント</span>
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showFontFamily && (
          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl w-44">
            {recentFonts.length > 0 && (
              <>
                <div className="px-3 py-0.5 text-[9px] text-slate-500 font-medium">最近使用</div>
                {recentFonts.map((f) => {
                  const font = FONT_FAMILIES.find(ff => ff.value === f)
                  return font ? (
                    <button
                      key={'recent-' + f}
                      type="button"
                      onClick={() => handleFontFamily(f)}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      style={{ fontFamily: f }}
                    >
                      {font.label}
                    </button>
                  ) : null
                })}
                <div className="h-px bg-slate-700 my-0.5" />
                <div className="px-3 py-0.5 text-[9px] text-slate-500 font-medium">すべて</div>
              </>
            )}
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFontFamily(f.value)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                style={{ fontFamily: f.value }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font size dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            const wasOpen = showFontSize
            closeAllDropdowns()
            setShowFontSize(!wasOpen)
          }}
          title="文字サイズ"
          active={showFontSize}
        >
          <span className="text-[10px] font-medium leading-none">サイズ</span>
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showFontSize && (
          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl w-20 max-h-48 overflow-y-auto custom-scrollbar">
            {FONT_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleFontSize(s)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {s}px
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      <ToolbarButton onClick={handleLink} title="リンク">
        <Link size={15} />
      </ToolbarButton>

      {/* Ruby (furigana) */}
      <ToolbarButton
        onClick={() => {
          const sel = window.getSelection()
          if (sel && !sel.isCollapsed) {
            const text = sel.toString()
            const reading = prompt('ふりがなを入力してください', '')
            if (reading) {
              document.execCommand('insertHTML', false,
                `<ruby>${text}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`)
            }
          }
          containerRef.current?.focus()
        }}
        title="ルビ（振り仮名）"
      >
        <span className="text-[10px] font-bold leading-none" style={{ lineHeight: 1 }}>
          <span style={{ fontSize: '6px', display: 'block', textAlign: 'center' }}>ルビ</span>
          <span>文</span>
        </span>
      </ToolbarButton>

      {/* Highlight color picker */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowHighlightPicker(!showHighlightPicker)
            setShowColorPicker(false)
          }}
          title="ハイライト"
          active={showHighlightPicker}
        >
          <Highlighter size={15} />
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showHighlightPicker && (
          <ColorPicker
            colors={HIGHLIGHT_COLORS}
            onSelect={handleHighlight}
          />
        )}
      </div>

      {/* Text color picker */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            setShowColorPicker(!showColorPicker)
            setShowHighlightPicker(false)
          }}
          title="文字色"
          active={showColorPicker}
        >
          <Type size={15} />
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showColorPicker && (
          <ColorPicker
            colors={TEXT_COLORS}
            onSelect={handleTextColor}
          />
        )}
      </div>

      {/* Text effects */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            const wasOpen = showTextEffects
            closeAllDropdowns()
            setShowTextEffects(!wasOpen)
          }}
          title="テキスト効果"
          active={showTextEffects}
        >
          <span className="text-[10px] font-bold leading-none" style={{ textShadow: '1px 1px 2px rgba(99,102,241,0.5)' }}>✦</span>
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showTextEffects && (
          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl w-28">
            {TEXT_EFFECTS.map((effect) => (
              <button
                key={effect.label}
                type="button"
                onClick={() => {
                  // Apply effect using insertHTML with span
                  const sel = window.getSelection()
                  if (sel && !sel.isCollapsed) {
                    const text = sel.toString()
                    document.execCommand('insertHTML', false,
                      `<span style="${effect.style}">${text}</span>`)
                  }
                  containerRef.current?.focus()
                  setShowTextEffects(false)
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {effect.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      <ToolbarButton onClick={handleClearFormatting} title="書式をクリア">
        <Eraser size={15} />
      </ToolbarButton>

      <Divider />

      {/* Text transform */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            const wasOpen = showTextTransform
            closeAllDropdowns()
            setShowTextTransform(!wasOpen)
          }}
          title="テキスト変換 (Shift+F3)"
          active={showTextTransform}
        >
          <span className="text-[10px] font-bold leading-none">Aa</span>
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showTextTransform && (
          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl w-32">
            <button
              type="button"
              onClick={() => {
                const sel = window.getSelection()
                if (sel && !sel.isCollapsed) {
                  document.execCommand('insertText', false, sel.toString().toUpperCase())
                }
                setShowTextTransform(false)
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              UPPERCASE
            </button>
            <button
              type="button"
              onClick={() => {
                const sel = window.getSelection()
                if (sel && !sel.isCollapsed) {
                  document.execCommand('insertText', false, sel.toString().toLowerCase())
                }
                setShowTextTransform(false)
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              lowercase
            </button>
            <button
              type="button"
              onClick={() => {
                const sel = window.getSelection()
                if (sel && !sel.isCollapsed) {
                  const text = sel.toString()
                  const titled = text.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase())
                  document.execCommand('insertText', false, titled)
                }
                setShowTextTransform(false)
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Title Case
            </button>
          </div>
        )}
      </div>

      {/* Style presets */}
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            const wasOpen = showStylePresets
            closeAllDropdowns()
            setShowStylePresets(!wasOpen)
          }}
          title="段落スタイル"
          active={showStylePresets}
        >
          <span className="text-[10px] font-medium leading-none">スタイル</span>
          <ChevronDown size={10} className="ml-0.5 opacity-60" />
        </ToolbarButton>
        {showStylePresets && (
          <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl w-32">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  // Clear formatting first
                  document.execCommand('removeFormat')
                  // Apply each command
                  preset.commands.forEach(([cmd, val]) => {
                    document.execCommand(cmd, false, val)
                  })
                  containerRef.current?.focus()
                  setShowStylePresets(false)
                }}
                className="w-full text-left px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes floatingToolbarFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

/* ---------- Sub-components ---------- */

function ToolbarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active ?? undefined}
      className={`flex items-center rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white ${
        active ? 'bg-slate-700 text-white' : ''
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-0.5 h-5 w-px bg-slate-600" />
}

function ColorPicker({
  colors,
  onSelect,
}: {
  colors: { label: string; value: string }[]
  onSelect: (value: string) => void
}) {
  return (
    <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 p-2 shadow-xl">
      <div className="flex gap-1">
        {colors.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onSelect(c.value)}
            title={c.label}
            className="h-6 w-6 rounded border border-slate-600 transition-transform hover:scale-110"
            style={{
              backgroundColor: c.value === 'transparent' ? undefined : c.value,
              backgroundImage:
                c.value === 'transparent'
                  ? 'linear-gradient(135deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)'
                  : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}
