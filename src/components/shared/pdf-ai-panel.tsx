'use client'

import { useState, useRef, useCallback } from 'react'
import {
  FileText,
  Upload,
  X,
  Sparkles,
  Table2,
  Presentation,
  FileDown,
  AlertCircle,
  Loader2,
  CheckCircle2,
  BookOpen,
  ListChecks,
  BarChart3,
} from 'lucide-react'
import { extractPDFInfo } from '@/lib/import/pdf-extract'
import {
  summarizeContentToDoc,
  summarizeContentToSlides,
  isContentInput,
} from '@/lib/ai-skills'
import { generateId } from '@/lib/utils'
import type { Block, Cell } from '@/types'

type OutputFormat = 'doc-summary' | 'doc-table' | 'doc-bullets' | 'slides' | 'spreadsheet'

interface Props {
  open: boolean
  onClose: () => void
  /** Insert blocks into the current document editor */
  onInsertBlocks?: (blocks: Block[], title: string) => void
  /** Insert into a new spreadsheet (cells) */
  onInsertSpreadsheet?: (cells: Record<string, Cell>, rowCount: number, colCount: number, title: string) => void
  /** Insert as new slides */
  onInsertSlides?: (
    slides: { title: string; bullets: string[]; themeKey: string }[],
    docTitle: string,
  ) => void
  /** Context: which editor we are in */
  context?: 'doc' | 'slides' | 'spreadsheet' | 'dashboard'
}

interface PDFState {
  file: File | null
  text: string
  pageCount: number
  title: string
  status: 'idle' | 'extracting' | 'extracted' | 'processing' | 'done' | 'error'
  error?: string
}

const OUTPUT_OPTIONS: { id: OutputFormat; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: 'doc-summary',
    label: '文書要約',
    desc: 'セクション別に整理したドキュメント',
    icon: <BookOpen size={16} />,
  },
  {
    id: 'doc-table',
    label: '表にまとめる',
    desc: 'キーワード・内容を表形式に整理',
    icon: <Table2 size={16} />,
  },
  {
    id: 'doc-bullets',
    label: '箇条書き抽出',
    desc: '要点を箇条書きでリストアップ',
    icon: <ListChecks size={16} />,
  },
  {
    id: 'slides',
    label: 'スライド化',
    desc: 'プレゼンテーション用にスライド生成',
    icon: <Presentation size={16} />,
  },
  {
    id: 'spreadsheet',
    label: 'スプレッドシートに変換',
    desc: 'テーブルデータを表計算形式に',
    icon: <BarChart3 size={16} />,
  },
]

