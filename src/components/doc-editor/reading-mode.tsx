'use client'

import { useEffect } from 'react'
import type { DocDocument, Block } from '@/types'
import { X } from 'lucide-react'

interface Props {
  doc: DocDocument
  onExit: () => void
}

function renderBlock(block: Block, index: number, footnoteIndex: number): string {
  const align = block.align ? `text-align:${block.align};` : ''
  const color = block.textColor ? `color:${block.textColor};` : ''
  const bg = block.bgColor ? `background:${block.bgColor};padding:2px 6px;border-radius:4px;` : ''
  const style = align || color || bg ? ` style="${align}${color}${bg}"` : ''

  switch (block.type) {
    case 'h1':
      return `<h1 class="text-4xl font-bold text-slate-100 mt-10 mb-4"${style}>${block.content}</h1>`
    case 'h2':
      return `<h2 class="text-3xl font-semibold text-slate-200 mt-8 mb-3"${style}>${block.content}</h2>`
    case 'h3':
      return `<h3 class="text-2xl font-medium text-slate-200 mt-6 mb-2"${style}>${block.content}</h3>`
    case 'paragraph':
      return `<p class="text-lg text-slate-300 leading-8 mb-4"${style}>${block.content}</p>`
    case 'bullet':
      return `<li class="text-lg text-slate-300 leading-8 ml-6 list-disc"${style}>${block.content}</li>`
    case 'numbered':
      return `<li class="text-lg text-slate-300 leading-8 ml-6 list-decimal"${style}>${block.content}</li>`
    case 'quote':
      return `<blockquote class="text-lg text-slate-400 italic border-l-4 border-indigo-500 pl-6 py-2 my-4"${style}>${block.content}</blockquote>`
    case 'divider':
      return '<hr class="border-slate-700 my-8" />'
    case 'page-break':
      return '<div class="border-t border-dashed border-slate-600 my-10"></div>'
    case 'callout': {
      const variants: Record<string, string> = {
        info: 'border-blue-500/40 bg-blue-500/5 text-blue-300',
        warning: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
        success: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
        error: 'border-red-500/40 bg-red-500/5 text-red-300',
      }
      const icons: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
      const v = block.calloutVariant || 'info'
      return `<div class="rounded-lg border ${variants[v]} p-4 my-4 text-base">${icons[v]} ${block.content}</div>`
    }
    case 'checklist':
      return `<div class="flex items-start gap-3 text-lg text-slate-300 leading-8 mb-2">
        <span class="mt-1">${block.checked ? '☑' : '☐'}</span>
        <span class="${block.checked ? 'line-through text-slate-500' : ''}">${block.content}</span>
      </div>`
    case 'footnote':
      return `<div class="text-sm text-slate-500 pl-6 border-l-2 border-slate-600 my-2"><sup class="text-indigo-400">[${footnoteIndex}]</sup> ${block.content}</div>`
    case 'math':
      return `<div class="text-center text-2xl text-white font-serif my-4 py-3">${block.content}</div>`
    case 'image': {
      const imgAlign = block.data?.imageAlign || 'left'
      const alignCls = imgAlign === 'center' ? 'mx-auto' : imgAlign === 'right' ? 'ml-auto' : ''
      const caption = block.data?.caption
        ? `<figcaption class="text-center text-sm text-slate-500 mt-2">${block.data.caption}</figcaption>`
        : ''
      return block.data?.src
        ? `<figure class="my-4 ${alignCls === 'mx-auto' ? 'text-center' : ''}"><img src="${block.data.src}" alt="${block.data?.alt || ''}" class="rounded-lg ${alignCls}" style="${block.data?.width ? `width:${block.data.width}` : 'max-width:100%'}" />${caption}</figure>`
        : ''
    }
    case 'code':
      return `<pre class="bg-slate-800 p-4 rounded-lg overflow-x-auto my-4"><code class="text-emerald-400 text-sm">${block.content}</code></pre>`
    case 'textbox':
      return `<div class="border border-slate-600 rounded-lg p-4 my-4 text-lg text-slate-300 leading-8"${style}>${block.content}</div>`
    case 'columns': {
      try {
        const cols: string[] = JSON.parse(block.content)
        return `<div style="display:flex;gap:24px;margin:16px 0">${cols.map((c) => `<div style="flex:1" class="text-lg text-slate-300 leading-8">${c}</div>`).join('')}</div>`
      } catch {
        return ''
      }
    }
    case 'signature':
      return `<div class="max-w-xs my-8 border-t-2 border-slate-600 pt-3"><div class="h-12 mb-2"></div><div class="text-base text-slate-300">${block.data?.name || ''}</div><div class="text-sm text-slate-500">${block.data?.title || ''}</div><div class="text-sm text-slate-500">${block.data?.company || ''}</div><div class="text-xs text-slate-600 mt-1">${block.data?.date || ''}</div></div>`
    case 'cover-page':
      return `<div class="my-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-12 min-h-[300px] flex flex-col justify-center"><h1 class="text-4xl font-bold text-white mb-3">${block.data?.coverTitle || ''}</h1><p class="text-xl text-slate-400 mb-8">${block.data?.coverSubtitle || ''}</p><div class="mt-auto pt-8 border-t border-slate-700/50"><div class="text-sm text-slate-300">${block.data?.coverAuthor || ''}</div><div class="text-xs text-slate-500">${block.data?.coverOrg || ''}</div><div class="text-xs text-slate-600 mt-1">${block.data?.coverDate || ''}</div></div></div>`
    case 'drawing':
      return '<div class="my-4 text-center text-slate-500">[描画コンテンツ]</div>'
    default:
      return `<p class="text-lg text-slate-300 leading-8 mb-4"${style}>${block.content}</p>`
  }
}

export default function ReadingMode({ doc, onExit }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onExit])

  let footnoteCount = 0

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
      <button
        onClick={onExit}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
        title="閲覧モードを終了 (Esc)"
      >
        <X size={20} />
      </button>

      <article className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-5xl font-bold text-white mb-2">{doc.meta.title || '無題のドキュメント'}</h1>
        <div className="text-sm text-slate-500 mb-12">
          {new Date(doc.meta.updatedAt).toLocaleDateString('ja-JP')} ·{' '}
          {doc.blocks
            .filter((b) => b.type !== 'divider' && b.type !== 'image')
            .reduce((a, b) => a + b.content.length, 0)}{' '}
          文字
        </div>
        <div>
          {doc.blocks.map((block, i) => {
            if (block.type === 'footnote') footnoteCount++
            return <div key={block.id} dangerouslySetInnerHTML={{ __html: renderBlock(block, i, footnoteCount) }} />
          })}
        </div>
      </article>
    </div>
  )
}
