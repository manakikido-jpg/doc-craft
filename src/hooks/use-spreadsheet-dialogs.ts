'use client'

import { useState, useCallback } from 'react'
import type { PrintRange } from '@/components/spreadsheet-editor/print-range-dialog'
import type { PivotResult } from '@/components/spreadsheet-editor/pivot-table-dialog'

export function useSpreadsheetDialogs() {
  // Go To dialog
  const [goToOpen, setGoToOpen] = useState(false)

  // Chart panel
  const [chartPanelOpen, setChartPanelOpen] = useState(false)

  // Data validation dialog
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)

  // Sort dialog
  const [sortDialogOpen, setSortDialogOpen] = useState(false)

  // Remove duplicates dialog
  const [removeDuplicatesOpen, setRemoveDuplicatesOpen] = useState(false)

  // Print preview
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)

  // AI formula panel
  const [aiFormulaPanelOpen, setAiFormulaPanelOpen] = useState(false)

  // Formula display mode
  const [showFormulas, setShowFormulas] = useState(false)

  // Version history panel
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)

  // Conditional format panel
  const [conditionalFormatOpen, setConditionalFormatOpen] = useState(false)

  // Named ranges
  const [namedRangesOpen, setNamedRangesOpen] = useState(false)

  // Subtotal dialog
  const [subtotalOpen, setSubtotalOpen] = useState(false)

  // Table feature
  const [tableFeatureOpen, setTableFeatureOpen] = useState(false)

  // Cell style gallery
  const [cellStyleGalleryOpen, setCellStyleGalleryOpen] = useState(false)

  // Size dialog
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false)
  const [sizeDialogMode, setSizeDialogMode] = useState<'column-width' | 'row-height'>('column-width')

  // Split view controls visibility
  const [showSplitControls, setShowSplitControls] = useState(false)

  // Pivot chart
  const [pivotChartResult, setPivotChartResult] = useState<PivotResult | null>(null)

  // Data connection dialog
  const [dataConnectionOpen, setDataConnectionOpen] = useState(false)

  // Print range
  const [printRangeDialogOpen, setPrintRangeDialogOpen] = useState(false)
  const [printRange, setPrintRange] = useState<PrintRange | null>(null)

  // Shortcuts help
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Command palette
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Pivot table
  const [pivotOpen, setPivotOpen] = useState(false)

  // PDF AI panel
  const [pdfAiOpen, setPdfAiOpen] = useState(false)

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Toggle helpers
  const toggleFormulas = useCallback(() => setShowFormulas((v) => !v), [])
  const toggleSplitControls = useCallback(() => setShowSplitControls((v) => !v), [])

  return {
    // Go To
    goToOpen, setGoToOpen,
    // Chart panel
    chartPanelOpen, setChartPanelOpen,
    // Data validation
    validationDialogOpen, setValidationDialogOpen,
    // Sort
    sortDialogOpen, setSortDialogOpen,
    // Remove duplicates
    removeDuplicatesOpen, setRemoveDuplicatesOpen,
    // Print preview
    printPreviewOpen, setPrintPreviewOpen,
    // AI formula
    aiFormulaPanelOpen, setAiFormulaPanelOpen,
    // Show formulas
    showFormulas, setShowFormulas, toggleFormulas,
    // Version history
    versionHistoryOpen, setVersionHistoryOpen,
    // Conditional format
    conditionalFormatOpen, setConditionalFormatOpen,
    // Named ranges
    namedRangesOpen, setNamedRangesOpen,
    // Subtotal
    subtotalOpen, setSubtotalOpen,
    // Table feature
    tableFeatureOpen, setTableFeatureOpen,
    // Cell style gallery
    cellStyleGalleryOpen, setCellStyleGalleryOpen,
    // Size dialog
    sizeDialogOpen, setSizeDialogOpen,
    sizeDialogMode, setSizeDialogMode,
    // Split view controls
    showSplitControls, setShowSplitControls, toggleSplitControls,
    // Pivot chart
    pivotChartResult, setPivotChartResult,
    // Data connection
    dataConnectionOpen, setDataConnectionOpen,
    // Print range
    printRangeDialogOpen, setPrintRangeDialogOpen,
    printRange, setPrintRange,
    // Shortcuts
    shortcutsOpen, setShortcutsOpen,
    // Command palette
    commandPaletteOpen, setCommandPaletteOpen,
    // Pivot table
    pivotOpen, setPivotOpen,
    // PDF AI
    pdfAiOpen, setPdfAiOpen,
    // Export menu
    showExportMenu, setShowExportMenu,
  }
}
