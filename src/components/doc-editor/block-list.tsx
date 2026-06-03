'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  ImageIcon,
  Table,
  Minus,
  AlertCircle,
  CheckSquare,
  Plus,
} from 'lucide-react'
import type { Block, BlockType, CalloutVariant, NumberFormat } from '@/types'
import BlockItem from './block-item'

// Number format conversion functions
function toUpperAlpha(n: number): string {
  let result = ''
  let num = n
  while (num > 0) {
    num--
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26)
  }
  return result
}

function toLowerAlpha(n: number): string {
  return toUpperAlpha(n).toLowerCase()
}

function toUpperRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let result = ''
  let num = n
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      result += syms[i]
      num -= vals[i]
    }
  }
  return result
}

function toLowerRoman(n: number): string {
  return toUpperRoman(n).toLowerCase()
}

const KATAKANA_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
function toKatakana(n: number): string {
  if (n <= 0 || n > KATAKANA_CHARS.length) return String(n)
  return KATAKANA_CHARS[n - 1]
}

const KANJI_CHARS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
function toKanji(n: number): string {
  if (n <= 0 || n > 10) return String(n)
  return KANJI_CHARS[n - 1]
}

function formatNumber(n: number, format: NumberFormat): string {
  switch (format) {
    case 'upper-alpha': return toUpperAlpha(n)
    case 'lower-alpha': return toLowerAlpha(n)
    case 'upper-roman': return toUpperRoman(n)
    case 'lower-roman': return toLowerRoman(n)
    case 'katakana': return toKatakana(n)
    case 'kanji': return toKanji(n)
    case 'decimal':
    default: return String(n)
  }
}

// Default auto-format by indent level
const AUTO_LEVEL_FORMATS: NumberFormat[] = ['decimal', 'lower-alpha', 'lower-roman']

const INSERT_BLOCK_OPTIONS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'paragraph', label: '段落', icon: <span className="text-[10px] font-mono">&#182;</span> },
  { type: 'h1', label: '見出し 1', icon: <span className="text-[10px] font-mono font-bold">H1</span> },
  { type: 'h2', label: '見出し 2', icon: <span className="text-[10px] font-mono font-bold">H2</span> },
  { type: 'h3', label: '見出し 3', icon: <span className="text-[10px] font-mono font-bold">H3</span> },
  { type: 'bullet', label: '箇条書き', icon: <span className="text-[10px]">&#8226;</span> },
  { type: 'numbered', label: '番号付き', icon: <span className="text-[10px] font-mono">1.</span> },
  { type: 'checklist', label: 'チェック', icon: <CheckSquare size={12} /> },
  { type: 'divider', label: '区切り線', icon: <Minus size={12} /> },
  { type: 'image', label: '画像', icon: <ImageIcon size={12} /> },
  { type: 'table', label: 'テーブル', icon: <Table size={12} /> },
  { type: 'code', label: 'コード', icon: <span className="text-[10px] font-mono">&lt;/&gt;</span> },
  { type: 'callout', label: 'コールアウト', icon: <AlertCircle size={12} /> },
  { type: 'quote', label: '引用', icon: <span className="text-[10px]">&ldquo;</span> },
  { type: 'section-break', label: 'セクション', icon: <span className="text-[10px]">§</span> },
]

interface Props {
  blocks: Block[]
  onUpdate: (id: string, content: string) => void
  onUpdateData?: (id: string, data: Record<string, string>) => void
  onAdd: (afterId: string, type: BlockType) => void
  onDelete: (id: string) => void
  onChangeType: (id: string, type: BlockType) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onIndent?: (id: string) => void
  onOutdent?: (id: string) => void
  onToggleChecked?: (id: string) => void
  onSetCalloutVariant?: (id: string, variant: CalloutVariant) => void
  onFocusBlock?: (id: string) => void
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
  onSplitBlock?: (id: string, contentBefore: string, contentAfter: string, newType?: BlockType) => void
  onMergeBlocks?: (targetId: string, sourceId: string, mergedContent: string) => void
  selectedBlockIds?: string[]
  onSelectBlock?: (id: string, e: React.MouseEvent) => void
  showLineNumbers?: boolean
}

