'use client'

import { useState, useCallback } from 'react'
import { X, Sparkles, Loader2, ChevronDown } from 'lucide-react'
import type { SlideElement, SlideThemeKey, SlideTextElement } from '@/types'
import { SLIDE_THEMES, THEME_KEYS } from '@/lib/themes'
import { generateId } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onGenerate: (slides: { elements: SlideElement[]; themeKey?: SlideThemeKey }[]) => void
}

type StyleOption = 'business' | 'creative' | 'minimal'
type TemplateOption = 'pitch-deck' | 'presentation' | 'report'

interface GeneratedSlidePreview {
  title: string
  bullets: string[]
}

// ── Topic-based content templates ──

const TOPIC_TEMPLATES: Record<string, { titles: string[]; bullets: Record<string, string[]> }> = {
  '会社紹介': {
    titles: ['会社概要', 'ミッション・ビジョン', '事業内容・サービス', '実績・数字で見る成果', 'チーム紹介', '今後の展望', 'お問い合わせ'],
    bullets: {
      '会社概要': ['設立年・所在地・代表者', '従業員数と拠点', '主要取引先・パートナー', '企業理念'],
      'ミッション・ビジョン': ['私たちが目指す世界', '社会課題へのアプローチ', '長期的なビジョン', 'ステークホルダーへの約束'],
      '事業内容・サービス': ['コアプロダクトの紹介', 'サービスラインナップ', '他社との差別化ポイント', '導入事例'],
      '実績・数字で見る成果': ['売上高と成長率', '顧客満足度', '導入企業数', '受賞歴・認定'],
      'チーム紹介': ['経営陣プロフィール', '組織体制', '採用情報', '社内文化・働き方'],
      '今後の展望': ['中期経営計画', '新規事業の方向性', '技術投資と研究開発', 'グローバル展開'],
      'お問い合わせ': ['メールアドレス', '電話番号', '公式ウェブサイト', 'SNSアカウント'],
    },
  },
  '新製品': {
    titles: ['新製品発表', '市場背景と課題', '製品コンセプト', '主要機能・特徴', '競合比較', 'ロードマップ', '価格・プラン'],
    bullets: {
      '新製品発表': ['製品名とキャッチコピー', 'ターゲットユーザー', 'リリース予定日', '期待される効果'],
      '市場背景と課題': ['市場規模と成長トレンド', '現在のペインポイント', 'ユーザーの声', '解決すべき課題'],
      '製品コンセプト': ['開発の背景', 'コア技術', 'デザイン哲学', 'ユーザー体験の革新'],
      '主要機能・特徴': ['機能1: 直感的なインターフェース', '機能2: 高度なカスタマイズ性', '機能3: シームレスな連携', 'パフォーマンスの向上'],
      '競合比較': ['市場ポジショニング', '機能比較表', '価格競争力', '独自の強み'],
      'ロードマップ': ['フェーズ1: 基本機能リリース', 'フェーズ2: 拡張機能追加', 'フェーズ3: エンタープライズ対応', '将来のビジョン'],
      '価格・プラン': ['スタータープラン', 'プロフェッショナルプラン', 'エンタープライズプラン', '無料トライアル情報'],
    },
  },
  '事業計画': {
    titles: ['事業計画概要', '市場分析', 'ビジネスモデル', 'マーケティング戦略', '財務計画', '組織体制', 'リスクと対策'],
    bullets: {
      '事業計画概要': ['事業ドメインの定義', 'ターゲット市場', '期間と目標', '必要投資額'],
      '市場分析': ['市場規模と成長性', '競合環境', '顧客セグメント', 'SWOT分析'],
      'ビジネスモデル': ['収益モデル', 'バリューチェーン', 'コスト構造', 'パートナーシップ'],
      'マーケティング戦略': ['チャネル戦略', 'プロモーション計画', 'ブランディング', 'KPI設定'],
      '財務計画': ['売上予測', '費用計画', '損益分岐点', '資金調達計画'],
      '組織体制': ['必要人材', '組織図', '採用計画', '外部パートナー'],
      'リスクと対策': ['主要リスクの特定', 'リスク軽減策', 'コンティンジェンシープラン', 'モニタリング体制'],
    },
  },
}

