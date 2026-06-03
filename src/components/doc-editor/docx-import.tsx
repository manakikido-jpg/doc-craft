'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import type { Block, BlockType } from '@/types'
import { generateId } from '@/lib/utils'

interface Props {
  onImport: (blocks: Block[], title: string) => void
  onClose?: () => void
}

function parseDocxXml(xmlString: string): Block[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')
  const blocks: Block[] = []
  const body = doc.querySelector('body') || doc.documentElement

  const paragraphs = body.getElementsByTagName('w:p')

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]

    // Determine block type from style
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
      // Check for numbering
      const numId = p.querySelector('pPr > numPr > numId')
      const ilvl = p.querySelector('pPr > numPr > ilvl')
      if (numId) {
        const numVal = numId.getAttribute('w:val')
        if (numVal && parseInt(numVal) > 0) {
          blockType = 'numbered'
        } else {
          blockType = 'bullet'
        }
      } else {
        blockType = 'bullet'
      }
    } else if (styleName.includes('quote')) {
      blockType = 'quote'
    }

    // Extract text content with basic formatting
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

      // Check for bold
      const isBold = rPr?.querySelector('b') !== null
      // Check for italic
      const isItalic = rPr?.querySelector('i') !== null

      if (isBold && isItalic) {
        content += `<b><i>${text}</i></b>`
      } else if (isBold) {
        content += `<b>${text}</b>`
      } else if (isItalic) {
        content += `<i>${text}</i>`
      } else {
        content += text
      }
    }

    // Skip empty paragraphs that have no content
    if (!content.trim() && blockType === 'paragraph') continue

    blocks.push({
      id: generateId(),
      type: blockType,
      content: content || '',
    })
  }

  if (blocks.length === 0) {
    blocks.push({ id: generateId(), type: 'paragraph', content: '' })
  }

  return blocks
}

async function readDocxFile(file: File): Promise<{ blocks: Block[]; title: string }> {
  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)

  // Basic ZIP parsing to find word/document.xml
  // ZIP files: look for local file headers (PK\x03\x04)
  const files: { name: string; data: Uint8Array }[] = []
  let offset = 0

  while (offset < uint8.length - 4) {
    // Check for local file header signature
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
        // Stored (no compression)
        files.push({ name, data: uint8.slice(dataStart, dataStart + compSize) })
      } else {
        // For compressed data, try DecompressionStream API
        try {
          const compressed = uint8.slice(dataStart, dataStart + compSize)
          // Raw deflate
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
          // If decompression fails, store raw
          files.push({ name, data: uint8.slice(dataStart, dataStart + compSize) })
        }
      }

      offset = dataStart + compSize
    } else {
      offset++
    }
  }

  // Find word/document.xml
  const docFile = files.find(f => f.name === 'word/document.xml')
  if (!docFile) {
    // Fallback: try to read as plain XML
    const text = new TextDecoder().decode(uint8)
    const blocks = parseDocxXml(text)
    return { blocks, title: file.name.replace(/\.docx$/i, '') }
  }

  const xmlString = new TextDecoder().decode(docFile.data)
  const blocks = parseDocxXml(xmlString)
  const title = file.name.replace(/\.docx$/i, '')

  return { blocks, title }
}

export default function DocxImport({ onImport, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.endsWith('.docx')) {
      setError('.docx ファイルを選択してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await readDocxFile(file)
      onImport(result.blocks, result.title)
      onClose?.()
    } catch (err) {
      setError('ファイルの読み込みに失敗しました')
      console.error('DOCX import error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <input
        ref={fileRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
        {loading ? 'インポート中...' : 'DOCX ファイルを選択'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
