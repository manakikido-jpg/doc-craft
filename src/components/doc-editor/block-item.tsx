'use client'

import { memo, useRef, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Type, Copy, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import type { Block, BlockType, CalloutVariant } from '@/types'
import SlashMenu from './slash-menu'
import BlockContextMenu from './block-context-menu'
import { getBlockRenderer } from './block-registry'
// Side-effect import: registers all block renderers into the registry
import './block-renderers'

const AUTOCORRECT_MAP: Record<string, string> = {
  '(c)': '©', '(r)': '®', '(tm)': '™',
  '...': '…', '--': '—', '->': '→', '<-': '←',
  '>=': '≥', '<=': '≤', '!=': '≠',
  '1/2': '½', '1/4': '¼', '3/4': '¾',
  '+-': '±', 'x^2': 'x²', 'x^3': 'x³',
}

function applySmartQuotes(text: string): string {
  // Smart double quotes: " at word start -> left quote, after text -> right quote
  text = text.replace(/(^|[\s([\-—–>])"/g, '$1“')
  text = text.replace(/"/g, '”')
  // Smart single quotes: ' at word start -> left quote, after text -> right quote
  text = text.replace(/(^|[\s([\-—–>])'/g, '$1‘')
  text = text.replace(/'/g, '’')
  return text
}

function applyAutoCapitalize(text: string): string {
  // After sentence-ending punctuation (. ! ?) followed by a space, capitalize the next letter
  return text.replace(/([.!?])\s+([a-z])/g, (_, punct, letter) => `${punct} ${letter.toUpperCase()}`)
}

function applyAutoCorrect(text: string, blockType?: string): string {
  for (const [key, value] of Object.entries(AUTOCORRECT_MAP)) {
    text = text.replaceAll(key, value)
  }
  text = applySmartQuotes(text)
  // Auto-capitalize only for text blocks, not code
  if (blockType !== 'code') {
    text = applyAutoCapitalize(text)
  }
  return text
}

interface Props {
  block: Block
  index: number
  onUpdate: (content: string) => void
  onUpdateData?: (id: string, data: Record<string, string>) => void
  onAdd: (afterId: string, type: BlockType) => void
  onDelete: (id: string) => void
  onChangeType: (id: string, type: BlockType) => void
  onIndent?: (id: string) => void
  onOutdent?: (id: string) => void
  onToggleChecked?: (id: string) => void
  onSetCalloutVariant?: (id: string, variant: CalloutVariant) => void
  onDuplicate?: (id: string) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
  onSetBorder?: (id: string, style: string, color?: string, width?: number) => void
  onSetDropCap?: (id: string, dropCap: boolean) => void
  onSetTextColor?: (id: string, color: string) => void
  onSetBgColor?: (id: string, color: string) => void
  onSetColumns?: (id: string, columns: 1 | 2 | 3) => void
  onSetLineSpacing?: (id: string, spacing: number) => void
  onSetParagraphSpacing?: (id: string, spacing: 'compact' | 'normal' | 'wide' | 'extra-wide') => void
  onSetAlign?: (id: string, align: 'left' | 'center' | 'right' | 'justify') => void
  onSetTextIndent?: (id: string, indent: number) => void
  onSplitBlock?: (contentBefore: string, contentAfter: string, newType?: BlockType) => void
  onMergeWithPrev?: (currentContent: string) => void
  onMergeWithNext?: (currentContent: string) => void
  focusNext: () => void
  focusPrev: () => void
  inputRef: (el: HTMLDivElement | null) => void
  headingBlocks?: Block[]
  footnoteIndex?: number
  numberedIndex?: string
  showLineNumbers?: boolean
  pageBreakNumber?: number
  totalPageBreaks?: number
}

const STYLES: Record<BlockType, string> = {
  h1: 'text-3xl font-bold text-white mt-4 mb-1',
  h2: 'text-2xl font-semibold text-white mt-3 mb-1',
  h3: 'text-xl font-medium text-white mt-2',
  h4: 'text-lg font-bold text-white mt-2',
  h5: 'text-base font-bold text-white mt-1',
  h6: 'text-sm font-bold uppercase tracking-wide text-slate-200 mt-1',
  paragraph: 'text-base text-slate-100 leading-7',
  bullet:
    'text-base text-slate-100 leading-7 pl-5 relative before:content-["•"] before:absolute before:left-0 before:text-indigo-400',
  numbered: 'text-base text-slate-100 leading-7',
  quote: 'text-base text-slate-300 italic border-l-4 border-indigo-500 pl-4 py-1',
  divider: '',
  image: '',
  code: '',
  embed: '',
  table: '',
  toc: '',
  'page-break': '',
  callout: '',
  checklist: 'text-base text-slate-100 leading-7',
  footnote: '',
  math: '',
  drawing: '',
  textbox: '',
  columns: '',
  signature: '',
  'cover-page': '',
  'section-break': '',
  'column-break': '',
}

const LINE_SPACING_MAP: Record<number, string> = {
  1: '1.4',
  1.15: '1.6',
  1.5: '2.0',
  2: '2.8',
}

const PARAGRAPH_SPACING_MAP: Record<string, string> = {
  compact: '0.25rem',
  normal: '0.75rem',
  wide: '1.5rem',
  'extra-wide': '2.5rem',
}

function BlockItem({
  block,
  index,
  onUpdate,
  onUpdateData,
  onAdd,
  onDelete,
  onChangeType,
  onIndent,
  onOutdent,
  onToggleChecked,
  onSetCalloutVariant,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onSetBorder,
  onSetDropCap,
  onSetTextColor,
  onSetBgColor,
  onSetColumns,
  onSetLineSpacing,
  onSetParagraphSpacing,
  onSetAlign,
  onSetTextIndent,
  onSplitBlock,
  onMergeWithPrev,
  onMergeWithNext,
  focusNext,
  focusPrev,
  inputRef,
  headingBlocks,
  footnoteIndex,
  numberedIndex,
  showLineNumbers,
  pageBreakNumber,
  totalPageBreaks,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [slashMenu, setSlashMenu] = useState<{ top: number; left: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })

  useEffect(() => {
    if (ref.current) {
      // Use innerHTML for rich text persistence (bold, italic, etc.)
      if (ref.current.innerHTML !== block.content) {
        ref.current.innerHTML = block.content
      }
    }
  }, [block.content])

  const indentStyle = block.indent ? { marginLeft: `${block.indent * 2}rem` } : {}
  const lineHeight = block.lineSpacing ? LINE_SPACING_MAP[block.lineSpacing] || '1.7' : undefined
  const marginBottom = block.paragraphSpacing ? PARAGRAPH_SPACING_MAP[block.paragraphSpacing] || undefined : undefined
  const columnCount = block.columns && block.columns > 1 ? block.columns : undefined

  function getCaretPosition(): { top: number; left: number } {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return { top: 0, left: 0 }
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    return { top: rect.bottom + window.scrollY + 4, left: rect.left }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')

    let cleanContent = text

    if (html) {
      // Parse HTML and extract clean content preserving basic formatting
      const tmp = document.createElement('div')
      tmp.innerHTML = html

      // Remove style, script, meta tags
      tmp.querySelectorAll('style, script, meta, link').forEach((el) => el.remove())

      // Convert <br> to newline markers
      tmp.querySelectorAll('br').forEach((br) => {
        br.replaceWith(document.createTextNode('\n'))
      })

      // Preserve bold/italic/underline, strip everything else
      function cleanNode(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || ''
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return ''

        const el = node as HTMLElement
        const tag = el.tagName.toLowerCase()
        const childContent = Array.from(el.childNodes).map(cleanNode).join('')

        // Preserve inline formatting
        if (tag === 'b' || tag === 'strong') return `<b>${childContent}</b>`
        if (tag === 'i' || tag === 'em') return `<i>${childContent}</i>`
        if (tag === 'u') return `<u>${childContent}</u>`
        if (tag === 's' || tag === 'strike' || tag === 'del') return `<s>${childContent}</s>`
        if (tag === 'a') {
          const href = el.getAttribute('href')
          return href ? `<a href="${href}">${childContent}</a>` : childContent
        }
        // Block elements add newline
        if (['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(tag)) {
          return childContent + '\n'
        }
        return childContent
      }

      cleanContent = cleanNode(tmp).replace(/\n{3,}/g, '\n\n').trim()
    }

    // Insert at cursor position
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()

      // If content has HTML tags, insert as HTML
      if (cleanContent.includes('<')) {
        const frag = document.createRange().createContextualFragment(cleanContent.replace(/\n/g, '<br>'))
        range.insertNode(frag)
      } else {
        // Plain text: insert as text nodes with br for newlines
        const lines = cleanContent.split('\n')
        const frag = document.createDocumentFragment()
        lines.forEach((line, i) => {
          frag.appendChild(document.createTextNode(line))
          if (i < lines.length - 1) frag.appendChild(document.createElement('br'))
        })
        range.insertNode(frag)
      }

      // Move cursor to end of inserted content
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)

      // Trigger update
      const el = e.currentTarget
      onUpdate(el.innerHTML)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const content = el.innerText.trim()

    if (e.key === '/') {
      const pos = getCaretPosition()
      setTimeout(() => setSlashMenu(pos), 0)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const isListType = ['bullet', 'numbered', 'checklist'].includes(block.type)
      if (isListType) {
        if (e.shiftKey) {
          onOutdent?.(block.id)
        } else {
          onIndent?.(block.id)
        }
      } else {
        // Insert tab stop (em space) for non-list blocks
        document.execCommand('insertHTML', false, '&emsp;')
      }
      return
    }

    // ── Enter: Word-style paragraph split ──
    // Shift+Enter = soft line break (browser default <br>), do nothing
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setSlashMenu(null)

      // For list types: if content is empty, convert to paragraph (like Word)
      if (content === '' && (block.type === 'bullet' || block.type === 'numbered' || block.type === 'checklist')) {
        onChangeType(block.id, 'paragraph')
        return
      }

      if (onSplitBlock) {
        // Split at cursor position
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)

          // Get HTML before cursor
          const rangeBefore = document.createRange()
          rangeBefore.setStart(el, 0)
          rangeBefore.setEnd(range.startContainer, range.startOffset)
          const fragBefore = rangeBefore.cloneContents()
          const tmpBefore = document.createElement('div')
          tmpBefore.appendChild(fragBefore)
          const htmlBefore = tmpBefore.innerHTML

          // Get HTML after cursor
          const rangeAfter = document.createRange()
          rangeAfter.setStart(range.endContainer, range.endOffset)
          rangeAfter.setEndAfter(el.lastChild || el)
          const fragAfter = rangeAfter.cloneContents()
          const tmpAfter = document.createElement('div')
          tmpAfter.appendChild(fragAfter)
          const htmlAfter = tmpAfter.innerHTML

          onSplitBlock(htmlBefore, htmlAfter)
        } else {
          onSplitBlock(el.innerHTML, '')
        }
      } else {
        onAdd(block.id, 'paragraph')
      }
      return
    }

    // ── Backspace at start: merge with previous block ──
    if (e.key === 'Backspace') {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        // Check if cursor is at the very start of the block
        const atStart = range.startOffset === 0 && (
          range.startContainer === el ||
          range.startContainer === el.firstChild ||
          (range.startContainer.nodeType === Node.TEXT_NODE && !range.startContainer.previousSibling && range.startContainer.parentNode === el)
        )

        if (atStart) {
          if (content === '') {
            // Empty block: just delete it
            e.preventDefault()
            setSlashMenu(null)
            onDelete(block.id)
            focusPrev()
            return
          }
          if (onMergeWithPrev) {
            // Merge current content into previous block
            e.preventDefault()
            onMergeWithPrev(el.innerHTML)
            return
          }
        }
      }
    }

    // ── Delete at end: merge next block into current ──
    if (e.key === 'Delete') {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed && onMergeWithNext) {
        const range = sel.getRangeAt(0)
        // Check if cursor is at the very end
        const textLen = el.textContent?.length || 0
        let offset = 0
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let node = walker.nextNode()
        while (node) {
          if (node === range.startContainer) {
            offset += range.startOffset
            break
          }
          offset += node.textContent?.length || 0
          node = walker.nextNode()
        }
        if (offset >= textLen) {
          e.preventDefault()
          onMergeWithNext(el.innerHTML)
          return
        }
      }
    }

    // ── Arrow keys: navigate between blocks ──
    if (e.key === 'ArrowDown') {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        // Check if at end of text content (single-line block)
        const textLen = el.textContent?.length || 0
        let cursorOffset = 0
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let node = walker.nextNode()
        while (node) {
          if (node === range.startContainer) { cursorOffset += range.startOffset; break }
          cursorOffset += node.textContent?.length || 0
          node = walker.nextNode()
        }
        const atEnd = cursorOffset >= textLen

        const rects = range.getClientRects()
        const elRect = el.getBoundingClientRect()
        const cursorY = rects.length > 0 ? rects[0].bottom : elRect.bottom
        const atLastLine = Math.abs(cursorY - elRect.bottom) < 8

        if (atEnd || atLastLine) {
          e.preventDefault()
          focusNext()
        }
      }
    }

    if (e.key === 'ArrowUp') {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        // Check if at start of text content
        const atStart = range.startOffset === 0 && (
          range.startContainer === el ||
          range.startContainer === el.firstChild ||
          (range.startContainer.nodeType === Node.TEXT_NODE && !range.startContainer.previousSibling && range.startContainer.parentNode === el)
        )

        const rects = range.getClientRects()
        const elRect = el.getBoundingClientRect()
        const cursorY = rects.length > 0 ? rects[0].top : elRect.top
        const atFirstLine = Math.abs(cursorY - elRect.top) < 8

        if (atStart || atFirstLine) {
          e.preventDefault()
          focusPrev()
        }
      }
    }

    // ArrowLeft at start → go to end of previous block
    if (e.key === 'ArrowLeft' && !e.shiftKey) {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        const atStart = range.startOffset === 0 && (
          range.startContainer === el ||
          range.startContainer === el.firstChild ||
          (range.startContainer.nodeType === Node.TEXT_NODE && !range.startContainer.previousSibling && range.startContainer.parentNode === el)
        )
        if (atStart) {
          e.preventDefault()
          focusPrev()
        }
      }
    }

    // ArrowRight at end → go to start of next block
    if (e.key === 'ArrowRight' && !e.shiftKey) {
      const sel = window.getSelection()
      if (sel && sel.isCollapsed) {
        const range = sel.getRangeAt(0)
        const textLen = el.textContent?.length || 0
        let cursorOffset = 0
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let node = walker.nextNode()
        while (node) {
          if (node === range.startContainer) { cursorOffset += range.startOffset; break }
          cursorOffset += node.textContent?.length || 0
          node = walker.nextNode()
        }
        if (cursorOffset >= textLen) {
          e.preventDefault()
          focusNext()
        }
      }
    }

    setSlashMenu(null)
  }

  function handleSlashSelect(type: BlockType) {
    setSlashMenu(null)
    if (
      type === 'divider' ||
      type === 'image' ||
      type === 'code' ||
      type === 'embed' ||
      type === 'table' ||
      type === 'toc' ||
      type === 'page-break' ||
      type === 'callout' ||
      type === 'checklist' ||
      type === 'footnote' ||
      type === 'math' ||
      type === 'drawing' ||
      type === 'textbox' ||
      type === 'columns' ||
      type === 'signature' ||
      type === 'cover-page' ||
      type === 'section-break' ||
      type === 'column-break'
    ) {
      onChangeType(block.id, type)
      return
    }
    if (ref.current) {
      const html = ref.current.innerHTML.replace(/\/?$/, '')
      ref.current.innerHTML = html
      onUpdate(html)
    }
    onChangeType(block.id, type)
  }

  const contextMenuEl =
    contextMenu &&
    onDuplicate &&
    onMoveUp &&
    onMoveDown &&
    onSetBorder &&
    onSetDropCap &&
    onSetTextColor &&
    onSetBgColor &&
    onSetColumns ? (
      <BlockContextMenu
        block={block}
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        onSetBorder={onSetBorder}
        onSetDropCap={onSetDropCap}
        onSetTextColor={onSetTextColor}
        onSetBgColor={onSetBgColor}
        onSetColumns={onSetColumns}
        onSetLineSpacing={onSetLineSpacing}
        onSetParagraphSpacing={onSetParagraphSpacing}
        onSetAlign={onSetAlign}
        onSetTextIndent={onSetTextIndent}
        onUpdateData={onUpdateData}
      />
    ) : null

  // ── Registry-based rendering for specialized block types ──
  const Renderer = getBlockRenderer(block.type)
  if (Renderer) {
    const rendererProps = {
      block, index, onUpdate, onUpdateData, onAdd, onDelete, onChangeType,
      onIndent, onOutdent, onToggleChecked, onSetCalloutVariant,
      onDuplicate, onMoveUp, onMoveDown, onSetBorder, onSetDropCap,
      onSetTextColor, onSetBgColor, onSetColumns, onSetLineSpacing,
      onSetParagraphSpacing, onSetAlign, onSetTextIndent, onSplitBlock,
      onMergeWithPrev, onMergeWithNext, focusNext, focusPrev, inputRef,
      headingBlocks, footnoteIndex, numberedIndex, showLineNumbers,
      pageBreakNumber, totalPageBreaks,
      handleKeyDown, handlePaste,
    }
    // Some types use flex items-center layout
    const isFlexLayout = block.type === 'divider' || block.type === 'page-break' || block.type === 'section-break' || block.type === 'column-break'
    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
          ...indentStyle,
          ...(block.type === 'column-break' ? { breakBefore: 'column' as const } : {}),
        }}
        className={`group relative ${isFlexLayout ? 'flex items-center py-3' : ''}`}
        {...attributes}
        data-block-id={block.id}
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <TypeBadge block={block} onChangeType={onChangeType} />
        <BlockHoverToolbar block={block} onDuplicate={onDuplicate} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={onDelete} />
        <Renderer {...rendererProps} />
        {contextMenuEl}
      </div>
    )
  }

  // Fallback for unknown/unhandled block types
  if (!(block.type in STYLES)) {
    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.4 : 1,
          ...indentStyle,
        }}
        className="group relative"
        {...attributes}
        data-block-id={block.id}
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <BlockHoverToolbar block={block} onDuplicate={onDuplicate} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={onDelete} />
        <div className="my-2 rounded-lg border border-dashed border-slate-600 bg-slate-800/30 px-4 py-3 text-sm text-slate-500">
          未対応のブロックタイプ: <code className="font-mono text-xs text-slate-400">{block.type}</code>
        </div>
        {contextMenuEl}
      </div>
    )
  }

  const numbered = block.type === 'numbered' ? `${numberedIndex || (index + 1)}. ` : ''

  // Block border/decoration styles
  const blockBorderStyle: React.CSSProperties = {}
  if (block.borderStyle && block.borderStyle !== 'none') {
    blockBorderStyle.border = `${block.borderWidth || 1}px ${block.borderStyle} ${block.borderColor || '#475569'}`
    blockBorderStyle.padding = '8px 12px'
    blockBorderStyle.borderRadius = '4px'
  }

  // Paragraph break control styles (#36)
  const paragraphBreakStyle: React.CSSProperties = {
    ...(block.data?.pageBreakBefore === 'true' ? { pageBreakBefore: 'always' as const } : {}),
    ...(block.data?.keepWithNext === 'true' ? { pageBreakAfter: 'avoid' as const } : {}),
    ...(block.data?.keepTogether === 'true' ? { breakInside: 'avoid' as const } : {}),
    ...(block.data?.widowOrphan === 'true' ? { orphans: 2, widows: 2 } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        ...indentStyle,
        ...paragraphBreakStyle,
      }}
      className="group relative"
      {...attributes}
      data-block-id={block.id}
      onContextMenu={handleContextMenu}
    >
      <DragHandle listeners={listeners} />
      <TypeBadge block={block} numberedIndex={numberedIndex} onChangeType={onChangeType} />
      <BlockHoverToolbar block={block} onDuplicate={onDuplicate} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={onDelete} />
      {showLineNumbers && (
        <span className="absolute -left-8 top-1 text-xs text-slate-600 select-none w-5 text-right font-mono">
          {index + 1}
        </span>
      )}
      <div
        ref={(el) => {
          ref.current = el
          inputRef(el)
        }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={getPlaceholder(block.type)}
        className={`w-full focus:outline-none ${STYLES[block.type]} min-h-[1.5em]`}
        style={{
          lineHeight,
          marginBottom,
          columnCount,
          textAlign: block.align || undefined,
          color: block.textColor || undefined,
          backgroundColor: block.bgColor || undefined,
          padding: block.bgColor ? '2px 6px' : blockBorderStyle.padding || undefined,
          borderRadius: block.bgColor ? '4px' : blockBorderStyle.borderRadius || undefined,
          ...blockBorderStyle,
          // Drop cap
          ...(block.dropCap ? { ['--drop-cap' as string]: '1' } : {}),
          // Text indent (first-line indent) / hanging indent (negative)
          ...(block.textIndent ? (block.textIndent > 0
            ? { textIndent: `${block.textIndent}em` }
            : { textIndent: `${block.textIndent}em`, paddingLeft: `${Math.abs(block.textIndent)}em` }
          ) : {}),
        }}
        onBlur={(e) => {
          let html = e.currentTarget.innerHTML
          html = applyAutoCorrect(html, block.type)
          onUpdate(html)
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onDoubleClick={(e) => {
          const el = e.currentTarget
          if (!el.textContent?.trim()) {
            const pos = getCaretPosition()
            setSlashMenu(pos)
          }
        }}
      >
        {numbered && <span className="text-indigo-400 mr-1 select-none">{numbered}</span>}
      </div>

      {slashMenu && <SlashMenu position={slashMenu} onSelect={handleSlashSelect} onClose={() => setSlashMenu(null)} />}
      {contextMenuEl}
    </div>
  )
}

function DragHandle({ listeners }: { listeners: ReturnType<typeof useSortable>['listeners'] }) {
  return (
    <div
      {...listeners}
      className="absolute -left-6 top-1 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-400 select-none"
      title="ドラッグして移動"
      style={{ minWidth: 20, minHeight: 20 }}
    >
      <GripVertical size={16} />
    </div>
  )
}

function getTypeBadge(type: BlockType, numberedIndex?: string): string {
  switch (type) {
    case 'h1': return 'H1'
    case 'h2': return 'H2'
    case 'h3': return 'H3'
    case 'h4': return 'H4'
    case 'h5': return 'H5'
    case 'h6': return 'H6'
    case 'paragraph': return '¶'
    case 'bullet': return '•'
    case 'numbered': return numberedIndex ? `${numberedIndex}.` : '1.'
    case 'checklist': return '✓'
    case 'quote': return '❝'
    case 'code': return '</>'
    case 'divider': return '—'
    case 'image': return '🖼'
    case 'table': return '⊞'
    case 'toc': return '≡'
    case 'callout': return '!'
    case 'footnote': return '*'
    case 'math': return 'Σ'
    case 'drawing': return '✎'
    case 'textbox': return '□'
    case 'columns': return '≡'
    case 'signature': return '✍'
    case 'cover-page': return '■'
    case 'section-break': return '§'
    case 'page-break': return '⏎'
    case 'embed': return '⧉'
    case 'column-break': return '⏎'
    default: return '¶'
  }
}

function BlockHoverToolbar({
  block,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: Block
  onDuplicate?: (id: string) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded-lg px-1 py-0.5 z-10 shadow-lg">
      {onDuplicate && (
        <button
          title="複製"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDuplicate(block.id) }}
          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-colors rounded hover:bg-slate-700"
        >
          <Copy size={12} />
        </button>
      )}
      {onMoveUp && (
        <button
          title="上へ"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onMoveUp(block.id) }}
          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-colors rounded hover:bg-slate-700"
        >
          <ChevronUp size={12} />
        </button>
      )}
      {onMoveDown && (
        <button
          title="下へ"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onMoveDown(block.id) }}
          className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-colors rounded hover:bg-slate-700"
        >
          <ChevronDown size={12} />
        </button>
      )}
      <button
        title="削除"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(block.id) }}
        className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-slate-700"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

