'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SlidesDocument } from '@/types'
import { useSlides } from '@/hooks/use-slides'
import { deleteDocument } from '@/lib/storage/cloud-store'
import { exportSlidesToHTML, exportSlidesToPDF, downloadFile } from '@/lib/export/export-utils'
import { exportSlidesToPPTX } from '@/lib/export/pptx-export'
import { importPPTX } from '@/lib/import/pptx-import'
import { autoLayout } from '@/lib/auto-layout'
import { useToast } from '@/components/shared/toast'
import SlideRibbonToolbar from './slide-ribbon-toolbar'
import SlideCommandPalette from './slide-command-palette'
import SlideWelcomeScreen from './slide-welcome-screen'
import SlidePanel from './slide-panel'
import SlideCanvas from './slide-canvas'
import PresentationMode from './presentation-mode'
import PresenterView from './presenter-view'
import CommentPanel from '../shared/comment-panel'
import ShortcutsHelp from '../shared/shortcuts-help'
import ShareModal from '../shared/share-modal'
import VersionPanel from '../shared/version-panel'
import VersionHistoryPanel from '../shared/version-history-panel'
import { saveVersion, getVersionData } from '@/lib/version-history'
import SlideSorter from './slide-sorter'
import AnimationPanel from './animation-panel'
import SlideFooterSettings from './slide-footer-settings'
import SlideLayoutPanel from './slide-layout-panel'
import PdfAiPanel from '../shared/pdf-ai-panel'
import AiDesignPanel from './ai-design-panel'
import { generateId } from '@/lib/utils'
import { useTheme } from '@/lib/theme-context'
import { SLIDE_THEMES, getThemesWithBrand } from '@/lib/themes'
import PresentationSlideJump from './presentation-slide-jump'
import PresentationBlackout from './presentation-blackout'
import PresentationTimer from './presentation-timer'
import SlideSizeModal from './slide-size-modal'
import BackgroundGallery from './background-gallery'
import BackgroundPatternPicker from './background-pattern-picker'
import ThemeColorEditor from './theme-color-editor'
import SectionManager from './section-manager'
import SlideMasterEditor from './slide-master-editor'
import HandoutView from './handout-view'
import TextBulletPanel from './text-bullet-panel'
import TextPaddingPanel from './text-padding-panel'
import WordArtStylePicker from './wordart-style-picker'
import ElementPositionPanel from './element-position-panel'
import ElementInspector from './element-inspector'
import EnhancedAlignmentToolbar from './enhanced-alignment-toolbar'
import RichNotesEditor from './rich-notes-editor'
import AnimationTimeline from './animation-timeline'
import SelectionPane from './selection-pane'
import OutlineView from './outline-view'
import TransitionPreview from './transition-preview'
import SmartArtInserter from './smartart-inserter'
import SlideStatusBar from './slide-status-bar'
import SlideFindReplace from './slide-find-replace'
import ImageColorFilters from './image-color-filters'
import FreehandDrawingTool from './freehand-drawing-tool'
import TableGridPicker from './table-grid-picker'
import PenColorPicker from './pen-color-picker'
import GuideManager from './guide-manager'
import ReadingView from './reading-view'
import SlideImageTools from './slide-image-tools'
import MotionPathEditor from './motion-path-editor'
import MoreShapesPanel from './more-shapes-panel'
import MoreChartTypes from './more-chart-types'
import MoreTransitions from './more-transitions'
import RehearsalTimer from './rehearsal-timer'
import SlideNotesPrint from './slide-notes-print'
import SlideCompareView from './slide-compare-view'
import ThemePreviewPicker from './theme-preview-picker'
import BackgroundGradientEditor from './background-gradient-editor'
import FontPairPicker from './font-pair-picker'
import CustomThemeManager from './custom-theme-manager'
import PictureStyles from './picture-styles'
import EyedropperTool from './eyedropper-tool'
import FormatPainter, { type FormatData } from './format-painter'
import HyperlinkEditor from './hyperlink-editor'
import AccessibilityChecker from './accessibility-checker'
import SlideLayoutDuplicate from './slide-layout-duplicate'
import SlideNumberFormat, { type SlideNumberConfig } from './slide-number-format'
import QuickActionsBar from './quick-actions-bar'
import TableCellFormat from './table-cell-format'
import ShapeTextEditor from './shape-text-editor'
import AnimationEasingPicker from './animation-easing-picker'
import PresentationSettings from './presentation-settings'
import CsvChartImport from './csv-chart-import'
import WatermarkSettings from './watermark-settings'
import CommentThreadPanel from './comment-thread-panel'
import TableSortPanel from './table-sort-panel'
import TableConditionalFormat, { type TableConditionalRule } from './table-conditional-format'
import AiSlideGenerator from './ai-slide-generator'
import AiImageSuggest from './ai-image-suggest'
import AiLayoutOptimizer from './ai-layout-optimizer'
import CanvasGrid from './canvas-grid'
import CanvasRuler from './canvas-ruler'
import ImageCropOverlay from './image-crop-overlay'
import SlideCommentBubble from './slide-comment-bubble'
import CollaborationCursors from './collaboration-cursors'
import SlideVersionCompare from './slide-version-compare'
import PresentationRecorder from './presentation-recorder'
import AiSummaryGenerator from './ai-summary-generator'
import SlideLibrary from './slide-library'
import WritingModeToggle from './writing-mode-toggle'

interface Props {
  initialDoc: SlidesDocument
}

// Transition preview mini-animation component for hover previews
function TransitionMiniPreview({ type, playing }: { type: string; playing: boolean }) {
  const animationMap: Record<string, string> = {
    fade: 'transitionPreviewFade',
    'slide-left': 'transitionPreviewSlideLeft',
    'slide-up': 'transitionPreviewSlideUp',
    zoom: 'transitionPreviewZoom',
    dissolve: 'transitionPreviewDissolve',
    'wipe-left': 'transitionPreviewWipeLeft',
    'wipe-up': 'transitionPreviewWipeUp',
    flip: 'transitionPreviewFlip',
    cube: 'transitionPreviewCube',
    morph: 'transitionPreviewZoom',
  }
  const animName = animationMap[type] || 'transitionPreviewFade'
  return (
    <>
      <style>{`
        @keyframes transitionPreviewFade { 0% { opacity: 1; } 40% { opacity: 0; } 60% { opacity: 0; background: #6366f1; } 100% { opacity: 1; background: #6366f1; } }
        @keyframes transitionPreviewSlideLeft { 0% { transform: translateX(0); } 40% { transform: translateX(-100%); } 50% { transform: translateX(100%); background: #6366f1; } 100% { transform: translateX(0); background: #6366f1; } }
        @keyframes transitionPreviewSlideUp { 0% { transform: translateY(0); } 40% { transform: translateY(-100%); } 50% { transform: translateY(100%); background: #6366f1; } 100% { transform: translateY(0); background: #6366f1; } }
        @keyframes transitionPreviewZoom { 0% { transform: scale(1); } 40% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.3); opacity: 0; background: #6366f1; } 100% { transform: scale(1); opacity: 1; background: #6366f1; } }
        @keyframes transitionPreviewDissolve { 0% { opacity: 1; } 50% { opacity: 0; } 51% { background: #6366f1; } 100% { opacity: 1; background: #6366f1; } }
        @keyframes transitionPreviewWipeLeft { 0% { clip-path: inset(0 0 0 0); } 40% { clip-path: inset(0 0 0 100%); } 41% { clip-path: inset(0 100% 0 0); background: #6366f1; } 100% { clip-path: inset(0 0 0 0); background: #6366f1; } }
        @keyframes transitionPreviewWipeUp { 0% { clip-path: inset(0 0 0 0); } 40% { clip-path: inset(0 0 100% 0); } 41% { clip-path: inset(100% 0 0 0); background: #6366f1; } 100% { clip-path: inset(0 0 0 0); background: #6366f1; } }
        @keyframes transitionPreviewFlip { 0% { transform: perspective(200px) rotateY(0); } 40% { transform: perspective(200px) rotateY(90deg); } 41% { background: #6366f1; } 100% { transform: perspective(200px) rotateY(0); background: #6366f1; } }
        @keyframes transitionPreviewCube { 0% { transform: perspective(200px) rotateY(0); } 40% { transform: perspective(200px) rotateY(-90deg); } 41% { background: #6366f1; } 100% { transform: perspective(200px) rotateY(0); background: #6366f1; } }
      `}</style>
      <div
        className="w-[60px] h-[40px] rounded overflow-hidden border border-slate-600"
        style={{ perspective: '200px' }}
      >
        <div
          className="w-full h-full bg-indigo-800"
          style={playing ? {
            animation: `${animName} 0.8s ease-in-out forwards`,
          } : {
            background: '#312e81',
          }}
        >
          <div className="w-full h-full flex items-center justify-center text-[6px] text-white/60">
            {type}
          </div>
        </div>
      </div>
    </>
  )
}

