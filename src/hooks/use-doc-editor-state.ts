'use client'

import { useState, useRef } from 'react'

// ── Dialog/panel visibility states ──

interface DialogStates {
  aiOpen: boolean
  setAiOpen: (v: boolean) => void
  proofreadOpen: boolean
  setProofreadOpen: (v: boolean) => void
  aiTextToolsOpen: boolean
  setAiTextToolsOpen: (v: boolean) => void
  commentsOpen: boolean
  setCommentsOpen: (v: boolean) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (v: boolean) => void
  shareOpen: boolean
  setShareOpen: (v: boolean) => void
  versionsOpen: boolean
  setVersionsOpen: (v: boolean) => void
  pageSettingsOpen: boolean
  setPageSettingsOpen: (v: boolean) => void
  readingMode: boolean
  setReadingMode: (v: boolean) => void
  watermarkOpen: boolean
  setWatermarkOpen: (v: boolean) => void
  specialCharsOpen: boolean
  setSpecialCharsOpen: (v: boolean) => void
  trackChangesOpen: boolean
  setTrackChangesOpen: (v: boolean) => void
  mailMergeOpen: boolean
  setMailMergeOpen: (v: boolean) => void
  templatesOpen: boolean
  setTemplatesOpen: (v: boolean) => void
  gotoOpen: boolean
  setGotoOpen: (v: boolean) => void
  docLinkOpen: boolean
  setDocLinkOpen: (v: boolean) => void
  pdfAiOpen: boolean
  setPdfAiOpen: (v: boolean) => void
  versionHistoryOpen: boolean
  setVersionHistoryOpen: (v: boolean) => void
  compareOpen: boolean
  setCompareOpen: (v: boolean) => void
  figureTocOpen: boolean
  setFigureTocOpen: (v: boolean) => void
  crossRefOpen: boolean
  setCrossRefOpen: (v: boolean) => void
  bibliographyOpen: boolean
  setBibliographyOpen: (v: boolean) => void
  indexGenOpen: boolean
  setIndexGenOpen: (v: boolean) => void
  docxImportOpen: boolean
  setDocxImportOpen: (v: boolean) => void
  versionDiffOpen: boolean
  setVersionDiffOpen: (v: boolean) => void
  docCompareOpen: boolean
  setDocCompareOpen: (v: boolean) => void
  clipHistoryOpen: boolean
  setClipHistoryOpen: (v: boolean | ((prev: boolean) => boolean)) => void
}

// ── Find/replace states ──

interface FindReplaceStates {
  findOpen: boolean
  setFindOpen: (v: boolean) => void
}

// ── Navigation/editor states ──

interface NavigationStates {
  focusedBlockId: string | null
  setFocusedBlockId: (v: string | null) => void
  selectedBlockIds: string[]
  setSelectedBlockIds: (v: string[] | ((prev: string[]) => string[])) => void
  outlinePanelOpen: boolean
  setOutlinePanelOpen: (v: boolean) => void
  focusMode: boolean
  setFocusMode: (v: boolean | ((prev: boolean) => boolean)) => void
  docLinkAnchor: { top: number; left: number } | null
  setDocLinkAnchor: (v: { top: number; left: number } | null) => void
}

// ── Editor display states ──

interface DisplayStates {
  zoom: number
  setZoom: (v: number | ((prev: number) => number)) => void
  pageLayout: boolean
  setPageLayout: (v: boolean) => void
  showFormattingMarks: boolean
  setShowFormattingMarks: (v: boolean) => void
  showLineNumbers: boolean
  setShowLineNumbers: (v: boolean) => void
  spellCheckEnabled: boolean
  setSpellCheckEnabled: (v: boolean) => void
  pageCount: number
  setPageCount: (v: number) => void
  dragOver: boolean
  setDragOver: (v: boolean) => void
}

// ── Save/status states ──

interface SaveStates {
  saveStatus: 'saved' | 'saving' | 'error'
  setSaveStatus: (v: 'saved' | 'saving' | 'error') => void
  saveFlash: boolean
  setSaveFlash: (v: boolean) => void
}

// ── Clipboard states ──

interface ClipboardStates {
  clipboardHistory: string[]
  setClipboardHistory: (v: string[] | ((prev: string[]) => string[])) => void
  pasteOptionsPos: { x: number; y: number } | null
  setPasteOptionsPos: (v: { x: number; y: number } | null) => void
  pasteOptionsTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  lastPasteData: React.MutableRefObject<{ html: string; text: string } | null>
}

export interface DocEditorState {
  dialogs: DialogStates
  findReplace: FindReplaceStates
  navigation: NavigationStates
  display: DisplayStates
  save: SaveStates
  clipboard: ClipboardStates
}