/** Simulate AI-like text processing */
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/** Parse text into sentences */
function splitSentences(text: string): string[] {
  return text
    .split(/[。.！!？?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5)
}

/** Extract key phrases from text (simulated NLP) */
function extractKeyPhrases(text: string): string[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  const phrases: string[] = []
  for (const line of lines) {
    // Take first meaningful part of each line/paragraph
    const trimmed = line.trim()
    if (trimmed.length > 10 && trimmed.length < 200) {
      phrases.push(trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed)
    }
  }
  return phrases.slice(0, 30)
}

/** Build summary blocks from PDF text */
function buildSummaryBlocks(text: string, title: string): Block[] {
  const sections = summarizeContentToDoc('free', text)
  const blocks: Block[] = [
    { id: generateId(), type: 'h1', content: `${title} - 要約` },
    {
      id: generateId(),
      type: 'callout',
      content: `このドキュメントはPDFから自動生成されました。元のPDFは${text.length}文字のテキストを含んでいます。`,
      data: { variant: 'info' },
    },
  ]

  for (const section of sections) {
    blocks.push({ id: generateId(), type: 'h2', content: section.heading })
    for (const p of section.paragraphs) {
      blocks.push({ id: generateId(), type: 'paragraph', content: p })
    }
    if (section.bullets) {
      for (const b of section.bullets) {
        blocks.push({ id: generateId(), type: 'bullet', content: b })
      }
    }
  }

  return blocks
}

/** Build table blocks from PDF text */
function buildTableBlocks(text: string, title: string): Block[] {
  const sentences = splitSentences(text)
  const blocks: Block[] = [
    { id: generateId(), type: 'h1', content: `${title} - 情報整理表` },
    {
      id: generateId(),
      type: 'callout',
      content: 'PDFから抽出したテキストを表形式に整理しました。',
      data: { variant: 'info' },
    },
  ]

  // Group sentences into categories
  const categories: Record<string, string[]> = {
    '概要・目的': [],
    '主要な内容': [],
    '詳細・補足': [],
    'その他': [],
  }

  sentences.forEach((s, i) => {
    if (i < sentences.length * 0.15) {
      categories['概要・目的'].push(s)
    } else if (i < sentences.length * 0.6) {
      categories['主要な内容'].push(s)
    } else if (i < sentences.length * 0.85) {
      categories['詳細・補足'].push(s)
    } else {
      categories['その他'].push(s)
    }
  })

  // Create a table block
  const rows: string[][] = [['カテゴリ', '内容', '備考']]
  for (const [cat, items] of Object.entries(categories)) {
    if (items.length === 0) continue
    for (let i = 0; i < Math.min(items.length, 5); i++) {
      rows.push([i === 0 ? cat : '', items[i], ''])
    }
  }

  blocks.push({
    id: generateId(),
    type: 'table',
    content: '',
    data: { rows, headerRow: true } as any,
  })

  return blocks
}

/** Build bullet list blocks from PDF text */
function buildBulletBlocks(text: string, title: string): Block[] {
  const phrases = extractKeyPhrases(text)
  const blocks: Block[] = [
    { id: generateId(), type: 'h1', content: `${title} - 要点` },
    {
      id: generateId(),
      type: 'callout',
      content: `PDFから${phrases.length}個の要点を抽出しました。`,
      data: { variant: 'info' },
    },
    { id: generateId(), type: 'h2', content: '主要ポイント' },
  ]

  // First third as important points
  const important = phrases.slice(0, Math.ceil(phrases.length / 3))
  for (const p of important) {
    blocks.push({ id: generateId(), type: 'bullet', content: p })
  }

  // Middle section
  if (phrases.length > 3) {
    blocks.push({ id: generateId(), type: 'h2', content: '詳細項目' })
    const details = phrases.slice(Math.ceil(phrases.length / 3), Math.ceil((phrases.length * 2) / 3))
    for (const p of details) {
      blocks.push({ id: generateId(), type: 'bullet', content: p })
    }
  }

  // Action items / checklist
  if (phrases.length > 6) {
    blocks.push({ id: generateId(), type: 'h2', content: 'アクションアイテム' })
    const actions = phrases.slice(Math.ceil((phrases.length * 2) / 3))
    for (const p of actions) {
      blocks.push({ id: generateId(), type: 'checklist', content: p, checked: false })
    }
  }

  return blocks
}

/** Build slide data from PDF text */
function buildSlideData(text: string, title: string) {
  const slides = summarizeContentToSlides('free', text)
  return {
    slides: slides.map((s) => ({
      title: s.title,
      bullets: s.bullets,
      themeKey: s.themeKey,
    })),
    docTitle: title,
  }
}

/** Build spreadsheet cells from PDF text */
function buildSpreadsheetCells(text: string, title: string) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const cells: Record<string, Cell> = {}

  // Header row
  cells['0-0'] = { value: '行番号', format: { bold: true } }
  cells['0-1'] = { value: '内容', format: { bold: true } }
  cells['0-2'] = { value: '文字数', format: { bold: true } }
  cells['0-3'] = { value: 'カテゴリ', format: { bold: true } }

  // Data rows
  lines.forEach((line, i) => {
    const row = i + 1
    cells[`${row}-0`] = { value: String(row) }
    cells[`${row}-1`] = { value: line.length > 200 ? line.slice(0, 200) + '...' : line }
    cells[`${row}-2`] = { value: String(line.length) }
    // Simple categorization
    const cat =
      i < lines.length * 0.1
        ? '導入'
        : i < lines.length * 0.3
          ? '前半'
          : i < lines.length * 0.7
            ? '本文'
            : i < lines.length * 0.9
              ? '後半'
              : 'まとめ'
    cells[`${row}-3`] = { value: cat }
  })

  // Summary row
  const summaryRow = lines.length + 2
  cells[`${summaryRow}-0`] = { value: '合計', format: { bold: true } }
  cells[`${summaryRow}-1`] = { value: `${lines.length} 行`, format: { bold: true } }
  cells[`${summaryRow}-2`] = {
    value: `=SUM(C2:C${lines.length + 1})`,
    format: { bold: true },
  }

  return {
    cells,
    rowCount: Math.max(summaryRow + 10, 50),
    colCount: 26,
    title: `${title} - データ`,
  }
}

