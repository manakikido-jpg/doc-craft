'use client'

import { useState } from 'react'
import { Sparkles, X, Languages, FileText, Wand2, Expand, ArrowRight } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  blocks: Block[]
  selectedBlockIds: string[]
  onReplaceBlocks: (blockIds: string[], newBlocks: Block[]) => void
  onInsertBlocksAfter: (afterBlockId: string, newBlocks: Block[]) => void
}

type ToolType = 'summarize' | 'translate' | 'rewrite' | 'expand'
type TranslateTarget = 'en' | 'ja' | 'zh' | 'ko'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

// Mock AI text transformations
function mockSummarize(text: string): string {
  const sentences = text.split(/[。.！!？?\n]/).filter(s => s.trim().length > 5)
  if (sentences.length <= 2) return text
  // Take first sentence and last sentence as "summary"
  const key = sentences.filter((_, i) => i === 0 || i === sentences.length - 1)
  return '【要約】 ' + key.join('。') + '。'
}

function mockTranslate(text: string, target: TranslateTarget): string {
  // Simple mock: add a prefix indicating translation target
  const labels: Record<TranslateTarget, string> = {
    en: '\u{1F1FA}\u{1F1F8} [English]',
    ja: '\u{1F1EF}\u{1F1F5} [日本語]',
    zh: '\u{1F1E8}\u{1F1F3} [中文]',
    ko: '\u{1F1F0}\u{1F1F7} [한국어]',
  }

  // Check if text is mostly Japanese
  const isJapanese = /[぀-ゟ゠-ヿ一-龯]/.test(text)

  if (target === 'en' && isJapanese) {
    // Very basic mock translations of common Japanese business phrases
    const translations: Record<string, string> = {
      'お疲れ様です': 'Thank you for your hard work',
      'よろしくお願いします': 'Thank you in advance',
      '議事録': 'Meeting Minutes',
      '課題': 'Issues',
      '目標': 'Objectives',
      '結果': 'Results',
      '概要': 'Overview',
      '背景': 'Background',
      '方法': 'Methods',
      '結論': 'Conclusion',
    }
    let result = text
    for (const [jp, en] of Object.entries(translations)) {
      result = result.replace(new RegExp(jp, 'g'), en)
    }
    return `${labels[target]} ${result}`
  }

  return `${labels[target]} ${text}`
}

function mockRewrite(text: string): string {
  // Mock rewrite: clean up and slightly rephrase
  let result = text
    .replace(/\s+/g, ' ')
    .trim()
  // Add some "rewritten" marker
  return '【推敲済み】 ' + result
}

function mockExpand(text: string): string {
  // Mock expand: add elaboration
  const sentences = text.split(/[。.]/).filter(s => s.trim())
  if (sentences.length === 0) return text

  const expanded = sentences.map(s => {
    const trimmed = s.trim()
    if (trimmed.length < 5) return trimmed
    return `${trimmed}。この点について、より具体的に述べると、${trimmed.slice(0, Math.min(10, trimmed.length))}に関連する重要な側面があります`
  })
  return expanded.join('。') + '。'
}

export default function AiTextToolsPanel({ open, onClose, blocks, selectedBlockIds, onReplaceBlocks, onInsertBlocksAfter }: Props) {
  const [activeTool, setActiveTool] = useState<ToolType | null>(null)
  const [translateTarget, setTranslateTarget] = useState<TranslateTarget>('en')
  const [result, setResult] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id))
  const selectedText = selectedBlocks.map(b => stripHtml(b.content || '')).join('\n')
  const hasSelection = selectedText.trim().length > 0

  function processText(tool: ToolType) {
    if (!hasSelection) return
    setActiveTool(tool)
    setIsProcessing(true)
    setResult('')

    setTimeout(() => {
      let output = ''
      switch (tool) {
        case 'summarize':
          output = mockSummarize(selectedText)
          break
        case 'translate':
          output = mockTranslate(selectedText, translateTarget)
          break
        case 'rewrite':
          output = mockRewrite(selectedText)
          break
        case 'expand':
          output = mockExpand(selectedText)
          break
      }
      setResult(output)
      setIsProcessing(false)
    }, 1000)
  }

  function handleReplace() {
    if (!result || selectedBlockIds.length === 0) return
    const newBlocks: Block[] = result.split('\n').filter(l => l.trim()).map(line => ({
      id: generateId(),
      type: 'paragraph' as const,
      content: line,
    }))
    onReplaceBlocks(selectedBlockIds, newBlocks)
    setResult('')
    setActiveTool(null)
  }

  function handleInsertBelow() {
    if (!result || selectedBlockIds.length === 0) return
    const lastBlockId = selectedBlockIds[selectedBlockIds.length - 1]
    const newBlocks: Block[] = result.split('\n').filter(l => l.trim()).map(line => ({
      id: generateId(),
      type: 'paragraph' as const,
      content: line,
    }))
    onInsertBlocksAfter(lastBlockId, newBlocks)
    setResult('')
    setActiveTool(null)
  }

  if (!open) return null

  const tools: { type: ToolType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'summarize', label: '要約', icon: <FileText size={16} />, desc: '選択テキストを簡潔にまとめます' },
    { type: 'translate', label: '翻訳', icon: <Languages size={16} />, desc: '他の言語に翻訳します' },
    { type: 'rewrite', label: '推敲', icon: <Wand2 size={16} />, desc: '文章を読みやすく書き直します' },
    { type: 'expand', label: '展開', icon: <Expand size={16} />, desc: '内容を詳しく膨らませます' },
  ]

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          <span className="text-white font-semibold text-sm">AIテキストツール</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
      </div>

      {/* Source text */}
      <div className="p-3 border-b border-slate-800">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">対象テキスト</p>
        {hasSelection ? (
          <div className="bg-slate-800 rounded-lg p-2 text-xs text-slate-300 max-h-24 overflow-y-auto">
            {selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">テキストブロックを選択してください</p>
        )}
      </div>

      {/* Tools */}
      <div className="p-3 border-b border-slate-800">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">ツール</p>
        <div className="grid grid-cols-2 gap-2">
          {tools.map(t => (
            <button
              key={t.type}
              onClick={() => processText(t.type)}
              disabled={!hasSelection || isProcessing}
              className={`p-2.5 rounded-lg text-left transition-colors ${
                activeTool === t.type ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">{t.icon}<span className="text-xs font-medium">{t.label}</span></div>
              <p className="text-[10px] opacity-70">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Translate target */}
        {activeTool === 'translate' && (
          <div className="mt-2 flex gap-1">
            {(['en', 'ja', 'zh', 'ko'] as TranslateTarget[]).map(lang => (
              <button
                key={lang}
                onClick={() => { setTranslateTarget(lang); processText('translate') }}
                className={`px-2 py-1 rounded text-xs ${translateTarget === lang ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {{ en: 'English', ja: '日本語', zh: '中文', ko: '한국어' }[lang]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result */}
      <div className="flex-1 overflow-y-auto p-3">
        {isProcessing && (
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        {result && !isProcessing && (
          <>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">結果</p>
            <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap mb-3">
              {result}
            </div>
            <div className="flex gap-2">
              <button onClick={handleReplace} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs">
                <ArrowRight size={12} />置き換え
              </button>
              <button onClick={handleInsertBelow} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs">
                下に挿入
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