export default function BlockList({
  blocks,
  onUpdate,
  onUpdateData,
  onAdd,
  onDelete,
  onChangeType,
  onReorder,
  onIndent,
  onOutdent,
  onToggleChecked,
  onSetCalloutVariant,
  onFocusBlock,
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
  onMergeBlocks,
  selectedBlockIds,
  onSelectBlock,
  showLineNumbers,
}: Props) {
  const inputRefs = useRef<(HTMLDivElement | null)[]>([])
  const [insertPickerBlockId, setInsertPickerBlockId] = useState<string | null>(null)
  const insertPickerRef = useRef<HTMLDivElement>(null)

  // Close insert picker on click outside or Escape
  useEffect(() => {
    if (!insertPickerBlockId) return
    function handleClick(e: MouseEvent) {
      if (insertPickerRef.current && !insertPickerRef.current.contains(e.target as Node)) {
        setInsertPickerBlockId(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setInsertPickerBlockId(null)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [insertPickerBlockId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const headingBlocks = useMemo(
    () => blocks.filter((b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3' || b.type === 'h4' || b.type === 'h5' || b.type === 'h6'),
    [blocks],
  )

  const footnoteIndices = useMemo(() => {
    const map: Record<string, number> = {}
    let count = 0
    blocks.forEach((b) => {
      if (b.type === 'footnote') {
        count++
        map[b.id] = count
      }
    })
    return map
  }, [blocks])

  const pageBreakData = useMemo(() => {
    const totalPageBreaks = blocks.filter(b => b.type === 'page-break').length
    const map: Record<string, number> = {}
    let count = 0
    blocks.forEach((b) => {
      if (b.type === 'page-break') {
        count++
        map[b.id] = count
      }
    })
    return { totalPageBreaks, map }
  }, [blocks])

  const numberedIndices = useMemo(() => {
    const map: Record<string, string> = {}
    const counters: Record<number, number> = {}
    let prevWasNumbered = false
    blocks.forEach((b) => {
      const indent = b.indent || 0
      if (b.type === 'numbered') {
        // Restart numbering support
        if (!prevWasNumbered || b.restartNumbering) {
          for (const key of Object.keys(counters)) {
            delete counters[Number(key)]
          }
          if (b.restartNumbering && b.startNumber) {
            counters[indent] = (b.startNumber - 1)
          }
        }
        for (const key of Object.keys(counters)) {
          const k = Number(key)
          if (k > indent) delete counters[k]
        }
        counters[indent] = (counters[indent] || 0) + 1
        // Determine format: explicit numberFormat > auto by indent level
        const fmt: NumberFormat = b.numberFormat || AUTO_LEVEL_FORMATS[indent] || 'decimal'
        if (indent === 0) {
          map[b.id] = formatNumber(counters[0], fmt)
        } else {
          const parts: string[] = []
          for (let i = 0; i <= indent; i++) {
            const levelFmt: NumberFormat = i === indent ? fmt : (AUTO_LEVEL_FORMATS[i] || 'decimal')
            parts.push(formatNumber(counters[i] || 1, levelFmt))
          }
          map[b.id] = parts.join('.')
        }
        prevWasNumbered = true
      } else {
        prevWasNumbered = false
      }
    })
    return map
  }, [blocks])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = blocks.findIndex((b) => b.id === active.id)
    const toIndex = blocks.findIndex((b) => b.id === over.id)
    onReorder(fromIndex, toIndex)
  }

  function focusBlock(index: number, atStart = false) {
    setTimeout(() => {
      const el = inputRefs.current[index]
      if (el) {
        el.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(el)
        range.collapse(atStart)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }, 0)
  }

  function focusBlockAtOffset(index: number, offset: number) {
    setTimeout(() => {
      const el = inputRefs.current[index]
      if (!el) return
      el.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let remaining = offset
      let node = walker.nextNode()
      while (node) {
        if (remaining <= (node.textContent?.length || 0)) {
          range.setStart(node, remaining)
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
          return
        }
        remaining -= node.textContent?.length || 0
        node = walker.nextNode()
      }
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }, 0)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0">
          {blocks.map((block, i) => (
            <div key={block.id}>
              {/* Insert gap before first block */}
              {i === 0 && (
                <InsertGap
                  afterBlockId={'__before_first__'}
                  onAdd={(type) => {
                    // Insert before the first block by using a special handler
                    // We'll add after a virtual "before first" position
                    onAdd('__before_first__', type)
                  }}
                  insertPickerBlockId={insertPickerBlockId}
                  setInsertPickerBlockId={setInsertPickerBlockId}
                  insertPickerRef={insertPickerRef}
                />
              )}
              <div
                onFocus={() => onFocusBlock?.(block.id)}
                onClick={(e) => {
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    e.preventDefault()
                    onSelectBlock?.(block.id, e)
                  }
                }}
                className={`relative group ${
                  selectedBlockIds?.includes(block.id)
                    ? 'border-l-2 border-l-indigo-500 bg-indigo-500/5 rounded-r'
                    : ''
                }`}
              >
                <BlockItem
                  block={block}
                  index={i}
                  onUpdate={(content) => onUpdate(block.id, content)}
                  onUpdateData={onUpdateData}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  onChangeType={onChangeType}
                  onIndent={onIndent}
                  onOutdent={onOutdent}
                  onToggleChecked={onToggleChecked}
                  onSetCalloutVariant={onSetCalloutVariant}
                  onDuplicate={onDuplicate}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                  onSetBorder={onSetBorder}
                  onSetDropCap={onSetDropCap}
                  onSetTextColor={onSetTextColor}
                  onSetBgColor={onSetBgColor}
                  onSetColumns={onSetColumns}
                  onSetLineSpacing={onSetLineSpacing}
                  onSetParagraphSpacing={onSetParagraphSpacing}
                  onSetAlign={onSetAlign}
                  onSetTextIndent={onSetTextIndent}
                  onSplitBlock={onSplitBlock ? (contentBefore, contentAfter, newType) => {
                    onSplitBlock(block.id, contentBefore, contentAfter, newType)
                    focusBlock(i + 1, true)
                  } : undefined}
                  onMergeWithPrev={onMergeBlocks && i > 0 ? (currentContent) => {
                    const prevBlock = blocks[i - 1]
                    if (!prevBlock) return
                    const prevContent = prevBlock.content || ''
                    onMergeBlocks(prevBlock.id, block.id, prevContent + currentContent)
                    const tmp = document.createElement('div')
                    tmp.innerHTML = prevContent
                    focusBlockAtOffset(i - 1, tmp.textContent?.length || 0)
                  } : undefined}
                  onMergeWithNext={onMergeBlocks && i < blocks.length - 1 ? (currentContent) => {
                    const nextBlock = blocks[i + 1]
                    if (!nextBlock) return
                    const nextContent = nextBlock.content || ''
                    onMergeBlocks(block.id, nextBlock.id, currentContent + nextContent)
                  } : undefined}
                  focusNext={() => focusBlock(i + 1, true)}
                  focusPrev={() => focusBlock(i - 1, false)}
                  inputRef={(el) => {
                    inputRefs.current[i] = el
                  }}
                  headingBlocks={headingBlocks}
                  footnoteIndex={footnoteIndices[block.id]}
                  numberedIndex={numberedIndices[block.id]}
                  showLineNumbers={showLineNumbers}
                  pageBreakNumber={pageBreakData.map[block.id]}
                  totalPageBreaks={pageBreakData.totalPageBreaks}
                />
              </div>
              {/* Insert gap after each block */}
              <InsertGap
                afterBlockId={block.id}
                onAdd={(type) => {
                  onAdd(block.id, type)
                }}
                insertPickerBlockId={insertPickerBlockId}
                setInsertPickerBlockId={setInsertPickerBlockId}
                insertPickerRef={insertPickerRef}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function InsertGap({
  afterBlockId,
  onAdd,
  insertPickerBlockId,
  setInsertPickerBlockId,
  insertPickerRef,
}: {
  afterBlockId: string
  onAdd: (type: BlockType) => void
  insertPickerBlockId: string | null
  setInsertPickerBlockId: (v: string | null | ((prev: string | null) => string | null)) => void
  insertPickerRef: React.RefObject<HTMLDivElement | null>
}) {
  const gapId = `gap_${afterBlockId}`
  const isOpen = insertPickerBlockId === gapId

  return (
    <div className="h-2 relative group/gap">
      {/* Horizontal line that appears on hover */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-600 opacity-0 group-hover/gap:opacity-40 transition-opacity" />
      {/* Centered "+" button on the line */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={() => setInsertPickerBlockId((prev) => prev === gapId ? null : gapId)}
          className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-slate-500 hover:text-indigo-400 hover:border-indigo-500 flex items-center justify-center transition-all opacity-0 group-hover/gap:opacity-100 shadow-sm"
          style={{ opacity: isOpen ? 1 : undefined }}
          title="ブロックを挿入"
        >
          <Plus size={10} />
        </button>
      </div>
      {/* Block type picker popup */}
      {isOpen && (
        <div ref={insertPickerRef} className="absolute left-1/2 -translate-x-1/2 top-4 z-50">
          <InsertBlockPicker
            onSelect={(type) => {
              onAdd(type)
              setInsertPickerBlockId(null)
            }}
          />
        </div>
      )}
    </div>
  )
}

function InsertBlockPicker({ onSelect }: { onSelect: (type: BlockType) => void }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 w-48 text-sm max-h-72 overflow-y-auto animate-slide-up">
      <div className="px-3 py-1 text-slate-500 text-[10px] font-medium">ブロックを挿入</div>
      {INSERT_BLOCK_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSelect(opt.type)
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
            {opt.icon}
          </span>
          <span className="text-xs">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
