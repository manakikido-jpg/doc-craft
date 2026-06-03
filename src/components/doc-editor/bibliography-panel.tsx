'use client'

import { useState } from 'react'
import { X, Plus, Trash2, BookOpen } from 'lucide-react'

interface Citation {
  id: string
  title: string
  authors: string
  year: string
  publisher: string
  url: string
}

type CitationStyle = 'apa' | 'mla' | 'chicago'

interface Props {
  onInsertCitation: (html: string) => void
  onInsertBibliography: (html: string) => void
  onClose: () => void
}

function generateId() {
  return `cite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatCitation(c: Citation, style: CitationStyle): string {
  const authors = c.authors || '著者不明'
  const year = c.year || 'n.d.'
  const title = c.title || '無題'
  const publisher = c.publisher || ''
  const url = c.url || ''

  switch (style) {
    case 'apa': {
      let result = `${authors} (${year}). <em>${title}</em>.`
      if (publisher) result += ` ${publisher}.`
      if (url) result += ` ${url}`
      return result
    }
    case 'mla': {
      let result = `${authors}. "${title}."`
      if (publisher) result += ` ${publisher},`
      result += ` ${year}.`
      if (url) result += ` ${url}.`
      return result
    }
    case 'chicago': {
      let result = `${authors}. <em>${title}</em>.`
      if (publisher) result += ` ${publisher},`
      result += ` ${year}.`
      if (url) result += ` ${url}.`
      return result
    }
    default:
      return `${authors} (${year}). ${title}.`
  }
}

function formatInlineCitation(c: Citation): string {
  const authorShort = c.authors ? c.authors.split(',')[0].trim() : '著者不明'
  return `[${authorShort}, ${c.year || 'n.d.'}]`
}

export default function BibliographyPanel({ onInsertCitation, onInsertBibliography, onClose }: Props) {
  const [citations, setCitations] = useState<Citation[]>([])
  const [style, setStyle] = useState<CitationStyle>('apa')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formAuthors, setFormAuthors] = useState('')
  const [formYear, setFormYear] = useState('')
  const [formPublisher, setFormPublisher] = useState('')
  const [formUrl, setFormUrl] = useState('')

  function resetForm() {
    setFormTitle('')
    setFormAuthors('')
    setFormYear('')
    setFormPublisher('')
    setFormUrl('')
    setEditId(null)
    setShowForm(false)
  }

  function handleAddOrUpdate() {
    if (!formTitle.trim()) return

    if (editId) {
      setCitations((prev) =>
        prev.map((c) =>
          c.id === editId
            ? { ...c, title: formTitle, authors: formAuthors, year: formYear, publisher: formPublisher, url: formUrl }
            : c,
        ),
      )
    } else {
      const newCitation: Citation = {
        id: generateId(),
        title: formTitle,
        authors: formAuthors,
        year: formYear,
        publisher: formPublisher,
        url: formUrl,
      }
      setCitations((prev) => [...prev, newCitation])
    }
    resetForm()
  }

  function handleEdit(c: Citation) {
    setFormTitle(c.title)
    setFormAuthors(c.authors)
    setFormYear(c.year)
    setFormPublisher(c.publisher)
    setFormUrl(c.url)
    setEditId(c.id)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    setCitations((prev) => prev.filter((c) => c.id !== id))
  }

  function handleInsertInline(c: Citation) {
    onInsertCitation(formatInlineCitation(c))
  }

  function handleInsertBibliography() {
    if (citations.length === 0) return
    const sorted = [...citations].sort((a, b) => a.authors.localeCompare(b.authors))
    const lines = sorted.map((c) => `<p>${formatCitation(c, style)}</p>`)
    const html = `<div class="bibliography"><h3>参考文献</h3>${lines.join('')}</div>`
    onInsertBibliography(html)
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">参考文献管理</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Style selector */}
      <div className="px-4 py-2 border-b border-slate-800">
        <label className="block text-xs text-slate-400 mb-1">引用スタイル</label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value as CitationStyle)}
          className="w-full bg-slate-800 text-slate-300 text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="apa">APA</option>
          <option value="mla">MLA</option>
          <option value="chicago">Chicago</option>
        </select>
      </div>

      {/* Citation list */}
      <div className="flex-1 overflow-y-auto">
        {citations.length === 0 && !showForm ? (
          <div className="p-4 text-center text-xs text-slate-500">参考文献がありません。追加してください。</div>
        ) : (
          <div className="py-1">
            {citations.map((c) => (
              <div key={c.id} className="px-4 py-2 border-b border-slate-800/50 group">
                <div className="text-sm text-white truncate">{c.title}</div>
                <div className="text-xs text-slate-400 truncate">
                  {c.authors} ({c.year})
                </div>
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleInsertInline(c)}
                    className="px-2 py-0.5 text-[10px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded"
                  >
                    引用を挿入
                  </button>
                  <button
                    onClick={() => handleEdit(c)}
                    className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white bg-slate-800 rounded"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-0.5 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <div className="px-4 py-3 border-b border-slate-800 space-y-2">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="タイトル *"
              className="w-full bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              value={formAuthors}
              onChange={(e) => setFormAuthors(e.target.value)}
              placeholder="著者 (カンマ区切り)"
              className="w-full bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                placeholder="年"
                className="w-20 bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={formPublisher}
                onChange={(e) => setFormPublisher(e.target.value)}
                placeholder="出版社"
                className="flex-1 bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <input
              type="text"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="URL"
              className="w-full bg-slate-800 text-white text-xs rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddOrUpdate}
                className="flex-1 px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
              >
                {editId ? '更新' : '追加'}
              </button>
              <button
                onClick={resetForm}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-slate-800 space-y-2">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition-colors"
          >
            <Plus size={12} /> 参考文献を追加
          </button>
        )}
        <button
          onClick={handleInsertBibliography}
          disabled={citations.length === 0}
          className="w-full px-3 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
        >
          参考文献リストを挿入
        </button>
      </div>
    </div>
  )
}
