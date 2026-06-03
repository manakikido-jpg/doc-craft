'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { DocumentType } from '@/types'
import { createDocument, saveSlideDoc, saveDocDoc, getDocDoc, getSlideDoc, getSpreadsheetDoc, saveSpreadsheetDoc, getDesignDoc, saveDesignDoc } from '@/lib/storage/cloud-store'
import { useAIGenerate, useAIGenerateDoc } from '@/hooks/use-ai-generate'
import { generateId } from '@/lib/utils'
import { getSlideSkills, getDocSkills, isContentInput, extractDocTitle } from '@/lib/ai-skills'
import { DOC_TEMPLATES } from '@/lib/templates/doc-templates'
import { SPREADSHEET_TEMPLATES } from '@/lib/templates/spreadsheet-templates'
import { SLIDE_TEMPLATES } from '@/lib/templates/slide-templates'
import { DESIGN_TEMPLATES } from '@/lib/templates/design-templates'
import { createDocFromTemplate, routeForDoc } from '@/lib/create-from-template'
import { extractPDFInfo } from '@/lib/import/pdf-extract'
import {
  summarizeContentToDoc,
  summarizeContentToSlides,
} from '@/lib/ai-skills'
import { Presentation, FileText, Table2, Sparkles, ArrowLeft, Lightbulb, X, Upload, FileDown, Loader2, CheckCircle2, Palette } from 'lucide-react'
import IconFromKey from '@/components/shared/icon-map'
import type { Block, Cell } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'choose' | 'config' | 'generating'
type CreateMode = 'template' | 'ai' | 'pdf'

