import { useState } from 'react'
import type { FormatData } from '@/components/slide-editor/format-painter'
import type { SlideNumberConfig } from '@/components/slide-editor/slide-number-format'
import type { TableConditionalRule } from '@/components/slide-editor/table-conditional-format'
import type { Slide } from '@/types'

export function useSlideDialogs() {
  // Main dialogs
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
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [watermarkOpen, setWatermarkOpen] = useState(false)
  const [commentThreadOpen, setCommentThreadOpen] = useState(false)
  const [cropOverlayOpen, setCropOverlayOpen] = useState(false)
  const [cropOverlayElementId, setCropOverlayElementId] = useState<string | null>(null)
  const [commentBubbleMode, setCommentBubbleMode] = useState(false)
  const [versionCompareOpen, setVersionCompareOpen] = useState(false)
  const [versionCompareSlides, setVersionCompareSlides] = useState<Slide[]>([])
  const [recorderVisible, setRecorderVisible] = useState(false)
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false)
  const [slideLibraryOpen, setSlideLibraryOpen] = useState(false)
  const [tableSortOpen, setTableSortOpen] = useState(false)
  const [tableCondFormatOpen, setTableCondFormatOpen] = useState(false)

  return {
    presenting, setPresenting,
    presenterViewOpen, setPresenterViewOpen,
    notesOpen, setNotesOpen,
    commentsOpen, setCommentsOpen,
    shortcutsOpen, setShortcutsOpen,
    shareOpen, setShareOpen,
    versionsOpen, setVersionsOpen,
    sorterOpen, setSorterOpen,
    animPanelOpen, setAnimPanelOpen,
    footerSettingsOpen, setFooterSettingsOpen,
    layoutPanelOpen, setLayoutPanelOpen,
    pdfAiOpen, setPdfAiOpen,
    aiDesignPanelOpen, setAiDesignPanelOpen,
    aiGeneratorOpen, setAiGeneratorOpen,
    aiImageOpen, setAiImageOpen,
    aiLayoutOpen, setAiLayoutOpen,
    versionHistoryOpen, setVersionHistoryOpen,
    commandPaletteOpen, setCommandPaletteOpen,
    slideJumpOpen, setSlideJumpOpen,
    blackoutMode, setBlackoutMode,
    timerVisible, setTimerVisible,
    timerMode, setTimerMode,
    slideSizeOpen, setSlideSizeOpen,
    bgGalleryOpen, setBgGalleryOpen,
    bgPatternOpen, setBgPatternOpen,
    themeColorOpen, setThemeColorOpen,
    sectionManagerOpen, setSectionManagerOpen,
    masterEditorOpen, setMasterEditorOpen,
    handoutViewOpen, setHandoutViewOpen,
    bulletPanelOpen, setBulletPanelOpen,
    paddingPanelOpen, setPaddingPanelOpen,
    wordArtOpen, setWordArtOpen,
    positionPanelOpen, setPositionPanelOpen,
    alignmentToolbarOpen, setAlignmentToolbarOpen,
    animTimelineOpen, setAnimTimelineOpen,
    selectionPaneOpen, setSelectionPaneOpen,
    outlineViewOpen, setOutlineViewOpen,
    transitionPreviewOpen, setTransitionPreviewOpen,
    smartArtOpen, setSmartArtOpen,
    findReplaceOpen, setFindReplaceOpen,
    imageFiltersOpen, setImageFiltersOpen,
    freehandActive, setFreehandActive,
    penPickerOpen, setPenPickerOpen,
    guideManagerOpen, setGuideManagerOpen,
    readingViewOpen, setReadingViewOpen,
    imageToolsOpen, setImageToolsOpen,
    motionPathOpen, setMotionPathOpen,
    moreShapesOpen, setMoreShapesOpen,
    moreChartOpen, setMoreChartOpen,
    moreTransOpen, setMoreTransOpen,
    rehearsalOpen, setRehearsalOpen,
    notesPrintOpen, setNotesPrintOpen,
    compareViewOpen, setCompareViewOpen,
    themePreviewOpen, setThemePreviewOpen,
    gradientEditorOpen, setGradientEditorOpen,
    fontPairOpen, setFontPairOpen,
    customThemeOpen, setCustomThemeOpen,
    pictureStylesOpen, setPictureStylesOpen,
    eyedropperActive, setEyedropperActive,
    eyedropperTarget, setEyedropperTarget,
    formatPainterActive, setFormatPainterActive,
    formatPainterData, setFormatPainterData,
    hyperlinkOpen, setHyperlinkOpen,
    accessibilityOpen, setAccessibilityOpen,
    layoutDuplicateOpen, setLayoutDuplicateOpen,
    slideNumberOpen, setSlideNumberOpen,
    inspectorOpen, setInspectorOpen,
    tableCellFormatOpen, setTableCellFormatOpen,
    shapeTextOpen, setShapeTextOpen,
    easingPickerOpen, setEasingPickerOpen,
    presSettingsOpen, setPresSettingsOpen,
    csvImportOpen, setCsvImportOpen,
    watermarkOpen, setWatermarkOpen,
    commentThreadOpen, setCommentThreadOpen,
    cropOverlayOpen, setCropOverlayOpen,
    cropOverlayElementId, setCropOverlayElementId,
    commentBubbleMode, setCommentBubbleMode,
    versionCompareOpen, setVersionCompareOpen,
    versionCompareSlides, setVersionCompareSlides,
    recorderVisible, setRecorderVisible,
    aiSummaryOpen, setAiSummaryOpen,
    slideLibraryOpen, setSlideLibraryOpen,
    tableSortOpen, setTableSortOpen,
    tableCondFormatOpen, setTableCondFormatOpen,
  }
}
