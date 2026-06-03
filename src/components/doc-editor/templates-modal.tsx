'use client'

import { useState } from 'react'
import { X, FileText, Users, ClipboardList, Mail, BookOpen, Presentation } from 'lucide-react'
import type { Block, BlockType } from '@/types'
import { generateId } from '@/lib/utils'

interface TemplatesModalProps {
  onApply: (blocks: Block[], title?: string) => void
  onClose: () => void
}

function b(type: BlockType, content: string): Block {
  return { id: generateId(), type, content }
}

interface TemplateDefinition {
  title: string
  description: string
  icon: React.ReactNode
  blocks: () => Block[]
}

const templates: TemplateDefinition[] = [
  {
    title: '議事録',
    description: '会議の記録を整理するテンプレート',
    icon: <Users className="w-6 h-6" />,
    blocks: () => [
      b('h1', '議事録'),
      b('paragraph', '日時: 2026年○月○日（○）00:00〜00:00'),
      b('paragraph', '場所: 会議室A / オンライン'),
      b('h2', '出席者'),
      b('bullet', '山田太郎（議長）'),
      b('bullet', '佐藤花子'),
      b('bullet', '鈴木一郎'),
      b('h2', '議題'),
      b('numbered', '第1四半期の進捗報告'),
      b('numbered', '次期プロジェクト計画の検討'),
      b('h2', '討議内容'),
      b('paragraph', '各議題について以下のとおり討議を行った。'),
      b('h3', '1. 第1四半期の進捗報告'),
      b('paragraph', '進捗は予定どおり。特記事項なし。'),
      b('h2', 'アクションアイテム'),
      b('checklist', '山田: 報告書の最終版を作成する（期限: ○月○日）'),
      b('checklist', '佐藤: クライアントへ連絡する'),
      b('h2', '次回会議'),
      b('paragraph', '日時: ○月○日（○）00:00〜 場所: 未定'),
    ],
  },
  {
    title: '報告書',
    description: 'ビジネス報告書の標準フォーマット',
    icon: <FileText className="w-6 h-6" />,
    blocks: () => [
      b('h1', '報告書'),
      b('paragraph', '作成日: 2026年○月○日'),
      b('paragraph', '作成者: ○○部 ○○ ○○'),
      b('h2', '概要'),
      b('paragraph', '本報告書は、○○プロジェクトの現状と今後の方針についてまとめたものである。'),
      b('h2', '背景'),
      b('paragraph', '当プロジェクトは2025年度より開始し、現在フェーズ2の段階にある。'),
      b('h2', '詳細'),
      b('paragraph', '調査結果および分析内容を以下に記す。'),
      b('bullet', '売上は前年比115%で推移'),
      b('bullet', '顧客満足度は4.2/5.0を維持'),
      b('h2', '結論'),
      b('paragraph', '現時点での進捗は良好であり、計画どおりの達成が見込まれる。'),
      b('h2', '提言'),
      b('numbered', '追加リソースの確保を検討すること'),
      b('numbered', '月次レビューの頻度を増やすこと'),
    ],
  },
  {
    title: 'レター',
    description: 'ビジネスレターの書式',
    icon: <Mail className="w-6 h-6" />,
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
    title: '企画書',
    description: 'プロジェクト企画・提案書',
    icon: <Presentation className="w-6 h-6" />,
    blocks: () => [
      b('h1', '企画書: ○○プロジェクト'),
      b('paragraph', '提出日: 2026年○月○日'),
      b('h2', 'エグゼクティブサマリー'),
      b('paragraph', '本企画は、○○市場における新サービスの立ち上げを提案するものである。'),
      b('h2', '目的・目標'),
      b('numbered', '新規顧客層の開拓'),
      b('numbered', '売上20%増加の達成'),
      b('numbered', 'ブランド認知度の向上'),
      b('h2', '実施計画'),
      b('h3', 'フェーズ1: 調査・準備（1〜2ヶ月目）'),
      b('paragraph', '市場調査を実施し、ターゲット層を明確化する。'),
      b('h3', 'フェーズ2: 開発・構築（3〜5ヶ月目）'),
      b('paragraph', 'プロトタイプの開発およびテストを行う。'),
      b('h2', '予算'),
      b('paragraph', '総予算: ○○万円（内訳は別紙参照）'),
      b('h2', 'スケジュール'),
      b('paragraph', '開始: 2026年○月 / 完了予定: 2027年○月'),
      b('h2', '結論'),
      b('paragraph', '本企画により、持続的な成長基盤を構築できると考える。'),
    ],
  },
  {
    title: 'マニュアル',
    description: '操作・業務マニュアルの雛形',
    icon: <BookOpen className="w-6 h-6" />,
    blocks: () => [
      b('h1', '○○マニュアル'),
      b('paragraph', 'バージョン: 1.0 / 最終更新: 2026年○月○日'),
      b('toc', ''),
      b('h2', '1. はじめに'),
      b('paragraph', '本マニュアルは、○○システムの操作手順を説明するものです。'),
      b('h2', '2. 基本操作'),
      b('h3', '2.1 ログイン'),
      b('paragraph', 'ブラウザで管理画面URLにアクセスし、ID・パスワードを入力してください。'),
      b('h3', '2.2 ダッシュボード'),
      b('paragraph', 'ログイン後、ダッシュボードが表示されます。各メニューから機能を選択してください。'),
      b('h2', '3. 応用操作'),
      b('h3', '3.1 データのエクスポート'),
      b('paragraph', '「設定」メニューから「エクスポート」を選択し、形式を指定して実行します。'),
      b('h2', '4. トラブルシューティング'),
      b('paragraph', '問題が発生した場合は、以下の手順を確認してください。'),
      b('bullet', 'ブラウザのキャッシュをクリアする'),
      b('bullet', 'ネットワーク接続を確認する'),
      b('bullet', 'サポート窓口へ問い合わせる'),
    ],
  },
  {
    title: 'チェックリスト',
    description: 'タスク管理用チェックリスト',
    icon: <ClipboardList className="w-6 h-6" />,
    blocks: () => [
      b('h1', '○○チェックリスト'),
      b('h2', '事前準備'),
      b('checklist', '必要資料の準備'),
      b('checklist', '関係者への事前連絡'),
      b('checklist', '会場・設備の確認'),
      b('checklist', 'スケジュールの最終確認'),
      b('h2', '当日対応'),
      b('checklist', '受付の設営'),
      b('checklist', '配布資料の設置'),
      b('checklist', '機材テストの実施'),
      b('checklist', '参加者リストの確認'),
      b('h2', '事後対応'),
      b('checklist', '議事録の作成・共有'),
      b('checklist', 'フォローアップメールの送信'),
      b('checklist', '備品の返却・片付け'),
      b('checklist', '振り返りミーティングの設定'),
    ],
  },
]

