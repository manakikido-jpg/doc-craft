'use client'

import { useRef, useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Block, BlockType, CalloutVariant, DrawingStroke } from '@/types'
import SlashMenu from './slash-menu'
import ImageBlock from './image-block'
import CodeBlock from './code-block'
import EmbedBlock from './embed-block'
import TableBlock from './table-block'
import CalloutBlock from './callout-block'
import FootnoteBlock from './footnote-block'
import MathBlock from './math-block'
import DrawingBlock from './drawing-block'
import TextboxBlock from './textbox-block'
import ColumnsBlock from './columns-block'
import SignatureBlock from './signature-block'
import CoverPageBlock from './cover-page-block'
import BlockContextMenu from './block-context-menu'

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
  onSetParagraphSpacing?: (id: string, spacing: 'compact' | 'normal' | 'wide') => void
  onSetAlign?: (id: string, align: 'left' | 'center' | 'right' | 'justify') => void
  focusNext: () => void
  focusPrev: () => void
  inputRef: (el: HTMLDivElement | null) => void
  headingBlocks?: Block[]
  footnoteIndex?: number
}

const STYLES: Record<BlockType, string> = {
  h1: 'text-3xl font-bold text-white mt-4 mb-1',
  h2: 'text-2xl font-semibold text-white mt-3 mb-1',
  h3: 'text-xl font-medium text-white mt-2',
  paragraph: 'text-base text-slate-300 leading-7',
  bullet:
    'text-base text-slate-300 leading-7 pl-5 relative before:content-["•"] before:absolute before:left-0 before:text-indigo-400',
  numbered: 'text-base text-slate-300 leading-7',
  quote: 'text-base text-slate-400 italic border-l-4 border-indigo-500 pl-4 py-1',
  divider: '',
  image: '',
  code: '',
  embed: '',
  table: '',
  toc: '',
  'page-break': '',
  callout: '',
  checklist: 'text-base text-slate-300 leading-7',
  footnote: '',
  math: '',
  drawing: '',
  textbox: '',
  columns: '',
  signature: '',
  'cover-page': '',
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
}