const GENERIC_TEMPLATE = {
  titles: ['概要', '背景と課題', '現状分析', '提案内容', '実施計画', 'まとめ'],
  bullets: {
    '概要': ['本プレゼンテーションの目的', '対象範囲', '期待される成果', 'タイムライン'],
    '背景と課題': ['現在の状況', '直面している課題', '影響範囲', '改善の必要性'],
    '現状分析': ['データに基づく現状把握', '主要な指標', '過去との比較', '改善ポイント'],
    '提案内容': ['解決アプローチ', '具体的な施策', '必要リソース', '期待効果'],
    '実施計画': ['フェーズ分けとスケジュール', '役割分担', 'マイルストーン', '進捗管理方法'],
    'まとめ': ['本日のポイント', '次のステップ', 'アクションアイテム', 'スケジュール確認'],
  },
}

// ── Template-specific structures ──

const TEMPLATE_STRUCTURES: Record<TemplateOption, { titles: string[]; bullets: Record<string, string[]> }> = {
  'pitch-deck': {
    titles: ['タイトル', '課題', '解決策', '市場機会', 'プロダクト', 'ビジネスモデル', '競合優位性', 'トラクション', 'チーム', '財務計画', '資金調達', 'ビジョン'],
    bullets: {
      'タイトル': ['キャッチコピー', 'ターゲット顧客'],
      '課題': ['顧客が直面する最大の課題', '現在の解決策の限界', '市場のギャップ', '定量的なインパクト'],
      '解決策': ['私たちのアプローチ', 'コアバリュー', 'ユーザーベネフィット', '技術的な差別化'],
      '市場機会': ['TAM（総市場規模）', 'SAM（利用可能市場）', 'SOM（獲得可能市場）', '成長トレンド'],
      'プロダクト': ['主要機能の紹介', 'ユーザー体験フロー', 'テクノロジースタック', 'デモ・スクリーンショット'],
      'ビジネスモデル': ['収益モデル', '価格戦略', '顧客獲得チャネル', 'ユニットエコノミクス'],
      '競合優位性': ['競合マッピング', '差別化ポイント', '参入障壁', '知的財産'],
      'トラクション': ['主要KPI', 'ユーザー数推移', '売上成長率', 'パートナーシップ'],
      'チーム': ['創業メンバー紹介', '経験と専門性', 'アドバイザー', '採用計画'],
      '財務計画': ['売上予測（3年）', '費用構造', '損益分岐点', 'キャッシュフロー'],
      '資金調達': ['調達目標額', '資金使途', 'マイルストーン', '既存投資家'],
      'ビジョン': ['長期ビジョン', '社会的インパクト', 'コンタクト情報'],
    },
  },
  'presentation': {
    titles: ['タイトル', 'アジェンダ', '背景・目的', '現状分析', '提案内容', '実施スケジュール', '期待効果', '質疑応答'],
    bullets: {
      'タイトル': ['発表者名', '日付'],
      'アジェンダ': ['本日の流れ', '所要時間'],
      '背景・目的': ['プロジェクトの経緯', '解決すべき課題', '本プレゼンの目的', 'ゴール設定'],
      '現状分析': ['データに基づく現状', '課題の可視化', 'ステークホルダーの声', '改善の余地'],
      '提案内容': ['具体的な施策', '実行方法', '必要リソース', 'リスクと対策'],
      '実施スケジュール': ['フェーズ1: 準備期間', 'フェーズ2: 実行期間', 'フェーズ3: 評価期間', '重要マイルストーン'],
      '期待効果': ['定量的な効果', '定性的な効果', 'ROI予測', '成功指標'],
      '質疑応答': ['ご質問をお待ちしています', 'お問い合わせ先'],
    },
  },
  'report': {
    titles: ['報告書タイトル', 'エグゼクティブサマリー', '調査概要', 'データ分析', '主要な発見', '考察', '推奨事項', '次のステップ', '付録'],
    bullets: {
      '報告書タイトル': ['報告期間', '作成者', '部署'],
      'エグゼクティブサマリー': ['重要ポイント3つ', '結論の要約', '推奨アクション'],
      '調査概要': ['調査目的', '調査方法', '対象範囲', '期間'],
      'データ分析': ['主要データの提示', '前期比較', 'トレンド分析', '統計サマリー'],
      '主要な発見': ['発見1: 重要な傾向', '発見2: 注目すべき変化', '発見3: 予想外の結果', '追加調査が必要な領域'],
      '考察': ['データが示す意味', 'ビジネスへの影響', '外部要因の考慮', '限界と注意点'],
      '推奨事項': ['短期アクション', '中期施策', '長期戦略', '優先順位'],
      '次のステップ': ['フォローアップ項目', '担当者割り当て', '期限設定', 'レビュー日程'],
      '付録': ['詳細データ', '参考文献', '用語集'],
    },
  },
}

