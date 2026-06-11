import type { DocSkillResult } from './ai-skills'

// SNS投稿・LINE配信文面の公開前監査エンジン。
// 景表法・誇大広告リスクのある表現を検出し、言い換え案つきのレポートを生成する。

export type AuditSeverity = 'high' | 'medium' | 'low'

export interface AuditFinding {
  category: string
  severity: AuditSeverity
  matched: string
  excerpt: string
  suggestion: string
}

export interface AuditMetrics {
  charCount: number
  lineCount: number
  hashtagCount: number
  ctaKeywords: string[]
  longLines: number
}

export interface AuditResult {
  findings: AuditFinding[]
  metrics: AuditMetrics
  score: number
  grade: string
}

interface AuditRule {
  category: string
  severity: AuditSeverity
  pattern: RegExp
  suggestion: string
}

// 景表法（優良誤認・有利誤認）と誇大広告の観点からリスクの高い表現
const AUDIT_RULES: AuditRule[] = [
  {
    category: '断定・保証表現',
    severity: 'high',
    pattern: /必ず|絶対に?|100[%％]|確実に|間違いなく|保証(し|され)/g,
    suggestion: '「目安」「〜の可能性があります」など断定を避けた表現に言い換える（景表法・誇大広告リスク）',
  },
  {
    category: '成果の断定',
    severity: 'high',
    pattern: /年収(が|は)?(上がる|アップする|増える)|(内定|転職)(できます|が決まる)/g,
    suggestion: '「年収アップを目指せる」「選択肢が広がる」など、成果は目安・可能性の表現に留める',
  },
  {
    category: '最上級・No.1表現',
    severity: 'high',
    pattern: /No\.?\s?1|日本一|業界(最高|最大|初)|最安/gi,
    suggestion: '客観的な根拠（調査元・調査期間）を併記できない場合は削除する',
  },
  {
    category: '「誰でも・簡単に」訴求',
    severity: 'medium',
    pattern: /誰でも(簡単に)?|楽して|スキマ時間だけで/g,
    suggestion: '個人差がある旨を添えるか、対象者・条件を具体的に書く',
  },
  {
    category: '煽り・緊急性',
    severity: 'medium',
    pattern: /今だけ|期間限定|早い者勝ち|残り(わずか|\d+)/g,
    suggestion: '事実である場合のみ使用し、根拠（期限・枠数）を明記する',
  },
]

// CTA導線の分散チェックに使うキーワード（1投稿のCTAは1つに絞るのが原則）
const CTA_KEYWORDS = ['診断', '面談', '予約', '保存', 'フォロー', 'プロフィール', 'DM', '友だち追加']

const EXCERPT_MAX = 40

function toExcerpt(line: string): string {
  return line.length > EXCERPT_MAX ? line.slice(0, EXCERPT_MAX) + '...' : line
}

/** 表現ルールに基づき文面からリスク表現を検出 */
export function detectRiskExpressions(text: string): AuditFinding[] {
  const findings: AuditFinding[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    for (const rule of AUDIT_RULES) {
      for (const m of line.matchAll(rule.pattern)) {
        findings.push({
          category: rule.category,
          severity: rule.severity,
          matched: m[0],
          excerpt: toExcerpt(line.trim()),
          suggestion: rule.suggestion,
        })
      }
    }
  }
  return findings
}

