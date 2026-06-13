import type { SlideThemeKey } from '@/types'
import { buildAuditReport } from './content-audit'

export interface AISkill {
  id: string
  name: string
  icon: string
  description: string
  type: 'slides' | 'doc' | 'both'
}

// --- コンテンツ解析ユーティリティ ---

/** 入力が長文コンテンツかトピック名かを判定 */
export function isContentInput(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  return lines.length >= 3 || text.length >= 80
}

/** テキストを行単位で分割し空行を除去 */
function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/** 行をN個のバケットに均等分配 */
function distributeLines(lines: string[], buckets: number): string[][] {
  const result: string[][] = Array.from({ length: buckets }, () => [])
  lines.forEach((line, i) => {
    result[i % buckets].push(line)
  })
  return result
}

/** 最初の行またはテキストの先頭30文字をタイトルとして抽出 */
function extractTitle(text: string): string {
  const first = text.split('\n').find((l) => l.trim().length > 0) ?? ''
  return first.length > 30 ? first.slice(0, 30) + '...' : first
}

/** コンテンツからドキュメントタイトルを取得（外部向け） */
export function extractDocTitle(text: string): string {
  if (isContentInput(text)) {
    return extractTitle(text)
  }
  return text
}

export interface SlideSkillResult {
  title: string
  bullets: string[]
  themeKey: SlideThemeKey
}

