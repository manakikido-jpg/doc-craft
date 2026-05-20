'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { DocumentType } from '@/types'
import { createDocument, saveSlideDoc, saveDocDoc, getDocDoc } from '@/lib/cloud-store'
import { useAIGenerate, useAIGenerateDoc } from '@/hooks/use-ai-generate'
import { generateId } from '@/lib/utils'
import { getSlideSkills, getDocSkills, isContentInput, extractDocTitle } from '@/lib/ai-skills'
import { DOC_TEMPLATES } from '@/lib/doc-templates'
import { Presentation, FileText, Table2, Sparkles, ArrowLeft, Lightbulb, X } from 'lucide-react'
import IconFromKey from '@/components/shared/icon-map'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'choose' | 'config' | 'generating'

export default function CreateModal({ open, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [docType, setDocType] = useState<DocumentType>('slides')
  const [title, setTitle] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [skillId, setSkillId] = useState('free')
  const [docTemplateId, setDocTemplateId] = useState('blank')

  const { generate: generateSlides, slides: aiSlides, isGenerating: isGeneratingSlides } = useAIGenerate()
  const { generate: generateDoc, sections: aiSections, isGenerating: isGeneratingDoc, toBlocks } = useAIGenerateDoc()
  const createdDocId = useRef<string | null>(null)

  const _isGenerating = isGeneratingSlides || isGeneratingDoc

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('choose')
        setTitle('')
        setAiPrompt('')
        setUseAI(false)
        setSkillId('free')
        setDocTemplateId('blank')
        createdDocId.current = null
      }, 200)
    }
  }, [open])

  // Slide AI: navigate after generation complete
  useEffect(() => {
    if (
      step === 'generating' &&
      docType === 'slides' &&
      !isGeneratingSlides &&
      aiSlides.length > 0 &&
      createdDocId.current
    ) {
      const docId = createdDocId.current
      const doc = {
        meta: {
          id: docId,
          title: title || extractDocTitle(aiPrompt),
          type: 'slides' as DocumentType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thumbnailTheme: 'dark-blue',
        },
        slides: aiSlides.map((s) => ({
          id: generateId(),
          themeKey: s.themeKey,
          elements: [
            {
              id: generateId(),
              type: 'title' as const,
              content: s.title,
              x: 8,
              y: 10,
              w: 84,
              h: 15,
              fontSize: 42,
              fontWeight: '700' as const,
              align: 'left' as const,
            },
            {
              id: generateId(),
              type: 'body' as const,
              content: s.bullets.map((b) => '• ' + b).join('\n'),
              x: 8,
              y: 32,
              w: 84,
              h: 50,
              fontSize: 22,
              fontWeight: '400' as const,
              align: 'left' as const,
            },
          ],
        })),
        activeSlideId: '',
      }
      doc.activeSlideId = doc.slides[0]?.id ?? ''
      saveSlideDoc(doc).then(() => {
        onClose()
        router.push('/slides/' + docId)
      })
    }
  }, [isGeneratingSlides, aiSlides, step])

  // Doc AI: navigate after generation complete
  useEffect(() => {
    if (
      step === 'generating' &&
      docType === 'doc' &&
      !isGeneratingDoc &&
      aiSections.length > 0 &&
      createdDocId.current
    ) {
      const docId = createdDocId.current
      ;(async () => {
        const existing = await getDocDoc(docId)
        if (existing) {
          const docTitle = title || extractDocTitle(aiPrompt)
          const blocks = toBlocks(docTitle)
          existing.blocks = blocks
          existing.meta.title = docTitle
          await saveDocDoc(existing)
        }
        onClose()
        router.push('/docs/' + docId)
      })()
    }
  }, [isGeneratingDoc, aiSections, step])

  if (!open) return null

  function handleChoose(type: DocumentType) {
    setDocType(type)
    setStep('config')
  }

  async function handleCreate() {
    if (useAI && aiPrompt.trim()) {
      const docTitle = title || extractDocTitle(aiPrompt)
      const meta = await createDocument(docType, docTitle)
      if (!meta) return
      createdDocId.current = meta.id
      setStep('generating')
      if (docType === 'slides') {
        generateSlides({ topic: aiPrompt, slideCount: 6, style: 'business', skillId })
      } else {
        generateDoc(aiPrompt, skillId)
      }
    } else {
      const meta = await createDocument(docType, title)
      if (!meta) return
      // Apply doc template if selected (non-AI doc creation)
      if (docType === 'doc' && docTemplateId !== 'blank') {
        const tpl = DOC_TEMPLATES.find((t) => t.id === docTemplateId)
        if (tpl) {
          const existing = await getDocDoc(meta.id)
          if (existing) {
            existing.blocks = tpl.buildDoc()
            if (title) existing.blocks[0].content = title
            await saveDocDoc(existing)
          }
        }
      }
      onClose()
      router.push(
        docType === 'slides'
          ? '/slides/' + meta.id
          : docType === 'spreadsheet'
            ? '/spreadsheets/' + meta.id
            : '/docs/' + meta.id,
      )
    }
  }

  const generatingCount = docType === 'slides' ? aiSlides.length : aiSections.length
  const generatingTotal = docType === 'slides' ? 6 : 5
  const generatingItems = docType === 'slides' ? aiSlides.map((s) => s.title) : aiSections.map((s) => s.heading)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative glass bg-slate-900/80 border border-slate-700/50 rounded-2xl w-full max-w-lg mx-4 shadow-2xl shadow-indigo-500/5 overflow-hidden animate-slide-up">
        {step === 'choose' && <ChooseStep onChoose={handleChoose} onClose={onClose} />}
        {step === 'config' && (
          <ConfigStep
            docType={docType}
            title={title}
            setTitle={setTitle}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            useAI={useAI}
            setUseAI={setUseAI}
            skillId={skillId}
            setSkillId={setSkillId}
            docTemplateId={docTemplateId}
            setDocTemplateId={setDocTemplateId}
            onCreate={handleCreate}
            onBack={() => setStep('choose')}
          />
        )}
        {step === 'generating' && (
          <GeneratingStep
            topic={aiPrompt}
            docType={docType}
            items={generatingItems}
            count={generatingCount}
            total={generatingTotal}
          />
        )}
      </div>
    </div>
  )
}

