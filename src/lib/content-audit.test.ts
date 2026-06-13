import { describe, it, expect } from 'vitest'
import {
  detectRiskExpressions,
  measureMetrics,
  detectBrandIssues,
  auditScore,
  auditGrade,
  auditContent,
  buildAuditReport,
} from './content-audit'

const CLEAN_TEXT = [
  '転職を考え始めたら、まず市場価値の棚卸しから。',
  '3つの質問に答えるだけで、目安がわかります。',
  '完全無料・勧誘は一切しません。',
  'まずはプロフィールの無料市場価値診断からどうぞ。',
].join('\n')

describe('detectRiskExpressions', () => {
  it('断定・保証表現を高リスクとして検出する', () => {
    const findings = detectRiskExpressions('この方法なら必ず成功します。絶対に損しません。')
    const matched = findings.map((f) => f.matched)
    expect(matched).toContain('必ず')
    expect(matched).toContain('絶対に')
    expect(findings.every((f) => f.severity === 'high')).toBe(true)
  })

  it('成果の断定（年収が上がる）を検出し言い換えを提案する', () => {
    const findings = detectRiskExpressions('転職すれば年収が上がる！')
    const finding = findings.find((f) => f.category === '成果の断定')
    expect(finding).toBeDefined()
    expect(finding!.suggestion).toContain('目安')
  })

  it('No.1表現を大文字小文字問わず検出する', () => {
    expect(detectRiskExpressions('顧客満足度 no.1 のサービス')).toHaveLength(1)
    expect(detectRiskExpressions('日本一のキャリア支援')).toHaveLength(1)
  })

  it('煽り表現を中リスクとして検出する', () => {
    const findings = detectRiskExpressions('今だけ期間限定のキャンペーン！')
    expect(findings.length).toBe(2)
    expect(findings.every((f) => f.severity === 'medium')).toBe(true)
  })

  it('問題のない文面では何も検出しない', () => {
    expect(detectRiskExpressions(CLEAN_TEXT)).toHaveLength(0)
  })

  it('該当行の抜粋を含む', () => {
    const findings = detectRiskExpressions('必ず読んでください')
    expect(findings[0].excerpt).toBe('必ず読んでください')
  })
})

describe('measureMetrics', () => {
  it('空白を除いた文字数と行数を数える', () => {
    const m = measureMetrics('あいう えお\n\nかきく')
    expect(m.charCount).toBe(8)
    expect(m.lineCount).toBe(2)
  })

  it('ハッシュタグを数える', () => {
    const m = measureMetrics('本文です #転職 #キャリア #20代')
    expect(m.hashtagCount).toBe(3)
  })

  it('CTAキーワードを抽出する', () => {
    const m = measureMetrics('無料診断はプロフィールから。保存して見返してね。')
    expect(m.ctaKeywords).toEqual(expect.arrayContaining(['診断', 'プロフィール', '保存']))
  })

  it('60文字を超える行を数える', () => {
    const longLine = 'あ'.repeat(61)
    expect(measureMetrics(`${longLine}\n短い行`).longLines).toBe(1)
  })
})

describe('detectBrandIssues', () => {
  it('CTAが3種類以上で分散を指摘する', () => {
    const text = '診断を受けて、面談を予約して、フォローもお願いします。勧誘なし・完全無料。'
    const findings = detectBrandIssues(text, measureMetrics(text))
    expect(findings.some((f) => f.category === 'CTAの分散')).toBe(true)
  })

  it('「無料」のみの場合は「完全無料」表記を提案する', () => {
    const text = '無料で診断できます。勧誘なし。'
    const findings = detectBrandIssues(text, measureMetrics(text))
    expect(findings.some((f) => f.category === '無料表記')).toBe(true)
  })

  it('「完全無料」と書かれていれば無料表記の指摘をしない', () => {
    const text = '完全無料で診断できます。勧誘なし。'
    const findings = detectBrandIssues(text, measureMetrics(text))
    expect(findings.some((f) => f.category === '無料表記')).toBe(false)
  })

  it('勧誘への言及がなければ明記を提案する', () => {
    const text = '完全無料で診断できます。'
    const findings = detectBrandIssues(text, measureMetrics(text))
    expect(findings.some((f) => f.category === '勧誘なしの明記')).toBe(true)
  })

  it('500文字超でLINE文字数制限を指摘する', () => {
    const text = 'あ'.repeat(501)
    const findings = detectBrandIssues(text, measureMetrics(text))
    expect(findings.some((f) => f.category === 'LINE文字数制限')).toBe(true)
  })
})

describe('auditScore / auditGrade', () => {
  it('指摘ゼロなら100点・A判定', () => {
    expect(auditScore([])).toBe(100)
    expect(auditGrade(100)).toContain('A')
  })

  it('重大度に応じて減点する（high=20, medium=8, low=3）', () => {
    const f = (severity: 'high' | 'medium' | 'low') => ({
      category: 'x',
      severity,
      matched: 'x',
      excerpt: 'x',
      suggestion: 'x',
    })
    expect(auditScore([f('high'), f('medium'), f('low')])).toBe(100 - 20 - 8 - 3)
  })

  it('スコアは0を下回らない', () => {
    const highs = Array.from({ length: 10 }, () => ({
      category: 'x',
      severity: 'high' as const,
      matched: 'x',
      excerpt: 'x',
      suggestion: 'x',
    }))
    expect(auditScore(highs)).toBe(0)
  })

  it('70点未満はC判定', () => {
    expect(auditGrade(69)).toContain('C')
    expect(auditGrade(70)).toContain('B')
  })
})

describe('auditContent / buildAuditReport', () => {
  it('リスクの多い文面は低スコアになる', () => {
    const risky = '必ず年収が上がる！日本一のサービス。今だけ限定。誰でも簡単に稼げます。'
    const result = auditContent(risky)
    expect(result.score).toBeLessThan(70)
    expect(result.grade).toContain('C')
  })

  it('クリーンな文面は高スコアになる', () => {
    const result = auditContent(CLEAN_TEXT)
    expect(result.findings.filter((f) => f.severity === 'high')).toHaveLength(0)
    expect(result.score).toBeGreaterThanOrEqual(90)
  })

  it('レポートは5セクション構成でスコアを含む', () => {
    const report = buildAuditReport('必ず成功する方法を紹介します。\n試してみてください。')
    expect(report).toHaveLength(5)
    expect(report[0].heading).toBe('監査サマリー')
    expect(report[0].paragraphs[0]).toMatch(/総合スコアは \d+ 点/)
  })

  it('高リスク指摘には言い換え案と該当箇所が入る', () => {
    const report = buildAuditReport('転職すれば絶対に年収が上がる！')
    const highSection = report.find((s) => s.heading === '要修正（高リスク）')
    expect(highSection?.bullets?.some((b) => b.includes('→') && b.includes('該当:'))).toBe(true)
  })

  it('指摘ゼロの文面では「見つかりませんでした」と表示する', () => {
    const report = buildAuditReport(CLEAN_TEXT)
    const highSection = report.find((s) => s.heading === '要修正（高リスク）')
    expect(highSection?.paragraphs[0]).toContain('見つかりませんでした')
    expect(highSection?.bullets).toBeUndefined()
  })
})

describe('summarizeContentToDoc との連携', () => {
  it('auditスキルでは要約ではなく監査レポートを返す', async () => {
    const { summarizeContentToDoc } = await import('./ai-skills')
    const report = summarizeContentToDoc('audit', '必ず成功します。\n絶対お得です。\n今すぐ登録。')
    expect(report[0].heading).toBe('監査サマリー')
  })
})