function matchTopic(topic: string): { titles: string[]; bullets: Record<string, string[]> } {
  const normalized = topic.toLowerCase()
  for (const [key, template] of Object.entries(TOPIC_TEMPLATES)) {
    if (normalized.includes(key.toLowerCase())) {
      return template
    }
  }
  // Check for partial keyword matches
  if (normalized.includes('会社') || normalized.includes('企業') || normalized.includes('紹介')) {
    return TOPIC_TEMPLATES['会社紹介']
  }
  if (normalized.includes('製品') || normalized.includes('プロダクト') || normalized.includes('リリース') || normalized.includes('発表')) {
    return TOPIC_TEMPLATES['新製品']
  }
  if (normalized.includes('事業') || normalized.includes('計画') || normalized.includes('ビジネス') || normalized.includes('戦略')) {
    return TOPIC_TEMPLATES['事業計画']
  }
  return GENERIC_TEMPLATE
}

function makeTextElement(
  overrides: Partial<SlideTextElement> & Pick<SlideTextElement, 'type' | 'content' | 'x' | 'y' | 'w' | 'h' | 'fontSize' | 'fontWeight' | 'align'>
): SlideTextElement {
  return {
    id: generateId(),
    ...overrides,
  } as SlideTextElement
}

function generateSlides(
  topic: string,
  slideCount: number,
  style: StyleOption,
  themeKey: SlideThemeKey,
  templateType?: TemplateOption,
): { preview: GeneratedSlidePreview[]; slides: { elements: SlideElement[]; themeKey: SlideThemeKey }[] } {
  const template = templateType ? TEMPLATE_STRUCTURES[templateType] : matchTopic(topic)
  const theme = SLIDE_THEMES[themeKey]

  // Style-based font sizes
  const titleSize = style === 'minimal' ? 28 : style === 'creative' ? 36 : 32
  const bodySize = style === 'minimal' ? 16 : style === 'creative' ? 20 : 18
  const subtitleSize = style === 'minimal' ? 18 : style === 'creative' ? 22 : 20

  // Build the slide sequence
  const preview: GeneratedSlidePreview[] = []
  const slides: { elements: SlideElement[]; themeKey: SlideThemeKey }[] = []

  // 1. Title slide
  preview.push({ title: topic, bullets: ['プレゼンテーション'] })
  slides.push({
    themeKey,
    elements: [
      makeTextElement({
        type: 'title',
        content: topic,
        x: 10, y: 30, w: 80, h: 15,
        fontSize: style === 'creative' ? 42 : 38,
        fontWeight: '700',
        align: 'center',
        color: theme.titleColor,
      }),
      makeTextElement({
        type: 'subtitle',
        content: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }),
        x: 10, y: 50, w: 80, h: 8,
        fontSize: subtitleSize,
        fontWeight: '400',
        align: 'center',
        color: theme.bodyColor,
      }),
    ],
  })

  // 2. Agenda slide
  const contentCount = Math.max(1, slideCount - 3) // minus title, agenda, and thank-you (capped by available titles)
  const availableTitles = template.titles.slice(0, contentCount)
  const agendaBullets = availableTitles.map((t, i) => `${i + 1}. ${t}`)
  preview.push({ title: 'アジェンダ', bullets: agendaBullets })
  slides.push({
    themeKey,
    elements: [
      makeTextElement({
        type: 'title',
        content: 'アジェンダ',
        x: 5, y: 5, w: 90, h: 12,
        fontSize: titleSize,
        fontWeight: '700',
        align: 'left',
        color: theme.titleColor,
      }),
      ...agendaBullets.map((bullet, i) =>
        makeTextElement({
          type: 'body',
          content: bullet,
          x: 8, y: 22 + i * 9, w: 84, h: 7,
          fontSize: bodySize,
          fontWeight: '400',
          align: 'left',
          color: theme.bodyColor,
        })
      ),
    ],
  })

  // 3. Content slides
  for (let i = 0; i < contentCount; i++) {
    const title = i < availableTitles.length ? availableTitles[i] : `${topic} - 補足 ${i - availableTitles.length + 1}`
    const bullets = template.bullets[title] || [
      `${topic}に関するポイント1`,
      `${topic}に関するポイント2`,
      `${topic}に関するポイント3`,
      '詳細は次のスライドを参照',
    ]
    const usedBullets = bullets.slice(0, style === 'minimal' ? 3 : 4)
    preview.push({ title, bullets: usedBullets })
    slides.push({
      themeKey,
      elements: [
        makeTextElement({
          type: 'title',
          content: title,
          x: 5, y: 5, w: 90, h: 12,
          fontSize: titleSize,
          fontWeight: '700',
          align: 'left',
          color: theme.titleColor,
        }),
        ...usedBullets.map((bullet, bi) =>
          makeTextElement({
            type: 'body',
            content: `• ${bullet}`,
            x: 8, y: 24 + bi * 12, w: 84, h: 9,
            fontSize: bodySize,
            fontWeight: '400',
            align: 'left',
            color: theme.bodyColor,
            bulletType: 'disc',
          })
        ),
      ],
    })
  }

  // 4. Summary slide
  preview.push({ title: 'まとめ', bullets: ['本日のポイント', '次のアクション', 'ご質問・ご相談'] })
  slides.push({
    themeKey,
    elements: [
      makeTextElement({
        type: 'title',
        content: 'まとめ',
        x: 5, y: 5, w: 90, h: 12,
        fontSize: titleSize,
        fontWeight: '700',
        align: 'left',
        color: theme.titleColor,
      }),
      makeTextElement({
        type: 'body',
        content: '• 本日のポイント',
        x: 8, y: 24, w: 84, h: 9,
        fontSize: bodySize,
        fontWeight: '400',
        align: 'left',
        color: theme.bodyColor,
      }),
      makeTextElement({
        type: 'body',
        content: '• 次のアクション',
        x: 8, y: 36, w: 84, h: 9,
        fontSize: bodySize,
        fontWeight: '400',
        align: 'left',
        color: theme.bodyColor,
      }),
      makeTextElement({
        type: 'body',
        content: '• ご質問・ご相談',
        x: 8, y: 48, w: 84, h: 9,
        fontSize: bodySize,
        fontWeight: '400',
        align: 'left',
        color: theme.bodyColor,
      }),
    ],
  })

  // 5. Thank you / Q&A slide
  preview.push({ title: 'ご清聴ありがとうございました', bullets: ['Q&A'] })
  slides.push({
    themeKey,
    elements: [
      makeTextElement({
        type: 'title',
        content: 'ご清聴ありがとうございました',
        x: 10, y: 30, w: 80, h: 15,
        fontSize: style === 'creative' ? 38 : 34,
        fontWeight: '700',
        align: 'center',
        color: theme.titleColor,
      }),
      makeTextElement({
        type: 'subtitle',
        content: 'ご質問はございますか？',
        x: 10, y: 50, w: 80, h: 8,
        fontSize: subtitleSize,
        fontWeight: '400',
        align: 'center',
        color: theme.bodyColor,
      }),
    ],
  })

  // Trim to requested slide count
  return {
    preview: preview.slice(0, slideCount),
    slides: slides.slice(0, slideCount),
  }
}