export default function SlideEditor({ initialDoc }: Props) {
  const { state, dispatch, canUndo, canRedo } = useSlides()
  const { addToast, confirm } = useToast()
  const [presenting, setPresenting] = useState(false)
  const [presenterViewOpen, setPresenterViewOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [sorterOpen, setSorterOpen] = useState(false)
  const [animPanelOpen, setAnimPanelOpen] = useState(false)
  const [footerSettingsOpen, setFooterSettingsOpen] = useState(false)
  const [layoutPanelOpen, setLayoutPanelOpen] = useState(false)
  const [pdfAiOpen, setPdfAiOpen] = useState(false)
  const [aiDesignPanelOpen, setAiDesignPanelOpen] = useState(false)
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false)
  const [aiImageOpen, setAiImageOpen] = useState(false)
  const [aiLayoutOpen, setAiLayoutOpen] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
  const [zoom, setZoom] = useState(100)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Presentation tools
  const [slideJumpOpen, setSlideJumpOpen] = useState(false)
  const [blackoutMode, setBlackoutMode] = useState<'black' | 'white' | null>(null)
  const [timerVisible, setTimerVisible] = useState(false)
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'countdown'>('stopwatch')

  // Editor panels
  const [slideSizeOpen, setSlideSizeOpen] = useState(false)
  const [bgGalleryOpen, setBgGalleryOpen] = useState(false)
  const [bgPatternOpen, setBgPatternOpen] = useState(false)
  const [themeColorOpen, setThemeColorOpen] = useState(false)
  const [sectionManagerOpen, setSectionManagerOpen] = useState(false)
  const [masterEditorOpen, setMasterEditorOpen] = useState(false)
  const [handoutViewOpen, setHandoutViewOpen] = useState(false)
  const [bulletPanelOpen, setBulletPanelOpen] = useState(false)
  const [paddingPanelOpen, setPaddingPanelOpen] = useState(false)
  const [wordArtOpen, setWordArtOpen] = useState(false)
  const [positionPanelOpen, setPositionPanelOpen] = useState(false)
  const [alignmentToolbarOpen, setAlignmentToolbarOpen] = useState(false)
  const [animTimelineOpen, setAnimTimelineOpen] = useState(false)
  const [selectionPaneOpen, setSelectionPaneOpen] = useState(false)
  const [outlineViewOpen, setOutlineViewOpen] = useState(false)
  const [transitionPreviewOpen, setTransitionPreviewOpen] = useState(false)
  const [smartArtOpen, setSmartArtOpen] = useState(false)
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [imageFiltersOpen, setImageFiltersOpen] = useState(false)
  const [freehandActive, setFreehandActive] = useState(false)
  const [penPickerOpen, setPenPickerOpen] = useState(false)
  const [guideManagerOpen, setGuideManagerOpen] = useState(false)
  const [guides, setGuides] = useState<{id:string, type:'horizontal'|'vertical', position:number}[]>([])
  const [readingViewOpen, setReadingViewOpen] = useState(false)
  const [imageToolsOpen, setImageToolsOpen] = useState(false)
  const [motionPathOpen, setMotionPathOpen] = useState(false)
  const [moreShapesOpen, setMoreShapesOpen] = useState(false)
  const [moreChartOpen, setMoreChartOpen] = useState(false)
  const [moreTransOpen, setMoreTransOpen] = useState(false)
  const [rehearsalOpen, setRehearsalOpen] = useState(false)
  const [notesPrintOpen, setNotesPrintOpen] = useState(false)
  const [compareViewOpen, setCompareViewOpen] = useState(false)
  const [themePreviewOpen, setThemePreviewOpen] = useState(false)
  const [gradientEditorOpen, setGradientEditorOpen] = useState(false)
  const [fontPairOpen, setFontPairOpen] = useState(false)
  const [customThemeOpen, setCustomThemeOpen] = useState(false)
  const [pictureStylesOpen, setPictureStylesOpen] = useState(false)
  const [eyedropperActive, setEyedropperActive] = useState(false)
  const [eyedropperTarget, setEyedropperTarget] = useState<'fill' | 'text' | 'stroke'>('fill')
  const [formatPainterActive, setFormatPainterActive] = useState(false)
  const [formatPainterData, setFormatPainterData] = useState<FormatData | null>(null)
  const [hyperlinkOpen, setHyperlinkOpen] = useState(false)
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  const [layoutDuplicateOpen, setLayoutDuplicateOpen] = useState(false)
  const [slideNumberOpen, setSlideNumberOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [tableCellFormatOpen, setTableCellFormatOpen] = useState(false)
  const [shapeTextOpen, setShapeTextOpen] = useState(false)
  const [easingPickerOpen, setEasingPickerOpen] = useState(false)
  const [presSettingsOpen, setPresSettingsOpen] = useState(false)
  const [presConfig, setPresConfig] = useState({ loop: false, autoPlay: false, autoPlayInterval: 5, showControls: true, startFromCurrent: true, penColor: '#ef4444', penWidth: 3 })
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [watermarkOpen, setWatermarkOpen] = useState(false)
  const [commentThreadOpen, setCommentThreadOpen] = useState(false)
  const [watermarkConfig, setWatermarkConfig] = useState<{ enabled: boolean; text: string; fontSize: number; color: string; opacity: number; rotation: number; position: 'center' | 'diagonal' | 'bottom-right' }>({ enabled: false, text: 'CONFIDENTIAL', fontSize: 48, color: '#94a3b8', opacity: 15, rotation: -30, position: 'diagonal' })
  const [cropOverlayOpen, setCropOverlayOpen] = useState(false)
  const [cropOverlayElementId, setCropOverlayElementId] = useState<string | null>(null)
  // New feature state
  const [commentBubbleMode, setCommentBubbleMode] = useState(false)
  const [versionCompareOpen, setVersionCompareOpen] = useState(false)
  const [versionCompareSlides, setVersionCompareSlides] = useState<import('@/types').Slide[]>([])
  const [recorderVisible, setRecorderVisible] = useState(false)
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false)
  const [slideLibraryOpen, setSlideLibraryOpen] = useState(false)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [selectedTableCells, setSelectedTableCells] = useState<{row: number; col: number}[]>([])
  const [tableSortOpen, setTableSortOpen] = useState(false)
  const [tableCondFormatOpen, setTableCondFormatOpen] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)
  const [rulerVisible, setRulerVisible] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  // Speaker notes resizable panel
  const [speakerNotesHeight, setSpeakerNotesHeight] = useState(100)
  const [speakerNotesCollapsed, setSpeakerNotesCollapsed] = useState(true)
  const speakerNotesDragRef = useRef(false)
  // Dark/Light theme
  const [docThemeMode, setDocThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('doccraft_theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })
  // Transition preview hover state
  const [transitionHoverType, setTransitionHoverType] = useState<string | null>(null)
  const [transitionHoverPlaying, setTransitionHoverPlaying] = useState(false)
  const copiedSlideRef = useRef<import('@/types').Slide | null>(null)
  const router = useRouter()
  const { toggleTheme } = useTheme()

  useEffect(() => {
    dispatch({ type: 'LOAD', doc: initialDoc })
  }, [initialDoc.meta.id])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (presenting) {
        if (e.key === 'b' || e.key === 'B') {
          setBlackoutMode(prev => prev === 'black' ? null : 'black')
        }
        if (e.key === 'w' || e.key === 'W') {
          setBlackoutMode(prev => prev === 'white' ? null : 'white')
        }
        if (e.key === 't' || e.key === 'T') {
          setTimerVisible(prev => !prev)
        }
        if (e.key === 'g' || e.key === 'G') {
          setSlideJumpOpen(prev => !prev)
        }
        // Any key dismisses blackout
        if (blackoutMode && !['b','B','w','W'].includes(e.key)) {
          setBlackoutMode(null)
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        dispatch({ type: 'REDO' })
      }
      if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault()
        setPresenting(true)
      }
      if (e.shiftKey && e.key === 'F5') {
        e.preventDefault()
        setPresenting(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setFindReplaceOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault()
        setGridVisible(prev => !prev)
      }
      // Slide-level copy (skip when typing in input/textarea)
      const tag = (e.target as HTMLElement)?.tagName
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementIds.length === 0 && !isEditing) {
        const active = state.slides.find(s => s.id === state.activeSlideId)
        if (active) {
          copiedSlideRef.current = JSON.parse(JSON.stringify(active))
          addToast('スライドをコピーしました', 'info', 1500)
        }
      }
      // Slide-level paste (skip when typing in input/textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && selectedElementIds.length === 0 && !isEditing && copiedSlideRef.current) {
        e.preventDefault()
        const copied = copiedSlideRef.current
        const newElements = copied.elements.map(el => ({
          ...el,
          id: generateId(),
        }))
        dispatch({
          type: 'IMPORT_SLIDES',
          slides: [{
            elements: newElements as import('@/types').SlideElement[],
            themeKey: copied.themeKey,
            transition: copied.transition,
            transitionDuration: copied.transitionDuration,
            notes: copied.notes,
            customTheme: copied.customTheme,
          }],
          afterId: state.activeSlideId,
        })
        addToast('スライドを貼り付けました', 'success', 1500)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
      // Ctrl+S save feedback
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        addToast('保存しました', 'success', 2000)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, presenting, blackoutMode, selectedElementIds, state.slides, state.activeSlideId, addToast])

  // Dark/Light theme class switching
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    root.classList.add(docThemeMode === 'light' ? 'theme-light' : 'theme-dark')
    localStorage.setItem('doccraft_theme', docThemeMode)
  }, [docThemeMode])

  // Auto-save version snapshots to localStorage every 5 minutes
  const lastVersionSave = useRef(Date.now())
  useEffect(() => {
    if (!state.meta.id || state.slides.length === 0) return
    if (Date.now() - lastVersionSave.current > 300000) {
      saveVersion(state.meta.id, state.meta.title || '無題', JSON.stringify({ slides: state.slides, activeSlideId: state.activeSlideId }))
      lastVersionSave.current = Date.now()
    }
  }, [state.slides, state.meta.id, state.meta.title, state.activeSlideId])

  // Track save status based on state changes
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!state.meta.id || state.slides.length === 0) return
    setSaveStatus('saving')
    if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
    saveStatusTimer.current = setTimeout(() => {
      setSaveStatus('saved')
    }, 1000)
    return () => {
      if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current)
    }
  }, [state.slides, state.meta, state.activeSlideId])

  const handleRestoreVersion = useCallback((versionId: string) => {
    const data = getVersionData(versionId)
    if (!data) return
    try {
      const parsed = JSON.parse(data)
      if (parsed.slides) {
        dispatch({ type: 'LOAD', doc: { ...state, slides: parsed.slides, activeSlideId: parsed.activeSlideId || state.activeSlideId } })
      }
    } catch { /* ignore parse errors */ }
    setVersionHistoryOpen(false)
  }, [dispatch, state])

  function handleExport() {
    const html = exportSlidesToHTML(state)
    downloadFile(html, `${state.meta.title || 'presentation'}.html`)
  }

  async function handleExportPDF() {
    addToast('PDF生成中...', 'info', 3000)
    try {
      await exportSlidesToPDF(state)
      addToast('PDFをダウンロードしました', 'success')
    } catch {
      addToast('PDF生成に失敗しました', 'error')
    }
  }

  async function handleExportPPTX() {
    await exportSlidesToPPTX(state)
  }

  async function handleImportPPTX() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pptx'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      addToast('PPTXをインポート中...', 'info', 3000)
      try {
        const slides = await importPPTX(file)
        dispatch({ type: 'IMPORT_SLIDES', slides })
        addToast(`${slides.length}枚のスライドをインポートしました`, 'success')
      } catch {
        addToast('PPTXのインポートに失敗しました', 'error')
      }
    }
    input.click()
  }

  async function handleExportImages() {
    addToast('画像エクスポート中...', 'info', 3000)
    try {
      const { exportSlidesToImages } = await import('@/lib/export/export-utils')
      const slideEls = document.querySelectorAll('[data-slide-canvas]')
      await exportSlidesToImages(Array.from(slideEls) as HTMLElement[], state)
      addToast('画像をダウンロードしました', 'success')
    } catch {
      addToast('画像エクスポートに失敗しました', 'error')
    }
  }

  function handlePrint() {
    const prevTitle = document.title
    document.title = state.meta.title || 'presentation'
    window.print()
    document.title = prevTitle
  }

  async function handleDelete() {
    if (
      !(await confirm(`「${state.meta.title || '無題のプレゼンテーション'}」を削除しますか？この操作は取り消せません。`))
    )
      return
    await deleteDocument(state.meta.id)
    router.push('/dashboard')
  }

  const activeSlide = state.slides.find((s) => s.id === state.activeSlideId)

  if (!state.meta.id) return null

  return (
    <div data-editor-shell className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <div className="no-print">
      <QuickActionsBar
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        canUndo={canUndo}
        canRedo={canRedo}
        onPresent={() => setPresenting(true)}
        onExportPDF={handleExportPDF}
        onExportPPTX={handleExportPPTX}
        onPrint={handlePrint}
        saveStatus={saveStatus}
      />
      </div>
      <div className="no-print">
      <SlideRibbonToolbar
        state={state}
        dispatch={dispatch}
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onExportPPTX={handleExportPPTX}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onPresent={() => setPresenting(true)}
        onPresenterView={() => setPresenterViewOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onNotesToggle={() => setNotesOpen(!notesOpen)}
        onCommentsToggle={() => setCommentsOpen(!commentsOpen)}
        onShortcuts={() => setShortcutsOpen(true)}
        onShare={() => setShareOpen(true)}
        onVersions={() => setVersionsOpen(true)}
        onVersionHistory={() => setVersionHistoryOpen(true)}
        onSorterView={() => setSorterOpen(true)}
        onAnimationPanel={() => setAnimPanelOpen(!animPanelOpen)}
        onFooterSettings={() => setFooterSettingsOpen(!footerSettingsOpen)}
        onSlideLayout={() => setLayoutPanelOpen(true)}
        onPdfImport={() => setPdfAiOpen(true)}
        onAiDesign={() => setAiDesignPanelOpen(!aiDesignPanelOpen)}
        onAutoLayout={() => {
          if (activeSlide) {
            const laid = autoLayout(activeSlide)
            laid.elements.forEach((el) => {
              if (
                el.type !== 'image' &&
                el.type !== 'shape' &&
                el.type !== 'table' &&
                el.type !== 'connector' &&
                el.type !== 'video' &&
                el.type !== 'audio' &&
                el.type !== 'chart'
              ) {
                dispatch({
                  type: 'UPDATE_ELEMENT_POSITION',
                  slideId: activeSlide.id,
                  elementId: el.id,
                  x: el.x,
                  y: el.y,
                })
              }
            })
          }
        }}
        activeSlideId={activeSlide?.id}
        elements={activeSlide?.elements || []}
        selectedIds={selectedElementIds}
        onUpdateProps={(slideId, elementId, props) =>
          dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId, elementId, props })
        }
        zoom={zoom}
        onZoomChange={setZoom}
        onSlideSizeSettings={() => setSlideSizeOpen(true)}
        onBackgroundGallery={() => setBgGalleryOpen(true)}
        onThemeColorEditor={() => setThemeColorOpen(true)}
        onSectionManager={() => setSectionManagerOpen(true)}
        onMasterEditor={() => setMasterEditorOpen(true)}
        onHandoutView={() => setHandoutViewOpen(true)}
        onBulletPanel={() => setBulletPanelOpen(true)}
        onPaddingPanel={() => setPaddingPanelOpen(true)}
        onWordArtPicker={() => setWordArtOpen(true)}
        onPositionPanel={() => setPositionPanelOpen(true)}
        onAlignmentToolbar={() => setAlignmentToolbarOpen(true)}
        currentTransitionDuration={activeSlide?.transitionDuration || 500}
        onTransitionDuration={(ms) => dispatch({ type: 'SET_TRANSITION_DURATION', slideId: state.activeSlideId, duration: ms })}
        onAnimationTimeline={() => setAnimTimelineOpen(true)}
        onSelectionPane={() => setSelectionPaneOpen(!selectionPaneOpen)}
        onOutlineView={() => setOutlineViewOpen(!outlineViewOpen)}
        onTransitionPreview={() => setTransitionPreviewOpen(true)}
        onSmartArt={() => setSmartArtOpen(true)}
        onFindReplace={() => setFindReplaceOpen(true)}
        onFreehandDraw={() => setFreehandActive(true)}
        onTransitionApplyAll={() => {
          const active = state.slides.find(s => s.id === state.activeSlideId)
          if (active?.transition) {
            dispatch({ type: 'SET_TRANSITION_ALL', transition: active.transition, duration: active.transitionDuration })
          }
        }}
        onGuideManager={() => setGuideManagerOpen(true)}
        onReadingView={() => setReadingViewOpen(true)}
        onImageTools={() => setImageToolsOpen(true)}
        onMotionPath={() => setMotionPathOpen(true)}
        onMoreShapes={() => setMoreShapesOpen(true)}
        onMoreCharts={() => setMoreChartOpen(true)}
        onMoreTransitions={() => setMoreTransOpen(true)}
        onRehearsal={() => setRehearsalOpen(true)}
        onNotesPrint={() => setNotesPrintOpen(true)}
        onExportImages={handleExportImages}
        onImportPPTX={handleImportPPTX}
        onThemePreview={() => setThemePreviewOpen(true)}
        onGradientEditor={() => setGradientEditorOpen(true)}
        onFontPairPicker={() => setFontPairOpen(true)}
        onCompareView={() => setCompareViewOpen(true)}
        onCustomThemeManager={() => setCustomThemeOpen(true)}
        onPictureStyles={() => setPictureStylesOpen(true)}
        onEyedropper={(target: 'fill' | 'text' | 'stroke') => { setEyedropperTarget(target); setEyedropperActive(true) }}
        onAccessibilityCheck={() => setAccessibilityOpen(true)}
        onFormatPainter={() => {
          if (selectedElementIds.length === 1 && activeSlide) {
            const el = activeSlide.elements.find(e => e.id === selectedElementIds[0])
            if (el) {
              const data: FormatData = {}
              if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
                const t = el as import('@/types').SlideTextElement
                data.fontSize = t.fontSize; data.fontWeight = t.fontWeight; data.fontFamily = t.fontFamily
                data.color = t.color; data.align = t.align; data.underline = t.underline
                data.strikethrough = t.strikethrough; data.highlightColor = t.highlightColor
              } else if (el.type === 'shape') {
                const s = el as import('@/types').SlideShapeElement
                data.fill = s.fill; data.stroke = s.stroke; data.strokeWidth = s.strokeWidth
              }
              data.opacity = el.opacity
              setFormatPainterData(data)
              setFormatPainterActive(true)
            }
          }
        }}
        onHyperlinkEditor={() => setHyperlinkOpen(true)}
        onInspector={() => setInspectorOpen(!inspectorOpen)}
        onShapeTextEditor={() => setShapeTextOpen(true)}
        onBackgroundPattern={() => setBgPatternOpen(true)}
        onEasingPicker={() => setEasingPickerOpen(true)}
        onPresentationSettings={() => setPresSettingsOpen(true)}
        onCsvImport={() => setCsvImportOpen(true)}
        onWatermark={() => setWatermarkOpen(true)}
      />
      </div>

      {/* Theme toggle button */}
      <div className="absolute top-1.5 right-4 z-50 no-print">
        <button
          onClick={() => setDocThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
          className="px-2 py-1 text-xs rounded-lg border transition-colors bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          title={docThemeMode === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
        >
          {docThemeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="no-print">
          <SlidePanel state={state} dispatch={dispatch} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden print-content" ref={canvasContainerRef}>
          <div className="relative flex-1 overflow-hidden">
            <SlideCanvas state={state} dispatch={dispatch} onSelectionChange={setSelectedElementIds} zoom={zoom} onZoomChange={setZoom} watermarkConfig={watermarkConfig} gridVisible={gridVisible} rulerVisible={rulerVisible} onCropOverlay={(elementId) => { setCropOverlayElementId(elementId); setCropOverlayOpen(true) }} />
            {/* Collaboration cursors overlay */}
            {state.meta.id && (
              <CollaborationCursors documentId={state.meta.id} canvasRef={canvasContainerRef} />
            )}
            {/* Slide comment bubbles overlay */}
            {(commentBubbleMode || (state.comments || []).some(c => c.blockId?.startsWith('pos:'))) && activeSlide && (
              <SlideCommentBubble
                comments={state.comments || []}
                slideId={state.activeSlideId}
                onAdd={(text, slideId, parentId, blockId) => dispatch({ type: 'ADD_COMMENT', text, slideId, parentId, blockId })}
                onResolve={(id) => dispatch({ type: 'RESOLVE_COMMENT', id })}
                onDelete={(id) => dispatch({ type: 'DELETE_COMMENT', id })}
                isAddingMode={commentBubbleMode}
                onToggleAddMode={() => setCommentBubbleMode(false)}
              />
            )}
            {/* Transition mini-preview bar */}
            {activeSlide && (
              <div className="absolute bottom-12 right-2 z-40 flex items-center gap-1 bg-slate-800/90 rounded-lg px-2 py-1 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 mr-1">切替:</span>
                {['none', 'fade', 'slide-left', 'slide-up', 'zoom', 'dissolve', 'flip'].map(t => (
                  <div
                    key={t}
                    className="relative"
                    onMouseEnter={() => { setTransitionHoverType(t); setTransitionHoverPlaying(true) }}
                    onMouseLeave={() => { setTransitionHoverType(null); setTransitionHoverPlaying(false) }}
                  >
                    <button
                      className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${activeSlide.transition === t ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                      onClick={() => dispatch({ type: 'SET_TRANSITION', slideId: state.activeSlideId, transition: t as any })}
                    >
                      {t === 'none' ? 'なし' : t === 'fade' ? 'フェード' : t === 'slide-left' ? 'スライド' : t === 'slide-up' ? 'スライドUp' : t === 'zoom' ? 'ズーム' : t === 'dissolve' ? 'ディゾルブ' : 'フリップ'}
                    </button>
                    {transitionHoverType === t && t !== 'none' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                        <TransitionMiniPreview type={t} playing={transitionHoverPlaying} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Auto-advance setting per slide */}
            {activeSlide && (
              <div className="absolute bottom-2 left-2 z-40 flex items-center gap-1.5 bg-slate-800/90 rounded-lg px-2 py-1 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 whitespace-nowrap">自動送り:</span>
                <select
                  value={activeSlide.autoAdvance ?? 0}
                  onChange={(e) => {
                    dispatch({ type: 'SET_AUTO_ADVANCE', slideId: activeSlide.id, seconds: Number(e.target.value) })
                  }}
                  className="bg-slate-700 text-xs text-slate-200 rounded px-1.5 py-0.5 border border-slate-600 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={0}>なし</option>
                  <option value={3}>3秒</option>
                  <option value={5}>5秒</option>
                  <option value={10}>10秒</option>
                  <option value={15}>15秒</option>
                  <option value={30}>30秒</option>
                </select>
              </div>
            )}
            {/* Reset to theme button for selected elements */}
            {selectedElementIds.length > 0 && activeSlide && (
              <div className="absolute top-2 left-2 z-40">
                <button
                  onClick={() => {
                    selectedElementIds.forEach(id => {
                      dispatch({
                        type: 'UPDATE_ELEMENT_PROPS',
                        slideId: state.activeSlideId,
                        elementId: id,
                        props: { color: undefined, titleColor: undefined, bodyColor: undefined, shapeColor: undefined, fill: undefined, stroke: undefined } as any,
                      })
                    })
                    addToast('テーマカラーに戻しました', 'success')
                  }}
                  className="px-2 py-1 text-[10px] bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/50 transition-colors whitespace-nowrap"
                  title="選択した要素のカスタムカラーを削除してテーマの色に戻す"
                >
                  テーマに戻す
                </button>
              </div>
            )}
            {/* Writing mode toggle for selected text element */}
            {selectedElementIds.length === 1 && activeSlide && (() => {
              const selEl = activeSlide.elements.find(el => el.id === selectedElementIds[0])
              if (!selEl || (selEl.type !== 'title' && selEl.type !== 'subtitle' && selEl.type !== 'body' && selEl.type !== 'label')) return null
              const textEl = selEl as import('@/types').SlideTextElement
              return (
                <div className="absolute top-2 right-2 z-40">
                  <WritingModeToggle
                    writingMode={(textEl as any).writingMode || 'horizontal'}
                    onToggle={(mode) => {
                      dispatch({
                        type: 'UPDATE_ELEMENT_PROPS',
                        slideId: state.activeSlideId,
                        elementId: textEl.id,
                        props: { writingMode: mode } as any,
                      })
                    }}
                  />
                </div>
              )
            })()}
          </div>
          {notesOpen && activeSlide && (
            <RichNotesEditor
              notes={activeSlide?.notes || ''}
              onChange={(notes) => dispatch({ type: 'SET_NOTES', slideId: state.activeSlideId, notes })}
            />
          )}
          {/* Speaker notes resizable panel */}
          {activeSlide && (
            <div className="no-print">
              {/* Divider bar / collapse toggle */}
              <div
                className="flex items-center gap-2 px-3 py-1 bg-slate-800 border-t border-slate-700 cursor-row-resize select-none hover:bg-slate-750"
                onMouseDown={(e) => {
                  if (speakerNotesCollapsed) return
                  e.preventDefault()
                  speakerNotesDragRef.current = true
                  const startY = e.clientY
                  const startH = speakerNotesHeight
                  const onMove = (ev: MouseEvent) => {
                    if (!speakerNotesDragRef.current) return
                    const delta = startY - ev.clientY
                    setSpeakerNotesHeight(Math.max(50, Math.min(400, startH + delta)))
                  }
                  const onUp = () => {
                    speakerNotesDragRef.current = false
                    window.removeEventListener('mousemove', onMove)
                    window.removeEventListener('mouseup', onUp)
                  }
                  window.addEventListener('mousemove', onMove)
                  window.addEventListener('mouseup', onUp)
                }}
              >
                <button
                  onClick={() => setSpeakerNotesCollapsed(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  {speakerNotesCollapsed ? 'ノート ▶' : 'スピーカーノート'}
                </button>
                {!speakerNotesCollapsed && (
                  <div className="flex-1 flex justify-center">
                    <div className="w-8 h-1 rounded-full bg-slate-600" />
                  </div>
                )}
              </div>
              {!speakerNotesCollapsed && (
                <div style={{ height: speakerNotesHeight }} className="bg-slate-900 border-t border-slate-700/50">
                  <textarea
                    value={activeSlide.notes || ''}
                    onChange={(e) => dispatch({ type: 'SET_NOTES', slideId: state.activeSlideId, notes: e.target.value })}
                    placeholder="スピーカーノートをここに入力..."
                    className="w-full h-full p-3 bg-transparent text-slate-300 text-sm resize-none outline-none placeholder:text-slate-600"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {commentsOpen && (
          <CommentPanel
            comments={state.comments || []}
            onAdd={(text, parentId) => dispatch({ type: 'ADD_COMMENT', text, slideId: state.activeSlideId, parentId })}
            onResolve={(id) => dispatch({ type: 'RESOLVE_COMMENT', id })}
            onDelete={(id) => dispatch({ type: 'DELETE_COMMENT', id })}
            onClose={() => setCommentsOpen(false)}
          />
        )}
        {commentThreadOpen && (
          <CommentThreadPanel
            comments={state.comments || []}
            slides={state.slides}
            activeSlideId={state.activeSlideId}
            onAdd={(text, slideId, parentId) => dispatch({ type: 'ADD_COMMENT', text, slideId, parentId })}
            onResolve={(id) => dispatch({ type: 'RESOLVE_COMMENT', id })}
            onDelete={(id) => dispatch({ type: 'DELETE_COMMENT', id })}
            onClose={() => setCommentThreadOpen(false)}
          />
        )}
        {animPanelOpen && activeSlide && (
          <AnimationPanel
            slide={activeSlide}
            dispatch={dispatch}
            onClose={() => setAnimPanelOpen(false)}
            selectedElementIds={selectedElementIds}
          />
        )}
        {aiLayoutOpen && activeSlide && (
          <AiLayoutOptimizer
            open={aiLayoutOpen}
            onClose={() => setAiLayoutOpen(false)}
            slide={activeSlide}
            onApplyLayout={(elements) => {
              dispatch({ type: 'SET_SLIDE_ELEMENTS', slideId: activeSlide.id, elements })
            }}
          />
        )}
      </div>

      {presenting && (
        <PresentationMode
          slides={state.slides}
          startIndex={Math.max(
            0,
            state.slides.findIndex((s) => s.id === state.activeSlideId),
          )}
          onExit={() => setPresenting(false)}
          globalFooter={state.globalFooter}
        />
      )}

      {presenterViewOpen && (
        <PresenterView
          slides={state.slides}
          startIndex={Math.max(
            0,
            state.slides.findIndex((s) => s.id === state.activeSlideId),
          )}
          onExit={() => setPresenterViewOpen(false)}
          globalFooter={state.globalFooter}
        />
      )}

      {sorterOpen && <SlideSorter state={state} dispatch={dispatch} onClose={() => setSorterOpen(false)} />}

      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} context="slides" />
      <ShareModal doc={state} open={shareOpen} onClose={() => setShareOpen(false)} />
      {versionsOpen && (
        <VersionPanel
          versions={state.versions || []}
          onRestore={(_id) => dispatch({ type: 'SAVE_VERSION' })}
          onClose={() => setVersionsOpen(false)}
        />
      )}
      <VersionHistoryPanel
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        docId={state.meta.id}
        onRestore={handleRestoreVersion}
      />
      {footerSettingsOpen && (
        <SlideFooterSettings
          footer={state.globalFooter}
          onUpdate={(footer) => dispatch({ type: 'SET_GLOBAL_FOOTER', footer })}
          onClose={() => setFooterSettingsOpen(false)}
        />
      )}
      {layoutPanelOpen && activeSlide && (
        <SlideLayoutPanel
          themeKey={activeSlide.themeKey}
          onApplyLayout={(elements) => {
            dispatch({
              type: 'SET_SLIDE_ELEMENTS',
              slideId: activeSlide.id,
              elements,
            })
          }}
          onClose={() => setLayoutPanelOpen(false)}
        />
      )}
      <AiDesignPanel
        open={aiDesignPanelOpen}
        onClose={() => setAiDesignPanelOpen(false)}
        currentSlide={activeSlide || null}
        allSlides={state.slides}
        onUpdateElement={(slideId, elementId, updates) => {
          dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId, elementId, props: updates })
        }}
        onUpdateSlide={(slideId, updates) => {
          if (updates.themeKey) {
            dispatch({ type: 'SET_THEME', slideId, themeKey: updates.themeKey })
          }
        }}
      />
      <AiSlideGenerator
        open={aiGeneratorOpen}
        onClose={() => setAiGeneratorOpen(false)}
        onGenerate={(slides) => {
          dispatch({ type: 'IMPORT_SLIDES', slides })
        }}
      />
      <PdfAiPanel
        open={pdfAiOpen}
        onClose={() => setPdfAiOpen(false)}
        context="slides"
        onInsertSlides={(slides, docTitle) => {
          dispatch({ type: 'SET_TITLE', title: docTitle })
          const importSlides = slides.map((slideData) => ({
            elements: [
              {
                id: generateId(),
                type: 'title' as const,
                content: slideData.title,
                x: 5, y: 5, w: 90, h: 15,
                fontSize: 32, fontWeight: '700' as const, align: 'left' as const,
                color: '#ffffff',
              },
              ...slideData.bullets.map((bullet, bi) => ({
                id: generateId(),
                type: 'body' as const,
                content: `• ${bullet}`,
                x: 5, y: 25 + bi * 10, w: 90, h: 8,
                fontSize: 18, fontWeight: '400' as const, align: 'left' as const,
                color: '#e2e8f0',
              })),
            ] as import('@/types').SlideElement[],
            themeKey: slideData.themeKey as import('@/types').SlideThemeKey | undefined,
          }))
          dispatch({ type: 'IMPORT_SLIDES', slides: importSlides })
        }}
      />

      {/* Presentation tools */}
      {presenting && <PresentationBlackout mode={blackoutMode} />}
      {presenting && <PresentationTimer visible={timerVisible} mode={timerMode} countdownMinutes={15} />}
      {presenting && slideJumpOpen && (
        <PresentationSlideJump
          slides={state.slides}
          currentIndex={state.slides.findIndex(s => s.id === state.activeSlideId)}
          onJump={(i) => { dispatch({ type: 'SET_ACTIVE', id: state.slides[i].id }); setSlideJumpOpen(false) }}
          onClose={() => setSlideJumpOpen(false)}
        />
      )}

      {/* Editor panels */}
      {slideSizeOpen && (
        <SlideSizeModal
          currentSize={state.slideSize}
          onApply={(size) => { dispatch({ type: 'SET_SLIDE_SIZE', slideSize: size }); setSlideSizeOpen(false) }}
          onClose={() => setSlideSizeOpen(false)}
        />
      )}

      {bgGalleryOpen && (
        <BackgroundGallery
          onApply={(bg) => {
            const active = state.slides.find(s => s.id === state.activeSlideId)
            if (active) dispatch({ type: 'SET_CUSTOM_THEME', slideId: active.id, customTheme: { background: bg } })
            setBgGalleryOpen(false)
          }}
          onApplyImage={(url, fit) => {
            dispatch({ type: 'SET_BACKGROUND_IMAGE', slideId: state.activeSlideId, backgroundImage: url, backgroundFit: fit })
            setBgGalleryOpen(false)
          }}
          onClose={() => setBgGalleryOpen(false)}
        />
      )}

      {themeColorOpen && (() => {
        const active = state.slides.find(s => s.id === state.activeSlideId)
        return (
          <ThemeColorEditor
            theme={active?.customTheme || {}}
            onUpdate={(theme) => dispatch({ type: 'SET_CUSTOM_THEME', slideId: state.activeSlideId, customTheme: theme })}
            onClose={() => setThemeColorOpen(false)}
          />
        )
      })()}

      {sectionManagerOpen && (
        <SectionManager
          sections={state.sections || []}
          slideCount={state.slides.length}
          onAdd={(name, idx, color) => dispatch({ type: 'ADD_SECTION', name, startSlideIndex: idx, color })}
          onRename={(id, name) => dispatch({ type: 'RENAME_SECTION', sectionId: id, name })}
          onDelete={(id) => dispatch({ type: 'DELETE_SECTION', sectionId: id })}
          onClose={() => setSectionManagerOpen(false)}
        />
      )}

      {masterEditorOpen && (
        <SlideMasterEditor
          masters={state.masters || []}
          onAddMaster={(m) => dispatch({ type: 'ADD_MASTER', master: m })}
          onUpdateMaster={(id, u) => dispatch({ type: 'UPDATE_MASTER', masterId: id, master: u })}
          onDeleteMaster={(id) => dispatch({ type: 'DELETE_MASTER', masterId: id })}
          onClose={() => setMasterEditorOpen(false)}
        />
      )}

      {handoutViewOpen && (
        <HandoutView
          slides={state.slides}
          layout="2"
          onClose={() => setHandoutViewOpen(false)}
          onPrint={() => window.print()}
        />
      )}

      {bulletPanelOpen && (() => {
        const selEl = state.slides.find(s => s.id === state.activeSlideId)?.elements.find(el => selectedElementIds.includes(el.id) && (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label'))
        if (!selEl) return null
        const textEl = selEl as import('@/types').SlideTextElement
        return (
          <TextBulletPanel
            bulletType={textEl.bulletType || 'none'}
            indentLevel={textEl.indentLevel || 0}
            onChangeBullet={(t) => { dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: textEl.id, props: { bulletType: t } as any }); }}
            onChangeIndent={(l) => { dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: textEl.id, props: { indentLevel: l } as any }); }}
            onClose={() => setBulletPanelOpen(false)}
          />
        )
      })()}

      {paddingPanelOpen && (() => {
        const selEl = state.slides.find(s => s.id === state.activeSlideId)?.elements.find(el => selectedElementIds.includes(el.id))
        if (!selEl || selEl.type === 'connector') return null
        const textEl = selEl as import('@/types').SlideTextElement
        return (
          <TextPaddingPanel
            padding={textEl.padding || { top: 0, right: 0, bottom: 0, left: 0 }}
            onUpdate={(p) => dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selEl.id, props: { padding: p } as any })}
            onClose={() => setPaddingPanelOpen(false)}
          />
        )
      })()}

      {wordArtOpen && (() => {
        const selEl = state.slides.find(s => s.id === state.activeSlideId)?.elements.find(el => selectedElementIds.includes(el.id))
        if (!selEl) return null
        const textEl = selEl as import('@/types').SlideTextElement
        return (
          <WordArtStylePicker
            currentStyle={textEl.wordArtStyle || 'none'}
            onSelect={(s) => { dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selEl.id, props: { wordArtStyle: s } as any }); setWordArtOpen(false) }}
            onClose={() => setWordArtOpen(false)}
          />
        )
      })()}

      {positionPanelOpen && (() => {
        const selEl = state.slides.find(s => s.id === state.activeSlideId)?.elements.find(el => selectedElementIds.includes(el.id))
        if (!selEl || selEl.type === 'connector') return null
        return (
          <ElementPositionPanel
            element={selEl}
            slideId={state.activeSlideId}
            dispatch={dispatch}
            onClose={() => setPositionPanelOpen(false)}
          />
        )
      })()}

      {alignmentToolbarOpen && (() => {
        const activeSlide = state.slides.find(s => s.id === state.activeSlideId)
        if (!activeSlide) return null
        const selEls = activeSlide.elements.filter(el => selectedElementIds.includes(el.id))
        if (selEls.length === 0) return null
        return (
          <div className="fixed inset-0 z-50" onClick={() => setAlignmentToolbarOpen(false)}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={e => e.stopPropagation()}>
              <EnhancedAlignmentToolbar
                selectedElements={selEls}
                slideId={state.activeSlideId}
                dispatch={dispatch}
                onClose={() => setAlignmentToolbarOpen(false)}
              />
            </div>
          </div>
        )
      })()}

      {/* Welcome screen for empty presentations */}
      {state.slides.length === 1 && activeSlide && activeSlide.elements.length === 0 && (
        <SlideWelcomeScreen
          onApplyTemplate={(templateSlides) => {
            dispatch({ type: 'IMPORT_SLIDES', slides: templateSlides })
          }}
        />
      )}

      {/* Animation Timeline */}
      {animTimelineOpen && (() => {
        const activeSlide = state.slides.find(s => s.id === state.activeSlideId)
        if (!activeSlide) return null
        return <AnimationTimeline slide={activeSlide} slideId={state.activeSlideId} dispatch={dispatch} onClose={() => setAnimTimelineOpen(false)} />
      })()}

      {/* Selection Pane */}
      {selectionPaneOpen && (() => {
        const activeSlide = state.slides.find(s => s.id === state.activeSlideId)
        if (!activeSlide) return null
        return (
          <SelectionPane
            slide={activeSlide}
            slideId={state.activeSlideId}
            selectedIds={selectedElementIds}
            dispatch={dispatch}
            onSelectElement={(id) => setSelectedElementIds([id])}
            onClose={() => setSelectionPaneOpen(false)}
          />
        )
      })()}

      {/* Outline View */}
      {outlineViewOpen && (
        <OutlineView
          slides={state.slides}
          activeSlideId={state.activeSlideId}
          sections={state.sections}
          onSelectSlide={(id) => dispatch({ type: 'SET_ACTIVE', id })}
          onClose={() => setOutlineViewOpen(false)}
        />
      )}

      {/* Transition Preview */}
      {transitionPreviewOpen && (() => {
        const activeSlide = state.slides.find(s => s.id === state.activeSlideId)
        const activeIdx = state.slides.findIndex(s => s.id === state.activeSlideId)
        const prevSlide = activeIdx > 0 ? state.slides[activeIdx - 1] : undefined
        if (!activeSlide) return null
        return (
          <TransitionPreview
            slide={activeSlide}
            prevSlide={prevSlide}
            transition={activeSlide.transition || 'none'}
            duration={activeSlide.transitionDuration || 500}
            onApplyToAll={(t, d) => dispatch({ type: 'SET_TRANSITION_ALL', transition: t as any, duration: d })}
            onClose={() => setTransitionPreviewOpen(false)}
          />
        )
      })()}

      {/* SmartArt */}
      {smartArtOpen && (
        <SmartArtInserter slideId={state.activeSlideId} dispatch={dispatch} onClose={() => setSmartArtOpen(false)} />
      )}

      {/* Find Replace */}
      {findReplaceOpen && (
        <SlideFindReplace
          slides={state.slides}
          slideId={state.activeSlideId}
          dispatch={dispatch}
          onNavigateToSlide={(id) => dispatch({ type: 'SET_ACTIVE', id })}
          onClose={() => setFindReplaceOpen(false)}
        />
      )}

      {/* Image Color Filters */}
      {imageFiltersOpen && (() => {
        const activeSlide = state.slides.find(s => s.id === state.activeSlideId)
        const selImg = activeSlide?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'image')
        if (!selImg) return null
        return (
          <ImageColorFilters
            element={selImg as import('@/types').SlideImageElement}
            slideId={state.activeSlideId}
            dispatch={dispatch}
            onClose={() => setImageFiltersOpen(false)}
          />
        )
      })()}

      {/* Freehand Drawing */}
      {freehandActive && (
        <FreehandDrawingTool
          active={freehandActive}
          slideId={state.activeSlideId}
          dispatch={dispatch}
          onDeactivate={() => setFreehandActive(false)}
        />
      )}

      {/* Command palette */}
      <SlideCommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onExportPPTX={handleExportPPTX}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onSaveVersion={() => dispatch({ type: 'SAVE_VERSION' } as any)}
        onVersionHistory={() => setVersionHistoryOpen(true)}
        onShare={() => setShareOpen(true)}
        onPresent={() => setPresenting(true)}
        onPresenterView={() => setPresenterViewOpen(true)}
        onNotesToggle={() => setNotesOpen(!notesOpen)}
        onCommentsToggle={() => setCommentsOpen(!commentsOpen)}
        onSorterView={() => setSorterOpen(true)}
        onAnimationPanel={() => setAnimPanelOpen(!animPanelOpen)}
        onFooterSettings={() => setFooterSettingsOpen(!footerSettingsOpen)}
        onSlideLayout={() => setLayoutPanelOpen(true)}
        onAutoLayout={() => {
          if (activeSlide) {
            const laid = autoLayout(activeSlide)
            laid.elements.forEach((el) => {
              if (el.type !== 'image' && el.type !== 'shape' && el.type !== 'table' && el.type !== 'connector' && el.type !== 'video' && el.type !== 'audio' && el.type !== 'chart') {
                dispatch({ type: 'UPDATE_ELEMENT_POSITION', slideId: activeSlide.id, elementId: el.id, x: el.x, y: el.y })
              }
            })
          }
        }}
        onAiDesign={() => setAiDesignPanelOpen(!aiDesignPanelOpen)}
        onAiSlideGenerator={() => setAiGeneratorOpen(true)}
        onPdfImport={() => setPdfAiOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
        onToggleTheme={toggleTheme}
        onSlideSizeSettings={() => setSlideSizeOpen(true)}
        onBackgroundGallery={() => setBgGalleryOpen(true)}
        onThemeColorEditor={() => setThemeColorOpen(true)}
        onSectionManager={() => setSectionManagerOpen(true)}
        onMasterEditor={() => setMasterEditorOpen(true)}
        onHandoutView={() => setHandoutViewOpen(true)}
        onBulletPanel={() => setBulletPanelOpen(true)}
        onPaddingPanel={() => setPaddingPanelOpen(true)}
        onWordArtPicker={() => setWordArtOpen(true)}
        onPositionPanel={() => setPositionPanelOpen(true)}
        onAddSlide={() => dispatch({ type: 'ADD_SLIDE', afterId: state.activeSlideId })}
        onDuplicateSlide={activeSlide ? () => dispatch({ type: 'DUPLICATE_SLIDE', id: activeSlide.id }) : undefined}
        onDeleteSlide={activeSlide ? () => dispatch({ type: 'DELETE_SLIDE', id: activeSlide.id }) : undefined}
        onAddTextElement={activeSlide ? (textType) => dispatch({ type: 'ADD_TEXT_ELEMENT', slideId: activeSlide.id, textType: textType as any }) : undefined}
        onAddImage={activeSlide ? () => {
          const url = prompt('画像URLを入力:', 'https://')
          if (url) dispatch({ type: 'ADD_IMAGE_ELEMENT', slideId: state.activeSlideId, src: url })
        } : undefined}
        onAddShape={activeSlide ? () => {
          dispatch({ type: 'ADD_SHAPE_ELEMENT', slideId: state.activeSlideId, shape: 'rect', fill: '#6366f1' })
        } : undefined}
        onAddTable={activeSlide ? () => dispatch({ type: 'ADD_TABLE_ELEMENT', slideId: activeSlide.id, rows: 3, cols: 3 }) : undefined}
        onAddChart={activeSlide ? () => dispatch({ type: 'ADD_CHART_ELEMENT', slideId: activeSlide.id, chartType: 'bar' }) : undefined}
        onAddConnector={activeSlide ? () => dispatch({ type: 'ADD_CONNECTOR', slideId: activeSlide.id, fromPoint: { x: 20, y: 50 }, toPoint: { x: 80, y: 50 }, stroke: '#6366f1' }) : undefined}
        onAnimationTimeline={() => setAnimTimelineOpen(true)}
        onSelectionPane={() => setSelectionPaneOpen(true)}
        onOutlineView={() => setOutlineViewOpen(true)}
        onTransitionPreview={() => setTransitionPreviewOpen(true)}
        onSmartArt={() => setSmartArtOpen(true)}
        onFindReplace={() => setFindReplaceOpen(true)}
        onFreehandDraw={() => setFreehandActive(true)}
        onImageColorFilters={() => setImageFiltersOpen(true)}
        onGuideManager={() => setGuideManagerOpen(true)}
        onReadingView={() => setReadingViewOpen(true)}
        onImageTools={() => setImageToolsOpen(true)}
        onMotionPath={() => setMotionPathOpen(true)}
        onMoreShapes={() => setMoreShapesOpen(true)}
        onMoreCharts={() => setMoreChartOpen(true)}
        onMoreTransitions={() => setMoreTransOpen(true)}
        onRehearsal={() => setRehearsalOpen(true)}
        onNotesPrint={() => setNotesPrintOpen(true)}
        onAiSummary={() => setAiSummaryOpen(true)}
        onSlideLibrary={() => setSlideLibraryOpen(true)}
        onVersionCompare={() => {
          // Load last version if available, otherwise compare with self
          const versions = state.versions || []
          if (versions.length > 0) {
            try {
              const lastVersion = versions[versions.length - 1]
              const parsed = JSON.parse(lastVersion.data)
              if (parsed.slides) {
                setVersionCompareSlides(parsed.slides)
              }
            } catch { /* ignore */ }
          }
          setVersionCompareOpen(true)
        }}
        onRecorder={() => setRecorderVisible(prev => !prev)}
        onCommentBubble={() => setCommentBubbleMode(prev => !prev)}
      />

      {/* Guide Manager */}
      {guideManagerOpen && (
        <GuideManager
          open={guideManagerOpen}
          onClose={() => setGuideManagerOpen(false)}
          guides={guides}
          onAddGuide={(type, position) => setGuides(prev => [...prev, { id: generateId(), type, position }])}
          onDeleteGuide={(id) => setGuides(prev => prev.filter(g => g.id !== id))}
          onClearGuides={() => setGuides([])}
        />
      )}

      {/* Reading View */}
      {readingViewOpen && (
        <ReadingView
          slides={state.slides}
          startIndex={Math.max(0, state.slides.findIndex(s => s.id === state.activeSlideId))}
          onClose={() => setReadingViewOpen(false)}
          globalFooter={state.globalFooter}
        />
      )}

      {/* Image Tools */}
      {imageToolsOpen && (() => {
        const selImg = state.slides.find(s => s.id === state.activeSlideId)?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'image') as import('@/types').SlideImageElement | undefined
        return (
          <SlideImageTools
            open={imageToolsOpen}
            onClose={() => setImageToolsOpen(false)}
            element={selImg || null}
            onUpdateProps={(props) => {
              if (selImg) dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selImg.id, props: props as any })
            }}
          />
        )
      })()}

      {/* Motion Path Editor */}
      {motionPathOpen && (() => {
        const selEl = state.slides.find(s => s.id === state.activeSlideId)?.elements.find(el => selectedElementIds.includes(el.id))
        return (
          <MotionPathEditor
            open={motionPathOpen}
            onClose={() => setMotionPathOpen(false)}
            animation={selEl?.animation}
            onSetAnimation={(anim) => {
              if (selEl) dispatch({ type: 'SET_ELEMENT_ANIMATION', slideId: state.activeSlideId, elementId: selEl.id, animation: anim })
            }}
          />
        )
      })()}

      {/* More Shapes */}
      {moreShapesOpen && (
        <MoreShapesPanel
          open={moreShapesOpen}
          onClose={() => setMoreShapesOpen(false)}
          onSelectShape={(shape, fill) => {
            dispatch({ type: 'ADD_SHAPE_ELEMENT', slideId: state.activeSlideId, shape: shape as any, fill })
            setMoreShapesOpen(false)
          }}
        />
      )}

      {/* More Charts */}
      {moreChartOpen && (
        <MoreChartTypes
          open={moreChartOpen}
          onClose={() => setMoreChartOpen(false)}
          onSelectChart={(chartType) => {
            dispatch({ type: 'ADD_CHART_ELEMENT', slideId: state.activeSlideId, chartType: chartType as any })
            setMoreChartOpen(false)
          }}
        />
      )}

      {/* More Transitions */}
      {moreTransOpen && (
        <MoreTransitions
          open={moreTransOpen}
          onClose={() => setMoreTransOpen(false)}
          currentTransition={activeSlide?.transition}
          onSelectTransition={(t) => dispatch({ type: 'SET_TRANSITION', slideId: state.activeSlideId, transition: t as any })}
          currentDuration={activeSlide?.transitionDuration}
          onSetDuration={(ms) => dispatch({ type: 'SET_TRANSITION_DURATION', slideId: state.activeSlideId, duration: ms })}
        />
      )}

      {/* Rehearsal Timer */}
      {rehearsalOpen && (
        <RehearsalTimer
          slides={state.slides}
          onSave={(timings) => {
            timings.forEach(t => dispatch({ type: 'SET_AUTO_ADVANCE', slideId: t.slideId, seconds: t.seconds }))
            setRehearsalOpen(false)
          }}
          onCancel={() => setRehearsalOpen(false)}
        />
      )}

      {/* Notes Print */}
      {notesPrintOpen && (
        <SlideNotesPrint
          slides={state.slides}
          onClose={() => setNotesPrintOpen(false)}
        />
      )}

      {/* Compare View (legacy) */}
      {compareViewOpen && !versionCompareOpen && (
        <SlideCompareView
          open={compareViewOpen}
          onClose={() => setCompareViewOpen(false)}
          slidesA={state.slides}
          slidesB={state.slides}
          labelA="現在"
          labelB="比較"
        />
      )}

      {/* Theme Preview */}
      {themePreviewOpen && activeSlide && (
        <ThemePreviewPicker
          themes={Object.values(getThemesWithBrand())}
          currentThemeKey={activeSlide.themeKey}
          onPreview={() => {}}
          onApply={(key) => {
            dispatch({ type: 'SET_THEME', slideId: activeSlide.id, themeKey: key as any })
            setThemePreviewOpen(false)
          }}
          onClose={() => setThemePreviewOpen(false)}
        />
      )}

      {/* Gradient Editor */}
      <BackgroundGradientEditor
        open={gradientEditorOpen}
        onClose={() => setGradientEditorOpen(false)}
        onApply={(gradient) => {
          dispatch({ type: 'SET_CUSTOM_THEME', slideId: state.activeSlideId, customTheme: { background: gradient } })
        }}
      />

      {/* Font Pair Picker */}
      <FontPairPicker
        open={fontPairOpen}
        onClose={() => setFontPairOpen(false)}
        onApply={(titleFont, bodyFont) => {
          const activeSlide = state.slides.find(s => s.id === state.activeSlideId)
          if (activeSlide) {
            activeSlide.elements.forEach(el => {
              if (el.type === 'title' || el.type === 'subtitle') {
                dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: activeSlide.id, elementId: el.id, props: { fontFamily: titleFont } as any })
              } else if (el.type === 'body' || el.type === 'label') {
                dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: activeSlide.id, elementId: el.id, props: { fontFamily: bodyFont } as any })
              }
            })
          }
        }}
      />

      {/* Custom Theme Manager */}
      {customThemeOpen && activeSlide && (
        <CustomThemeManager
          open={customThemeOpen}
          onClose={() => setCustomThemeOpen(false)}
          currentTheme={activeSlide.customTheme || {}}
          onApply={(theme) => dispatch({ type: 'SET_CUSTOM_THEME', slideId: activeSlide.id, customTheme: theme })}
        />
      )}

      {/* Picture Styles */}
      {pictureStylesOpen && (() => {
        const selImg = activeSlide?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'image') as import('@/types').SlideImageElement | undefined
        return (
          <PictureStyles
            open={pictureStylesOpen}
            onClose={() => setPictureStylesOpen(false)}
            currentImageSrc={selImg?.src}
            onApply={(style) => {
              if (selImg) {
                dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selImg.id, props: { imageStyle: style } as any })
                if (style.rotation !== undefined) {
                  dispatch({ type: 'UPDATE_ELEMENT_ROTATION', slideId: state.activeSlideId, elementId: selImg.id, rotation: style.rotation })
                }
              }
            }}
          />
        )
      })()}

      {/* Eyedropper */}
      <EyedropperTool
        active={eyedropperActive}
        onPickColor={(color) => {
          setEyedropperActive(false)
          if (selectedElementIds.length === 1 && activeSlide) {
            const el = activeSlide.elements.find(e => e.id === selectedElementIds[0])
            if (!el) return
            if (eyedropperTarget === 'fill' && el.type === 'shape') {
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: activeSlide.id, elementId: el.id, props: { fill: color } as any })
            } else if (eyedropperTarget === 'text') {
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: activeSlide.id, elementId: el.id, props: { color } as any })
            } else if (eyedropperTarget === 'stroke') {
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: activeSlide.id, elementId: el.id, props: { stroke: color } as any })
            }
          }
        }}
        onCancel={() => setEyedropperActive(false)}
      />

      {/* Format Painter */}
      <FormatPainter
        active={formatPainterActive}
        onActivate={() => setFormatPainterActive(true)}
        onDeactivate={() => setFormatPainterActive(false)}
        formatData={formatPainterData}
        onApplyFormat={(targetId) => {
          if (!formatPainterData || !activeSlide) return
          dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: activeSlide.id, elementId: targetId, props: formatPainterData as any })
        }}
      />

      {/* Hyperlink Editor */}
      {hyperlinkOpen && (() => {
        const selEl = activeSlide?.elements.find(el => selectedElementIds.includes(el.id))
        return (
          <HyperlinkEditor
            open={hyperlinkOpen}
            onClose={() => setHyperlinkOpen(false)}
            currentUrl={(selEl as any)?.hyperlink}
            onApply={(url) => {
              if (selEl) dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selEl.id, props: { hyperlink: url } as any })
            }}
          />
        )
      })()}

      {/* Accessibility Checker */}
      <AccessibilityChecker
        open={accessibilityOpen}
        onClose={() => setAccessibilityOpen(false)}
        slides={state.slides}
        onNavigate={(slideId, elementId) => {
          dispatch({ type: 'SET_ACTIVE', id: slideId })
          if (elementId) setSelectedElementIds([elementId])
        }}
      />

      {/* Layout Duplicate */}
      {layoutDuplicateOpen && activeSlide && (
        <SlideLayoutDuplicate
          open={layoutDuplicateOpen}
          onClose={() => setLayoutDuplicateOpen(false)}
          currentSlide={activeSlide}
          onDuplicate={(layoutId) => {
            dispatch({ type: 'DUPLICATE_SLIDE', id: activeSlide.id })
          }}
        />
      )}

      {/* Slide Number Format */}
      <SlideNumberFormat
        open={slideNumberOpen}
        onClose={() => setSlideNumberOpen(false)}
        currentFormat={{ show: !!state.globalFooter?.showSlideNumber, format: 'number-total', position: 'bottom-right', startFrom: 1, fontSize: 10, color: '#94a3b8', hideOnTitleSlide: (state.globalFooter as any)?.hideSlideNumberOnTitle }}
        onApply={(config) => {
          dispatch({ type: 'SET_GLOBAL_FOOTER', footer: { ...state.globalFooter, showSlideNumber: config.show, hideSlideNumberOnTitle: config.hideOnTitleSlide } as any })
        }}
      />

      {/* Element Inspector */}
      {inspectorOpen && (() => {
        const selEl = activeSlide?.elements.find(el => selectedElementIds.includes(el.id))
        return (
          <ElementInspector
            open={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            element={selEl || null}
            slideId={state.activeSlideId}
            onUpdate={(props) => {
              if (!selEl) return
              if (props.x !== undefined || props.y !== undefined) {
                dispatch({ type: 'UPDATE_ELEMENT_POSITION', slideId: state.activeSlideId, elementId: selEl.id, x: props.x ?? (selEl as any).x, y: props.y ?? (selEl as any).y })
              }
              if (props.w !== undefined || props.h !== undefined) {
                dispatch({ type: 'UPDATE_ELEMENT_SIZE', slideId: state.activeSlideId, elementId: selEl.id, w: props.w ?? (selEl as any).w, h: props.h ?? (selEl as any).h })
              }
              if (props.rotation !== undefined) {
                dispatch({ type: 'UPDATE_ELEMENT_ROTATION', slideId: state.activeSlideId, elementId: selEl.id, rotation: props.rotation })
              }
              if ((props as any).opacity !== undefined) {
                dispatch({ type: 'SET_ELEMENT_OPACITY', slideId: state.activeSlideId, elementId: selEl.id, opacity: (props as any).opacity })
              }
            }}
          />
        )
      })()}

      {/* Table Cell Format */}
      {tableCellFormatOpen && (() => {
        const selTable = activeSlide?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'table') as import('@/types').SlideTableElement | undefined
        if (!selTable) return null
        return (
          <TableCellFormat
            open={tableCellFormatOpen}
            onClose={() => setTableCellFormatOpen(false)}
            selectedCells={selectedTableCells.length > 0 ? selectedTableCells : [{ row: 0, col: 0 }]}
            currentStyles={selTable.cellStyles || {}}
            onUpdateStyle={(key, style) => {
              const newStyles = { ...(selTable.cellStyles || {}), [key]: style }
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selTable.id, props: { cellStyles: newStyles } as any })
            }}
            canMerge={selectedTableCells.length >= 2}
            onMergeCells={() => {
              if (selectedTableCells.length >= 2) {
                const minRow = Math.min(...selectedTableCells.map(c => c.row))
                const minCol = Math.min(...selectedTableCells.map(c => c.col))
                const maxRow = Math.max(...selectedTableCells.map(c => c.row))
                const maxCol = Math.max(...selectedTableCells.map(c => c.col))
                dispatch({
                  type: 'MERGE_TABLE_CELLS',
                  slideId: state.activeSlideId,
                  elementId: selTable.id,
                  startRow: minRow,
                  startCol: minCol,
                  rowSpan: maxRow - minRow + 1,
                  colSpan: maxCol - minCol + 1,
                } as any)
              }
            }}
          />
        )
      })()}

      {/* Table Sort Panel */}
      {tableSortOpen && (() => {
        const selTable = activeSlide?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'table') as import('@/types').SlideTableElement | undefined
        if (!selTable) return null
        return (
          <TableSortPanel
            open={tableSortOpen}
            onClose={() => setTableSortOpen(false)}
            table={selTable}
            onSort={(colIndex, direction) => {
              dispatch({
                type: 'SORT_TABLE',
                slideId: state.activeSlideId,
                elementId: selTable.id,
                col: colIndex,
                direction,
                excludeHeader: selTable.headerRow ?? true,
              })
            }}
          />
        )
      })()}

      {/* Table Conditional Format */}
      {tableCondFormatOpen && (() => {
        const selTable = activeSlide?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'table') as import('@/types').SlideTableElement | undefined
        if (!selTable) return null
        const colCount = selTable.rows[0]?.length || 0
        const headers = selTable.headerRow && selTable.rows[0] ? selTable.rows[0] : undefined
        return (
          <TableConditionalFormat
            open={tableCondFormatOpen}
            onClose={() => setTableCondFormatOpen(false)}
            columnCount={colCount}
            columnHeaders={headers}
            onApply={(rule: TableConditionalRule) => {
              // Apply conditional formatting by updating cellStyles
              const newStyles = { ...(selTable.cellStyles || {}) }
              const startRow = selTable.headerRow ? 1 : 0
              for (let ri = startRow; ri < selTable.rows.length; ri++) {
                const cellVal = (selTable.rows[ri][rule.column] || '').replace(/<[^>]*>/g, '').trim()
                let match = false
                switch (rule.condition) {
                  case 'greater-than': match = !isNaN(parseFloat(cellVal)) && parseFloat(cellVal) > parseFloat(rule.value); break
                  case 'less-than': match = !isNaN(parseFloat(cellVal)) && parseFloat(cellVal) < parseFloat(rule.value); break
                  case 'equals': match = cellVal === rule.value; break
                  case 'contains': match = cellVal.includes(rule.value); break
                  case 'empty': match = cellVal === ''; break
                }
                if (match) {
                  const key = `${ri}-${rule.column}`
                  newStyles[key] = { bgColor: rule.bgColor, textColor: rule.textColor }
                }
              }
              dispatch({
                type: 'UPDATE_ELEMENT_PROPS',
                slideId: state.activeSlideId,
                elementId: selTable.id,
                props: { cellStyles: newStyles } as any,
              })
            }}
          />
        )
      })()}

      {/* Shape Text Editor */}
      {shapeTextOpen && (() => {
        const selShape = activeSlide?.elements.find(el => selectedElementIds.includes(el.id) && el.type === 'shape') as import('@/types').SlideShapeElement | undefined
        if (!selShape) return null
        return (
          <ShapeTextEditor
            open={shapeTextOpen}
            onClose={() => setShapeTextOpen(false)}
            textContent={selShape.textContent}
            textColor={selShape.textColor}
            textFontSize={selShape.textFontSize}
            cornerRadius={selShape.cornerRadius}
            onUpdate={(props) => {
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selShape.id, props: props as any })
            }}
          />
        )
      })()}

      {/* Animation Easing */}
      {easingPickerOpen && (() => {
        const selEl = activeSlide?.elements.find(el => selectedElementIds.includes(el.id))
        if (!selEl?.animation) return null
        return (
          <AnimationEasingPicker
            open={easingPickerOpen}
            onClose={() => setEasingPickerOpen(false)}
            currentEasing={selEl.animation.easing}
            currentDelay={selEl.animation.delay}
            currentDuration={selEl.animation.duration}
            onUpdate={(props) => {
              dispatch({
                type: 'SET_ELEMENT_ANIMATION',
                slideId: state.activeSlideId,
                elementId: selEl.id,
                animation: { ...selEl.animation!, ...props } as any,
              })
            }}
          />
        )
      })()}

      {/* Presentation Settings */}
      <PresentationSettings
        open={presSettingsOpen}
        onClose={() => setPresSettingsOpen(false)}
        config={presConfig}
        onUpdate={setPresConfig}
        onStartPresentation={() => setPresenting(true)}
      />

      {/* Background Pattern */}
      <BackgroundPatternPicker
        open={bgPatternOpen}
        onClose={() => setBgPatternOpen(false)}
        onApply={(pattern) => {
          dispatch({ type: 'SET_CUSTOM_THEME', slideId: state.activeSlideId, customTheme: { background: pattern } })
        }}
      />

      {/* CSV Chart Import */}
      <CsvChartImport
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImport={(data) => {
          dispatch({ type: 'ADD_CHART_ELEMENT', slideId: state.activeSlideId, chartType: 'bar' })
          // Update chart data on the newly added chart
          const slide = state.slides.find(s => s.id === state.activeSlideId)
          if (slide) {
            const lastChart = [...slide.elements].reverse().find(el => el.type === 'chart')
            if (lastChart) {
              dispatch({ type: 'UPDATE_CHART_DATA', slideId: state.activeSlideId, elementId: lastChart.id, data })
            }
          }
        }}
      />

      {/* Watermark */}
      <WatermarkSettings
        open={watermarkOpen}
        onClose={() => setWatermarkOpen(false)}
        config={watermarkConfig}
        onUpdate={setWatermarkConfig}
      />

      {/* Image Crop Overlay */}
      {cropOverlayOpen && cropOverlayElementId && (() => {
        const selImg = activeSlide?.elements.find(el => el.id === cropOverlayElementId && el.type === 'image') as import('@/types').SlideImageElement | undefined
        if (!selImg) return null
        const canvasEl = document.querySelector('[data-slide-canvas]') || document.querySelector('.slide-print-page')
        if (!canvasEl) return null
        const canvasRect = canvasEl.getBoundingClientRect()
        return (
          <ImageCropOverlay
            element={selImg}
            canvasRect={canvasRect}
            onCropChange={(crop) => {
              dispatch({ type: 'UPDATE_ELEMENT_PROPS', slideId: state.activeSlideId, elementId: selImg.id, props: { crop } as any })
              setCropOverlayOpen(false)
              setCropOverlayElementId(null)
            }}
            onClose={() => {
              setCropOverlayOpen(false)
              setCropOverlayElementId(null)
            }}
          />
        )
      })()}

      {/* AI Image Suggest */}
      <AiImageSuggest
        open={aiImageOpen}
        onClose={() => setAiImageOpen(false)}
        slideContent={(() => {
          if (!activeSlide) return ''
          return activeSlide.elements
            .filter((el): el is import('@/types').SlideTextElement =>
              el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label'
            )
            .map(el => el.content)
            .join(' ')
        })()}
        onInsert={(imageUrl, alt) => {
          if (activeSlide) {
            dispatch({ type: 'ADD_IMAGE_ELEMENT', slideId: activeSlide.id, src: imageUrl, alt })
          }
          setAiImageOpen(false)
        }}
      />

      {/* AI Summary Generator */}
      <AiSummaryGenerator
        open={aiSummaryOpen}
        onClose={() => setAiSummaryOpen(false)}
        slides={state.slides}
        onInsertSummarySlide={(elements) => {
          dispatch({ type: 'IMPORT_SLIDES', slides: [{ elements: elements as import('@/types').SlideElement[] }] })
        }}
      />

      {/* Slide Library */}
      <SlideLibrary
        open={slideLibraryOpen}
        onClose={() => setSlideLibraryOpen(false)}
        currentDocId={state.meta.id}
        onImportSlide={(elements, themeKey) => {
          dispatch({
            type: 'IMPORT_SLIDES',
            slides: [{ elements: elements as import('@/types').SlideElement[], themeKey: themeKey as import('@/types').SlideThemeKey | undefined }],
          })
        }}
      />

      {/* Version Compare (enhanced) */}
      {versionCompareOpen && (
        <SlideVersionCompare
          open={versionCompareOpen}
          onClose={() => setVersionCompareOpen(false)}
          slidesA={state.slides}
          slidesB={versionCompareSlides.length > 0 ? versionCompareSlides : state.slides}
          labelA="Current"
          labelB="Previous Version"
        />
      )}

      {/* Presentation Recorder */}
      <PresentationRecorder
        targetRef={canvasContainerRef}
        visible={recorderVisible || presenting}
      />

      {/* Status Bar */}
      <SlideStatusBar
        currentSlideIndex={state.slides.findIndex(s => s.id === state.activeSlideId) + 1}
        totalSlides={state.slides.length}
        zoom={zoom}
        onZoomChange={setZoom}
        sectionName={(state.sections || []).find(sec => {
          const idx = state.slides.findIndex(s => s.id === state.activeSlideId)
          return sec.startSlideIndex <= idx
        })?.name}
        selectedElementCount={selectedElementIds.length}
        selectedElementType={
          selectedElementIds.length === 1
            ? activeSlide?.elements.find(el => el.id === selectedElementIds[0])?.type
            : undefined
        }
        themeName={activeSlide ? getThemesWithBrand()[activeSlide.themeKey]?.label : undefined}
        characterCount={(() => {
          const slide = state.slides.find(s => s.id === state.activeSlideId)
          if (!slide) return 0
          return slide.elements.reduce((count, el) => {
            if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
              return count + (el as import('@/types').SlideTextElement).content.replace(/<[^>]*>/g, '').length
            }
            return count
          }, 0)
        })()}
        saveStatus={saveStatus}
        onOutlineView={() => setOutlineViewOpen(!outlineViewOpen)}
        onSorterView={() => setSorterOpen(true)}
        onNotesToggle={() => setNotesOpen(!notesOpen)}
      />
    </div>
  )
}
