'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import type { SlidesDocument, Slide } from '@/types'
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Palette,
  ImageIcon,
  Shapes,
  Sparkle,
  StickyNote,
  MessageSquare,
  Sparkles,
  Save,
  History,
  Share2,
  Keyboard,
  Play,
  Printer,
  Trash2,
  Download,
  FileDown,
  ChevronDown,
  Monitor,
  Plus,
  Table,
  Wallpaper,
  ArrowRightLeft,
  LayoutGrid,
  BarChart3,
  Video,
  Music,
  Settings2,
  Sun,
  Moon,
  Type,
  Clock,
  Wand2,
} from 'lucide-react'
import type { SlideAction } from '@/hooks/use-slides'
import type { UndoableAction } from '@/lib/undoable'
import ThemePicker from './theme-picker'
import TemplatePicker from './template-picker'
import ThemeCustomizer from './theme-customizer'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'
import { t } from '@/lib/i18n'
import { useToast } from '@/components/shared/toast'
import { useTheme } from '@/lib/theme-context'

interface Props {
  state: SlidesDocument
  dispatch: React.Dispatch<UndoableAction<SlideAction>>
  onExport: () => void
  onExportPDF?: () => void
  onExportPPTX?: () => void
  onDelete: () => void
  onPresent?: () => void
  onPresenterView?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onPrint?: () => void
  onNotesToggle?: () => void
  onCommentsToggle?: () => void
  onShortcuts?: () => void
  onShare?: () => void
  onVersions?: () => void
  onVersionHistory?: () => void
  onAutoLayout?: () => void
  onSorterView?: () => void
  onSlideLayout?: () => void
  onAnimationPanel?: () => void
  onFooterSettings?: () => void
  onPdfImport?: () => void
  onAiDesign?: () => void
}

const SHAPE_CATEGORIES = [
  {
    label: '基本図形',
    shapes: [
      { shape: 'rect' as const, label: '□ 四角', fill: '#3b82f6' },
      { shape: 'circle' as const, label: '○ 丸', fill: '#10b981' },
      { shape: 'triangle' as const, label: '△ 三角', fill: '#f59e0b' },
      { shape: 'diamond' as const, label: '◇ ダイヤ', fill: '#ec4899' },
      { shape: 'pentagon' as const, label: '⬠ 五角', fill: '#06b6d4' },
      { shape: 'hexagon' as const, label: '⬡ 六角', fill: '#14b8a6' },
      { shape: 'line' as const, label: '— 線', fill: '#94a3b8' },
    ],
  },
  {
    label: '矢印',
    shapes: [
      { shape: 'arrow-right' as const, label: '→ 右矢印', fill: '#8b5cf6' },
      { shape: 'arrow-left' as const, label: '← 左矢印', fill: '#8b5cf6' },
      { shape: 'arrow-up' as const, label: '↑ 上矢印', fill: '#8b5cf6' },
      { shape: 'arrow-down' as const, label: '↓ 下矢印', fill: '#8b5cf6' },
    ],
  },
  {
    label: '特殊',
    shapes: [
      { shape: 'star' as const, label: '★ 星', fill: '#eab308' },
      { shape: 'heart' as const, label: '♥ ハート', fill: '#ef4444' },
      { shape: 'cross' as const, label: '✚ 十字', fill: '#6366f1' },
      { shape: 'callout' as const, label: '💬 吹出し', fill: '#64748b' },
    ],
  },
]

const TRANSITIONS: { value: Slide['transition']; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'fade', label: 'フェード' },
  { value: 'dissolve', label: 'ディゾルブ' },
  { value: 'slide-left', label: 'スライド左' },
  { value: 'slide-up', label: 'スライド上' },
  { value: 'wipe-left', label: 'ワイプ左' },
  { value: 'wipe-up', label: 'ワイプ上' },
  { value: 'zoom', label: 'ズーム' },
  { value: 'flip', label: 'フリップ' },
  { value: 'cube', label: 'キューブ' },
]