export interface DocSkillResult {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export const AI_SKILLS: AISkill[] = [
  { id: 'free', name: '自由入力', icon: 'pen', description: 'テーマを自由に入力して生成', type: 'both' },
  { id: 'pitch', name: '投資家ピッチ', icon: 'rocket', description: 'スタートアップの資金調達向け', type: 'both' },
  { id: 'report', name: '事業報告', icon: 'barChart', description: '四半期・月次の業績報告', type: 'both' },
  { id: 'product', name: '製品紹介', icon: 'target', description: '新製品・サービスのローンチ', type: 'both' },
  { id: 'education', name: '教育・研修', icon: 'bookOpen', description: '社内研修・セミナー・授業', type: 'both' },
  { id: 'marketing', name: 'マーケ戦略', icon: 'trendingUp', description: 'マーケティング計画・戦略', type: 'both' },
  {
    id: 'snspost',
    name: 'キャリアSNS投稿',
    icon: 'megaphone',
    description: '転職・キャリア系SNS投稿の構成と企画書',
    type: 'both',
  },
  {
    id: 'linemsg',
    name: 'LINE配信設計',
    icon: 'mail',
    description: '公式LINEのあいさつ文・ステップ配信の設計書',
    type: 'both',
  },
  {
    id: 'coaching',
    name: 'キャリア面談シート',
    icon: 'users',
    description: '1on1キャリア面談の準備・記録シート',
    type: 'doc',
  },
  {
    id: 'audit',
    name: '公開前チェック',
    icon: 'shield',
    description: '文面を貼り付けると景表法・導線リスクを自動監査',
    type: 'doc',
  },
  {
    id: 'lp-craft',
    name: 'LP制作',
    icon: 'layout',
    description: 'LP構成・コピーライティング・デザイン指示を一気通貫で生成',
    type: 'both',
  },
  {
    id: 'market-strategy',
    name: 'マーケ戦略設計',
    icon: 'pieChart',
    description: '3C/SWOT/STP/ペルソナ/カスタマージャーニーの分析レポート',
    type: 'doc',
  },
  {
    id: 'ad-copy',
    name: '広告コピー',
    icon: 'zap',
    description: 'Meta広告・Google広告向けA/Bコピーを複数バリエーション生成',
    type: 'doc',
  },
  {
    id: 'biz-proposal',
    name: '提案書',
    icon: 'fileText',
    description: 'クライアント向け業務提案書・事業計画書・パートナー提案',
    type: 'both',
  },
  { id: 'meeting', name: '会議議事録', icon: 'notebookPen', description: '会議の記録・決定事項まとめ', type: 'doc' },
  { id: 'techspec', name: '技術仕様書', icon: 'cog', description: '技術設計・API仕様・要件定義', type: 'doc' },
]

export function getSlideSkills(): AISkill[] {
  return AI_SKILLS.filter((s) => s.type === 'slides' || s.type === 'both')
}

export function getDocSkills(): AISkill[] {
  return AI_SKILLS.filter((s) => s.type === 'doc' || s.type === 'both')
}

const THEMES: SlideThemeKey[] = ['dark-blue', 'violet-slate', 'dark-blue', 'ocean', 'dark-blue', 'midnight']

export function buildSkillSlides(skillId: string, topic: string): SlideSkillResult[] {
  const t = topic || 'プレゼンテーション'

  const templates: Record<string, SlideSkillResult[]> = {
    free: [
      { title: t, bullets: ['概要・背景', '課題の定義', 'アプローチ', '期待される成果'], themeKey: 'dark-blue' },
      {
        title: '背景と課題',
        bullets: ['現状の市場環境を理解する', '主要な課題点と機会の特定', 'ステークホルダーへの影響'],
        themeKey: 'violet-slate',
      },
      {
        title: '提案するソリューション',
        bullets: ['核となるアプローチの説明', '技術・戦略的な優位性', '実装のロードマップ', '差別化ポイント'],
        themeKey: 'dark-blue',
      },
      {
        title: '期待される成果',
        bullets: ['定量的な目標 KPI', 'タイムライン（フェーズ別）', 'リソースと投資計画'],
        themeKey: 'ocean',
      },
      {
        title: '実行計画',
        bullets: ['フェーズ 1: 準備・調査', 'フェーズ 2: 実装・開発', 'フェーズ 3: 展開・最適化'],
        themeKey: 'dark-blue',
      },
      { title: 'まとめ', bullets: ['本提案のポイント', '意思決定に必要な情報', 'Q&A'], themeKey: 'midnight' },
    ],
    pitch: [
      { title: t, bullets: ['会社概要', 'ビジョンとミッション', '創業ストーリー'], themeKey: 'dark-blue' },
      {
        title: '解決する課題',
        bullets: ['ターゲット市場の課題', '既存ソリューションの限界', '市場規模（TAM/SAM/SOM）'],
        themeKey: 'rose-pink',
      },
      {
        title: 'プロダクト',
        bullets: ['ソリューションの概要', 'コア機能とUVP', 'デモ・スクリーンショット', '技術的優位性'],
        themeKey: 'violet-slate',
      },
      {
        title: 'トラクション',
        bullets: ['主要KPI（MRR, ユーザー数, 成長率）', '導入事例・顧客の声', '提携・パートナーシップ'],
        themeKey: 'emerald',
      },
      {
        title: 'ビジネスモデル',
        bullets: ['収益モデル（SaaS/マーケットプレイス等）', 'ユニットエコノミクス', '成長戦略とスケーラビリティ'],
        themeKey: 'ocean',
      },
      {
        title: 'チームと調達',
        bullets: ['経営チーム紹介', '調達希望額と使途', 'マイルストーンと出口戦略'],
        themeKey: 'midnight',
      },
    ],
    report: [
      {
        title: `${t} — 事業報告`,
        bullets: ['報告期間', '主要ハイライト', 'エグゼクティブサマリー'],
        themeKey: 'dark-blue',
      },
      {
        title: '業績サマリー',
        bullets: ['売上高: ¥XX億（前年比 +XX%）', '営業利益率: XX%', '新規顧客獲得数: XXX社'],
        themeKey: 'emerald',
      },
      {
        title: '主要KPI達成状況',
        bullets: ['KPI 1: 目標 vs 実績', 'KPI 2: 目標 vs 実績', 'KPI 3: 目標 vs 実績', '総合達成率: XX%'],
        themeKey: 'ocean',
      },
      {
        title: '成果とハイライト',
        bullets: ['新規プロダクトのローンチ', '大型案件の受注', 'チーム拡大・組織改編'],
        themeKey: 'violet-slate',
      },
      {
        title: '課題と対策',
        bullets: ['課題 1: 内容と対策', '課題 2: 内容と対策', 'リスク要因の分析'],
        themeKey: 'amber',
      },
      { title: '次期の計画', bullets: ['重点施策 3つ', '投資計画', '目標数値'], themeKey: 'midnight' },
    ],
    product: [
      {
        title: `${t} — 製品紹介`,
        bullets: ['製品のビジョン', 'ターゲットユーザー', '発売スケジュール'],
        themeKey: 'violet-slate',
      },
      {
        title: 'ユーザーの課題',
        bullets: ['現在のペインポイント', '既存ソリューションの不満点', '未解決のニーズ'],
        themeKey: 'dark-blue',
      },
      {
        title: '製品の特長',
        bullets: ['特長 1: 差別化ポイント', '特長 2: 技術的革新', '特長 3: ユーザー体験', '競合比較'],
        themeKey: 'emerald',
      },
      {
        title: 'デモ / 画面イメージ',
        bullets: ['メイン画面の説明', 'ユーザーフローの紹介', '操作の簡便さ'],
        themeKey: 'ocean',
      },
      {
        title: '料金プラン',
        bullets: ['Free: 基本機能', 'Pro: ¥X,XXX/月', 'Enterprise: カスタム', '導入特典'],
        themeKey: 'amber',
      },
      {
        title: '次のステップ',
        bullets: ['ベータ版登録はこちら', 'お問い合わせ先', 'SNSフォローのお願い'],
        themeKey: 'midnight',
      },
    ],
    education: [
      { title: `${t} — 研修資料`, bullets: ['研修の目的', '対象者', '所要時間'], themeKey: 'dark-blue' },
      {
        title: '学習目標',
        bullets: ['目標 1: 知識の習得', '目標 2: スキルの実践', '目標 3: 応用力の向上'],
        themeKey: 'violet-slate',
      },
      { title: '基礎知識', bullets: ['重要な概念の説明', '用語の定義', '背景情報と文脈'], themeKey: 'emerald' },
      {
        title: '実践ワーク',
        bullets: ['ケーススタディ', 'グループディスカッション', 'ハンズオン演習'],
        themeKey: 'ocean',
      },
      { title: '応用・発展', bullets: ['現場での活用方法', '失敗例と成功例', 'ベストプラクティス'], themeKey: 'amber' },
      {
        title: 'まとめと評価',
        bullets: ['学んだポイントの振り返り', '理解度チェック', '参考資料・次のステップ'],
        themeKey: 'midnight',
      },
    ],
    snspost: [
      {
        title: t,
        bullets: ['ターゲットの悩みを一言で（表紙フック）', '「保存して見返したくなる」価値の提示', '続きを読みたくなる問いかけ'],
        themeKey: 'dark-blue',
      },
      {
        title: 'あるある・共感',
        bullets: ['「転職したいけど何から？」の悩みに寄り添う', 'あるあるシーンの具体例', '読者の現状をことばにして言語化'],
        themeKey: 'rose-pink',
      },
      {
        title: '原因・ヒント',
        bullets: ['悩みの原因をシンプルに解説', '知っておきたい前提知識・統計', 'よくある誤解の訂正'],
        themeKey: 'violet-slate',
      },
      {
        title: 'ノウハウ・ステップ',
        bullets: ['Step 1: [最初の一歩]', 'Step 2: [具体的な行動]', 'Step 3: [継続のコツ]', 'つまずきやすいポイント'],
        themeKey: 'emerald',
      },
      {
        title: '具体例・変化のイメージ',
        bullets: ['未経験・他業界からのキャリアチェンジ例', '年収・働き方の変化は「目安・可能性」の表現で', 'ビフォー → アフターの対比'],
        themeKey: 'ocean',
      },
      {
        title: '次の一歩（CTA）',
        bullets: ['無料市場価値診断への誘導（プロフィールリンク）', '完全無料・勧誘なしを明記', '保存・フォローのお願い'],
        themeKey: 'midnight',
      },
    ],
    linemsg: [
      {
        title: `${t} — LINE配信設計`,
        bullets: [
          '対象範囲: あいさつ文 / ステップ配信 / リッチメニュー',
          '狙い: 登録者を最初のCV（無料市場価値診断）へ',
          '合否基準: 登録動機と一致・CTAは1つ・スマホで一瞬で読める',
        ],
        themeKey: 'dark-blue',
      },
      {
        title: '現状の課題',
        bullets: [
          '登録動機とのズレ（診断が欲しい人に面談予約を打診）',
          '最初のCTAが重い（登録直後の温度では面談はハードルが高い）',
          '導線設計（Day 0〜7）との不一致',
        ],
        themeKey: 'rose-pink',
      },
      {
        title: '改善の考え方',
        bullets: [
          '診断ファースト: 約束した診断をすぐ渡して信頼をつくる',
          '二段構えCTA: 主=市場価値診断 / 副=面談予約を1行だけ',
          '数字で判断: 面談直push 約5% vs 診断経由 15〜25%',
        ],
        themeKey: 'violet-slate',
      },
      {
        title: '文面案',
        bullets: [
          'A案: 診断ファースト（導線設計と完全一致・推奨）',
          'A案・ターゲット最適化版: 年収軸・職歴不問を前面に',
          'B案: メニュー誘導型（診断URLが無い場合の暫定案）',
          '冒頭は {Nickname} さん差し込みで親しみを出す',
        ],
        themeKey: 'emerald',
      },
      {
        title: 'ステップ配信の流れ',
        bullets: [
          'Day 0: ウェルカム + 3問アンケート（約1分）',
          'Day 1: あなた専用の診断コメントをお届け',
          'Day 2〜4: お役立ち情報・事例で信頼を育てる',
          'Day 5〜7: 無料面談のご案内',
        ],
        themeKey: 'ocean',
      },
      {
        title: '注意点と確認事項',
        bullets: [
          '年収は断定せず「目安・可能性」の表現に（景表法）',
          '実績訴求は事実・実例がある場合のみ',
          'あいさつ文は全角500文字以内・分割は最大5通まで',
          '絵文字の使用方針・診断URLの有無を確定',
        ],
        themeKey: 'midnight',
      },
    ],
    marketing: [
      { title: `${t} — マーケティング戦略`, bullets: ['戦略の目的', '対象期間', '担当チーム'], themeKey: 'dark-blue' },
      {
        title: '市場分析',
        bullets: ['市場規模と成長率', '競合ポジショニング', 'SWOT分析', 'トレンド'],
        themeKey: 'violet-slate',
      },
      { title: 'ターゲット', bullets: ['ペルソナ定義', 'セグメンテーション', '購買行動の分析'], themeKey: 'emerald' },
      {
        title: 'チャネル戦略',
        bullets: [
          'デジタル広告（Google/Meta）',
          'SNSマーケティング',
          'コンテンツマーケティング',
          'メールマーケティング',
        ],
        themeKey: 'ocean',
      },
      {
        title: '予算と KPI',
        bullets: ['総予算: ¥XX万', 'チャネル別配分', '目標 CPA / ROAS', '月次KPI設定'],
        themeKey: 'amber',
      },
      {
        title: '実行ロードマップ',
        bullets: ['Month 1: 準備・設計', 'Month 2-3: 実行・テスト', 'Month 4+: 最適化', '効果測定方法'],
        themeKey: 'midnight',
      },
    ],
    'lp-craft': [
      {
        title: `${t} — LP設計書`,
        bullets: ['目的: 無料体験セッション / セミナー / 継続契約の獲得', 'ターゲット: [ペルソナ]', 'ゴール（KPI）: [CTA到達率・申込数]'],
        themeKey: 'dark-blue',
      },
      {
        title: 'ファーストビュー設計',
        bullets: ['キャッチコピー（課題＋ベネフィット）', 'サブコピー（Who・How・Why Now）', 'CTA ボタン（行動を1つに絞る）', '視覚: ヒーロー画像 / 人物写真の有無'],
        themeKey: 'violet-slate',
      },
      {
        title: '課題・共感セクション（P→A）',
        bullets: ['Problem: ターゲットの痛みを言語化', 'Agitation: 放置するとどうなるか', '「あるある」で共感を生む具体例', '読者の声を想定した表現'],
        themeKey: 'rose-pink',
      },
      {
        title: '解決策・ベネフィット（S→O）',
        bullets: ['Solution: このサービスで何が変わるか', 'Offer: 無料 / リスクなし / ハードルを下げる', '特徴ではなくベネフィットで語る', '成果は「目指す・可能性」の表現で（景表法）'],
        themeKey: 'emerald',
      },
      {
        title: '信頼・実績・料金（N→A）',
        bullets: ['Narrowing: 「こんな方に向いています」', '資格・実績・お客様の声', '料金プランと最低契約期間', 'FAQ（よくある不安を先に解消）'],
        themeKey: 'ocean',
      },
      {
        title: '最終CTA・デザイン注意点',
        bullets: ['CTA は最低3箇所（FV・中盤・末尾）', 'ボタンは「今すぐ無料で予約する」など動詞+ベネフィット', '禁止配色: cream+terracotta / acid-green / purple gradient', '情報商材っぽいデザイン・煽り表現を避ける'],
        themeKey: 'midnight',
      },
    ],
    'biz-proposal': [
      {
        title: `${t} — 業務提案書`,
        bullets: ['提案者: [名前]（可能性ラボ / 国家資格キャリアコンサルタント）', '提案先: [会社名] 様', '提案日: [日付]'],
        themeKey: 'dark-blue',
      },
      {
        title: '現状と課題の整理',
        bullets: ['現状: [確認できた事実・ヒアリング内容]', '課題: [できていないこと・不足していること]', '機会: [今が強化のタイミングである理由]'],
        themeKey: 'violet-slate',
      },
      {
        title: '提案の概要',
        bullets: ['一言: [強み]を通じて[ゴール]を実現するSNS運用サポート', 'ターゲット: [誰への認知拡大か]', 'ゴール: LP誘導 / 問合せ獲得 / 採用強化'],
        themeKey: 'emerald',
      },
      {
        title: '提供内容・期待できる効果',
        bullets: ['投稿企画・制作: 週〇本', 'ハッシュタグ設計・公開前チェック', '月次レポート（リーチ・保存・CTA）', '効果は「目指す」で表現（断定・保証は景表法違反）'],
        themeKey: 'ocean',
      },
      {
        title: '実績・信頼情報・料金',
        bullets: ['運用経験: 〇件（〇業種）', '保有資格: 国家資格キャリアコンサルタント', 'ライトプラン: 週2投稿・月次レポート', 'スタンダード: 週4投稿・戦略提案・月次レポート'],
        themeKey: 'amber',
      },
      {
        title: '次のステップ',
        bullets: ['まずは30分のオンライン説明会', '→ [連絡先 / 予約フォームURL]', '最低契約期間: 3ヶ月', 'ご不明点はお気軽にご連絡ください'],
        themeKey: 'midnight',
      },
    ],
  }

  const result = templates[skillId] ?? templates['free']
  return result.map((s, i) => ({ ...s, themeKey: THEMES[i % THEMES.length] }))
}

export function buildSkillDocSections(skillId: string, topic: string): DocSkillResult[] {
  const t = topic || 'ドキュメント'

  const templates: Record<string, DocSkillResult[]> = {
    free: [
      { heading: '概要', paragraphs: [`${t}についての概要です。`] },
      {
        heading: '背景と目的',
        paragraphs: ['現状の課題と取り組む理由を説明します。'],
        bullets: ['課題 1: 問題点の特定', '課題 2: 優先事項の明確化', '目的: 成果目標の設定'],
      },
      {
        heading: '主要な内容',
        paragraphs: ['重要なポイントをまとめます。'],
        bullets: ['ポイント 1: 核となる情報', 'ポイント 2: 分析結果', 'ポイント 3: データと根拠'],
      },
      {
        heading: '実施計画',
        paragraphs: ['以下のステップで進めます。'],
        bullets: ['Step 1: 準備と調査', 'Step 2: 実施と検証', 'Step 3: 評価と改善'],
      },
      { heading: 'まとめ', paragraphs: [`${t}に関する次のステップへ進みます。`] },
    ],
    pitch: [
      {
        heading: 'エグゼクティブサマリー',
        paragraphs: [
          `${t}は、[ターゲット市場]における[課題]を解決する[プロダクト/サービス]です。[TAM]の市場規模に対して、独自の[技術/アプローチ]で参入します。`,
        ],
      },
      {
        heading: '課題と市場機会',
        paragraphs: ['現在の市場では以下の課題が存在します。'],
        bullets: [
          'ユーザーが直面する具体的な課題',
          '既存ソリューションの限界',
          '市場規模: TAM ¥XX億 / SAM ¥XX億 / SOM ¥XX億',
        ],
      },
      {
        heading: 'ソリューション',
        paragraphs: ['当社のプロダクトは以下の特長で課題を解決します。'],
        bullets: ['コア機能と差別化ポイント', '技術的優位性（特許・独自技術）', 'ユーザー体験の革新'],
      },
      {
        heading: 'ビジネスモデルとトラクション',
        paragraphs: ['SaaSモデルによる持続的な収益構造を構築しています。'],
        bullets: ['MRR: ¥XXX万（前月比 +XX%）', 'ユーザー数: X,XXX（月次成長率 XX%）', '主要顧客: [企業名] 等 XX社'],
      },
      {
        heading: '資金調達計画',
        paragraphs: ['シリーズAラウンドとして¥X億の調達を計画しています。'],
        bullets: ['プロダクト開発: 40%', '営業・マーケティング: 35%', '採用・組織: 25%'],
      },
    ],
    report: [
      {
        heading: 'エグゼクティブサマリー',
        paragraphs: [`${t}の業績報告です。当期は売上高¥XX億（前年比+XX%）、営業利益¥XX億を達成しました。`],
      },
      {
        heading: '業績ハイライト',
        paragraphs: ['主要な業績指標は以下の通りです。'],
        bullets: [
          '売上高: ¥XX億（目標比 XXX%）',
          '営業利益率: XX%（前期比 +X.Xpt）',
          '新規顧客: XXX社（目標比 XXX%）',
          'NPS: XX（前期比 +X）',
        ],
      },
      {
        heading: '部門別報告',
        paragraphs: ['各部門の成果と課題をまとめます。'],
        bullets: ['営業部門: [成果と課題]', '開発部門: [成果と課題]', 'マーケ部門: [成果と課題]'],
      },
      {
        heading: '課題とリスク',
        paragraphs: ['以下の課題への対策を進めています。'],
        bullets: ['課題 1: [内容] → 対策: [具体策]', '課題 2: [内容] → 対策: [具体策]', 'リスク要因: [分析と対策]'],
      },
      {
        heading: '次期計画',
        paragraphs: ['来期は以下の重点施策に取り組みます。'],
        bullets: ['重点施策 1: [内容]', '重点施策 2: [内容]', '投資計画: ¥XX億', '目標売上: ¥XX億'],
      },
    ],
    product: [
      {
        heading: '製品概要',
        paragraphs: [
          `${t}は、[ターゲットユーザー]向けの[カテゴリ]製品です。[主要な課題]を解決し、[具体的な価値]を提供します。`,
        ],
      },
      {
        heading: '主要機能',
        paragraphs: ['以下の機能でユーザーの課題を解決します。'],
        bullets: ['機能 1: [名前] — [説明]', '機能 2: [名前] — [説明]', '機能 3: [名前] — [説明]'],
      },
      {
        heading: '競合優位性',
        paragraphs: ['既存の競合製品と比較した優位性は以下の通りです。'],
        bullets: ['差別化 1: [内容]', '差別化 2: [内容]', '技術的バリア: [内容]'],
      },
      {
        heading: '料金体系',
        paragraphs: ['3つのプランを用意しています。'],
        bullets: ['Free プラン: 基本機能（無料）', 'Pro プラン: 全機能（¥X,XXX/月）', 'Enterprise: カスタム（要相談）'],
      },
      {
        heading: 'ローンチ計画',
        paragraphs: ['以下のスケジュールで展開します。'],
        bullets: [
          'Week 1-2: クローズドβ',
          'Week 3-4: パブリックβ',
          'Week 5: 正式リリース',
          'Week 6+: マーケティング展開',
        ],
      },
    ],
    education: [
      {
        heading: '研修概要',
        paragraphs: [`${t}に関する研修資料です。本研修では実践的なスキル習得を目指します。`],
        bullets: ['対象者: [対象]', '所要時間: X時間', '形式: 座学 + ハンズオン'],
      },
      {
        heading: '学習目標',
        paragraphs: ['本研修の完了時に、以下ができるようになります。'],
        bullets: ['目標 1: [知識レベル]を理解する', '目標 2: [スキル]を実践できる', '目標 3: [応用場面]で活用できる'],
      },
      {
        heading: 'カリキュラム',
        paragraphs: ['以下の順序で学習を進めます。'],
        bullets: [
          'Part 1: 基礎概念（30分）',
          'Part 2: 実践演習（60分）',
          'Part 3: 応用ケーススタディ（45分）',
          'Part 4: 振り返りとQ&A（15分）',
        ],
      },
      {
        heading: '演習問題',
        paragraphs: ['以下の演習を通じて理解を深めます。'],
        bullets: ['演習 1: [テーマ]', '演習 2: [テーマ]', 'グループワーク: [テーマ]'],
      },
      {
        heading: '参考資料',
        paragraphs: ['さらに学習を深めたい方は以下を参照してください。'],
        bullets: ['書籍: [タイトル]', 'Web: [URL/サイト名]', '社内Wiki: [ページ名]'],
      },
    ],
    snspost: [
      {
        heading: '投稿概要',
        paragraphs: [`「${t}」をテーマにしたSNS投稿（カルーセル）の企画書です。`],
        bullets: [
          '形式: 共感系A / ノウハウ系B（どちらかを選択）',
          'ターゲット: 20〜30代・転職やキャリアに悩む層',
          'ゴール: 無料市場価値診断への誘導',
          'スライド枚数: X枚（表紙含む）',
        ],
      },
      {
        heading: 'リサーチメモ',
        paragraphs: ['投稿の根拠となる情報を整理します。'],
        bullets: ['統計・データ: [出典つきで記載]', 'よくある悩み・検索ワード: [リスト]', '参考アカウントの類似投稿: [URL・学べる点]'],
      },
      {
        heading: '構成案',
        paragraphs: ['ストーリーの流れを設計します（共感 → 原因/ヒント → 診断誘導）。'],
        bullets: [
          '1枚目（表紙）: フックとなる見出し',
          '2〜3枚目: 共感・あるある / 原因の解説',
          '4〜5枚目: ノウハウ・ステップ / 具体例',
          '最終枚: CTA（無料市場価値診断へ）',
        ],
      },
      {
        heading: 'キャプション・ハッシュタグ',
        paragraphs: ['投稿本文とタグを作成します。'],
        bullets: [
          '導入: 投稿の要約・自己紹介（国家資格キャリアコンサルタント）',
          'CTA文言: 無料市場価値診断への誘導（完全無料・勧誘なし）',
          'ハッシュタグ: #転職 #キャリア など X個を選定',
        ],
      },
      {
        heading: '公開前チェックリスト',
        paragraphs: ['公開前に以下を確認します。'],
        bullets: [
          '誤字脱字・情報の正確性チェック',
          '年収・成果は断定せず「目安・可能性」の表現か（景表法）',
          'トンマナ統一（フォント・配色・アイコンスタイル）',
          '社内レビュー・修正対応の完了',
        ],
      },
    ],
    linemsg: [
      {
        heading: '配信概要',
        paragraphs: [`「${t}」に関する公式LINE配信の設計書です。`],
        bullets: [
          '対象: あいさつメッセージ / ステップ配信 / リッチメニュー',
          'ターゲット: 20〜30代・転職で年収アップを狙う層（職歴不問）',
          'ゴール: 無料市場価値診断 → ステップ配信 → 面談予約（Day 5〜7）',
          'KPI目安: 登録 → 無料相談申込 15〜25%',
        ],
      },
      {
        heading: 'あいさつメッセージ（Day 0）',
        paragraphs: ['登録直後に届く1通です。主CTAは市場価値診断に絞ります（診断ファースト）。'],
        bullets: [
          '冒頭: {Nickname}さん + 登録お礼で「約束した診断」を確認',
          '共感: ターゲットの痛みをことばに（「今の仕事、この先も続けるのかな」）',
          '主CTA: 無料市場価値診断（3つの質問・約1分・翌日コメント返送）',
          '副CTA: 「じっくり相談したい方は面談予約へ」を1行だけ添える',
          '文字数: 全角500文字以内（長い場合は2バブルに分割）',
        ],
      },
      {
        heading: 'ステップ配信設計',
        paragraphs: ['Day 0〜7 の導線を設計します。'],
        bullets: [
          'Day 0: ウェルカム + 3問アンケート',
          'Day 1: あなた専用の診断コメントをお届け',
          'Day 2〜4: お役立ち情報・事例の配信で信頼を育てる',
          'Day 5〜7: 無料面談のご案内（完全無料・勧誘なしを明記）',
        ],
      },
      {
        heading: 'リッチメニュー連携',
        paragraphs: ['トーク画面下部のメニューと役割分担します。'],
        bullets: [
          '上段（アクション）: 無料面談を予約する / 職業タイプ診断 / コーチに相談する',
          '下段（情報）: 転職お役立ち情報 / 可能性ラボについて / よくある質問',
          '最重要ボタンは左上に配置し、色とリボンで強調',
          'アクション種別: リンク（URI） / テキスト送信（自動応答に接続）',
        ],
      },
      {
        heading: '公開前チェックリスト',
        paragraphs: ['配信前に以下を確認します。'],
        bullets: [
          '年収・成果は断定せず「目安・可能性」の表現か（景表法）',
          '実績訴求は事実・実例がある場合のみ使用しているか',
          'CTAが1つに絞れているか・スマホで一瞬で読めるか',
          '「完全無料・勧誘なし」を明記しているか',
          'ダミーURL（診断・予約フォーム）を実URLに置き換えたか',
        ],
      },
    ],
    coaching: [
      {
        heading: '面談情報',
        paragraphs: [`${t}のキャリア面談シートです。`],
        bullets: [
          '日時: 20XX年X月X日 XX:XX〜XX:XX（30分・オンライン）',
          '相談者: [ニックネーム / 年代 / 現職・業界]',
          '担当: [コーチ名]（国家資格キャリアコンサルタント）',
          '面談の位置づけ: 初回（Day 5〜7） / フォロー',
        ],
      },
      {
        heading: '事前情報',
        paragraphs: ['LINE登録から面談までの情報を整理します。'],
        bullets: [
          '3問アンケートの回答: [内容]',
          '市場価値診断で送付したコメント: [内容]',
          '登録経路・反応のあった配信: [SNS投稿テーマなど]',
        ],
      },
      {
        heading: 'ヒアリング項目',
        paragraphs: ['面談で確認する項目です。相談者のことばを書き留めます。'],
        bullets: [
          '現状: 仕事内容・労働時間・年収・職場環境',
          'モヤモヤの正体: 続けるべきか / 転職すべきかの迷い',
          'キャリアの軸: 大切にしたい条件・避けたい条件',
          '転職活動の状況: 未着手 / 情報収集中 / 応募中',
        ],
      },
      {
        heading: '可能性の棚卸し',
        paragraphs: ['強みと選択肢を一緒に整理します。'],
        bullets: [
          '活かせる経験・スキル: [接客 / 営業 / マネジメント等]',
          '市場価値の目安: [職種 × 経験年数での相場感]',
          '広げられる選択肢: [営業職など職歴不問のキャリアパス]',
          '年収の話は断定せず「目安・可能性」として伝える',
        ],
      },
      {
        heading: '次のアクション',
        paragraphs: ['面談後のフォローを決めます。勧誘はせず、本人のペースを尊重します。'],
        bullets: [
          '相談者の宿題: [職務経歴の整理・求人の確認など]',
          'コーチ側の対応: [求人情報・資料の送付など]',
          '次回: [次回面談の日程 / LINEでのフォロー]',
          '共有事項: [社内メモ・引き継ぎ]',
        ],
      },
    ],
    audit: [
      {
        heading: '使い方',
        paragraphs: [
          `このスキルは、作成済みの投稿文・LINE文面を入力欄に貼り付けると自動で監査します。「${t}」のようにテーマ名だけ入力された場合は、手動チェック用のテンプレートを生成します。`,
        ],
        bullets: [
          '自動検出: 断定・保証表現 / 成果の断定 / No.1表現 / 煽り文句',
          '計測: 文字数（LINE 500文字制限）/ ハッシュタグ数 / CTA分散',
          '出力: 重大度別の指摘と言い換え案、総合スコア（A/B/C判定）',
        ],
      },
      {
        heading: '景表法・表現チェック',
        paragraphs: ['以下の表現が含まれていないか確認します。'],
        bullets: [
          '断定・保証: 「必ず」「絶対」「100%」「確実に」',
          '成果の断定: 「年収が上がる」→「年収アップを目指せる」へ',
          '最上級: 「No.1」「日本一」は根拠（調査元・期間）が必須',
          '実績訴求は事実・実例がある場合のみ',
        ],
      },
      {
        heading: '導線・CTAチェック',
        paragraphs: ['CTAの設計を確認します。'],
        bullets: [
          '主CTAが1つに絞れているか（二段構えなら副CTAは1行だけ）',
          '「完全無料・勧誘なし」を明記しているか',
          'リンク・ダミーURLが実URLに置き換わっているか',
        ],
      },
      {
        heading: 'フォーマットチェック',
        paragraphs: ['媒体ごとの制約を確認します。'],
        bullets: [
          'LINEあいさつ文: 全角500文字以内（分割は最大5通）',
          'スマホで一瞬で読めるか（1行を短く・改行で視線誘導）',
          'ハッシュタグの個数と関連性',
        ],
      },
      {
        heading: '最終確認',
        paragraphs: ['公開前の最後のステップです。'],
        bullets: ['誤字脱字・固有名詞・数字の正確性', 'トンマナ統一', '社内レビューの承認'],
      },
    ],
    marketing: [
      {
        heading: '戦略サマリー',
        paragraphs: [`${t}に関するマーケティング戦略です。[期間]における[目標]の達成を目指します。`],
      },
      {
        heading: '市場分析',
        paragraphs: ['市場環境の分析結果は以下の通りです。'],
        bullets: [
          '市場規模: ¥XX億（CAGR XX%）',
          '主要競合: [A社]、[B社]、[C社]',
          'トレンド: [キーワード]',
          'SWOT: 強み[X]、機会[Y]',
        ],
      },
      {
        heading: 'ターゲット戦略',
        paragraphs: ['以下のセグメントをターゲットとします。'],
        bullets: [
          'ペルソナ A: [年齢/職種/課題]',
          'ペルソナ B: [年齢/職種/課題]',
          'フェーズ別アプローチ: 認知→興味→検討→購入',
        ],
      },
      {
        heading: 'チャネル・施策',
        paragraphs: ['以下のチャネルを中心にアプローチします。'],
        bullets: [
          'SEO/コンテンツ: 月X本の記事',
          'SNS広告: Meta/Google 月¥XX万',
          'メール: 週1回ニュースレター',
          'イベント: 四半期に1回ウェビナー',
        ],
      },
      {
        heading: '予算・KPI・ロードマップ',
        paragraphs: ['総予算¥XX万で以下の指標を追跡します。'],
        bullets: [
          'CPA目標: ¥X,XXX',
          'ROAS目標: XXX%',
          'Month 1: 設計・準備',
          'Month 2-3: 実行・改善',
          'Month 4+: スケール',
        ],
      },
    ],
    meeting: [
      {
        heading: '会議情報',
        paragraphs: [`${t}の議事録です。`],
        bullets: [
          '日時: 20XX年X月X日 XX:XX〜XX:XX',
          '場所: [会議室名/オンライン]',
          '参加者: [名前一覧]',
          '議事録作成: [担当者名]',
        ],
      },
      {
        heading: '議題と討議内容',
        paragraphs: ['以下の議題について討議しました。'],
        bullets: [
          '議題 1: [内容] → 結論: [決定事項]',
          '議題 2: [内容] → 結論: [決定事項]',
          '議題 3: [内容] → 結論: [決定事項]',
        ],
      },
      {
        heading: '決定事項',
        paragraphs: ['以下の事項が決定されました。'],
        bullets: ['決定 1: [内容]（担当: [名前]、期限: X/XX）', '決定 2: [内容]（担当: [名前]、期限: X/XX）'],
      },
      {
        heading: 'アクションアイテム',
        paragraphs: ['次回までの対応事項は以下の通りです。'],
        bullets: [
          '[担当者]: [タスク内容]（期限: X/XX）',
          '[担当者]: [タスク内容]（期限: X/XX）',
          '[担当者]: [タスク内容]（期限: X/XX）',
        ],
      },
      {
        heading: '次回会議',
        paragraphs: ['次回の会議予定は以下の通りです。'],
        bullets: ['日時: 20XX年X月X日 XX:XX', '議題（予定）: [内容]'],
      },
    ],
    techspec: [
      {
        heading: '概要',
        paragraphs: [`${t}の技術仕様書です。本ドキュメントではシステムの設計と技術要件を定義します。`],
        bullets: ['バージョン: v1.0', 'ステータス: ドラフト', '最終更新: 20XX-XX-XX'],
      },
      {
        heading: 'アーキテクチャ',
        paragraphs: ['システム全体のアーキテクチャを以下に示します。'],
        bullets: [
          'フロントエンド: React / Next.js',
          'バックエンド: Node.js / Express',
          'データベース: PostgreSQL',
          'インフラ: AWS (ECS, RDS, S3)',
        ],
      },
      {
        heading: 'API仕様',
        paragraphs: ['主要なAPIエンドポイントを定義します。'],
        bullets: [
          'GET /api/v1/users — ユーザー一覧取得',
          'POST /api/v1/users — ユーザー作成',
          'PUT /api/v1/users/:id — ユーザー更新',
          'DELETE /api/v1/users/:id — ユーザー削除',
        ],
      },
      {
        heading: '非機能要件',
        paragraphs: ['以下の非機能要件を満たす設計とします。'],
        bullets: [
          '可用性: 99.9% SLA',
          'レスポンスタイム: p95 < 200ms',
          'セキュリティ: OAuth 2.0 + JWT',
          'スケーラビリティ: 水平スケーリング対応',
        ],
      },
      {
        heading: 'テスト計画',
        paragraphs: ['以下のテスト戦略で品質を担保します。'],
        bullets: [
          '単体テスト: カバレッジ 80%以上',
          '結合テスト: 主要フロー網羅',
          'E2Eテスト: Playwright',
          '負荷テスト: k6（同時接続 1000）',
        ],
      },
    ],
    'lp-craft': [
      {
        heading: 'LP設計概要',
        paragraphs: [`「${t}」のLP設計書です。新PASONAフレームワークをベースに構成します。`],
        bullets: [
          '目的: 無料体験セッション獲得 / セミナー集客 / 継続契約獲得',
          'ターゲット: [ペルソナ: 年代・職種・悩み]',
          'ゴール（KPI）: [申込数・CTA到達率]',
          '媒体: PC / スマホ最適化',
        ],
      },
      {
        heading: 'ファーストビュー（FV）',
        paragraphs: ['スクロールせずに見える範囲で興味を掴みます。'],
        bullets: [
          'キャッチコピー: [課題＋ベネフィットを一言で]',
          'サブコピー: [誰に・何を・なぜ今か]',
          'CTA ボタン: 「今すぐ無料で予約する」など動詞+ベネフィット形式',
          '画像: 人物写真（親近感） / イラスト（世界観）',
        ],
      },
      {
        heading: '課題・共感セクション（P→A）',
        paragraphs: ['読者の「あるある」をことばにして共感を生みます。'],
        bullets: [
          'Problem（課題）: [ターゲットの具体的な痛み]',
          'Agitation（煽り）: 放置するとどうなるか（断定禁止・可能性の表現）',
          'あるあるリスト: 「こんな悩みはありませんか？」形式',
          '成果の断定は景表法違反: 「〇〇になれます」→「〇〇を目指せます」',
        ],
      },
      {
        heading: '解決策・ベネフィット（S→O）',
        paragraphs: ['特徴ではなく「どう変わるか」で語ります。'],
        bullets: [
          'Solution（解決策）: このサービスで何が変わるか',
          'Offer（提案）: 無料・リスクなし・まず話すだけでOK',
          'ベネフィット訴求: 機能→ベネフィットの変換',
          '中間CTA: FVの次に設置（離脱防止）',
        ],
      },
      {
        heading: '信頼・実績・料金（N→A）',
        paragraphs: ['不安を解消し、行動へのハードルを下げます。'],
        bullets: [
          'Narrowing（絞り込み）: 「こんな方に向いています」',
          '実績・資格・お客様の声（景表法: 事実のみ）',
          '料金プラン: 透明性が信頼を生む（要相談のみは避ける）',
          'FAQ: よくある不安を先に解消',
        ],
      },
      {
        heading: 'CTA・最終クロージング',
        paragraphs: ['ページ末尾でも行動を促します。'],
        bullets: [
          '最終CTA: 再掲（ボタン文言・フォームへのリンク）',
          '「強引な勧誘なし・完全無料」を明記',
          '禁止配色: cream+terracotta / acid-green / purple gradient',
          '情報商材っぽいデザイン・煽り表現を避ける',
        ],
      },
    ],
    'market-strategy': [
      {
        heading: '分析概要',
        paragraphs: [`「${t}」のマーケティング戦略分析レポートです。3C→PEST→SWOT→STP→4Pの順で実施します。`],
        bullets: [
          '目的: [認知拡大 / リード獲得 / 成約増加]',
          'スコープ: [期間・地域・チャネル]',
          'KPI: [CPA / リーチ数 / 申込数]',
        ],
      },
      {
        heading: '3C分析',
        paragraphs: ['自社・競合・顧客の3軸で現状を把握します。'],
        bullets: [
          '自社（Company）: 強み=[資格・SNS実績]・弱み=[認知度・リソース]',
          '競合（Competitor）: [競合A]・[競合B] のポジションと差別化余地',
          '顧客（Customer）: 転職・副業・独立を検討中の20〜30代',
          '3Cから導かれる機会: [×]',
        ],
      },
      {
        heading: 'SWOT・クロスSWOT分析',
        paragraphs: ['内部・外部環境を整理し、戦略の方向性を導きます。'],
        bullets: [
          '強み（S）: [国家資格・親身な対応・キャリア特化]',
          '弱み（W）: [認知度・広告予算・一人運営のリソース]',
          '機会（O）: [転職活動活況・副業需要増・SNS拡散]',
          '脅威（T）: [大手エージェントの無料化・参入増加]',
          'SO戦略: 強みで機会を活かす施策',
          'WT戦略: 弱みを最小化しリスクを回避する施策',
        ],
      },
      {
        heading: 'STP設計',
        paragraphs: ['誰に・何を・どのポジションで届けるかを定義します。'],
        bullets: [
          'Segmentation: [年代・転職意欲・悩みのタイプ]',
          'Targeting: [職歴不問・年収アップ志向の20〜30代]',
          'Positioning: [親身×プロ×無料体験で低ハードル]',
          'ペルソナ: [名前・年齢・職種・悩み・行動パターン]',
        ],
      },
      {
        heading: '戦略示唆（So What）',
        paragraphs: ['分析から導かれるアクションプランです。'],
        bullets: [
          '優先チャネル: [SNS / 検索広告 / LINE / LP]',
          '施策1: [内容・期間・予算目安]',
          '施策2: [内容・期間・予算目安]',
          'カスタマージャーニー: 認知→興味→検討→申込→継続',
          '成果測定: [KPI・計測ツール・レビューサイクル]',
        ],
      },
    ],
    'ad-copy': [
      {
        heading: '広告概要',
        paragraphs: [`「${t}」の広告コピー案です。A/B/Cの3バリエーションを作成しました。`],
        bullets: [
          '媒体: [Meta広告 / Google RSA / LINE広告]',
          '目的: [無料市場価値診断への誘導]',
          'ターゲット: 転職・キャリアに悩む20〜30代',
          '景表法: 断定・保証・No.1表現は使用禁止',
        ],
      },
      {
        heading: 'A案（感情訴求）',
        paragraphs: ['不安・共感に訴えかけるコピーです。'],
        bullets: [
          'ヘッドライン: 「転職すべきか」迷い続けていませんか？',
          '本文: 1人で抱え込まず、国家資格キャリアコンサルタントに相談を。完全無料・勧誘なし。',
          'CTA: 今すぐ無料で診断する',
          '文字数確認: ヘッドライン[XX字] / 本文[XX字]',
        ],
      },
      {
        heading: 'B案（実績・理性訴求）',
        paragraphs: ['実績・資格・数字で信頼を訴えるコピーです。'],
        bullets: [
          'ヘッドライン: 国家資格保有者が無料でキャリア診断',
          '本文: 累計〇〇名のキャリア相談。転職市場でのあなたの強みと選択肢を整理します。',
          'CTA: 無料で予約する',
          '※数字は実績に基づく場合のみ使用',
        ],
      },
      {
        heading: 'C案（行動ハードル訴求）',
        paragraphs: ['「まず話すだけ」でいいハードルの低さを訴えるコピーです。'],
        bullets: [
          'ヘッドライン: 45分・無料・オンライン。まず話してみませんか',
          '本文: 資料請求もなし、強引な勧誘もなし。ただ話すだけで「次の一歩」が見えます。',
          'CTA: 無料で予約する（1分で完了）',
          'フォーマット確認: 媒体別の文字数制限に適合しているか',
        ],
      },
      {
        heading: '公開前チェック・入稿メモ',
        paragraphs: ['入稿前に以下を確認します。'],
        bullets: [
          '景表法: 「必ず」「絶対」「保証」「100%」が含まれていないか',
          '実績数字: 事実に基づくもののみ（根拠を保持）',
          '文字数: 媒体フォーマット仕様に適合しているか',
          'UTMパラメータ: キャンペーン・媒体・クリエイティブを設定',
          'A/Bテスト計測期間: Meta 7日間以上 / Google 2週間以上',
        ],
      },
    ],
    'biz-proposal': [
      {
        heading: '提案概要',
        paragraphs: [`「${t}」の業務提案書です。相手が Yes と言いやすい構成で作成します。`],
        bullets: [
          '提案者: [名前]（可能性ラボ / 国家資格キャリアコンサルタント）',
          '提案先: [会社名・担当者名] 様',
          '提案日: [日付]',
          '提案の種類: 業務委託 / パートナー / 事業計画',
        ],
      },
      {
        heading: '現状と課題の整理',
        paragraphs: ['相手の状況をことばにして「分かってもらえている」感を作ります。'],
        bullets: [
          '現状: [確認できた事実・ヒアリング内容]',
          '課題: [できていないこと・不足しているもの]',
          '機会: [今がSNS強化・施策実施のタイミングである理由]',
        ],
      },
      {
        heading: '提供内容・期待できる効果',
        paragraphs: ['何を・いつまでに・どのように提供するかを明確にします。'],
        bullets: [
          '投稿企画・制作: 週〇本（テーマ設計〜画像・キャプション作成）',
          'ハッシュタグ設計: 月次見直し（Instagram上限5個対応）',
          '公開前チェック: 景表法・ブランド整合性の確認（全投稿）',
          '月次レポート: リーチ・保存・CTA数を計測・改善提案',
          '※成果は市場環境により異なります。特定の数値保証はしません',
        ],
      },
      {
        heading: '実績・信頼情報・料金プラン',
        paragraphs: ['信頼の根拠と料金を明示します。'],
        bullets: [
          '運用経験: 〇件（〇業種）',
          '保有資格: 国家資格キャリアコンサルタント',
          'ライトプラン: 週2投稿・月次レポート / 〇〇,000円',
          'スタンダード: 週4投稿・月次レポート・戦略提案 / 〇〇,000円',
          '最低契約期間: 3ヶ月（効果測定に必要な期間）',
        ],
      },
      {
        heading: '次のステップ',
        paragraphs: ['次のアクションを1つだけ提示します（複数提示は意思決定を遅らせる）。'],
        bullets: [
          'まずは30分のオンライン説明会でご質問にお答えします',
          '→ [連絡先 / 予約フォームURL]',
          '支払い: 前払い・月次（詳細はご相談）',
          'クラウドワークス経由の場合はプラットフォーム手数料が別途発生します',
        ],
      },
    ],
  }

  return templates[skillId] ?? templates['free']
}

// --- コンテンツ要約（長文入力をスキル構造に沿って整理） ---

/** スキル別のセクション構造定義（要約用） */
const SUMMARIZE_STRUCTURES: Record<string, { headings: string[]; intro: string[] }> = {
  free: {
    headings: ['概要', '主要ポイント', '詳細', '考察', 'まとめ'],
    intro: [
      '以下の内容を整理しました。',
      '主なポイントは以下の通りです。',
      '詳細な内容をまとめます。',
      '内容を踏まえた考察です。',
      '以上の内容のまとめです。',
    ],
  },
  pitch: {
    headings: ['エグゼクティブサマリー', '課題・市場', 'ソリューション', 'トラクション・実績', '今後の計画'],
    intro: [
      '事業の要点を整理しました。',
      '市場課題に関する内容です。',
      'ソリューションに関する内容です。',
      '実績・成果に関する内容です。',
      '今後の展望をまとめます。',
    ],
  },
  report: {
    headings: ['報告サマリー', '業績・数値', '成果ハイライト', '課題と対策', '次期アクション'],
    intro: [
      '報告の概要を整理しました。',
      '業績に関する情報です。',
      '成果に関する内容です。',
      '課題と対策をまとめます。',
      '今後のアクションです。',
    ],
  },
  product: {
    headings: ['製品概要', '解決する課題', '主要機能・特長', '競合優位性', '展開計画'],
    intro: [
      '製品の概要を整理しました。',
      '解決する課題に関する内容です。',
      '機能と特長をまとめます。',
      '競合との差別化ポイントです。',
      '展開計画をまとめます。',
    ],
  },
  education: {
    headings: ['研修概要', '学習目標', '基礎知識', '実践内容', 'まとめ・評価'],
    intro: [
      '研修の概要を整理しました。',
      '学習目標に関する内容です。',
      '基礎知識をまとめます。',
      '実践内容に関する項目です。',
      'まとめと評価です。',
    ],
  },
  snspost: {
    headings: ['投稿概要', 'リサーチ', '構成案', 'キャプション・タグ', 'チェック・レビュー'],
    intro: [
      '投稿の概要を整理しました。',
      'リサーチ内容をまとめます。',
      '構成案に関する内容です。',
      'キャプションとタグの案です。',
      '公開前の確認事項です。',
    ],
  },
  linemsg: {
    headings: ['配信概要', '現状と課題', '文面案', 'ステップ・導線設計', '注意点・確認事項'],
    intro: [
      '配信の概要を整理しました。',
      '現状の課題をまとめます。',
      '文面案に関する内容です。',
      '配信ステップと導線の設計です。',
      '公開前の注意点と確認事項です。',
    ],
  },
  coaching: {
    headings: ['面談概要', '相談者の現状', '可能性の棚卸し', '提案・アドバイス', '次のアクション'],
    intro: [
      '面談の概要を整理しました。',
      '相談者の現状をまとめます。',
      '強みと選択肢の棚卸しです。',
      '面談での提案内容です。',
      '面談後のアクションです。',
    ],
  },
  marketing: {
    headings: ['戦略概要', '市場分析', 'ターゲット', 'チャネル・施策', 'KPI・ロードマップ'],
    intro: [
      '戦略の概要を整理しました。',
      '市場に関する情報です。',
      'ターゲットに関する内容です。',
      '施策をまとめます。',
      'KPIと計画です。',
    ],
  },
  meeting: {
    headings: ['会議概要', '議題と討議内容', '決定事項', 'アクションアイテム', '次回予定'],
    intro: [
      '会議の概要を整理しました。',
      '議題と討議内容をまとめます。',
      '決定された事項です。',
      '次回までの対応事項です。',
      '次回の予定です。',
    ],
  },
  techspec: {
    headings: ['技術概要', 'アーキテクチャ', 'API・インターフェース', '非機能要件', 'テスト計画'],
    intro: [
      '技術仕様の概要を整理しました。',
      'アーキテクチャに関する内容です。',
      'インターフェース仕様です。',
      '非機能要件をまとめます。',
      'テスト計画です。',
    ],
  },
  'lp-craft': {
    headings: ['LP設計概要', 'ファーストビュー', '課題・共感', '解決策・実績', 'CTA・クロージング'],
    intro: [
      'LPの設計概要を整理しました。',
      'ファーストビューに関する内容です。',
      '課題と共感セクションです。',
      '解決策と実績の内容です。',
      'CTAとクロージングの設計です。',
    ],
  },
  'market-strategy': {
    headings: ['分析概要', '3C分析', 'SWOT分析', 'STP設計', '戦略示唆（So What）'],
    intro: [
      '分析の概要を整理しました。',
      '3C分析の内容です。',
      'SWOT分析の内容です。',
      'STP設計をまとめます。',
      '戦略的な示唆とアクションです。',
    ],
  },
  'ad-copy': {
    headings: ['広告概要', 'A案（感情訴求）', 'B案（理性訴求）', 'C案（行動訴求）', '公開前チェック'],
    intro: [
      '広告の概要を整理しました。',
      '感情訴求コピーの内容です。',
      '理性訴求コピーの内容です。',
      '行動訴求コピーの内容です。',
      '公開前の確認事項です。',
    ],
  },
  'biz-proposal': {
    headings: ['提案概要', '現状・課題', '提供内容・効果', '実績・料金', '次のステップ'],
    intro: [
      '提案の概要を整理しました。',
      '現状と課題をまとめます。',
      '提供内容と期待効果です。',
      '実績と料金プランです。',
      '次のアクションです。',
    ],
  },
}

/** 長文コンテンツをスキル構造に沿ってドキュメントセクションに要約 */
export function summarizeContentToDoc(skillId: string, content: string): DocSkillResult[] {
  // 公開前チェックは要約ではなく文面監査を行う
  if (skillId === 'audit') {
    return buildAuditReport(content)
  }
  const lines = parseLines(content)
  const structure = SUMMARIZE_STRUCTURES[skillId] ?? SUMMARIZE_STRUCTURES['free']
  const sectionCount = structure.headings.length
  const buckets = distributeLines(lines, sectionCount)
  const title = extractTitle(content)

  return structure.headings.map((heading, i) => {
    const sectionLines = buckets[i]
    if (sectionLines.length === 0) {
      return {
        heading,
        paragraphs: [structure.intro[i]],
      }
    }
    // 最初の行をパラグラフの導入文に、残りをbulletsに
    const firstLine = sectionLines[0]
    const rest = sectionLines.slice(1)
    return {
      heading,
      paragraphs: [
        i === 0 ? `${title}に関する${heading}を整理しました。` : structure.intro[i],
        ...(rest.length === 0 ? [firstLine] : []),
      ],
      bullets: rest.length > 0 ? [firstLine, ...rest] : undefined,
    }
  })
}

/** 長文コンテンツをスキル構造に沿ってスライドに要約 */
export function summarizeContentToSlides(skillId: string, content: string): SlideSkillResult[] {
  const lines = parseLines(content)
  const structure = SUMMARIZE_STRUCTURES[skillId] ?? SUMMARIZE_STRUCTURES['free']
  const sectionCount = structure.headings.length
  const buckets = distributeLines(lines, sectionCount)
  const title = extractTitle(content)

  // 表紙スライドを先頭に追加
  const slides: SlideSkillResult[] = [
    {
      title: title,
      bullets: [`全${lines.length}項目を${sectionCount}セクションに整理`, ...structure.headings.slice(0, 4)],
      themeKey: THEMES[0],
    },
  ]

  structure.headings.forEach((heading, i) => {
    const sectionLines = buckets[i]
    slides.push({
      title: heading,
      bullets: sectionLines.length > 0 ? sectionLines.slice(0, 5) : [structure.intro[i]],
      themeKey: THEMES[(i + 1) % THEMES.length],
    })
  })

  return slides
}
