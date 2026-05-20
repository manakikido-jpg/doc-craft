'use client'

import { useState } from 'react'
import type { Block } from '@/types'
import { SpellCheck, X } from 'lucide-react'

interface ProofreadIssue {
  blockId: string
  blockSnippet: string
  issueType: string
  description: string
}

interface Props {
  blocks: Block[]
  onClose: () => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function analyzeBlocks(blocks: Block[]): ProofreadIssue[] {
  const issues: ProofreadIssue[] = []

  for (const block of blocks) {
    if (!block.content) continue
    const text = stripHtml(block.content)
    if (!text.trim()) continue

    const snippet = text.length > 30 ? text.slice(0, 30) + '...' : text

    // Double particles
    const doubleParticles = ['はは', 'がが', 'をを', 'にに', 'でで', 'とと', 'もも', 'のの', 'へへ']
    for (const dp of doubleParticles) {
      if (text.includes(dp)) {
        issues.push({
          blockId: block.id,
          blockSnippet: snippet,
          issueType: '助詞の重複',
          description: `「${dp}」が検出されました。助詞が重複している可能性があります。`,
        })
      }
    }

    // Missing period at end of sentence (for paragraph-type blocks with Japanese text)
    if (
      (block.type === 'paragraph' || block.type === 'bullet' || block.type === 'numbered') &&
      text.trim().length > 5
    ) {
      const trimmed = text.trim()
      const lastChar = trimmed[trimmed.length - 1]
      const endsWithPunctuation = ['。', '、', '！', '？', '.', '!', '?', ':', '：', '）', '」', '』'].includes(
        lastChar || '',
      )
      // Check if contains Japanese characters
      const hasJapanese = /[　-鿿]/.test(trimmed)
      if (hasJapanese && !endsWithPunctuation) {
        issues.push({
          blockId: block.id,
          blockSnippet: snippet,
          issueType: '句点の欠落',
          description: '文末に句点（。）がありません。',
        })
      }
    }

    // Very long sentences without punctuation (>100 chars)
    const sentences = text.split(/[。！？\n]/)
    for (const sentence of sentences) {
      const clean = sentence.replace(/\s/g, '')
      if (clean.length > 100) {
        issues.push({
          blockId: block.id,
          blockSnippet: snippet,
          issueType: '長すぎる文',
          description: `句読点なしで${clean.length}文字の文があります。読みやすさのために分割を検討してください。`,
        })
      }
    }

    // Repeated words (consecutive identical words of 2+ chars)
    const repeatedWordPattern = /(\p{L}{2,})\1/gu
    let match: RegExpExecArray | null
    while ((match = repeatedWordPattern.exec(text)) !== null) {
      // Skip known valid repetitions
      const word = match[1]
      const validRepeats = ['いろいろ', 'さまざま', 'それぞれ', 'ますます', 'だんだん', 'どんどん', 'しばしば']
      if (!validRepeats.includes(match[0])) {
        issues.push({
          blockId: block.id,
          blockSnippet: snippet,
          issueType: '単語の繰り返し',
          description: `「${word}」が連続して繰り返されています。`,
        })
      }
    }
  }

  return issues
}

export default function AiProofreadPanel({ blocks, onClose }: Props) {
  const [issues, setIssues] = useState<ProofreadIssue[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  function handleRun() {
    setIsAnalyzing(true)
    // Simulate brief analysis delay
    setTimeout(() => {
      const result = analyzeBlocks(blocks)
      setIssues(result)
      setHasRun(true)
      setIsAnalyzing(false)
    }, 600)
  }

  function handleScrollToBlock(blockId: string) {
    const el = document.querySelector(`[data-block-id="${blockId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-yellow-400/50')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-yellow-400/50')
      }, 2000)
    }
  }

  const issueTypeColor: Record<string, string> = {
    '助詞の重複': 'bg-red-500/20 text-red-300',
    '句点の欠落': 'bg-yellow-500/20 text-yellow-300',
    '長すぎる文': 'bg-orange-500/20 text-orange-300',
    '単語の繰り返し': 'bg-purple-500/20 text-purple-300',
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-80 bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <SpellCheck size={18} className="text-indigo-400" />
          <h2 className="text-white font-semibold text-sm">AI文章校正</h2>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="閉じる"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <button
          onClick={handleRun}
          disabled={isAnalyzing}
          className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isAnalyzing ? '校正中...' : '校正を実行'}
        </button>

        {isAnalyzing && (
          <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-xs animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.1s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
            <span>文章を分析しています...</span>
          </div>
        )}

        {hasRun && !isAnalyzing && issues.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">&#10003;</div>
            <p className="text-slate-300 text-sm font-medium">問題は見つかりませんでした</p>
            <p className="text-slate-500 text-xs mt-1">文章に明らかな問題はありません。</p>
          </div>
        )}

        {hasRun && !isAnalyzing && issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs">{issues.length}件の指摘があります</p>
            {issues.map((issue, i) => (
              <button
                key={i}
                onClick={() => handleScrollToBlock(issue.blockId)}
                className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-800 hover:border-slate-500 transition-colors space-y-1.5"
              >
                <span
                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${issueTypeColor[issue.issueType] || 'bg-slate-700 text-slate-300'}`}
                >
                  {issue.issueType}
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">{issue.description}</p>
                <p className="text-slate-500 text-[10px] truncate">{issue.blockSnippet}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 flex-shrink-0">
        <p className="text-slate-500 text-[10px] text-center">
          AIによる校正は参考情報です。必ずご自身でご確認ください。
        </p>
      </div>
    </div>
  )
}