export default function SlideToolbar({
  state,
  dispatch,
  onExport,
  onExportPDF,
  onExportPPTX,
  onPrint,
  onDelete,
  onPresent,
  onPresenterView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNotesToggle,
  onCommentsToggle,
  onShortcuts,
  onShare,
  onVersions,
  onVersionHistory,
  onAutoLayout,
  onSorterView,
  onSlideLayout,
  onAnimationPanel,
  onFooterSettings,
  onPdfImport,
  onAiDesign,
}: Props) {
  const { addToast } = useToast()
  const activeSlide = state.slides.find((s) => s.id === state.activeSlideId)
  const [shapeMenu, setShapeMenu] = useState(false)
  const [transMenu, setTransMenu] = useState(false)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [textMenu, setTextMenu] = useState(false)
  const [tableMenu, setTableMenu] = useState(false)
  const [chartMenu, setChartMenu] = useState(false)
  const [exportMenu, setExportMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)
  const commentCount = (state.comments || []).filter((c) => !c.resolved).length

  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/') || !activeSlide) return
    if (isStorageNearLimit()) {
      addToast('ストレージの容量が不足しています。', 'warning')
      return
    }
    const src = await fileToDataURL(file)
    dispatch({ type: 'ADD_IMAGE_ELEMENT', slideId: activeSlide.id, src, alt: file.name })
  }

  return (
    <header className="h-12 flex items-center gap-2 px-4 border-b border-slate-800 bg-slate-950 no-print flex-shrink-0">
      <Link
        href="/dashboard"
        className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 flex-shrink-0"
      >
        <ArrowLeft size={14} />
        <span className="max-md:hidden">{t('nav.back').slice(2)}</span>
      </Link>

      <div className="w-px h-5 bg-slate-800 flex-shrink-0" />

      <input
        type="text"
        value={state.meta.title}
        onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
        className="flex-1 bg-transparent text-white text-sm font-medium placeholder-slate-500 focus:outline-none min-w-0"
        placeholder={t('editor.untitledPresentation')}
      />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onUndo && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="元に戻す (Ctrl+Z)"
              aria-label="元に戻す"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="やり直し (Ctrl+Y)"
              aria-label="やり直し"
            >
              <Redo2 size={15} />
            </button>
          </div>
        )}

        <div className="w-px h-5 bg-slate-800" />

        {activeSlide && (
          <>
            <ThemePicker
              currentTheme={activeSlide.themeKey}
              onSelect={(key) => dispatch({ type: 'SET_THEME', slideId: activeSlide.id, themeKey: key })}
              onSelectAll={(key) => dispatch({ type: 'SET_THEME_ALL', themeKey: key })}
            />
            <TemplatePicker
              currentTheme={activeSlide.themeKey}
              onApply={(id) => dispatch({ type: 'APPLY_TEMPLATE', templateId: id })}
            />

            <button
              onClick={() => setCustomizerOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="テーマカスタマイズ"
              aria-label="テーマカスタマイズ"
            >
              <Palette size={14} />
            </button>
            {customizerOpen && (
              <ThemeCustomizer
                currentTheme={activeSlide.themeKey}
                onApplyCustom={(custom) => {
                  dispatch({ type: 'SET_CUSTOM_THEME', slideId: activeSlide.id, customTheme: custom })
                }}
                onClose={() => setCustomizerOpen(false)}
              />
            )}

            <div className="w-px h-5 bg-slate-800" />

            {/* Text box insert */}
            <div className="relative">
              <button
                onClick={() => setTextMenu(!textMenu)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="テキストボックスを挿入 (T)"
                aria-label="テキストボックスを挿入"
                aria-expanded={textMenu}
              >
                <Type size={14} />
              </button>
              {textMenu && (
                <div
                  className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-44 animate-slide-up"
                  role="menu"
                >
                  {[
                    { textType: 'title' as const, label: 'タイトル', desc: '大きい見出し' },
                    { textType: 'subtitle' as const, label: 'サブタイトル', desc: '中見出し' },
                    { textType: 'body' as const, label: '本文', desc: '標準テキスト' },
                    { textType: 'label' as const, label: 'ラベル', desc: '小さいテキスト' },
                  ].map((item) => (
                    <button
                      key={item.textType}
                      role="menuitem"
                      onClick={() => {
                        dispatch({ type: 'ADD_TEXT_ELEMENT', slideId: activeSlide!.id, textType: item.textType })
                        setTextMenu(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      <span className="text-[10px] text-slate-500">{item.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="画像を挿入 (I)"
              aria-label="画像を挿入"
            >
              <ImageIcon size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageFile(file)
              }}
            />

            <div className="relative">
              <button
                onClick={() => setShapeMenu(!shapeMenu)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="図形を挿入 (S)"
                aria-label="図形を挿入"
                aria-expanded={shapeMenu}
              >
                <Shapes size={14} />
              </button>
              {shapeMenu && (
                <div
                  className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-40 animate-slide-up max-h-80 overflow-y-auto"
                  role="menu"
                >
                  {SHAPE_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <div className="px-3 py-1 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        {cat.label}
                      </div>
                      {cat.shapes.map((s) => (
                        <button
                          key={s.shape}
                          role="menuitem"
                          onClick={() => {
                            dispatch({
                              type: 'ADD_SHAPE_ELEMENT',
                              slideId: activeSlide.id,
                              shape: s.shape,
                              fill: s.fill,
                            })
                            setShapeMenu(false)
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table insert */}
            <div className="relative">
              <button
                onClick={() => setTableMenu(!tableMenu)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="テーブルを挿入"
                aria-label="テーブルを挿入"
              >
                <Table size={14} />
              </button>
              {tableMenu && (
                <div className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-32 animate-slide-up">
                  {[
                    { r: 2, c: 2, l: '2×2' },
                    { r: 3, c: 3, l: '3×3' },
                    { r: 4, c: 4, l: '4×4' },
                    { r: 3, c: 5, l: '3×5' },
                  ].map((t) => (
                    <button
                      key={t.l}
                      onClick={() => {
                        dispatch({ type: 'ADD_TABLE_ELEMENT', slideId: activeSlide!.id, rows: t.r, cols: t.c })
                        setTableMenu(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      {t.l} テーブル
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Background image */}
            <button
              onClick={() => bgFileRef.current?.click()}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="背景画像"
              aria-label="背景画像"
            >
              <Wallpaper size={14} />
            </button>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !activeSlide) return
                if (isStorageNearLimit()) {
                  addToast('ストレージの容量が不足しています。', 'warning')
                  return
                }
                const src = await fileToDataURL(file)
                dispatch({
                  type: 'SET_BACKGROUND_IMAGE',
                  slideId: activeSlide.id,
                  backgroundImage: src,
                  backgroundFit: 'cover',
                })
              }}
            />

            {/* Connector */}
            <button
              onClick={() => {
                if (!activeSlide) return
                dispatch({
                  type: 'ADD_CONNECTOR',
                  slideId: activeSlide.id,
                  fromPoint: { x: 20, y: 50 },
                  toPoint: { x: 80, y: 50 },
                  stroke: '#6366f1',
                })
              }}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="コネクター線"
              aria-label="コネクター線"
            >
              <ArrowRightLeft size={14} />
            </button>

            {/* Chart */}
            <div className="relative">
              <button
                onClick={() => setChartMenu(!chartMenu)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="グラフを挿入"
                aria-label="グラフを挿入"
              >
                <BarChart3 size={14} />
              </button>
              {chartMenu && (
                <div
                  className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-36 animate-slide-up"
                  role="menu"
                >
                  {[
                    { type: 'bar' as const, label: '棒グラフ' },
                    { type: 'line' as const, label: '折れ線グラフ' },
                    { type: 'pie' as const, label: '円グラフ' },
                    { type: 'donut' as const, label: 'ドーナツグラフ' },
                  ].map((c) => (
                    <button
                      key={c.type}
                      role="menuitem"
                      onClick={() => {
                        dispatch({ type: 'ADD_CHART_ELEMENT', slideId: activeSlide.id, chartType: c.type })
                        setChartMenu(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Video */}
            <button
              onClick={() => {
                const url = prompt('動画URLまたはYouTube URLを入力')
                if (!url || !activeSlide) return
                const isYT = url.includes('youtube.com') || url.includes('youtu.be')
                let src = url
                if (isYT) {
                  const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
                  if (match) src = `https://www.youtube.com/embed/${match[1]}`
                }
                dispatch({
                  type: 'ADD_VIDEO_ELEMENT',
                  slideId: activeSlide.id,
                  src,
                  embedType: isYT ? 'youtube' : 'url',
                })
              }}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="動画を挿入"
              aria-label="動画を挿入"
            >
              <Video size={14} />
            </button>

            {/* Audio */}
            <button
              onClick={() => {
                const url = prompt('音声ファイルURLを入力')
                if (!url || !activeSlide) return
                dispatch({ type: 'ADD_AUDIO_ELEMENT', slideId: activeSlide.id, src: url })
              }}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="音声を挿入"
              aria-label="音声を挿入"
            >
              <Music size={14} />
            </button>

            <div className="relative">
              <button
                onClick={() => setTransMenu(!transMenu)}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="トランジション"
                aria-label="トランジション"
                aria-expanded={transMenu}
              >
                <Sparkle size={14} />
              </button>
              {transMenu && (
                <div
                  className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-32 animate-slide-up"
                  role="menu"
                >
                  {TRANSITIONS.map((tr) => (
                    <button
                      key={tr.value}
                      role="menuitem"
                      onClick={() => {
                        dispatch({ type: 'SET_TRANSITION', slideId: activeSlide.id, transition: tr.value })
                        setTransMenu(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        activeSlide.transition === tr.value
                          ? 'text-indigo-400 bg-indigo-500/10'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {tr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {onAnimationPanel && (
              <button
                onClick={onAnimationPanel}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="アニメーション"
                aria-label="アニメーション"
              >
                <Sparkle size={14} />
              </button>
            )}

            {onFooterSettings && (
              <button
                onClick={onFooterSettings}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="フッター設定"
                aria-label="フッター設定"
              >
                <Settings2 size={14} />
              </button>
            )}
          </>
        )}

        <div className="w-px h-5 bg-slate-800" />

        <button
          onClick={() => dispatch({ type: 'ADD_SLIDE', afterId: state.activeSlideId })}
          className="flex items-center gap-1 px-2 py-1 rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-white text-xs transition-colors"
        >
          <Plus size={12} /> <span className="max-md:hidden">{t('editor.addSlide').replace('+ ', '')}</span>
        </button>

        <div className="w-px h-5 bg-slate-800 max-md:hidden" />

        {onNotesToggle && (
          <button
            onClick={onNotesToggle}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-lg:hidden"
            title="スピーカーノート"
            aria-label="スピーカーノート"
          >
            <StickyNote size={14} />
          </button>
        )}

        {onCommentsToggle && (
          <button
            onClick={onCommentsToggle}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors relative max-lg:hidden"
            title="コメント"
            aria-label="コメント"
          >
            <MessageSquare size={14} />
            {commentCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {commentCount}
              </span>
            )}
          </button>
        )}

        {onSlideLayout && (
          <button
            onClick={onSlideLayout}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="レイアウト"
            aria-label="レイアウト"
          >
            <LayoutGrid size={14} />
          </button>
        )}

        {onAutoLayout && (
          <button
            onClick={onAutoLayout}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-lg:hidden"
            title="自動レイアウト"
            aria-label="自動レイアウト"
          >
            <Sparkles size={14} />
          </button>
        )}

        {onPdfImport && (
          <button
            onClick={onPdfImport}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-rose-500 bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            title="PDF読み込み"
            aria-label="PDF読み込み"
          >
            <FileDown size={14} />
          </button>
        )}

        {onAiDesign && (
          <button
            onClick={onAiDesign}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-violet-500 bg-slate-800 text-slate-400 hover:text-violet-400 transition-colors"
            title="AIデザイン改善"
            aria-label="AIデザイン改善"
          >
            <Wand2 size={14} />
          </button>
        )}

        {onVersions && (
          <>
            <button
              onClick={() => dispatch({ type: 'SAVE_VERSION' } as any)}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-lg:hidden"
              title="バージョンを保存"
              aria-label="バージョンを保存"
            >
              <Save size={14} />
            </button>
            <button
              onClick={onVersions}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-lg:hidden"
              title="バージョン履歴"
              aria-label="バージョン履歴"
            >
              <History size={14} />
            </button>
          </>
        )}

        {onVersionHistory && (
          <button
            onClick={onVersionHistory}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-lg:hidden"
            title="自動バージョン履歴"
            aria-label="自動バージョン履歴"
          >
            <Clock size={14} />
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-lg:hidden"
            title="共有"
            aria-label="共有"
          >
            <Share2 size={14} />
          </button>
        )}

        {onShortcuts && (
          <button
            onClick={onShortcuts}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-md:hidden"
            title="ショートカット"
            aria-label="ショートカット"
          >
            <Keyboard size={14} />
          </button>
        )}

        <div className="w-px h-5 bg-slate-800" />

        {onSorterView && (
          <button
            onClick={onSorterView}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-md:hidden"
            title="スライド一覧"
            aria-label="スライド一覧"
          >
            <LayoutGrid size={14} />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
          aria-label="テーマ切替"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {onPresent && (
          <button
            onClick={onPresent}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all active:scale-95"
          >
            <Play size={12} /> <span className="max-md:hidden">{t('editor.present').replace('▶ ', '')}</span>
          </button>
        )}

        {onPresenterView && (
          <button
            onClick={onPresenterView}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="発表者ビュー"
            aria-label="発表者ビュー"
          >
            <Monitor size={14} />
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setExportMenu(!exportMenu)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all active:scale-95"
            title="エクスポート"
          >
            <FileDown size={12} />
            <span className="max-md:hidden">{t('editor.export')}</span>
            <ChevronDown size={10} />
          </button>
          {exportMenu && (
            <div
              className="absolute top-full mt-1 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50 w-40 animate-slide-up"
              role="menu"
            >
              <button
                role="menuitem"
                onClick={() => { onExport(); setExportMenu(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                HTML
              </button>
              {onExportPDF && (
                <button
                  role="menuitem"
                  onClick={() => { onExportPDF(); setExportMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  PDF
                </button>
              )}
              {onExportPPTX && (
                <button
                  role="menuitem"
                  onClick={() => { onExportPPTX(); setExportMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  PPTX
                </button>
              )}
            </div>
          )}
        </div>

        {onPrint && (
          <button
            onClick={onPrint}
            className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-slate-500 bg-slate-800 text-slate-400 hover:text-white transition-colors max-md:hidden"
            title="印刷"
            aria-label="印刷"
          >
            <Printer size={14} />
          </button>
        )}

        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 hover:border-red-500 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
          title="削除"
          aria-label="削除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </header>
  )
}
