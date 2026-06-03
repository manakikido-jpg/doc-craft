'use client'

import { Save, Undo2, Redo2, Play, Printer, Download, FileDown, FileUp, Eye } from 'lucide-react'

interface Props {
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onPresent?: () => void
  onPrint?: () => void
  onExportPDF?: () => void
  onExportPPTX?: () => void
  onImportPPTX?: () => void
  onReadingView?: () => void
  canUndo?: boolean
  canRedo?: boolean
  saveStatus?: 'saved' | 'saving' | 'error'
}

export default function QuickActionsBar({
  onSave, onUndo, onRedo, onPresent, onPrint,
  onExportPDF, onExportPPTX, onImportPPTX, onReadingView,
  canUndo, canRedo, saveStatus,
}: Props) {
  return (
    <div className="absolute top-1 right-4 z-30 flex items-center gap-0.5 rounded-full bg-slate-800/80 border border-slate-700/50 px-1 py-0.5 backdrop-blur-sm">
      {onUndo && (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-full transition ${canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
          title="元に戻す (Ctrl+Z)"
        >
          <Undo2 size={13} />
        </button>
      )}
      {onRedo && (
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-full transition ${canRedo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
          title="やり直す (Ctrl+Y)"
        >
          <Redo2 size={13} />
        </button>
      )}
      <div className="w-px h-4 bg-slate-700 mx-0.5" />
      {onPresent && (
        <button
          onClick={onPresent}
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-indigo-600/50 transition"
          title="プレゼンテーション (F5)"
        >
          <Play size={13} />
        </button>
      )}
      {onExportPDF && (
        <button
          onClick={onExportPDF}
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="PDFエクスポート"
        >
          <FileDown size={13} />
        </button>
      )}
      {onExportPPTX && (
        <button
          onClick={onExportPPTX}
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="PPTXエクスポート"
        >
          <Download size={13} />
        </button>
      )}
      {onPrint && (
        <button
          onClick={onPrint}
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="印刷"
        >
          <Printer size={13} />
        </button>
      )}
      {saveStatus && (
        <div className="px-1.5">
          {saveStatus === 'saving' && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="保存中..." />}
          {saveStatus === 'saved' && <div className="w-2 h-2 rounded-full bg-green-400" title="保存済み" />}
          {saveStatus === 'error' && <div className="w-2 h-2 rounded-full bg-red-400" title="保存エラー" />}
        </div>
      )}
    </div>
  )
}
