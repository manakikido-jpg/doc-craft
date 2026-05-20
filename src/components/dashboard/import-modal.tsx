'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { createDocument, saveDocDoc, saveSpreadsheetDoc, getDocDoc, getSpreadsheetDoc } from '@/lib/cloud-store'
import { generateId } from '@/lib/utils'
import type { Block, Cell } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

function parseMarkdownToBlocks(text: string): { blocks: Block[]; title: string } {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let title = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Headings
    if (line.startsWith('### ')) {
      const content = line.slice(4).trim()
      if (!title && !blocks.length) title = content
      blocks.push({ id: generateId(), type: 'h3', content })
    } else if (line.startsWith('## ')) {
      const content = line.slice(3).trim()
      if (!title && !blocks.length) title = content
      blocks.push({ id: generateId(), type: 'h2', content })
    } else if (line.startsWith('# ')) {
      const content = line.slice(2).trim()
      if (!title) title = content
      blocks.push({ id: generateId(), type: 'h1', content })
    }
    // Bullet list
    else if (line.match(/^[-*+]\s/)) {
      blocks.push({ id: generateId(), type: 'bullet', content: line.replace(/^[-*+]\s/, '') })
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      blocks.push({ id: generateId(), type: 'numbered', content: line.replace(/^\d+\.\s/, '') })
    }
    // Checklist
    else if (line.match(/^[-*]\s*\[[ x]\]\s/i)) {
      const checked = line.includes('[x]') || line.includes('[X]')
      const content = line.replace(/^[-*]\s*\[[ xX]\]\s/, '')
      blocks.push({ id: generateId(), type: 'checklist', content, checked })
    }
    // Blockquote
    else if (line.startsWith('> ')) {
      blocks.push({ id: generateId(), type: 'quote', content: line.slice(2) })
    }
    // Divider
    else if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) {
      blocks.push({ id: generateId(), type: 'divider', content: '' })
    }
    // Code block (fenced)
    else if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ id: generateId(), type: 'code', content: codeLines.join('\n') })
    }
    // Empty line → skip or add paragraph break
    else if (line.trim() === '') {
      // Skip empty lines between blocks
    }
    // Regular paragraph
    else {
      blocks.push({ id: generateId(), type: 'paragraph', content: line })
    }
  }

  if (blocks.length === 0) {
    blocks.push({ id: generateId(), type: 'paragraph', content: '' })
  }

  return { blocks, title: title || 'インポートしたドキュメント' }
}

function parseCSVToSpreadsheet(text: string): { cells: Record<string, Cell>; rowCount: number; colCount: number; title: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const cells: Record<string, Cell> = {}
  let maxCol = 0

  for (let r = 0; r < lines.length; r++) {
    // Simple CSV parsing (handles quoted fields)
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of lines[r]) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if ((ch === ',' || ch === '\t') && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    row.push(current.trim())

    if (row.length > maxCol) maxCol = row.length
    for (let c = 0; c < row.length; c++) {
      if (row[c]) {
        cells[`${r}-${c}`] = { value: row[c] }
      }
    }
  }

  return {
    cells,
    rowCount: Math.max(lines.length + 10, 50),
    colCount: Math.max(maxCol + 5, 26),
    title: 'インポートしたスプレッドシート',
  }
}

export default function ImportModal({ open, onClose }: Props) {
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  async function handleFile(file: File) {
    setError(null)
    setImporting(true)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const text = await file.text()

      if (ext === 'md' || ext === 'txt' || ext === 'text') {
        // Import as document
        const { blocks, title } = parseMarkdownToBlocks(text)
        const fileTitle = file.name.replace(/\.(md|txt|text)$/i, '') || title

        const meta = await createDocument('doc', fileTitle)
        if (!meta) throw new Error('ドキュメントの作成に失敗しました')

        const doc = await getDocDoc(meta.id)
        if (!doc) throw new Error('ドキュメントの読み込みに失敗しました')

        doc.blocks = blocks
        await saveDocDoc(doc)
        router.push(`/docs/${meta.id}`)
        onClose()
      } else if (ext === 'csv' || ext === 'tsv') {
        // Import as spreadsheet
        const { cells, rowCount, colCount, title } = parseCSVToSpreadsheet(text)
        const fileTitle = file.name.replace(/\.(csv|tsv)$/i, '') || title

        const meta = await createDocument('spreadsheet', fileTitle)
        if (!meta) throw new Error('スプレッドシートの作成に失敗しました')

        const ssDoc = await getSpreadsheetDoc(meta.id)
        if (!ssDoc) throw new Error('スプレッドシートの読み込みに失敗しました')

        // Update the first sheet with imported data
        if (ssDoc.sheets[0]) {
          ssDoc.sheets[0].cells = cells
          ssDoc.sheets[0].rowCount = rowCount
          ssDoc.sheets[0].colCount = colCount
        }
        await saveSpreadsheetDoc(ssDoc)
        router.push(`/spreadsheets/${meta.id}`)
        onClose()
      } else if (ext === 'html' || ext === 'htm') {
        // Basic HTML → text extraction
        const parser = new DOMParser()
        const htmlDoc = parser.parseFromString(text, 'text/html')
        const bodyText = htmlDoc.body.textContent || ''
        const { blocks, title } = parseMarkdownToBlocks(bodyText)
        const fileTitle = htmlDoc.title || file.name.replace(/\.(html|htm)$/i, '') || title

        const meta = await createDocument('doc', fileTitle)
        if (!meta) throw new Error('ドキュメントの作成に失敗しました')

        const doc = await getDocDoc(meta.id)
        if (!doc) throw new Error('ドキュメントの読み込みに失敗しました')

        doc.blocks = blocks
        await saveDocDoc(doc)
        router.push(`/docs/${meta.id}`)
        onClose()
      } else {
        setError(`未対応のファイル形式です: .${ext}\n対応形式: .md .txt .csv .tsv .html`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-scale-in p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Upload size={18} className="text-indigo-400" />
            ファイルインポート
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="mx-auto text-slate-500 mb-3" />
          <p className="text-sm text-slate-300 mb-1">
            {importing ? 'インポート中...' : 'ファイルをドラッグ＆ドロップ'}
          </p>
          <p className="text-xs text-slate-500">またはクリックして選択</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.text,.csv,.tsv,.html,.htm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-300 whitespace-pre-line">{error}</p>
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">対応形式</p>
          <div className="flex flex-wrap gap-1.5">
            <FormatTag icon={<FileText size={11} />} label=".md" desc="Markdownドキュメント" />
            <FormatTag icon={<FileText size={11} />} label=".txt" desc="テキストファイル" />
            <FormatTag icon={<FileSpreadsheet size={11} />} label=".csv" desc="CSVスプレッドシート" />
            <FormatTag icon={<FileSpreadsheet size={11} />} label=".tsv" desc="TSVスプレッドシート" />
            <FormatTag icon={<FileText size={11} />} label=".html" desc="HTMLファイル" />
          </div>
        </div>
      </div>
    </div>
  )
}

function FormatTag({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[11px] text-slate-400" title={desc}>
      {icon}
      <span className="font-mono">{label}</span>
    </div>
  )
}
