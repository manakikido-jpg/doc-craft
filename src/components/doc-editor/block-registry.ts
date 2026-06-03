import type { ComponentType } from 'react'
import type { Block, BlockType, CalloutVariant } from '@/types'

/**
 * Common props passed to every block renderer from BlockItem.
 * Renderers may use only a subset of these props.
 */
export interface BlockRendererProps {
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
  // Provided by BlockItem wrapper
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void
}

// Registry map: block type -> renderer component
const blockRegistry: Record<string, ComponentType<BlockRendererProps>> = {}

export function registerBlock(type: string, component: ComponentType<BlockRendererProps>): void {
  blockRegistry[type] = component
}

export function getBlockRenderer(type: string): ComponentType<BlockRendererProps> | null {
  return blockRegistry[type] || null
}
