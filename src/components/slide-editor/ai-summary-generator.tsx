'use client'

import { useState, useMemo } from 'react'
import { X, Sparkles, Plus, Loader2 } from 'lucide-react'
import type { Slide, SlideElement, SlideTextElement } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  slides: Slide[]
  onInsertSummarySlide: (elements: SlideElement[]) => void
}

// Extract text content from all slides
function extractAllText(slides: Slide[]): string[] {
  const texts: string[] = []
  for (const slide of slides) {
    for (const el of slide.elements) {
      if (
        el.type === 'title' ||
        el.type === 'subtitle' ||
        el.type === 'body' ||
        el.type === 'label'
      ) {
        const textEl = el as SlideTextElement
        const clean = textEl.content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
        if (clean) texts.push(clean)
      }
    }
  }
  return texts
}

// Simple keyword extraction: most frequent meaningful words/phrases
function extractKeywords(texts: string[], topN: number = 8): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up',
    'about', 'into', 'over', 'after', 'and', 'but', 'or', 'nor', 'not',
    'no', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every',
    'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
    'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
    'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they',
    'we', 'you', 'i', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
    'his', 'our', 'their', 'what', 'which', 'who', 'whom', 'when',
    'where', 'why', 'how', 'if', 'then', 'else', 'also', 'only',
    // Japanese stop words
    'の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ',
    'さ', 'ある', 'いる', 'する', 'も', 'な', 'こと', 'として', 'い',
    'や', 'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その',
    'あっ', 'よう', 'また', 'もの', 'だ', 'です', 'ます',
  ])

  const wordFreq = new Map<string, number>()
  const allText = texts.join(' ')

  // Split on whitespace and punctuation
  const words = allText
    .split(/[\s、。！？・\-\(\)\[\]「」『』【】,.:;!?]+/)
    .filter((w) => w.length > 1)
    .map((w) => w.toLowerCase())

  for (const word of words) {
    if (stopWords.has(word)) continue
    if (/^\d+$/.test(word)) continue
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  }

  // Sort by frequency
  const sorted = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word)

  return sorted
}

// Generate bullet points from slides
function generateBulletPoints(slides: Slide[]): string[] {
  const bullets: string[] = []

  for (const slide of slides) {
    const titleEl = slide.elements.find(
      (el) => el.type === 'title' || el.type === 'subtitle'
    )
    if (titleEl && 'content' in titleEl) {
      const title = (titleEl as SlideTextElement).content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim()
      if (title && title.length > 2) {
        bullets.push(title)
      }
    }
  }

  // If we have fewer than 3 bullets from titles, add body text
  if (bullets.length < 3) {
    for (const slide of slides) {
      const bodyEl = slide.elements.find((el) => el.type === 'body')
      if (bodyEl && 'content' in bodyEl) {
        const body = (bodyEl as SlideTextElement).content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
        if (body && body.length > 5 && !bullets.includes(body)) {
          // Take first sentence or up to 80 chars
          const firstSentence = body.split(/[.。!！?？]/)[0]
          if (firstSentence && firstSentence.length <= 80) {
            bullets.push(firstSentence)
          } else if (body.length <= 80) {
            bullets.push(body)
          }
        }
      }
      if (bullets.length >= 8) break
    }
  }

  return bullets.slice(0, 8)
}

export default function AiSummaryGenerator({
  open,
  onClose,
  slides,
  onInsertSummarySlide,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [editableBullets, setEditableBullets] = useState<string[]>([])
  const [summaryTitle, setSummaryTitle] = useState('')
  const [generated, setGenerated] = useState(false)

  const allTexts = useMemo(() => extractAllText(slides), [slides])
  const keywords = useMemo(
    () => extractKeywords(allTexts),
    [allTexts]
  )

  if (!open) return null

  function handleGenerate() {
    setIsGenerating(true)

    // Simulate brief processing delay
    setTimeout(() => {
      const bullets = generateBulletPoints(slides)
      setEditableBullets(bullets.length > 0 ? bullets : ['No content to summarize'])
      setSummaryTitle('Summary')
      setGenerated(true)
      setIsGenerating(false)
    }, 500)
  }

  function handleInsert() {
    const elements: SlideElement[] = [
      {
        id: `summary-title-${Date.now()}`,
        type: 'title' as const,
        content: summaryTitle,
        x: 5,
        y: 5,
        w: 90,
        h: 12,
        fontSize: 32,
        fontWeight: '700' as const,
        align: 'left' as const,
      },
      ...editableBullets.map((bullet, i) => ({
        id: `summary-bullet-${Date.now()}-${i}`,
        type: 'body' as const,
        content: `• ${bullet}`,
        x: 5,
        y: 22 + i * 9,
        w: 90,
        h: 8,
        fontSize: 18,
        fontWeight: '400' as const,
        align: 'left' as const,
      })),
    ]

    onInsertSummarySlide(elements)
    onClose()
  }

  function updateBullet(index: number, value: string) {
    setEditableBullets((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function removeBullet(index: number) {
    setEditableBullets((prev) => prev.filter((_, i) => i !== index))
  }

  function addBullet() {
    setEditableBullets((prev) => [...prev, ''])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[520px] max-h-[80vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <span className="text-white text-sm font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" />
            AI Summary Slide
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Info */}
          <div className="text-xs text-slate-400">
            Analyzing {slides.length} slides to generate a summary slide.
          </div>

          {/* Keywords */}
          {keywords.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Key Terms</p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs rounded-full"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          {!generated && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || slides.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Summary
                </>
              )}
            </button>
          )}

          {/* Editable results */}
          {generated && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Bullet Points
                </label>
                <div className="space-y-1.5">
                  {editableBullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-xs w-4 text-right flex-shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => updateBullet(i, e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => removeBullet(i)}
                        className="text-slate-500 hover:text-red-400 flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addBullet}
                  className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <Plus size={12} />
                  Add bullet
                </button>
              </div>

              {/* Preview */}
              <div className="border border-slate-600 rounded-lg overflow-hidden">
                <div className="bg-slate-900 aspect-video p-6 flex flex-col justify-center">
                  <h3 className="text-white text-lg font-bold mb-3">
                    {summaryTitle}
                  </h3>
                  <ul className="space-y-1.5">
                    {editableBullets.map((b, i) => (
                      <li key={i} className="text-slate-300 text-xs">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generated && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-700">
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={handleInsert}
              disabled={editableBullets.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
            >
              <Plus size={14} />
              Insert Summary Slide
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
