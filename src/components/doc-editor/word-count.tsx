'use client'

import { useMemo } from 'react'
import type { Block } from '@/types'
import DocZoomControl from './doc-zoom-control'

interface Props {
  blocks: Block[]
  zoom?: number
  onZoomChange?: (zoom: number) => void
}

export default function WordCount({ blocks, zoom, onZoomChange }: Props) {
  const stats = useMemo(() => {
    let chars = 0
    let words = 0
    let paragraphs = 0
    let images = 0
    let tables = 0

    blocks.forEach((b) => {
      if (b.type === 'image') {
        images++
        return
      }
      if (b.type === 'table') {
        tables++
        return
      }
      if (b.type === 'divider' || b.type === 'toc' || b.type === 'page-break') return
      const text = b.content.trim()
      if (!text) return
      paragraphs++
      chars += text.length

      const cjkCount = (text.match(/[　-鿿豈-﫿]/g) || []).length
      const latinWords = text
        .replace(/[　-鿿豈-﫿]/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length
      words += cjkCount + latinWords
    })

    // Reading time: ~500 chars/min for Japanese, ~200 words/min for English
    const readingMinutes = Math.max(1, Math.ceil(chars / 500))
    // Rough page count: ~1500 chars per page
    const pages = Math.max(1, Math.ceil(chars / 1500))

    return { chars, words, paragraphs, images, tables, readingMinutes, pages }
  }, [blocks])

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 no-print">
      <span>{stats.chars.toLocaleString()} 文字</span>
      <span>{stats.words.toLocaleString()} 単語</span>
      <span>{stats.paragraphs} 段落</span>
      <span>約{stats.readingMinutes}分</span>
      <span>約{stats.pages}ページ</span>
      {stats.images > 0 && <span>{stats.images} 画像</span>}
      {stats.tables > 0 && <span>{stats.tables} テーブル</span>}
      <div className="ml-auto">
        {zoom != null && onZoomChange && <DocZoomControl zoom={zoom} onZoomChange={onZoomChange} />}
      </div>
    </div>
  )
}