export function useDocEditorState(): DocEditorState {
  // ── Dialog/panel visibility ──
  const [aiOpen, setAiOpen] = useState(false)
  const [proofreadOpen, setProofreadOpen] = useState(false)
  const [aiTextToolsOpen, setAiTextToolsOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false)
  const [readingMode, setReadingMode] = useState(false)
  const [watermarkOpen, setWatermarkOpen] = useState(false)
  const [specialCharsOpen, setSpecialCharsOpen] = useState(false)
  const [trackChangesOpen, setTrackChangesOpen] = useState(false)
  const [mailMergeOpen, setMailMergeOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [gotoOpen, setGotoOpen] = useState(false)
  const [docLinkOpen, setDocLinkOpen] = useState(false)
  const [pdfAiOpen, setPdfAiOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [figureTocOpen, setFigureTocOpen] = useState(false)
  const [crossRefOpen, setCrossRefOpen] = useState(false)
  const [bibliographyOpen, setBibliographyOpen] = useState(false)
  const [indexGenOpen, setIndexGenOpen] = useState(false)
  const [docxImportOpen, setDocxImportOpen] = useState(false)
  const [versionDiffOpen, setVersionDiffOpen] = useState(false)
  const [docCompareOpen, setDocCompareOpen] = useState(false)
  const [clipHistoryOpen, setClipHistoryOpen] = useState(false)

  // ── Find/replace ──
  const [findOpen, setFindOpen] = useState(false)

  // ── Navigation/editor ──
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const [outlinePanelOpen, setOutlinePanelOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [docLinkAnchor, setDocLinkAnchor] = useState<{ top: number; left: number } | null>(null)

  // ── Editor display ──
  const [zoom, setZoom] = useState(100)
  const [pageLayout, setPageLayout] = useState(false)
  const [showFormattingMarks, setShowFormattingMarks] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false)
  const [pageCount, setPageCount] = useState(1)
  const [dragOver, setDragOver] = useState(false)

  // ── Save/status ──
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [saveFlash, setSaveFlash] = useState(false)

  // ── Clipboard ──
  const [clipboardHistory, setClipboardHistory] = useState<string[]>([])
  const [pasteOptionsPos, setPasteOptionsPos] = useState<{ x: number; y: number } | null>(null)
  const pasteOptionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPasteData = useRef<{ html: string; text: string } | null>(null)

  return {
    dialogs: {
      aiOpen, setAiOpen,
      proofreadOpen, setProofreadOpen,
      aiTextToolsOpen, setAiTextToolsOpen,
      commentsOpen, setCommentsOpen,
      commandPaletteOpen, setCommandPaletteOpen,
      sidebarOpen, setSidebarOpen,
      shortcutsOpen, setShortcutsOpen,
      shareOpen, setShareOpen,
      versionsOpen, setVersionsOpen,
      pageSettingsOpen, setPageSettingsOpen,
      readingMode, setReadingMode,
      watermarkOpen, setWatermarkOpen,
      specialCharsOpen, setSpecialCharsOpen,
      trackChangesOpen, setTrackChangesOpen,
      mailMergeOpen, setMailMergeOpen,
      templatesOpen, setTemplatesOpen,
      gotoOpen, setGotoOpen,
      docLinkOpen, setDocLinkOpen,
      pdfAiOpen, setPdfAiOpen,
      versionHistoryOpen, setVersionHistoryOpen,
      compareOpen, setCompareOpen,
      figureTocOpen, setFigureTocOpen,
      crossRefOpen, setCrossRefOpen,
      bibliographyOpen, setBibliographyOpen,
      indexGenOpen, setIndexGenOpen,
      docxImportOpen, setDocxImportOpen,
      versionDiffOpen, setVersionDiffOpen,
      docCompareOpen, setDocCompareOpen,
      clipHistoryOpen, setClipHistoryOpen,
    },
    findReplace: {
      findOpen, setFindOpen,
    },
    navigation: {
      focusedBlockId, setFocusedBlockId,
      selectedBlockIds, setSelectedBlockIds,
      outlinePanelOpen, setOutlinePanelOpen,
      focusMode, setFocusMode,
      docLinkAnchor, setDocLinkAnchor,
    },
    display: {
      zoom, setZoom,
      pageLayout, setPageLayout,
      showFormattingMarks, setShowFormattingMarks,
      showLineNumbers, setShowLineNumbers,
      spellCheckEnabled, setSpellCheckEnabled,
      pageCount, setPageCount,
      dragOver, setDragOver,
    },
    save: {
      saveStatus, setSaveStatus,
      saveFlash, setSaveFlash,
    },
    clipboard: {
      clipboardHistory, setClipboardHistory,
      pasteOptionsPos, setPasteOptionsPos,
      pasteOptionsTimer,
      lastPasteData,
    },
  }
}