export default function PdfAiPanel({ open, onClose, onInsertBlocks, onInsertSpreadsheet, onInsertSlides, context }: Props) {
  const [state, setState] = useState<PDFState>({
    file: null,
    text: '',
    pageCount: 0,
    title: '',
    status: 'idle',
  })
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('doc-summary')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setState((s) => ({ ...s, status: 'error', error: 'PDFファイルを選択してください' }))
      return
    }

    setState({
      file,
      text: '',
      pageCount: 0,
      title: file.name.replace(/\.pdf$/i, ''),
      status: 'extracting',
    })

    try {
      const info = await extractPDFInfo(file)
      setState({
        file,
        text: info.text,
        pageCount: info.pageCount,
        title: info.title || file.name.replace(/\.pdf$/i, ''),
        status: 'extracted',
      })
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: 'PDFの読み込みに失敗しました。ファイルが破損しているか、暗号化されている可能性があります。',
      }))
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!state.text) return

    setState((s) => ({ ...s, status: 'processing' }))

    // Simulate AI processing delay
    await delay(1200)

    try {
      switch (outputFormat) {
        case 'doc-summary': {
          const blocks = buildSummaryBlocks(state.text, state.title)
          onInsertBlocks?.(blocks, `${state.title} - 要約`)
          break
        }
        case 'doc-table': {
          const blocks = buildTableBlocks(state.text, state.title)
          onInsertBlocks?.(blocks, `${state.title} - 情報整理表`)
          break
        }
        case 'doc-bullets': {
          const blocks = buildBulletBlocks(state.text, state.title)
          onInsertBlocks?.(blocks, `${state.title} - 要点`)
          break
        }
        case 'slides': {
          const data = buildSlideData(state.text, state.title)
          onInsertSlides?.(data.slides, data.docTitle)
          break
        }
        case 'spreadsheet': {
          const data = buildSpreadsheetCells(state.text, state.title)
          onInsertSpreadsheet?.(data.cells, data.rowCount, data.colCount, data.title)
          break
        }
      }

      setState((s) => ({ ...s, status: 'done' }))
      await delay(500)
      onClose()
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: '処理中にエラーが発生しました。',
      }))
    }
  }, [state.text, state.title, outputFormat, onInsertBlocks, onInsertSlides, onInsertSpreadsheet, onClose])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // Determine available output formats based on context
  const availableFormats = OUTPUT_OPTIONS.filter((opt) => {
    if (context === 'slides') return opt.id === 'slides'
    if (context === 'spreadsheet') return opt.id === 'spreadsheet'
    // doc and dashboard: all options
    return true
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileDown size={18} className="text-rose-400" />
            PDF読み込み + AI処理
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: File upload */}
          {state.status === 'idle' || state.status === 'error' ? (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-rose-500 bg-rose-500/10' : 'border-slate-700 hover:border-slate-500'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="mx-auto text-slate-500 mb-3" />
                <p className="text-sm text-slate-300 mb-1">PDFファイルをドラッグ＆ドロップ</p>
                <p className="text-xs text-slate-500">またはクリックして選択</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    e.target.value = ''
                  }}
                />
              </div>

              {state.error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-300">{state.error}</p>
                </div>
              )}
            </>
          ) : state.status === 'extracting' ? (
            /* Step: Extracting */
            <div className="text-center py-8">
              <Loader2 size={32} className="mx-auto text-rose-400 mb-3 animate-spin" />
              <p className="text-sm text-slate-300">PDFを読み込み中...</p>
              <p className="text-xs text-slate-500 mt-1">{state.file?.name}</p>
            </div>
          ) : state.status === 'extracted' ? (
            /* Step 2: Choose output format */
            <>
              {/* PDF info */}
              <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
                <div className="w-10 h-10 bg-rose-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{state.title}</p>
                  <p className="text-xs text-slate-500">
                    {state.pageCount}ページ · {state.text.length.toLocaleString()}文字
                  </p>
                </div>
                <button
                  onClick={() => setState({ file: null, text: '', pageCount: 0, title: '', status: 'idle' })}
                  className="text-slate-500 hover:text-white p-1 transition-colors"
                  title="別のファイルを選択"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Text preview */}
              <div className="bg-slate-800/50 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">抽出テキスト プレビュー</p>
                <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {state.text.slice(0, 500)}
                  {state.text.length > 500 && <span className="text-slate-600">...（{state.text.length - 500}文字省略）</span>}
                </p>
              </div>

              {/* Output format selection */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">出力形式を選択</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {availableFormats.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setOutputFormat(opt.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        outputFormat === opt.id
                          ? 'bg-indigo-500/15 border border-indigo-500/40 text-white'
                          : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          outputFormat === opt.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {opt.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-[11px] text-slate-500">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Process button */}
              <button
                onClick={handleProcess}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl"
              >
                <Sparkles size={16} />
                AIで処理して挿入
              </button>
            </>
          ) : state.status === 'processing' ? (
            /* Step: Processing */
            <div className="text-center py-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <Loader2 size={40} className="absolute inset-0 m-auto text-indigo-400 animate-spin" />
                <Sparkles size={16} className="absolute top-0 right-0 text-violet-400 animate-pulse" />
              </div>
              <p className="text-sm text-slate-300">AIが内容を分析中...</p>
              <p className="text-xs text-slate-500 mt-1">
                {outputFormat === 'doc-summary' && '要約ドキュメントを生成しています'}
                {outputFormat === 'doc-table' && '情報を表形式に整理しています'}
                {outputFormat === 'doc-bullets' && '要点を抽出しています'}
                {outputFormat === 'slides' && 'スライドを生成しています'}
                {outputFormat === 'spreadsheet' && 'スプレッドシートに変換しています'}
              </p>
            </div>
          ) : state.status === 'done' ? (
            /* Step: Done */
            <div className="text-center py-8">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-sm text-white font-medium">処理が完了しました</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