export default function BlockItem({
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
  focusNext,
  focusPrev,
  inputRef,
  headingBlocks,
  footnoteIndex,
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const content = e.currentTarget.innerText.trim()

    if (e.key === '/') {
      const pos = getCaretPosition()
      setTimeout(() => setSlashMenu(pos), 0)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        onOutdent?.(block.id)
      } else {
        onIndent?.(block.id)
      }
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setSlashMenu(null)
      onAdd(block.id, 'paragraph')
      return
    }

    if (e.key === 'Backspace' && content === '') {
      e.preventDefault()
      setSlashMenu(null)
      onDelete(block.id)
      focusPrev()
      return
    }

    if (e.key === 'ArrowDown') {
      const sel = window.getSelection()
      const atEnd = sel && sel.focusOffset >= content.length
      if (atEnd) {
        e.preventDefault()
        focusNext()
      }
    }

    if (e.key === 'ArrowUp') {
      const sel = window.getSelection()
      if (sel && sel.focusOffset === 0) {
        e.preventDefault()
        focusPrev()
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
      type === 'cover-page'
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
      />
    ) : null

  // Divider with styles
  if (block.type === 'divider') {
    const divStyle = block.data?.dividerStyle || block.dividerStyle || 'solid'
    const divColor = block.data?.dividerColor || block.dividerColor || '#334155'
    const dividerEl = (() => {
      switch (divStyle) {
        case 'dashed':
          return <hr className="flex-1" style={{ borderTop: `2px dashed ${divColor}`, borderBottom: 'none' }} />
        case 'dotted':
          return <hr className="flex-1" style={{ borderTop: `2px dotted ${divColor}`, borderBottom: 'none' }} />
        case 'double':
          return <hr className="flex-1" style={{ borderTop: `3px double ${divColor}`, borderBottom: 'none' }} />
        case 'thick':
          return <hr className="flex-1" style={{ borderTop: `4px solid ${divColor}`, borderBottom: 'none' }} />
        case 'gradient':
          return (
            <div
              className="flex-1 h-[2px] rounded"
              style={{ background: `linear-gradient(90deg, transparent, ${divColor}, transparent)` }}
            />
          )
        default:
          return <hr className="flex-1" style={{ borderTop: `1px solid ${divColor}`, borderBottom: 'none' }} />
      }
    })()
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, ...indentStyle }}
        className="group relative flex items-center py-3"
        {...attributes}
        data-block-id={block.id}
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <div className="flex-1 relative">
          {dividerEl}
          {/* Style picker on hover */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 z-10">
            {(['solid', 'dashed', 'dotted', 'double', 'thick', 'gradient'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onUpdateData?.(block.id, { dividerStyle: s } as Record<string, string>)}
                className={`text-[9px] px-1 py-0.5 rounded transition-colors ${divStyle === s ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
              >
                {s === 'solid'
                  ? '―'
                  : s === 'dashed'
                    ? '- -'
                    : s === 'dotted'
                      ? '···'
                      : s === 'double'
                        ? '═'
                        : s === 'thick'
                          ? '━'
                          : '∿'}
              </button>
            ))}
            <input
              type="color"
              value={divColor}
              onChange={(e) => onUpdateData?.(block.id, { dividerColor: e.target.value } as Record<string, string>)}
              className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
        </div>
        {contextMenuEl}
      </div>
    )
  }

  // Page break
  if (block.type === 'page-break') {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, ...indentStyle }}
        className="group relative flex items-center py-4"
        {...attributes}
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <div className="flex-1 flex items-center gap-3">
          <hr className="flex-1 border-dashed border-slate-600" />
          <span className="text-xs text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            改ページ
          </span>
          <hr className="flex-1 border-dashed border-slate-600" />
        </div>
        {contextMenuEl}
      </div>
    )
  }

  // Table of Contents
  if (block.type === 'toc') {
    const headings = headingBlocks || []
    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          ...indentStyle,
          opacity: isDragging ? 0.4 : 1,
        }}
        className="group relative"
        {...attributes}
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 my-2">
          <h3 className="text-sm font-semibold text-slate-400 mb-2">目次</h3>
          {headings.length === 0 ? (
            <p className="text-xs text-slate-500">見出しがありません</p>
          ) : (
            <ul className="space-y-1">
              {headings.map((h) => (
                <li
                  key={h.id}
                  className={`text-sm cursor-pointer hover:text-indigo-400 transition-colors ${
                    h.type === 'h1'
                      ? 'text-white font-medium'
                      : h.type === 'h2'
                        ? 'text-slate-300 pl-4'
                        : 'text-slate-400 pl-8'
                  }`}
                  onClick={() => {
                    const el = document.querySelector(`[data-block-id="${h.id}"]`)
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                >
                  {h.content || '(空の見出し)'}
                </li>
              ))}
            </ul>
          )}
        </div>
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'image') {
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
        <ImageBlock
          src={block.data?.src}
          alt={block.data?.alt}
          width={block.data?.width}
          imageAlign={block.data?.imageAlign}
          caption={block.data?.caption}
          onImageSet={(src, alt) => onUpdateData?.(block.id, { src, alt })}
          onUpdateProps={(data) => onUpdateData?.(block.id, data)}
        />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'code') {
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
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <CodeBlock
          content={block.content}
          language={block.data?.language}
          onUpdate={onUpdate}
          onUpdateData={(data) => onUpdateData?.(block.id, data)}
        />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'embed') {
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
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <EmbedBlock url={block.data?.url} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'table') {
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
        onContextMenu={handleContextMenu}
      >
        <DragHandle listeners={listeners} />
        <TableBlock data={block.data} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'callout') {
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
        <CalloutBlock
          content={block.content}
          variant={block.calloutVariant || 'info'}
          onUpdate={onUpdate}
          onVariantChange={(variant) => onSetCalloutVariant?.(block.id, variant)}
          inputRef={(el) => {
            ref.current = el
            inputRef(el)
          }}
          onKeyDown={handleKeyDown}
        />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'footnote') {
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
        <FootnoteBlock
          content={block.content}
          footnoteIndex={footnoteIndex || 1}
          onUpdate={onUpdate}
          inputRef={(el) => {
            ref.current = el
            inputRef(el)
          }}
          onKeyDown={handleKeyDown}
        />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'math') {
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
        <MathBlock content={block.content} onUpdate={onUpdate} />
        {contextMenuEl}
      </div>
    )
  }

  if (block.type === 'checklist') {
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
        <div className="flex items-start gap-2 py-0.5">
          <input
            type="checkbox"
            checked={!!block.checked}
            onChange={() => onToggleChecked?.(block.id)}
            className="mt-1.5 accent-indigo-500 w-4 h-4 cursor-pointer flex-shrink-0"
          />
          <div
            ref={(el) => {
              ref.current = el
              inputRef(el)
            }}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="チェック項目..."
            className={`flex-1 focus:outline-none text-base leading-7 min-h-[1.5em] ${
              block.checked ? 'text-slate-500 line-through' : 'text-slate-300'
            }`}
            onBlur={(e) => onUpdate(e.currentTarget.innerHTML)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {contextMenuEl}
      </div>
    )
  }

  // Drawing block
  if (block.type === 'drawing') {
    let parsedStrokes: DrawingStroke[] = []
    try {
      parsedStrokes = block.data?.strokesJson ? JSON.parse(block.data.strokesJson) : block.strokes || []
    } catch {}
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
        <DrawingBlock
          strokes={parsedStrokes}
          onUpdate={(strokes) => {
            onUpdateData?.(block.id, { strokesJson: JSON.stringify(strokes) })
          }}
        />
        {contextMenuEl}
      </div>
    )
  }

  // Textbox block
  if (block.type === 'textbox') {
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
        <TextboxBlock
          content={block.content}
          data={block.data}
          onUpdate={onUpdate}
          onUpdateData={(data) => onUpdateData?.(block.id, data)}
        />
        {contextMenuEl}
      </div>
    )
  }

  // Columns block
  if (block.type === 'columns') {
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
        <ColumnsBlock
          content={block.content}
          data={block.data}
          onUpdate={onUpdate}
          onUpdateData={(data) => onUpdateData?.(block.id, data)}
        />
        {contextMenuEl}
      </div>
    )
  }

  // Signature block
  if (block.type === 'signature') {
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
        <SignatureBlock data={block.data} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
        {contextMenuEl}
      </div>
    )
  }

  // Cover page block
  if (block.type === 'cover-page') {
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
        <CoverPageBlock data={block.data} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
        {contextMenuEl}
      </div>
    )
  }

  const numbered = block.type === 'numbered' ? `${index + 1}. ` : ''

  // Block border/decoration styles
  const blockBorderStyle: React.CSSProperties = {}
  if (block.borderStyle && block.borderStyle !== 'none') {
    blockBorderStyle.border = `${block.borderWidth || 1}px ${block.borderStyle} ${block.borderColor || '#475569'}`
    blockBorderStyle.padding = '8px 12px'
    blockBorderStyle.borderRadius = '4px'
  }

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
        }}
        onBlur={(e) => onUpdate(e.currentTarget.innerHTML)}
        onKeyDown={handleKeyDown}
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
      className="absolute -left-6 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-400 select-none"
    >
      <GripVertical size={14} />
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
