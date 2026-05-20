'use client'

import { useReducer, useEffect, useRef, useCallback } from 'react'
import type {
  Block,
  BlockType,
  DocDocument,
  Comment,
  PageSettings,
  HeaderFooterSettings,
  CalloutVariant,
  WatermarkSettings,
  Bookmark,
} from '@/types'
import { generateId } from '@/lib/utils'
import { saveDocDoc } from '@/lib/cloud-store'
import { createUndoableReducer, initUndoable, type UndoableAction } from '@/lib/undoable'

type DocAction =
  | { type: 'LOAD'; doc: DocDocument }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'ADD_BLOCK'; afterId: string; blockType: BlockType }
  | { type: 'DELETE_BLOCK'; id: string }
  | { type: 'UPDATE_BLOCK'; id: string; content: string }
  | { type: 'CHANGE_TYPE'; id: string; newType: BlockType }
  | { type: 'REORDER_BLOCKS'; fromIndex: number; toIndex: number }
  | { type: 'SET_BLOCKS'; blocks: Block[]; title?: string }
  | { type: 'UPDATE_BLOCK_DATA'; id: string; data: Record<string, string> }
  | { type: 'ADD_COMMENT'; text: string; blockId?: string; parentId?: string }
  | { type: 'RESOLVE_COMMENT'; id: string }
  | { type: 'DELETE_COMMENT'; id: string }
  | { type: 'SAVE_VERSION' }
  | { type: 'RESTORE_VERSION'; versionId: string }
  // Phase 3: Indent
  | { type: 'INDENT_BLOCK'; id: string }
  | { type: 'OUTDENT_BLOCK'; id: string }
  // Phase 3: Line/paragraph spacing
  | { type: 'SET_LINE_SPACING'; id: string; lineSpacing: number }
  | { type: 'SET_PARAGRAPH_SPACING'; id: string; paragraphSpacing: 'compact' | 'normal' | 'wide' }
  // Phase 4: Page settings
  | { type: 'SET_PAGE_SETTINGS'; pageSettings: PageSettings }
  // Phase 4: Header/Footer
  | { type: 'SET_HEADER_FOOTER'; headerFooter: HeaderFooterSettings }
  // Phase 4: Columns
  | { type: 'SET_BLOCK_COLUMNS'; id: string; columns: 1 | 2 | 3 }
  // Phase 3: Find & Replace
  | { type: 'REPLACE_IN_BLOCK'; id: string; search: string; replacement: string; all?: boolean }
  // Block formatting
  | { type: 'SET_BLOCK_ALIGN'; id: string; align: 'left' | 'center' | 'right' | 'justify' }
  | { type: 'SET_BLOCK_TEXT_COLOR'; id: string; textColor: string }
  | { type: 'SET_BLOCK_BG_COLOR'; id: string; bgColor: string }
  | { type: 'TOGGLE_CHECKED'; id: string }
  | { type: 'SET_CALLOUT_VARIANT'; id: string; variant: CalloutVariant }
  | { type: 'DUPLICATE_BLOCK'; id: string }
  | { type: 'MOVE_BLOCK_UP'; id: string }
  | { type: 'MOVE_BLOCK_DOWN'; id: string }
  // Watermark
  | { type: 'SET_WATERMARK'; watermark: WatermarkSettings | undefined }
  // Block decoration
  | { type: 'SET_BLOCK_BORDER'; id: string; borderStyle: string; borderColor?: string; borderWidth?: number }
  | { type: 'SET_DROP_CAP'; id: string; dropCap: boolean }
  | { type: 'SET_DIVIDER_STYLE'; id: string; dividerStyle: string; dividerColor?: string }
  // Bookmarks
  | { type: 'ADD_BOOKMARK'; name: string; blockId: string }
  | { type: 'DELETE_BOOKMARK'; id: string }