export default function TemplatesModal({ onApply, onClose }: TemplatesModalProps) {
  const [preview, setPreview] = useState<number | null>(null)

  const handleApply = (tpl: TemplateDefinition) => {
    onApply(tpl.blocks(), tpl.title)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">テンプレートを選択</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((tpl, idx) => {
              const isOpen = preview === idx
              return (
                <div
                  key={tpl.title}
                  className="border border-slate-700 rounded-lg bg-slate-800/60 hover:border-slate-500 transition-colors flex flex-col"
                >
                  <button
                    onClick={() => setPreview(isOpen ? null : idx)}
                    className="flex items-start gap-3 p-4 text-left w-full"
                  >
                    <div className="p-2 rounded-lg bg-slate-700/50 text-blue-400 shrink-0">
                      {tpl.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100">{tpl.title}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{tpl.description}</p>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3 border-t border-slate-700/60 pt-3">
                      <p className="text-xs text-slate-500 mb-2">プレビュー</p>
                      <div className="space-y-1 text-xs text-slate-300 max-h-32 overflow-y-auto">
                        {tpl.blocks().slice(0, 6).map((block) => (
                          <div key={block.id} className="truncate">
                            <span className="text-slate-500 mr-1.5">
                              {block.type === 'h1' ? 'H1' : block.type === 'h2' ? 'H2' : block.type === 'h3' ? 'H3' : block.type === 'bullet' ? '•' : block.type === 'numbered' ? '#' : block.type === 'checklist' ? '☐' : '¶'}
                            </span>
                            {block.content || `[${block.type}]`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="px-4 pb-3 mt-auto">
                    <button
                      onClick={() => handleApply(tpl)}
                      className="w-full py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                    >
                      使用
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