function ChooseStep({ onChoose, onClose }: { onChoose: (t: DocumentType) => void; onClose: () => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">新規作成</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="閉じる"
        >
          <X size={18} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <TypeCard
          icon={<Presentation size={24} />}
          title="スライド"
          desc="プレゼンテーション・ピッチデッキ"
          color="from-indigo-600 to-violet-600"
          onClick={() => onChoose('slides')}
        />
        <TypeCard
          icon={<FileText size={24} />}
          title="ドキュメント"
          desc="レポート・議事録・仕様書"
          color="from-emerald-600 to-teal-600"
          onClick={() => onChoose('doc')}
        />
        <TypeCard
          icon={<Table2 size={24} />}
          title="スプレッドシート"
          desc="表計算・データ管理"
          color="from-cyan-600 to-blue-600"
          onClick={() => onChoose('spreadsheet')}
        />
      </div>
    </div>
  )
}

function TypeCard({
  icon,
  title,
  desc,
  color,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-6 rounded-xl border border-slate-700 hover:border-indigo-500 bg-slate-800/80 hover:bg-slate-800 transition-all duration-200 text-center hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-200`}
        >
          {icon}
        </div>
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300`}
        />
      </div>
      <div>
        <div className="font-semibold text-white text-sm">{title}</div>
        <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

function ConfigStep({
  docType,
  title,
  setTitle,
  aiPrompt,
  setAiPrompt,
  useAI,
  setUseAI,
  skillId,
  setSkillId,
  docTemplateId,
  setDocTemplateId,
  onCreate,
  onBack,
}: {
  docType: DocumentType
  title: string
  setTitle: (v: string) => void
  aiPrompt: string
  setAiPrompt: (v: string) => void
  useAI: boolean
  setUseAI: (v: boolean) => void
  skillId: string
  setSkillId: (v: string) => void
  docTemplateId: string
  setDocTemplateId: (v: string) => void
  onCreate: () => void
  onBack: () => void
}) {
  const typeLabel = docType === 'slides' ? 'スライド' : docType === 'spreadsheet' ? 'スプレッドシート' : 'ドキュメント'
  const skills = docType === 'slides' ? getSlideSkills() : getDocSkills()
  const selectedSkill = skills.find((s) => s.id === skillId)
  const placeholder =
    selectedSkill && skillId !== 'free'
      ? `例: ${selectedSkill.description}`
      : docType === 'slides'
        ? '例: 投資家向けピッチ、新製品戦略、四半期レビュー...'
        : '例: プロジェクト提案書、月次レポート、会議議事録...'

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          <ArrowLeft size={14} /> 戻る
        </button>
        <h2 className="text-lg font-semibold text-white">{typeLabel}を作成</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 font-medium mb-1.5 block">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={docType === 'slides' ? '例: Q4 事業報告' : '例: プロジェクト仕様書'}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
          />
        </div>

        {docType === 'doc' && !useAI && (
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block">テンプレート</label>
            <div className="grid grid-cols-3 gap-2">
              {DOC_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setDocTemplateId(tpl.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                    docTemplateId === tpl.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                      : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="flex-shrink-0">
                    <IconFromKey name={tpl.icon} size={18} className="text-slate-400" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{tpl.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{tpl.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <div
              onClick={() => setUseAI(!useAI)}
              className={`w-9 h-5 rounded-full transition-all duration-200 relative cursor-pointer ${useAI ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/30' : 'bg-slate-700'}`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${useAI ? 'translate-x-4' : 'translate-x-0.5'}`}
              />
            </div>
            <span className="text-sm text-slate-300 flex items-center gap-1">
              <Sparkles size={14} /> AIで{typeLabel}を自動生成
            </span>
          </label>

          {useAI && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block">スキルを選択</label>
                <div className="grid grid-cols-4 gap-2">
                  {skills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => setSkillId(skill.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all duration-200 ${
                        skillId === skill.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <IconFromKey name={skill.icon} size={18} className="text-slate-400" />
                      <span className="text-[10px] leading-tight font-medium truncate w-full">{skill.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-400 font-medium">テーマ・内容を入力</label>
                  {isContentInput(aiPrompt) && (
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      要約モード
                    </span>
                  )}
                </div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-200 resize-y min-h-[80px] max-h-[200px]"
                />
                <p className="text-[10px] text-slate-500 mt-1 flex items-start gap-1">
                  <Lightbulb size={10} className="flex-shrink-0 mt-0.5" />{' '}
                  トピックを入力するとテンプレートから生成。会議メモや長文をペーストすると自動で要約・構造化します。
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onCreate}
          disabled={useAI && !aiPrompt.trim()}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
        >
          {useAI ? `AIで${typeLabel}を生成する` : '作成する'}
        </button>
      </div>
    </div>
  )
}

function GeneratingStep({
  topic,
  docType,
  items,
  count,
  total,
}: {
  topic: string
  docType: DocumentType
  items: string[]
  count: number
  total: number
}) {
  const label = docType === 'slides' ? 'スライド' : 'セクション'
  return (
    <div className="p-8 text-center">
      <div className="relative w-12 h-12 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-glow-pulse blur-md" />
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/30">
          <Sparkles size={24} className="text-white" />
        </div>
      </div>
      <h2 className="text-white font-semibold text-lg mb-1">AIが{label}を生成中...</h2>
      <p className="text-slate-400 text-sm mb-6 truncate">{topic}</p>

      <div className="space-y-2 text-left mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300 flex-shrink-0 ${i < count ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white scale-100 shadow-sm shadow-indigo-500/30' : 'bg-slate-700/80 scale-90'}`}
            >
              {i < count ? <span className="animate-scale-in">✓</span> : ''}
            </div>
            <div className={`text-sm truncate transition-all duration-300 ${i < count ? 'text-white' : 'text-slate-600'}`}>
              {items[i] ?? `${label} ${i + 1}`}
            </div>
          </div>
        ))}
      </div>

      <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(count / total) * 100}%` }}
        />
      </div>
    </div>
  )
}