const TYPE_CHANGE_OPTIONS: { type: BlockType; label: string }[] = [
  { type: 'paragraph', label: '段落' },
  { type: 'h1', label: '見出し 1' },
  { type: 'h2', label: '見出し 2' },
  { type: 'h3', label: '見出し 3' },
  { type: 'h4', label: '見出し 4' },
  { type: 'h5', label: '見出し 5' },
  { type: 'h6', label: '見出し 6' },
  { type: 'bullet', label: '箇条書き' },
  { type: 'numbered', label: '番号付き' },
  { type: 'checklist', label: 'チェック' },
  { type: 'quote', label: '引用' },
  { type: 'code', label: 'コード' },
  { type: 'divider', label: '区切り線' },
  { type: 'callout', label: 'コールアウト' },
]

function TypeBadge({
  block,
  numberedIndex,
  onChangeType,
}: {
  block: Block
  numberedIndex?: string
  onChangeType: (id: string, type: BlockType) => void
}) {
  const [open, setOpen] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={badgeRef} className="absolute -left-10 top-0.5 z-10">
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
        className="text-[9px] font-mono text-slate-600 opacity-30 group-hover:opacity-100 hover:text-indigo-400 transition-all w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800"
        title="タイプ変更"
      >
        {getTypeBadge(block.type, numberedIndex)}
      </button>
      {open && (
        <div className="absolute left-0 top-6 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 w-40 text-sm max-h-60 overflow-y-auto z-50 animate-slide-up">
          <div className="px-3 py-1 text-slate-500 text-[10px] font-medium">タイプ変更</div>
          {TYPE_CHANGE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChangeType(block.id, opt.type)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 transition-colors text-xs ${
                block.type === opt.type ? 'text-indigo-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="w-4 text-center font-mono text-[9px] text-slate-500">{getTypeBadge(opt.type)}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getPlaceholder(type: BlockType): string {
  switch (type) {
    case 'h1':
      return '見出し 1'
    case 'h2':
      return '見出し 2'
    case 'h3':
      return '見出し 3'
    case 'h4':
      return '見出し 4'
    case 'h5':
      return '見出し 5'
    case 'h6':
      return '見出し 6'
    case 'bullet':
      return 'リストアイテム'
    case 'numbered':
      return 'リストアイテム'
    case 'quote':
      return '引用...'
    default:
      return "テキストを入力、または '/' でコマンドを使用"
  }
}

export default memo(BlockItem)