/** 文字数・ハッシュタグ・CTAなどのフォーマット指標を計測 */
export function measureMetrics(text: string): AuditMetrics {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  return {
    charCount: text.replace(/\s/g, '').length,
    lineCount: lines.length,
    hashtagCount: (text.match(/#[^\s#]+/g) ?? []).length,
    ctaKeywords: CTA_KEYWORDS.filter((k) => text.includes(k)),
    longLines: lines.filter((l) => l.trim().length > 60).length,
  }
}

/** ブランド・導線の観点からの指摘（可能性ラボのトンマナ基準） */
export function detectBrandIssues(text: string, metrics: AuditMetrics): AuditFinding[] {
  const findings: AuditFinding[] = []
  if (metrics.ctaKeywords.length >= 3) {
    findings.push({
      category: 'CTAの分散',
      severity: 'medium',
      matched: metrics.ctaKeywords.join(' / '),
      excerpt: `導線キーワードが${metrics.ctaKeywords.length}種類`,
      suggestion: '主CTAを1つに絞り、それ以外は1行の添え書きに留める（二段構えCTA）',
    })
  }
  if (/無料/.test(text) && !/完全無料/.test(text)) {
    findings.push({
      category: '無料表記',
      severity: 'low',
      matched: '無料',
      excerpt: '「無料」のみの表記',
      suggestion: '「完全無料」と明記すると、条件付き無料との誤認を防げる',
    })
  }
  if (!/勧誘/.test(text)) {
    findings.push({
      category: '勧誘なしの明記',
      severity: 'low',
      matched: '（記載なし）',
      excerpt: '「勧誘なし」への言及が見当たらない',
      suggestion: 'CTA付近に「勧誘は一切しません」を明記すると心理的ハードルが下がる',
    })
  }
  if (metrics.charCount > 500) {
    findings.push({
      category: 'LINE文字数制限',
      severity: 'medium',
      matched: `${metrics.charCount}文字`,
      excerpt: 'あいさつメッセージは1通あたり全角500文字以内',
      suggestion: 'LINEあいさつ文として使う場合は500文字以内に収めるか、複数バブルに分割する（最大5通）',
    })
  }
  if (metrics.longLines > 0) {
    findings.push({
      category: '可読性',
      severity: 'low',
      matched: `60文字超の行が${metrics.longLines}行`,
      excerpt: 'スマホでは長い行は読み飛ばされやすい',
      suggestion: '1行を短く区切り、改行と記号で視線を誘導する',
    })
  }
  return findings
}

const SEVERITY_PENALTY: Record<AuditSeverity, number> = { high: 20, medium: 8, low: 3 }

/** 指摘の重大度から総合スコア（0〜100）を算出 */
export function auditScore(findings: AuditFinding[]): number {
  const penalty = findings.reduce((sum, f) => sum + SEVERITY_PENALTY[f.severity], 0)
  return Math.max(0, 100 - penalty)
}

export function auditGrade(score: number): string {
  if (score >= 90) return 'A（このまま公開可）'
  if (score >= 70) return 'B（軽微な修正を推奨）'
  return 'C（公開前に修正必須）'
}

/** 文面全体を監査して結果を返す */
export function auditContent(text: string): AuditResult {
  const metrics = measureMetrics(text)
  const findings = [...detectRiskExpressions(text), ...detectBrandIssues(text, metrics)]
  const score = auditScore(findings)
  return { findings, metrics, score, grade: auditGrade(score) }
}

const MAX_FINDINGS_PER_SECTION = 8

function formatFindings(findings: AuditFinding[]): string[] {
  return findings
    .slice(0, MAX_FINDINGS_PER_SECTION)
    .map((f) => `[${f.category}]「${f.matched}」→ ${f.suggestion}（該当: ${f.excerpt}）`)
}

/** 監査結果をドキュメントセクションに整形 */
export function buildAuditReport(content: string): DocSkillResult[] {
  const result = auditContent(content)
  const { findings, metrics, score, grade } = result
  const high = findings.filter((f) => f.severity === 'high')
  const medium = findings.filter((f) => f.severity === 'medium')
  const low = findings.filter((f) => f.severity === 'low')
  const firstLine = content.split('\n').find((l) => l.trim().length > 0)?.trim() ?? ''
  const title = firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine

  return [
    {
      heading: '監査サマリー',
      paragraphs: [`「${title}」を解析しました。総合スコアは ${score} 点、判定は ${grade} です。`],
      bullets: [
        `高リスク（要修正）: ${high.length}件`,
        `中リスク（注意）: ${medium.length}件`,
        `低リスク（推奨）: ${low.length}件`,
        `文字数: ${metrics.charCount}文字 / ${metrics.lineCount}行`,
      ],
    },
    {
      heading: '要修正（高リスク）',
      paragraphs:
        high.length > 0
          ? ['景表法・誇大広告のリスクがある表現です。公開前に必ず修正してください。']
          : ['高リスクの表現は見つかりませんでした。'],
      bullets: high.length > 0 ? formatFindings(high) : undefined,
    },
    {
      heading: '注意（中リスク）',
      paragraphs:
        medium.length > 0
          ? ['誤認や訴求力低下につながる可能性のある表現です。']
          : ['中リスクの表現は見つかりませんでした。'],
      bullets: medium.length > 0 ? formatFindings(medium) : undefined,
    },
    {
      heading: '表記・導線チェック',
      paragraphs: ['フォーマットとCTA導線の計測結果です。'],
      bullets: [
        `ハッシュタグ: ${metrics.hashtagCount}個${metrics.hashtagCount === 0 ? '（SNS投稿なら5〜10個を検討）' : ''}`,
        `CTA導線キーワード: ${metrics.ctaKeywords.length > 0 ? metrics.ctaKeywords.join(' / ') : 'なし'}`,
        ...(low.length > 0 ? formatFindings(low) : ['推奨レベルの指摘はありません。']),
      ],
    },
    {
      heading: '修正後の最終確認',
      paragraphs: ['上記を修正したら、公開前に以下を確認します。'],
      bullets: [
        '誤字脱字・固有名詞・数字の正確性',
        '統計・実績を使う場合は出典/事実の裏付けがあるか',
        'トンマナ統一（フォント・配色・アイコンスタイル）',
        '社内レビューの承認を得たか',
      ],
    },
  ]
}