function docReducer(state: DocDocument, action: DocAction): DocDocument {
  switch (action.type) {
    case 'LOAD':
      return action.doc

    case 'SET_TITLE':
      return { ...state, meta: { ...state.meta, title: action.title } }

    case 'ADD_BLOCK': {
      const newBlock: Block = { id: generateId(), type: action.blockType, content: '' }
      const idx = state.blocks.findIndex((b) => b.id === action.afterId)
      const blocks = [...state.blocks]
      blocks.splice(idx + 1, 0, newBlock)
      return { ...state, blocks }
    }

    case 'DELETE_BLOCK': {
      if (state.blocks.length <= 1) return state
      const blocks = state.blocks.filter((b) => b.id !== action.id)
      return { ...state, blocks }
    }

    case 'UPDATE_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, content: action.content } : b)),
      }

    case 'CHANGE_TYPE':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, type: action.newType } : b)),
      }

    case 'REORDER_BLOCKS': {
      const blocks = [...state.blocks]
      const [moved] = blocks.splice(action.fromIndex, 1)
      blocks.splice(action.toIndex, 0, moved)
      return { ...state, blocks }
    }

    case 'SET_BLOCKS':
      return {
        ...state,
        blocks: action.blocks,
        meta: action.title ? { ...state.meta, title: action.title } : state.meta,
      }

    case 'UPDATE_BLOCK_DATA':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, data: { ...b.data, ...action.data } } : b)),
      }

    // Comments
    case 'ADD_COMMENT': {
      const comment: Comment = {
        id: generateId(),
        text: action.text,
        blockId: action.blockId,
        parentId: action.parentId,
        author: 'ユーザー',
        createdAt: new Date().toISOString(),
      }
      return { ...state, comments: [...(state.comments || []), comment] }
    }

    case 'RESOLVE_COMMENT':
      return {
        ...state,
        comments: (state.comments || []).map((c) => (c.id === action.id ? { ...c, resolved: true } : c)),
      }

    case 'DELETE_COMMENT':
      return {
        ...state,
        comments: (state.comments || []).filter((c) => c.id !== action.id),
      }

    // Versions
    case 'SAVE_VERSION': {
      const snapshot = {
        id: generateId(),
        title: state.meta.title || '無題',
        timestamp: new Date().toISOString(),
        data: JSON.stringify({ blocks: state.blocks }),
      }
      const versions = [...(state.versions || []), snapshot].slice(-20) // Keep last 20
      return { ...state, versions }
    }

    case 'RESTORE_VERSION': {
      const ver = (state.versions || []).find((v) => v.id === action.versionId)
      if (!ver) return state
      try {
        const { blocks } = JSON.parse(ver.data)
        return { ...state, blocks }
      } catch {
        return state
      }
    }

    // Phase 3: Indent
    case 'INDENT_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, indent: Math.min((b.indent || 0) + 1, 5) } : b)),
      }
    case 'OUTDENT_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, indent: Math.max((b.indent || 0) - 1, 0) } : b)),
      }

    // Phase 3: Line/paragraph spacing
    case 'SET_LINE_SPACING':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, lineSpacing: action.lineSpacing } : b)),
      }
    case 'SET_PARAGRAPH_SPACING':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, paragraphSpacing: action.paragraphSpacing } : b)),
      }

    // Phase 4: Page settings
    case 'SET_PAGE_SETTINGS':
      return { ...state, pageSettings: action.pageSettings }

    // Phase 4: Header/Footer
    case 'SET_HEADER_FOOTER':
      return { ...state, headerFooter: action.headerFooter }

    // Phase 4: Columns
    case 'SET_BLOCK_COLUMNS':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, columns: action.columns } : b)),
      }

    // Phase 3: Find & Replace
    case 'REPLACE_IN_BLOCK':
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b.id !== action.id) return b
          const content = action.all
            ? b.content.split(action.search).join(action.replacement)
            : b.content.replace(action.search, action.replacement)
          return { ...b, content }
        }),
      }

    // Block formatting
    case 'SET_BLOCK_ALIGN':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, align: action.align } : b)),
      }
    case 'SET_BLOCK_TEXT_COLOR':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, textColor: action.textColor } : b)),
      }
    case 'SET_BLOCK_BG_COLOR':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, bgColor: action.bgColor } : b)),
      }
    case 'TOGGLE_CHECKED':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, checked: !b.checked } : b)),
      }
    case 'SET_CALLOUT_VARIANT':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, calloutVariant: action.variant } : b)),
      }
    case 'DUPLICATE_BLOCK': {
      const idx = state.blocks.findIndex((b) => b.id === action.id)
      if (idx === -1) return state
      const blocks = [...state.blocks]
      blocks.splice(idx + 1, 0, { ...state.blocks[idx], id: generateId() })
      return { ...state, blocks }
    }
    case 'MOVE_BLOCK_UP': {
      const idx = state.blocks.findIndex((b) => b.id === action.id)
      if (idx <= 0) return state
      const blocks = [...state.blocks]
      ;[blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]]
      return { ...state, blocks }
    }
    case 'MOVE_BLOCK_DOWN': {
      const idx = state.blocks.findIndex((b) => b.id === action.id)
      if (idx === -1 || idx >= state.blocks.length - 1) return state
      const blocks = [...state.blocks]
      ;[blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]]
      return { ...state, blocks }
    }
    case 'SET_WATERMARK':
      return { ...state, watermark: action.watermark }
    case 'SET_BLOCK_BORDER':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.id
            ? {
                ...b,
                borderStyle: action.borderStyle as Block['borderStyle'],
                borderColor: action.borderColor,
                borderWidth: action.borderWidth,
              }
            : b,
        ),
      }
    case 'SET_DROP_CAP':
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, dropCap: action.dropCap } : b)),
      }
    case 'SET_DIVIDER_STYLE':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.id
            ? { ...b, dividerStyle: action.dividerStyle as Block['dividerStyle'], dividerColor: action.dividerColor }
            : b,
        ),
      }

    // Bookmarks
    case 'ADD_BOOKMARK': {
      const bookmark: Bookmark = { id: generateId(), name: action.name, blockId: action.blockId }
      return { ...state, bookmarks: [...(state.bookmarks || []), bookmark] }
    }
    case 'DELETE_BOOKMARK':
      return { ...state, bookmarks: (state.bookmarks || []).filter((b) => b.id !== action.id) }

    default:
      return state
  }
}

const INITIAL: DocDocument = {
  meta: { id: '', title: '', type: 'doc', createdAt: '', updatedAt: '' },
  blocks: [],
}

const undoableDocReducer = createUndoableReducer(docReducer)

export function useDocument() {
  const [undoState, rawDispatch] = useReducer(undoableDocReducer, initUndoable(INITIAL))
  const state = undoState.present
  const canUndo = undoState.past.length > 0
  const canRedo = undoState.future.length > 0
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useCallback((action: UndoableAction<DocAction>) => {
    rawDispatch(action)
  }, [])

  useEffect(() => {
    if (!state.meta.id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveDocDoc(state)
    }, 800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state])

  return { state, dispatch, canUndo, canRedo }
}
