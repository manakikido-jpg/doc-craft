import type { SlideThemeKey } from '@/types'

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
    id: 'workshop',
    name: 'ワークショップ企画',
    icon: 'lightbulb',
    description: '体験会・探究学習・イベントの企画運営',
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
    workshop: [
      {
        title: `${t} — ワークショップ企画`,
        bullets: ['開催の目的・コンセプト', '対象者と定員', '開催概要（日時・場所・参加費）'],
        themeKey: 'dark-blue',
      },
      {
        title: 'ねらいと体験価値',
        bullets: ['参加者が持ち帰る気づき・学び', '「できた！」を引き出す仕掛け', '可能性を広げる問いの設計'],
        themeKey: 'violet-slate',
      },
      {
        title: '当日のプログラム',
        bullets: [
          'オープニング・アイスブレイク（15分）',
          '体験・探究ワーク（60分）',
          '発表・シェアタイム（30分）',
          '振り返り・クロージング（15分）',
        ],
        themeKey: 'emerald',
      },
      {
        title: '準備と運営体制',
        bullets: ['必要な教材・機材リスト', 'スタッフの役割分担', '会場レイアウトと動線', '安全面・緊急時の対応'],
        themeKey: 'ocean',
      },
      {
        title: '集客と告知',
        bullets: ['告知チャネル（SNS・チラシ・口コミ）', '申込フローとリマインド', '参加ハードルを下げる工夫'],
        themeKey: 'amber',
      },
      {
        title: '振り返りと次回へ',
        bullets: ['参加者アンケートの設計', '改善ポイントの洗い出し', '次回開催・継続企画への展開'],
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
    workshop: [
      {
        heading: '企画概要',
        paragraphs: [`${t}のワークショップ企画書です。参加者一人ひとりの可能性を引き出す体験の場を設計します。`],
        bullets: ['日時: 20XX年X月X日 XX:XX〜XX:XX', '場所: [会場名]', '対象: [対象者]（定員 XX名）', '参加費: ¥X,XXX'],
      },
      {
        heading: 'ねらい・ゴール',
        paragraphs: ['本ワークショップを通じて、参加者が以下を持ち帰ることを目指します。'],
        bullets: ['気づき: [テーマ]への新しい視点', '体験: [活動]を通じた「できた！」の実感', 'つながり: 参加者同士の交流と学び合い'],
      },
      {
        heading: 'プログラム詳細',
        paragraphs: ['当日は以下のタイムテーブルで進行します。'],
        bullets: [
          'XX:00 受付・オープニング',
          'XX:15 アイスブレイク: [内容]',
          'XX:30 体験・探究ワーク: [内容]',
          'XX:30 発表・シェアタイム',
          'XX:00 振り返り・クロージング',
        ],
      },
      {
        heading: '準備・運営体制',
        paragraphs: ['以下の準備と役割分担で運営します。'],
        bullets: [
          '教材・機材: [リスト]',
          '進行: [担当者] / サポート: [担当者]',
          '会場設営: [レイアウト・動線]',
          '安全対応: [緊急連絡先・保険]',
        ],
      },
      {
        heading: '集客・振り返り',
        paragraphs: ['告知から開催後のフォローまでを計画します。'],
        bullets: [
          '告知: SNS・チラシ・口コミ（X週間前から）',
          '申込: [フォーム/連絡先]・前日リマインド',
          'アンケート: 満足度・気づき・次回への要望',
          '次回企画: 振り返りをもとに改善・継続開催へ',
        ],
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
  workshop: {
    headings: ['企画概要', 'ねらい・ゴール', 'プログラム内容', '準備・運営', '振り返り・次回'],
    intro: [
      '企画の概要を整理しました。',
      'ねらいとゴールに関する内容です。',
      'プログラム内容をまとめます。',
      '準備と運営に関する項目です。',
      '振り返りと次回への展開です。',
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
}

/** 長文コンテンツをスキル構造に沿ってドキュメントセクションに要約 */
export function summarizeContentToDoc(skillId: string, content: string): DocSkillResult[] {
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
