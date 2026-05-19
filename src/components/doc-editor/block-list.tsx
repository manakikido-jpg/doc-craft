'use client'

import { useRef, useMemo } from 'react'
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
import type { Block, BlockType, CalloutVariant } from '@/types'
import BlockItem from './block-item'

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
  onSetParagraphSpacing?: (id: string, spacing: 'compact' | 'normal' | 'wide') => void
  onSetAlign?: (id: string, align: 'left' | 'center' | 'right' | 'justify') => void
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
}: Props) {
  const inputRefs = useRef<(HTMLDivElement | null)[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const headingBlocks = useMemo(
    () => blocks.filter((b) => b.type === 'h1' || b.type === 'h2' || b.type === 'h3'),
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = blocks.findIndex((b) => b.id === active.id)
    const toIndex = blocks.findIndex((b) => b.id === over.id)
    onReorder(fromIndex, toIndex)
  }

  function focusBlock(index: number) {
    const el = inputRefs.current[index]
    if (el) {
      el.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(el)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {blocks.map((block, i) => (
            <div key={block.id} onFocus={() => onFocusBlock?.(block.id)}>
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
                focusNext={() => focusBlock(i + 1)}
                focusPrev={() => focusBlock(i - 1)}
                inputRef={(el) => {
                  inputRefs.current[i] = el
                }}
                headingBlocks={headingBlocks}
                footnoteIndex={footnoteIndices[block.id]}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