const STYLE_OPTIONS: { value: StyleOption; label: string }[] = [
  { value: 'business', label: 'ビジネス' },
  { value: 'creative', label: 'クリエイティブ' },
  { value: 'minimal', label: 'ミニマル' },
]

export default function AiSlideGenerator({ open, onClose, onGenerate }: Props) {
  const [topic, setTopic] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [style, setStyle] = useState<StyleOption>('business')
  const [templateType, setTemplateType] = useState<TemplateOption>('presentation')
  const [themeKey, setThemeKey] = useState<SlideThemeKey>('dark-blue')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<GeneratedSlidePreview[] | null>(null)
  const [generatedSlides, setGeneratedSlides] = useState<{ elements: SlideElement[]; themeKey?: SlideThemeKey }[] | null>(null)

  const handleGenerate = useCallback(() => {
    if (!topic.trim()) return
    setLoading(true)
    setPreview(null)
    setGeneratedSlides(null)

    // Simulate brief processing delay
    setTimeout(() => {
      const result = generateSlides(topic.trim(), slideCount, style, themeKey, templateType)
      setPreview(result.preview)
      setGeneratedSlides(result.slides)
      setLoading(false)
    }, 800)
  }, [topic, slideCount, style, themeKey, templateType])

  const handleConfirm = useCallback(() => {
    if (generatedSlides) {
      onGenerate(generatedSlides)
      // Reset state
      setTopic('')
      setPreview(null)
      setGeneratedSlides(null)
      onClose()
    }
  }, [generatedSlides, onGenerate, onClose])

  const handleClose = useCallback(() => {
    setPreview(null)
    setGeneratedSlides(null)
    setLoading(false)
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white">AIスライド生成</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Topic input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              トピック / プロンプト
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例: 会社紹介プレゼンテーション"
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Slide count */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              スライド数
            </label>
            <div className="relative">
              <select
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-full appearance-none px-3 py-2 pr-8 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={5}>5枚</option>
                <option value={8}>8枚</option>
                <option value={10}>10枚</option>
                <option value={15}>15枚</option>
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              テンプレート
            </label>
            <div className="relative">
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as TemplateOption)}
                className="w-full appearance-none px-3 py-2 pr-8 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="pitch-deck">ピッチデック</option>
                <option value="presentation">プレゼン</option>
                <option value="report">報告書</option>
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Style selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              スタイル
            </label>
            <div className="flex gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStyle(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    style === opt.value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              テーマ
            </label>
            <div className="relative">
              <select
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value as SlideThemeKey)}
                className="w-full appearance-none px-3 py-2 pr-8 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                {THEME_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {SLIDE_THEMES[key].label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                生成
              </>
            )}
          </button>

          {/* Preview of generated slide titles */}
          {preview && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">プレビュー</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {preview.map((slide, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/50"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded bg-indigo-600/30 text-indigo-400 text-xs font-mono flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{slide.title}</p>
                      {slide.bullets.length > 0 && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {slide.bullets.slice(0, 2).join(' / ')}
                          {slide.bullets.length > 2 && ' ...'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
              >
                スライドを追加
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
