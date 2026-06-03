'use client'

import { LayoutGrid, Columns3, FileText, Maximize, Loader2, Check, AlertCircle } from 'lucide-react'

interface SlideStatusBarProps {
  currentSlideIndex: number
  totalSlides: number
  zoom: number
  onZoomChange: (zoom: number) => void
  sectionName?: string
  selectedElementCount?: number
  selectedElementType?: string
  themeName?: string
  characterCount?: number
  saveStatus?: 'saving' | 'saved' | 'error'
  onOutlineView?: () => void
  onSorterView?: () => void
  onNotesToggle?: () => void
}

export default function SlideStatusBar({
  currentSlideIndex,
  totalSlides,
  zoom,
  onZoomChange,
  sectionName,
  selectedElementCount,
  selectedElementType,
  themeName,
  characterCount,
  saveStatus,
  onOutlineView,
  onSorterView,
  onNotesToggle,
}: SlideStatusBarProps) {
  return (
    <div className="h-7 flex items-center justify-between px-3 bg-slate-900 border-t border-slate-700 text-xs text-slate-400 select-none shrink-0">
      {/* Left side */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="whitespace-nowrap">
          スライド {currentSlideIndex + 1}/{totalSlides}
        </span>
        {sectionName && (
          <>
            <span className="text-slate-600">|</span>
            <span className="truncate max-w-[120px]">{sectionName}</span>
          </>
        )}
        {!!selectedElementCount && selectedElementCount > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span className="whitespace-nowrap">{selectedElementCount} 個の要素を選択中</span>
          </>
        )}
        {selectedElementType && (
          <>
            <span className="text-slate-600">|</span>
            <span className="whitespace-nowrap">{selectedElementType}</span>
          </>
        )}
        {themeName && (
          <>
            <span className="text-slate-600">|</span>
            <span className="whitespace-nowrap">テーマ: {themeName}</span>
          </>
        )}
        {saveStatus && (
          <>
            <span className="text-slate-600">|</span>
            <span className="whitespace-nowrap flex items-center gap-1">
              {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
              {saveStatus === 'saved' && <Check size={12} className="text-green-400" />}
              {saveStatus === 'error' && <AlertCircle size={12} className="text-red-400" />}
              {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '保存済み' : '保存エラー'}
            </span>
          </>
        )}
        {characterCount !== undefined && (
          <>
            <span className="text-slate-600">|</span>
            <span className="whitespace-nowrap tabular-nums">{characterCount} 文字</span>
          </>
        )}
      </div>

      {/* Center: view mode buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onNotesToggle}
          className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
          title="ノーマル表示"
        >
          <FileText size={14} />
        </button>
        <button
          onClick={onSorterView}
          className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
          title="スライド一覧"
        >
          <LayoutGrid size={14} />
        </button>
        <button
          onClick={onOutlineView}
          className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
          title="アウトライン表示"
        >
          <Columns3 size={14} />
        </button>
      </div>

      {/* Right side: zoom */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={50}
          max={200}
          step={10}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-24 accent-indigo-500 h-1"
        />
        <span className="w-10 text-right tabular-nums">{zoom}%</span>
        <button
          onClick={() => onZoomChange(100)}
          className="p-1 rounded hover:bg-slate-700 hover:text-white transition-colors"
          title="フィット"
        >
          <Maximize size={14} />
        </button>
      </div>
    </div>
  )
}
