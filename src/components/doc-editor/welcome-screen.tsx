'use client'

import { Users, FileText, Mail, Presentation, BookOpen, FileEdit, Sparkles } from 'lucide-react'
import type { Block, BlockType } from '@/types'
import { generateId } from '@/lib/utils'

interface WelcomeScreenProps {
  onStartTyping: () => void
  onUseTemplate: (blocks: Block[], title: string) => void
  onAIGenerate: () => void
}

function b(type: BlockType, content: string): Block {
  return { id: generateId(), type, content }
}

interface TemplateCard {
  title: string
  description: string
  icon: React.ReactNode
  blocks: () => Block[]
  docTitle: string
}

const templates: TemplateCard[] = [
  {
    title: '議事録',
    description: '会議の記録を整理',
    icon: <Users className="w-5 h-5" />,
    docTitle: '議事録',
    blocks: () => [
      b('h1', '議事録'),
      b('paragraph', '日時: 2026年○月○日（○）00:00〜00:00'),
      b('paragraph', '場所: 会議室A / オンライン'),
      b('h2', '出席者'),
      b('bullet', '山田太郎（議長）'),
      b('bullet', '佐藤花子'),
      b('h2', '議題'),
      b('numbered', '議題1'),
      b('numbered', '議題2'),
      b('h2', '討議内容'),
      b('paragraph', '各議題について以下のとおり討議を行った。'),
      b('h2', 'アクションアイテム'),
      b('checklist', '担当者: タスク内容（期限: ○月○日）'),
      b('h2', '次回会議'),
      b('paragraph', '日時: ○月○日（○）00:00〜 場所: 未定'),
    ],
  },
  {
    title: '企画書',
    description: 'プロジェクト提案書',
    icon: <Presentation className="w-5 h-5" />,
    docTitle: '企画書',
    blocks: () => [
      b('h1', '企画書: ○○プロジェクト'),
      b('paragraph', '提出日: 2026年○月○日'),
      b('h2', 'エグゼクティブサマリー'),
      b('paragraph', '本企画は、○○市場における新サービスの立ち上げを提案するものである。'),
      b('h2', '背景・課題'),
      b('paragraph', '現状の課題と背景を記述する。'),
      b('h2', '実施計画'),
      b('paragraph', '具体的な計画を記述する。'),
      b('h2', '予算'),
      b('paragraph', '総予算: ○○万円'),
      b('h2', 'スケジュール'),
      b('paragraph', '開始: 2026年○月 / 完了予定: 2027年○月'),
      b('h2', '結論'),
      b('paragraph', '本企画により期待される成果を記述する。'),
    ],
  },
  {
    title: '報告書',
    description: 'ビジネス報告書',
    icon: <FileText className="w-5 h-5" />,
    docTitle: '報告書',
    blocks: () => [
      b('h1', '報告書'),
      b('paragraph', '作成日: 2026年○月○日'),
      b('paragraph', '作成者: ○○部 ○○ ○○'),
      b('h2', '概要'),
      b('paragraph', '本報告書の概要を記述する。'),
      b('h2', '詳細'),
      b('paragraph', '調査結果および分析内容を記述する。'),
      b('h2', '結論'),
      b('paragraph', '結論を記述する。'),
      b('h2', '今後の対応'),
      b('numbered', '対応事項1'),
      b('numbered', '対応事項2'),
    ],
  },
  {
    title: 'マニュアル',
    description: '操作・業務マニュアル',
    icon: <BookOpen className="w-5 h-5" />,
    docTitle: 'マニュアル',
    blocks: () => [
      b('h1', '○○マニュアル'),
      b('paragraph', 'バージョン: 1.0 / 最終更新: 2026年○月○日'),
      b('toc', ''),
      b('h2', '1. はじめに'),
      b('paragraph', '本マニュアルの目的と対象を記述する。'),
      b('h2', '2. 基本操作'),
      b('h3', '2.1 ログイン'),
      b('paragraph', '手順を記述する。'),
      b('h3', '2.2 ダッシュボード'),
      b('paragraph', '画面の説明を記述する。'),
      b('h2', '3. 応用操作'),
      b('paragraph', '応用的な操作手順を記述する。'),
      b('h2', '4. よくある質問'),
      b('h3', 'Q1. ○○できない場合は？'),
      b('paragraph', 'A1. ○○を確認してください。'),
    ],
  },
  {
    title: 'レター',
    description: 'ビジネスレター書式',
    icon: <Mail className="w-5 h-5" />,
    docTitle: 'レター',
    blocks: () => [
      b('paragraph', '2026年○月○日'),
      b('paragraph', '○○株式会社\n○○部 ○○様'),
      b('paragraph', '拝啓 時下ますますご清栄のこととお慶び申し上げます。'),
      b('paragraph', '平素より格別のご高配を賜り、厚く御礼申し上げます。'),
      b('paragraph', 'さて、○○の件につきまして、下記のとおりご連絡申し上げます。'),
      b('paragraph', '何卒ご検討のほど、よろしくお願い申し上げます。'),
      b('paragraph', '敬具'),
      b('divider', ''),
      b('paragraph', '○○株式会社\n○○部 ○○ ○○\nTEL: 03-0000-0000\nEmail: example@example.co.jp'),
    ],
  },
  {
    title: '白紙',
    description: '自由に書き始める',
    icon: <FileEdit className="w-5 h-5" />,
    docTitle: '',
    blocks: () => [],
  },
]

export default function WelcomeScreen({ onStartTyping, onUseTemplate, onAIGenerate }: WelcomeScreenProps) {
  function handleTemplate(tpl: TemplateCard) {
    if (tpl.blocks().length === 0) {
      onStartTyping()
    } else {
      onUseTemplate(tpl.blocks(), tpl.docTitle)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full py-12 px-4 animate-in fade-in duration-500">
      <div className="max-w-xl w-full text-center">
        {/* Greeting */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
          新しいドキュメント
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          テンプレートから始めるか、直接入力を始めましょう
        </p>

        {/* Template grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {templates.map((tpl) => (
            <button
              key={tpl.title}
              onClick={() => handleTemplate(tpl)}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-700/50 group-hover:bg-indigo-600/20 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                {tpl.icon}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                  {tpl.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* AI Generate button */}
        <button
          onClick={onAIGenerate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          <Sparkles size={16} />
          AIで生成
        </button>
      </div>
    </div>
  )
}
