'use client'

import { generateId } from '@/lib/utils'
import type { SlideElement, SlideThemeKey } from '@/types'
import {
  Briefcase,
  Users,
  ClipboardList,
  TrendingUp,
  GraduationCap,
  FileText,
} from 'lucide-react'

interface SlideWelcomeScreenProps {
  onApplyTemplate: (slides: { elements: SlideElement[]; themeKey?: SlideThemeKey }[]) => void
}

interface TemplateOption {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  themeKey: SlideThemeKey
  generate: () => { elements: SlideElement[]; themeKey?: SlideThemeKey }[]
}

function textEl(
  type: 'title' | 'subtitle' | 'body' | 'label',
  content: string,
  x: number,
  y: number,
  w: number,
  h: number,
  overrides?: Partial<import('@/types').SlideTextElement>,
): SlideElement {
  return {
    id: generateId(),
    type,
    content,
    x,
    y,
    w,
    h,
    fontSize: type === 'title' ? 36 : type === 'subtitle' ? 24 : type === 'body' ? 18 : 14,
    fontWeight: type === 'title' ? '700' : type === 'subtitle' ? '600' : '400',
    align: type === 'title' || type === 'subtitle' ? 'center' : 'left',
    color: '#ffffff',
    ...overrides,
  } as SlideElement
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'business',
    label: 'ビジネスプレゼン',
    description: 'タイトル + 箇条書き + 結論',
    icon: <Briefcase size={24} />,
    themeKey: 'dark-blue',
    generate: () => [
      {
        themeKey: 'dark-blue' as SlideThemeKey,
        elements: [
          textEl('title', 'プレゼンテーションタイトル', 5, 30, 90, 15),
          textEl('subtitle', 'サブタイトル / 日付', 5, 50, 90, 10),
        ],
      },
      {
        themeKey: 'dark-blue' as SlideThemeKey,
        elements: [
          textEl('title', 'アジェンダ', 5, 5, 90, 12),
          textEl('body', '1. 背景と課題\n2. 提案内容\n3. 期待される効果\n4. スケジュール\n5. まとめ', 5, 22, 90, 60, { fontSize: 20 }),
        ],
      },
      {
        themeKey: 'dark-blue' as SlideThemeKey,
        elements: [
          textEl('title', 'まとめ', 5, 5, 90, 12),
          textEl('body', '- 主要なポイントの振り返り\n- 次のステップ\n- ご質問・ご意見', 5, 25, 90, 50, { fontSize: 20 }),
        ],
      },
    ],
  },
  {
    id: 'team',
    label: 'チーム紹介',
    description: 'タイトル + メンバーカード',
    icon: <Users size={24} />,
    themeKey: 'emerald',
    generate: () => [
      {
        themeKey: 'emerald' as SlideThemeKey,
        elements: [
          textEl('title', 'チーム紹介', 5, 30, 90, 15),
          textEl('subtitle', '私たちのチームについて', 5, 50, 90, 10),
        ],
      },
      {
        themeKey: 'emerald' as SlideThemeKey,
        elements: [
          textEl('title', 'メンバー', 5, 3, 90, 10),
          textEl('body', '田中 太郎\nプロジェクトマネージャー', 3, 20, 28, 30, { fontSize: 16, align: 'center' as const }),
          textEl('body', '佐藤 花子\nデザイナー', 36, 20, 28, 30, { fontSize: 16, align: 'center' as const }),
          textEl('body', '鈴木 一郎\nエンジニア', 69, 20, 28, 30, { fontSize: 16, align: 'center' as const }),
        ],
      },
      {
        themeKey: 'emerald' as SlideThemeKey,
        elements: [
          textEl('title', 'チームの強み', 5, 5, 90, 12),
          textEl('body', '- 豊富な経験と専門知識\n- アジャイルな開発手法\n- 高いコミュニケーション能力', 5, 25, 90, 50, { fontSize: 20 }),
        ],
      },
    ],
  },
  {
    id: 'report',
    label: 'プロジェクト報告',
    description: 'ステータス、タイムライン、次のステップ',
    icon: <ClipboardList size={24} />,
    themeKey: 'violet-slate',
    generate: () => [
      {
        themeKey: 'violet-slate' as SlideThemeKey,
        elements: [
          textEl('title', 'プロジェクト報告', 5, 30, 90, 15),
          textEl('subtitle', '2024年度 第3四半期', 5, 50, 90, 10),
        ],
      },
      {
        themeKey: 'violet-slate' as SlideThemeKey,
        elements: [
          textEl('title', '進捗状況', 5, 5, 90, 12),
          textEl('body', '全体進捗: 75%\n\n完了タスク: 15/20\n進行中: 3\n未着手: 2', 5, 22, 90, 55, { fontSize: 20 }),
        ],
      },
      {
        themeKey: 'violet-slate' as SlideThemeKey,
        elements: [
          textEl('title', 'タイムライン', 5, 5, 90, 12),
          textEl('body', 'Q1: 要件定義・設計 (完了)\nQ2: 開発フェーズ1 (完了)\nQ3: 開発フェーズ2 (進行中)\nQ4: テスト・リリース', 5, 22, 90, 55, { fontSize: 18 }),
        ],
      },
      {
        themeKey: 'violet-slate' as SlideThemeKey,
        elements: [
          textEl('title', '次のステップ', 5, 5, 90, 12),
          textEl('body', '1. ユーザーテストの実施\n2. フィードバックの反映\n3. 最終レビュー\n4. 本番リリース準備', 5, 25, 90, 50, { fontSize: 20 }),
        ],
      },
    ],
  },
  {
    id: 'sales',
    label: 'セールスピッチ',
    description: '課題、解決策、価格',
    icon: <TrendingUp size={24} />,
    themeKey: 'rose-pink',
    generate: () => [
      {
        themeKey: 'rose-pink' as SlideThemeKey,
        elements: [
          textEl('title', '製品名', 5, 25, 90, 15),
          textEl('subtitle', 'あなたの課題を解決するソリューション', 5, 45, 90, 10),
        ],
      },
      {
        themeKey: 'rose-pink' as SlideThemeKey,
        elements: [
          textEl('title', '課題', 5, 5, 90, 12),
          textEl('body', '- 現状の問題点\n- コストの増加\n- 効率の低下\n- 競争力の喪失', 5, 22, 90, 55, { fontSize: 20 }),
        ],
      },
      {
        themeKey: 'rose-pink' as SlideThemeKey,
        elements: [
          textEl('title', '解決策', 5, 5, 90, 12),
          textEl('body', '- 主要機能1: 詳細\n- 主要機能2: 詳細\n- 主要機能3: 詳細', 5, 22, 90, 55, { fontSize: 20 }),
        ],
      },
      {
        themeKey: 'rose-pink' as SlideThemeKey,
        elements: [
          textEl('title', '価格プラン', 5, 5, 90, 12),
          textEl('body', 'スタンダード: 月額 ¥9,800\nプロ: 月額 ¥19,800\nエンタープライズ: お問い合わせ', 5, 25, 90, 50, { fontSize: 20, align: 'center' as const }),
        ],
      },
    ],
  },
  {
    id: 'education',
    label: '教育/講義',
    description: 'トピック、要点、クイズ',
    icon: <GraduationCap size={24} />,
    themeKey: 'ocean',
    generate: () => [
      {
        themeKey: 'ocean' as SlideThemeKey,
        elements: [
          textEl('title', '講義タイトル', 5, 30, 90, 15),
          textEl('subtitle', '講師名 / 日付', 5, 50, 90, 10),
        ],
      },
      {
        themeKey: 'ocean' as SlideThemeKey,
        elements: [
          textEl('title', '今日のトピック', 5, 5, 90, 12),
          textEl('body', '1. 導入\n2. 基本概念\n3. 実践例\n4. まとめ\n5. Q&A', 5, 22, 90, 55, { fontSize: 20 }),
        ],
      },
      {
        themeKey: 'ocean' as SlideThemeKey,
        elements: [
          textEl('title', '重要ポイント', 5, 5, 90, 12),
          textEl('body', '- ポイント1の説明\n- ポイント2の説明\n- ポイント3の説明', 5, 22, 90, 55, { fontSize: 20 }),
        ],
      },
      {
        themeKey: 'ocean' as SlideThemeKey,
        elements: [
          textEl('title', '理解度チェック', 5, 5, 90, 12),
          textEl('body', 'Q1: 質問内容をここに記入\n\nA) 選択肢A\nB) 選択肢B\nC) 選択肢C\nD) 選択肢D', 5, 22, 90, 55, { fontSize: 18 }),
        ],
      },
    ],
  },
  {
    id: 'blank',
    label: '白紙',
    description: 'タイトルスライドのみ',
    icon: <FileText size={24} />,
    themeKey: 'dark-blue',
    generate: () => [
      {
        themeKey: 'dark-blue' as SlideThemeKey,
        elements: [
          textEl('title', 'タイトル', 10, 35, 80, 15),
          textEl('subtitle', 'サブタイトル', 10, 55, 80, 10),
        ],
      },
    ],
  },
]

export default function SlideWelcomeScreen({ onApplyTemplate }: SlideWelcomeScreenProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            プレゼンテーションを作成
          </h2>
          <p className="text-sm text-slate-400">
            テンプレートを選択するか、白紙から始めましょう
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onApplyTemplate(tmpl.generate())}
              className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-slate-700 bg-slate-900/80 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                {tmpl.icon}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-white">{tmpl.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{tmpl.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