export default function CreateModal({ open, onClose }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('choose')
  const [docType, setDocType] = useState<DocumentType>('slides')
  const [title, setTitle] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>('template')
  const [skillId, setSkillId] = useState('free')
  const [docTemplateId, setDocTemplateId] = useState('blank')
  const [spreadsheetTemplateId, setSpreadsheetTemplateId] = useState('blank')
  const [slideTemplateId, setSlideTemplateId] = useState('blank')
  const [designTemplateId, setDesignTemplateId] = useState('blank')
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState('')
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [pdfTitle, setPdfTitle] = useState('')
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'extracting' | 'extracted' | 'processing' | 'error'>('idle')
  const [pdfError, setPdfError] = useState('')

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
        setCreateMode('template')
        setSkillId('free')
        setDocTemplateId('blank')
        setSpreadsheetTemplateId('blank')
        setSlideTemplateId('blank')
        setDesignTemplateId('blank')
        setPdfFile(null)
        setPdfText('')
        setPdfPageCount(0)
        setPdfTitle('')
        setPdfStatus('idle')
        setPdfError('')
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
    if (type === 'design') setCreateMode('template')
    setStep('config')
  }

  async function handleCreate() {
    // --- PDF mode ---
    if (createMode === 'pdf' && pdfText) {
      setPdfStatus('processing')
      const docTitle = title || pdfTitle || 'PDF読み込み'
      const meta = await createDocument(docType, docTitle)
      if (!meta) { setPdfStatus('error'); setPdfError('ドキュメントの作成に失敗しました'); return }

      try {
        if (docType === 'doc') {
          const sections = summarizeContentToDoc('free', pdfText)
          const blocks: Block[] = [
            { id: generateId(), type: 'h1', content: `${docTitle}` },
            { id: generateId(), type: 'callout', content: `PDFから自動生成（${pdfPageCount}ページ, ${pdfText.length.toLocaleString()}文字）`, data: { variant: 'info' } as any },
          ]
          for (const section of sections) {
            blocks.push({ id: generateId(), type: 'h2', content: section.heading })
            for (const p of section.paragraphs) blocks.push({ id: generateId(), type: 'paragraph', content: p })
            if (section.bullets) for (const b of section.bullets) blocks.push({ id: generateId(), type: 'bullet', content: b })
          }
          const existing = await getDocDoc(meta.id)
          if (existing) { existing.blocks = blocks; existing.meta.title = docTitle; await saveDocDoc(existing) }
          onClose(); router.push('/docs/' + meta.id)
        } else if (docType === 'slides') {
          const slideData = summarizeContentToSlides('free', pdfText)
          const slides = slideData.map((s) => ({
            id: generateId(),
            themeKey: s.themeKey,
            elements: [
              { id: generateId(), type: 'title' as const, content: s.title, x: 5, y: 5, w: 90, h: 15, fontSize: 32, fontWeight: '700' as const, align: 'left' as const, color: '#ffffff' },
              ...s.bullets.map((bullet, bi) => ({ id: generateId(), type: 'body' as const, content: `• ${bullet}`, x: 5, y: 25 + bi * 10, w: 90, h: 8, fontSize: 18, fontWeight: '400' as const, align: 'left' as const, color: '#e2e8f0' })),
            ],
          }))
          const existing = await getSlideDoc(meta.id)
          if (existing) {
            existing.slides = slides as any
            existing.activeSlideId = slides[0]?.id ?? ''
            existing.meta.title = docTitle
            await saveSlideDoc(existing)
          }
          onClose(); router.push('/slides/' + meta.id)
        } else if (docType === 'spreadsheet') {
          const lines = pdfText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
          const cells: Record<string, Cell> = {}
          cells['0-0'] = { value: '行番号', format: { bold: true } }
          cells['0-1'] = { value: '内容', format: { bold: true } }
          cells['0-2'] = { value: '文字数', format: { bold: true } }
          lines.forEach((line, i) => {
            const row = i + 1
            cells[`${row}-0`] = { value: String(row) }
            cells[`${row}-1`] = { value: line.length > 200 ? line.slice(0, 200) + '...' : line }
            cells[`${row}-2`] = { value: String(line.length) }
          })
          const existing = await getSpreadsheetDoc(meta.id)
          if (existing) {
            existing.sheets[0].cells = cells
            existing.sheets[0].rowCount = Math.max(lines.length + 10, 50)
            existing.meta.title = docTitle
            await saveSpreadsheetDoc(existing)
          }
          onClose(); router.push('/spreadsheets/' + meta.id)
        }
      } catch {
        setPdfStatus('error'); setPdfError('PDF処理中にエラーが発生しました')
      }
      return
    }

    // --- AI mode ---
    if ((createMode === 'ai' || useAI) && aiPrompt.trim()) {
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
      // --- Template / blank mode --- (shared with the dashboard template gallery)
      const templateId =
        docType === 'doc' ? docTemplateId
          : docType === 'slides' ? slideTemplateId
            : docType === 'spreadsheet' ? spreadsheetTemplateId
              : designTemplateId
      const id = await createDocFromTemplate(docType, templateId, title)
      if (!id) return
      onClose()
      router.push(routeForDoc(docType, id))
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
            createMode={createMode}
            setCreateMode={setCreateMode}
            skillId={skillId}
            setSkillId={setSkillId}
            docTemplateId={docTemplateId}
            setDocTemplateId={setDocTemplateId}
            spreadsheetTemplateId={spreadsheetTemplateId}
            setSpreadsheetTemplateId={setSpreadsheetTemplateId}
            slideTemplateId={slideTemplateId}
            setSlideTemplateId={setSlideTemplateId}
            designTemplateId={designTemplateId}
            setDesignTemplateId={setDesignTemplateId}
            pdfFile={pdfFile}
            pdfText={pdfText}
            pdfPageCount={pdfPageCount}
            pdfTitle={pdfTitle}
            pdfStatus={pdfStatus}
            pdfError={pdfError}
            onPdfFile={async (file: File) => {
              if (!file.name.toLowerCase().endsWith('.pdf')) {
                setPdfStatus('error'); setPdfError('PDFファイルを選択してください'); return
              }
              setPdfFile(file); setPdfStatus('extracting'); setPdfError('')
              try {
                const info = await extractPDFInfo(file)
                setPdfText(info.text); setPdfPageCount(info.pageCount)
                setPdfTitle(info.title || file.name.replace(/\.pdf$/i, ''))
                setPdfStatus('extracted')
                if (!title) setTitle(info.title || file.name.replace(/\.pdf$/i, ''))
              } catch {
                setPdfStatus('error'); setPdfError('PDFの読み込みに失敗しました')
              }
            }}
            onPdfClear={() => { setPdfFile(null); setPdfText(''); setPdfPageCount(0); setPdfTitle(''); setPdfStatus('idle'); setPdfError('') }}
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
      <div className="grid grid-cols-4 gap-4">
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
        <TypeCard
          icon={<Palette size={24} />}
          title="デザイン"
          desc="SNS投稿・ポスター・名刺"
          color="from-pink-600 to-rose-600"
          onClick={() => onChoose('design')}
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
  createMode,
  setCreateMode,
  skillId,
  setSkillId,
  docTemplateId,
  setDocTemplateId,
  spreadsheetTemplateId,
  setSpreadsheetTemplateId,
  slideTemplateId,
  setSlideTemplateId,
  designTemplateId,
  setDesignTemplateId,
  pdfFile,
  pdfText,
  pdfPageCount,
  pdfTitle,
  pdfStatus,
  pdfError,
  onPdfFile,
  onPdfClear,
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
  createMode: CreateMode
  setCreateMode: (v: CreateMode) => void
  skillId: string
  setSkillId: (v: string) => void
  docTemplateId: string
  setDocTemplateId: (v: string) => void
  spreadsheetTemplateId: string
  setSpreadsheetTemplateId: (v: string) => void
  slideTemplateId: string
  setSlideTemplateId: (v: string) => void
  designTemplateId: string
  setDesignTemplateId: (v: string) => void
  pdfFile: File | null
  pdfText: string
  pdfPageCount: number
  pdfTitle: string
  pdfStatus: string
  pdfError: string
  onPdfFile: (file: File) => void
  onPdfClear: () => void
  onCreate: () => void
  onBack: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const typeLabel = docType === 'slides' ? 'スライド' : docType === 'spreadsheet' ? 'スプレッドシート' : docType === 'design' ? 'デザイン' : 'ドキュメント'
  const skills = docType === 'slides' ? getSlideSkills() : getDocSkills()
  const selectedSkill = skills.find((s) => s.id === skillId)
  const placeholder =
    selectedSkill && skillId !== 'free'
      ? `例: ${selectedSkill.description}`
      : docType === 'slides'
        ? '例: 投資家向けピッチ、新製品戦略、四半期レビュー...'
        : '例: プロジェクト提案書、月次レポート、会議議事録...'

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onPdfFile(file)
  }

  // Determine if create button should be disabled
  const isCreateDisabled =
    (createMode === 'ai' && !aiPrompt.trim()) ||
    (createMode === 'pdf' && pdfStatus !== 'extracted') ||
    pdfStatus === 'processing'

  return (
    <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          <ArrowLeft size={14} /> 戻る
        </button>
        <h2 className="text-lg font-semibold text-white">{typeLabel}を作成</h2>
      </div>

      <div className="space-y-4">
        {/* ── Mode Tabs ── */}
        <div className="flex bg-slate-800/80 rounded-lg p-0.5 gap-0.5">
          {([
            { key: 'template' as CreateMode, label: 'テンプレート', icon: <FileText size={13} /> },
            { key: 'ai' as CreateMode, label: 'AI生成', icon: <Sparkles size={13} /> },
            { key: 'pdf' as CreateMode, label: 'PDF読込', icon: <FileDown size={13} /> },
          ]).map((tab) => {
            const disabledModes: CreateMode[] = docType === 'design' ? ['ai', 'pdf'] : []
            const isDisabled = disabledModes.includes(tab.key)
            return (
              <button
                key={tab.key}
                onClick={() => !isDisabled && setCreateMode(tab.key)}
                disabled={isDisabled}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isDisabled
                    ? 'opacity-30 cursor-not-allowed'
                    : createMode === tab.key
                      ? 'bg-indigo-500/20 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── Title ── */}
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

        {/* ══════ Template Mode ══════ */}
        {createMode === 'template' && (
          <>
            {docType === 'slides' && (
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block">テンプレート</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSlideTemplateId('blank')}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                      slideTemplateId === 'blank'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex-shrink-0"><Presentation size={18} className="text-slate-400" /></span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">ブランク</div>
                      <div className="text-[10px] text-slate-500 truncate">空のスライド</div>
                    </div>
                  </button>
                  {SLIDE_TEMPLATES.filter((t) => !!t.buildSlides).map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSlideTemplateId(tpl.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                        slideTemplateId === tpl.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex-shrink-0"><Presentation size={18} className="text-slate-400" /></span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{tpl.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{tpl.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {docType === 'doc' && (
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
                      <span className="flex-shrink-0"><IconFromKey name={tpl.icon} size={18} className="text-slate-400" /></span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{tpl.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{tpl.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {docType === 'spreadsheet' && (
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block">テンプレート</label>
                <div className="grid grid-cols-3 gap-2">
                  {SPREADSHEET_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSpreadsheetTemplateId(tpl.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                        spreadsheetTemplateId === tpl.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex-shrink-0"><IconFromKey name={tpl.icon} size={18} className="text-slate-400" /></span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{tpl.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{tpl.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {docType === 'design' && (
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block">テンプレート</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDesignTemplateId('blank')}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                      designTemplateId === 'blank'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex-shrink-0"><Palette size={18} className="text-slate-400" /></span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">ブランク</div>
                      <div className="text-[10px] text-slate-500 truncate">空のキャンバス</div>
                    </div>
                  </button>
                  {DESIGN_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setDesignTemplateId(tpl.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200 ${
                        designTemplateId === tpl.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10'
                          : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex-shrink-0"><IconFromKey name={tpl.icon} size={18} className="text-slate-400" /></span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{tpl.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{tpl.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════ AI Mode ══════ */}
        {createMode === 'ai' && (
          <div className="space-y-3">
            {docType !== 'spreadsheet' && (
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
            )}

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

        {/* ══════ PDF Mode ══════ */}
        {createMode === 'pdf' && (
          <div className="space-y-3">
            {pdfStatus === 'idle' || pdfStatus === 'error' ? (
              <>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    dragOver ? 'border-rose-500 bg-rose-500/10' : 'border-slate-700 hover:border-slate-500'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={28} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-sm text-slate-300 mb-1">PDFファイルをドラッグ＆ドロップ</p>
                  <p className="text-xs text-slate-500">またはクリックして選択</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) onPdfFile(file)
                      e.target.value = ''
                    }}
                  />
                </div>
                {pdfError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
                    {pdfError}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 flex items-start gap-1">
                  <Lightbulb size={10} className="flex-shrink-0 mt-0.5" />
                  PDFの内容をAIが解析し、{typeLabel}として自動構成します。
                </p>
              </>
            ) : pdfStatus === 'extracting' ? (
              <div className="text-center py-6">
                <Loader2 size={28} className="mx-auto text-rose-400 mb-2 animate-spin" />
                <p className="text-sm text-slate-300">PDFを読み込み中...</p>
                <p className="text-xs text-slate-500 mt-1">{pdfFile?.name}</p>
              </div>
            ) : pdfStatus === 'extracted' ? (
              <>
                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
                  <div className="w-9 h-9 bg-rose-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileDown size={18} className="text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{pdfTitle}</p>
                    <p className="text-xs text-slate-500">
                      {pdfPageCount}ページ · {pdfText.length.toLocaleString()}文字
                    </p>
                  </div>
                  <button
                    onClick={onPdfClear}
                    className="text-slate-500 hover:text-white p-1 transition-colors"
                    title="別のファイルを選択"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-2.5 max-h-24 overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">抽出テキスト</p>
                  <p className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {pdfText.slice(0, 300)}
                    {pdfText.length > 300 && <span className="text-slate-600">...（{(pdfText.length - 300).toLocaleString()}文字省略）</span>}
                  </p>
                </div>
                <p className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                  <CheckCircle2 size={10} /> PDFの読み込みが完了しました。「作成する」で{typeLabel}に変換します。
                </p>
              </>
            ) : pdfStatus === 'processing' ? (
              <div className="text-center py-6">
                <Loader2 size={28} className="mx-auto text-indigo-400 mb-2 animate-spin" />
                <p className="text-sm text-slate-300">AIが{typeLabel}を生成中...</p>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Create Button ── */}
        <button
          onClick={onCreate}
          disabled={isCreateDisabled}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all duration-200 text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
        >
          {createMode === 'ai' ? (
            <><Sparkles size={14} /> AIで{typeLabel}を生成する</>
          ) : createMode === 'pdf' ? (
            <><FileDown size={14} /> PDFから{typeLabel}を作成</>
          ) : (
            '作成する'
          )}
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
