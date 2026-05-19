'use client'

import { useState } from 'react'
import type { Block } from '@/types'
import { useAIGenerateDoc, type DocSection } from '@/hooks/use-ai-generate'
import { getDocSkills, isContentInput } from '@/lib/ai-skills'
import { Sparkles, X } from 'lucide-react'

interface Props {
  onInsert: (blocks: Block[], title: string) => void
  onClose: () => void
}

export default function AiDocPanel({ onInsert, onClose }: Props) {
  const [topic, setTopic] = useState('')
  const [skillId, setSkillId] = useState('free')
  const { sections, isGenerating, generate, reset, toBlocks } = useAIGenerateDoc()
  const done = !isGenerating && sections.length > 0
  const skills = getDocSkills()

  const isSummarizeMode = isContentInput(topic)

  async function handleGenerate() {
    if (!topic.trim()) return
    reset()
    await generate(topic, skillId)
  }

  function handleInsert() {
    // 要約モードの場合、タイトルは先頭行を使う
    const insertTitle = isSummarizeMode
      ? (topic.split('\n').find((l) => l.trim().length > 0) ?? topic).slice(0, 30)
      : topic
    onInsert(toBlocks(insertTitle), insertTitle)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            <h2 className="text-white font-semibold text-sm">AIでドキュメントを生成</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">スキルを選択</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => setSkillId(skill.id)}
                  disabled={isGenerating}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                    skillId === skill.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                  } disabled:opacity-50`}
                >
                  <span className="text-lg">{skill.icon}</span>
                  <span className="text-[10px] leading-tight font-medium truncate w-full">{skill.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 font-medium">テーマ・内容を入力</label>
              {isSummarizeMode && (
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  📋 要約モード
                </span>
              )}
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isSummarizeMode) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              placeholder="トピックを入力 or 会議メモ・議事録などをペーストして要約..."
              disabled={isGenerating}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors disabled:opacity-50 resize-y min-h-[80px] max-h-[200px]"
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[10px] text-slate-500">💡 長文をペーストすると自動で要約・構造化します</p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {isGenerating ? '生成中...' : isSummarizeMode ? '要約・生成' : '生成'}
              </button>
            </div>
          </div>

          {(isGenerating || sections.length > 0) && (
            <div className="bg-slate-800 rounded-xl p-4 max-h-60 overflow-y-auto space-y-3">
              {sections.map((section, i) => (
                <SectionPreview key={i} section={section} />
              ))}
              {isGenerating && (
                <div className="flex items-center gap-2 text-slate-500 text-xs animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.1s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span>生成中...</span>
                </div>
              )}
            </div>
          )}

          {done && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 text-xs">{sections.length} セクション生成完了</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    reset()
                    setTopic('')
                  }}
                  className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  やり直す
                </button>
                <button
                  onClick={handleInsert}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  ドキュメントに挿入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionPreview({ section }: { section: DocSection }) {
  return (
    <div className="space-y-1">
      <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wide">{section.heading}</div>
      {section.paragraphs.map((p, i) => (
        <div key={i} className="text-slate-300 text-xs leading-relaxed line-clamp-2">
          {p}
        </div>
      ))}
      {section.bullets && (
        <div className="space-y-0.5">
          {section.bullets.map((b, i) => (
            <div key={i} className="text-slate-400 text-xs flex gap-1.5">
              <span className="text-indigo-500">•</span>
              {b}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
