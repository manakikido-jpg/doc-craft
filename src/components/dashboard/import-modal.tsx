'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X, FileSpreadsheet, AlertCircle, Presentation } from 'lucide-react'
import { createDocument, saveDocDoc, saveSpreadsheetDoc, getDocDoc, getSpreadsheetDoc, getSlideDoc, saveSlideDoc } from '@/lib/storage/cloud-store'
import { generateId } from '@/lib/utils'
import type { Block, BlockType, Cell, Slide, SlideTextElement } from '@/types'

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

function parseDocxXml(xmlString: string): Block[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')
  const blocks: Block[] = []
  const body = doc.querySelector('body') || doc.documentElement
  const paragraphs = body.getElementsByTagName('w:p')

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    let blockType: BlockType = 'paragraph'
    const pStyle = p.querySelector('pPr > pStyle')
    const styleName = pStyle?.getAttribute('w:val')?.toLowerCase() || ''

    if (styleName.includes('heading1') || styleName === '1' || styleName.includes('title')) {
      blockType = 'h1'
    } else if (styleName.includes('heading2') || styleName === '2' || styleName.includes('subtitle')) {
      blockType = 'h2'
    } else if (styleName.includes('heading3') || styleName === '3') {
      blockType = 'h3'
    } else if (styleName.includes('listparagraph') || styleName.includes('list')) {
      const numId = p.querySelector('pPr > numPr > numId')
      if (numId) {
        const numVal = numId.getAttribute('w:val')
        blockType = numVal && parseInt(numVal) > 0 ? 'numbered' : 'bullet'
      } else {
        blockType = 'bullet'
      }
    } else if (styleName.includes('quote')) {
      blockType = 'quote'
    }

    const runs = p.getElementsByTagName('w:r')
    let content = ''
    for (let j = 0; j < runs.length; j++) {
      const run = runs[j]
      const rPr = run.querySelector('rPr')
      const textNodes = run.getElementsByTagName('w:t')
      let text = ''
      for (let k = 0; k < textNodes.length; k++) {
        text += textNodes[k].textContent || ''
      }
      if (!text) continue
      const isBold = rPr?.querySelector('b') !== null
      const isItalic = rPr?.querySelector('i') !== null
      if (isBold && isItalic) content += `<b><i>${text}</i></b>`
      else if (isBold) content += `<b>${text}</b>`
      else if (isItalic) content += `<i>${text}</i>`
      else content += text
    }

    if (!content.trim() && blockType === 'paragraph') continue
    blocks.push({ id: generateId(), type: blockType, content: content || '' })
  }

  if (blocks.length === 0) {
    blocks.push({ id: generateId(), type: 'paragraph', content: '' })
  }
  return blocks
}

async function readZipEntries(file: File): Promise<{ name: string; data: Uint8Array }[]> {
  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)
  const files: { name: string; data: Uint8Array }[] = []
  let offset = 0

  while (offset < uint8.length - 4) {
    if (uint8[offset] === 0x50 && uint8[offset + 1] === 0x4b &&
        uint8[offset + 2] === 0x03 && uint8[offset + 3] === 0x04) {
      const nameLen = uint8[offset + 26] | (uint8[offset + 27] << 8)
      const extraLen = uint8[offset + 28] | (uint8[offset + 29] << 8)
      const compSize = uint8[offset + 18] | (uint8[offset + 19] << 8) | (uint8[offset + 20] << 16) | (uint8[offset + 21] << 24)
      const compMethod = uint8[offset + 8] | (uint8[offset + 9] << 8)
      const nameStart = offset + 30
      const name = new TextDecoder().decode(uint8.slice(nameStart, nameStart + nameLen))
      const dataStart = nameStart + nameLen + extraLen

      if (compMethod === 0) {
        files.push({ name, data: uint8.slice(dataStart, dataStart + compSize) })
      } else {
        try {
          const compressed = uint8.slice(dataStart, dataStart + compSize)
          const blob = new Blob([compressed])
          const ds = new DecompressionStream('deflate-raw' as CompressionFormat)
          const reader = blob.stream().pipeThrough(ds).getReader()
          const chunks: Uint8Array[] = []
          let done = false
          while (!done) {
            const result = await reader.read()
            if (result.done) { done = true; break }
            chunks.push(result.value)
          }
          const totalLen = chunks.reduce((s, c) => s + c.length, 0)
          const decompressed = new Uint8Array(totalLen)
          let pos = 0
          for (const chunk of chunks) {
            decompressed.set(chunk, pos)
            pos += chunk.length
          }
          files.push({ name, data: decompressed })
        } catch {
          files.push({ name, data: uint8.slice(dataStart, dataStart + compSize) })
        }
      }
      offset = dataStart + compSize
    } else {
      offset++
    }
  }
  return files
}

