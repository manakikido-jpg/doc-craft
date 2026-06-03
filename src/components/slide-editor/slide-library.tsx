'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Plus, FolderOpen, Loader2 } from 'lucide-react'
import type { Slide, SlideElement, SlidesDocument } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface LibraryPresentation {
  id: string
  title: string
  slides: Slide[]
}

interface Props {
  open: boolean
  onClose: () => void
  currentDocId: string
  onImportSlide: (elements: SlideElement[], themeKey?: string) => void
}

// Get saved presentations from localStorage
function getSavedPresentations(excludeId: string): LibraryPresentation[] {
  const presentations: LibraryPresentation[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('doccraft-')) continue
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const doc = JSON.parse(raw) as SlidesDocument
        if (doc.meta?.type !== 'slides') continue
        if (doc.meta?.id === excludeId) continue
        if (!doc.slides || doc.slides.length === 0) continue
        presentations.push({
          id: doc.meta.id,
          title: doc.meta.title || 'Untitled',
          slides: doc.slides,
        })
      } catch {
        // Skip unparseable items
      }
    }
  } catch {
    // localStorage may not be available
  }
  return presentations
}

function SlideThumb({
  slide,
  onClick,
  selected,
}: {
  slide: Slide
  onClick: () => void
  selected: boolean
}) {
  const themeData = SLIDE_THEMES[slide.themeKey] ?? SLIDE_THEMES['dark-blue']
  const theme = slide.customTheme
    ? { ...themeData, ...slide.customTheme }
    : themeData

  const titleEl = slide.elements.find(
    (el) => el.type === 'title' || el.type === 'subtitle'
  )
  const titleText =
    titleEl && 'content' in titleEl
      ? (titleEl as any).content.replace(/<[^>]*>/g, '').slice(0, 40)
      : ''

  return (
    <button
      onClick={onClick}
      className={`relative aspect-video rounded-lg border-2 overflow-hidden transition-all hover:scale-105 cursor-pointer ${
        selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-slate-600 hover:border-slate-500'
      }`}
      style={{ background: theme.background }}
    >
      <div className="absolute inset-0 p-2 flex flex-col justify-center">
        {titleText && (
          <p
            className="text-[8px] font-bold truncate"
            style={{ color: theme.titleColor }}
          >
            {titleText}
          </p>
        )}
        <p className="text-[6px] mt-0.5" style={{ color: theme.bodyColor }}>
          {slide.elements.length} elements
        </p>
      </div>
      {selected && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
          <Plus size={10} className="text-white" />
        </div>
      )}
    </button>
  )
}

export default function SlideLibrary({
  open,
  onClose,
  currentDocId,
  onImportSlide,
}: Props) {
  const [presentations, setPresentations] = useState<LibraryPresentation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPresId, setSelectedPresId] = useState<string | null>(null)
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<string>>(
    new Set()
  )

  useEffect(() => {
    if (!open) return
    setLoading(true)
    // Load in next tick to not block render
    setTimeout(() => {
      const data = getSavedPresentations(currentDocId)
      setPresentations(data)
      setLoading(false)
    }, 100)
  }, [open, currentDocId])

  const filteredPres = useMemo(() => {
    if (!search.trim()) return presentations
    const q = search.toLowerCase()
    return presentations.filter((p) => p.title.toLowerCase().includes(q))
  }, [presentations, search])

  const selectedPres = selectedPresId
    ? presentations.find((p) => p.id === selectedPresId)
    : null

  function handleToggleSlide(slideId: string) {
    setSelectedSlideIds((prev) => {
      const next = new Set(prev)
      if (next.has(slideId)) {
        next.delete(slideId)
      } else {
        next.add(slideId)
      }
      return next
    })
  }

  function handleImportSelected() {
    if (!selectedPres) return
    const slides = selectedPres.slides.filter((s) =>
      selectedSlideIds.has(s.id)
    )
    for (const slide of slides) {
      onImportSlide(
        slide.elements.map((el) => ({ ...el })),
        slide.themeKey
      )
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[640px] max-h-[80vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <FolderOpen size={16} className="text-amber-400" />
            Slide Library
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Presentation list */}
          <div className="w-48 border-r border-slate-700 flex flex-col flex-shrink-0">
            <div className="p-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : filteredPres.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  No other presentations found
                </p>
              ) : (
                filteredPres.map((pres) => (
                  <button
                    key={pres.id}
                    onClick={() => {
                      setSelectedPresId(pres.id)
                      setSelectedSlideIds(new Set())
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      selectedPresId === pres.id
                        ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    <p className="font-medium truncate">{pres.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {pres.slides.length} slides
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Slide thumbnails */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedPres ? (
              <>
                <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {selectedPres.title} - {selectedPres.slides.length} slides
                  </span>
                  {selectedSlideIds.size > 0 && (
                    <span className="text-xs text-indigo-400">
                      {selectedSlideIds.size} selected
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-3 gap-3">
                    {selectedPres.slides.map((slide, i) => (
                      <div key={slide.id} className="relative">
                        <span className="absolute -top-1.5 left-1 text-[9px] text-slate-500 z-10">
                          {i + 1}
                        </span>
                        <SlideThumb
                          slide={slide}
                          onClick={() => handleToggleSlide(slide.id)}
                          selected={selectedSlideIds.has(slide.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-slate-500">
                  Select a presentation to browse slides
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImportSelected}
            disabled={selectedSlideIds.size === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
          >
            <Plus size={14} />
            Import {selectedSlideIds.size > 0 ? `(${selectedSlideIds.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