function extractPptxSlideText(xmlString: string): { title: string; bodyTexts: string[] } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')
  let title = ''
  const bodyTexts: string[] = []

  // Find all sp (shape) elements
  const shapes = doc.getElementsByTagName('p:sp')
  for (let i = 0; i < shapes.length; i++) {
    const sp = shapes[i]
    // Check shape type from nvSpPr > nvPr > ph
    const ph = sp.querySelector('nvSpPr > nvPr > ph')
    const phType = ph?.getAttribute('type') || ''
    const isTitle = phType === 'title' || phType === 'ctrTitle'

    // Extract text from txBody > p > r > t
    const txBody = sp.getElementsByTagName('p:txBody')[0]
    if (!txBody) continue

    const paragraphs = txBody.getElementsByTagName('a:p')
    const paraTexts: string[] = []
    for (let j = 0; j < paragraphs.length; j++) {
      const runs = paragraphs[j].getElementsByTagName('a:r')
      let lineText = ''
      for (let k = 0; k < runs.length; k++) {
        const tNodes = runs[k].getElementsByTagName('a:t')
        for (let m = 0; m < tNodes.length; m++) {
          lineText += tNodes[m].textContent || ''
        }
      }
      if (lineText.trim()) paraTexts.push(lineText.trim())
    }

    const fullText = paraTexts.join('\n')
    if (!fullText) continue

    if (isTitle && !title) {
      title = paraTexts[0] || fullText
    } else {
      bodyTexts.push(fullText)
    }
  }

  return { title, bodyTexts }
}

async function readPptxFile(file: File): Promise<{ slides: Slide[]; title: string }> {
  const entries = await readZipEntries(file)

  // Find slide files: ppt/slides/slide1.xml, slide2.xml, etc.
  const slideEntries = entries
    .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/slide(\d+)/)?.[1] || '0')
      const numB = parseInt(b.name.match(/slide(\d+)/)?.[1] || '0')
      return numA - numB
    })

  if (slideEntries.length === 0) {
    throw new Error('スライドデータが見つかりませんでした')
  }

  let docTitle = file.name.replace(/\.pptx$/i, '')
  const slides: Slide[] = []

  for (let i = 0; i < slideEntries.length; i++) {
    const xmlString = new TextDecoder().decode(slideEntries[i].data)
    const { title, bodyTexts } = extractPptxSlideText(xmlString)

    if (i === 0 && title) docTitle = title

    const elements: SlideTextElement[] = []

    // Add title element
    if (title) {
      elements.push({
        id: generateId(),
        type: 'title',
        content: title,
        x: 50,
        y: 40,
        w: 860,
        h: 80,
        fontSize: 36,
        fontWeight: '700',
        align: 'left',
      })
    }

    // Add body text element
    const bodyContent = bodyTexts.join('\n')
    if (bodyContent) {
      elements.push({
        id: generateId(),
        type: 'body',
        content: bodyContent,
        x: 50,
        y: title ? 140 : 40,
        w: 860,
        h: 380,
        fontSize: 18,
        fontWeight: '400',
        align: 'left',
      })
    }

    // If no content at all, add an empty body
    if (elements.length === 0) {
      elements.push({
        id: generateId(),
        type: 'body',
        content: '',
        x: 50,
        y: 40,
        w: 860,
        h: 460,
        fontSize: 18,
        fontWeight: '400',
        align: 'left',
      })
    }

    slides.push({
      id: generateId(),
      themeKey: 'dark-blue',
      elements,
    })
  }

  return { slides, title: docTitle }
}

async function readDocxFile(file: File): Promise<{ blocks: Block[]; title: string }> {
  const files = await readZipEntries(file)

  const docFile = files.find(f => f.name === 'word/document.xml')
  if (!docFile) {
    const arrayBuffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(new Uint8Array(arrayBuffer))
    const blocks = parseDocxXml(text)
    return { blocks, title: file.name.replace(/\.docx$/i, '') }
  }

  const xmlString = new TextDecoder().decode(docFile.data)
  const blocks = parseDocxXml(xmlString)
  return { blocks, title: file.name.replace(/\.docx$/i, '') }
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

      if (ext === 'pptx') {
        // Import PPTX as slides
        const { slides, title } = await readPptxFile(file)
        const fileTitle = file.name.replace(/\.pptx$/i, '') || title

        const meta = await createDocument('slides', fileTitle)
        if (!meta) throw new Error('スライドの作成に失敗しました')

        const slideDoc = await getSlideDoc(meta.id)
        if (!slideDoc) throw new Error('スライドの読み込みに失敗しました')

        slideDoc.slides = slides
        slideDoc.activeSlideId = slides[0]?.id || slideDoc.activeSlideId
        await saveSlideDoc(slideDoc)
        router.push(`/slides/${meta.id}`)
        onClose()
        return
      }

      if (ext === 'docx') {
        // Import DOCX as document
        const { blocks, title } = await readDocxFile(file)
        const fileTitle = file.name.replace(/\.docx$/i, '') || title

        const meta = await createDocument('doc', fileTitle)
        if (!meta) throw new Error('ドキュメントの作成に失敗しました')

        const doc = await getDocDoc(meta.id)
        if (!doc) throw new Error('ドキュメントの読み込みに失敗しました')

        doc.blocks = blocks
        await saveDocDoc(doc)
        router.push(`/docs/${meta.id}`)
        onClose()
        return
      }

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
        setError(`未対応のファイル形式です: .${ext}\n対応形式: .md .txt .csv .tsv .html .docx .pptx`)
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
            accept=".md,.txt,.text,.csv,.tsv,.html,.htm,.docx,.pptx"
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
            <FormatTag icon={<FileText size={11} />} label=".docx" desc="Word文書" />
            <FormatTag icon={<Presentation size={11} />} label=".pptx" desc="PowerPointスライド" />
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
