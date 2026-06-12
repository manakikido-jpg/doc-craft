import type { Metadata } from 'next'
import { LpNav } from './components/LpNav'
import { Hero } from './components/Hero'
import { LpFooter } from './components/LpFooter'
import { StickyCta, StickyCtaSentinel } from './components/StickyCta'
import { PainPoints } from './components/PainPoints'
import { DiagnosisTeaser } from './components/DiagnosisTeaser'
import { FlowTimeline } from './components/FlowTimeline'
import { TypesTeaser } from './components/TypesTeaser'
import { ReasonsBand } from './components/ReasonsBand'
import { Voices } from './components/Voices'
import { Faq } from './components/Faq'
import { FinalCta } from './components/FinalCta'
import { Analytics } from './components/Analytics'

/**
 * Metadata — plan §4
 */
export const metadata: Metadata = {
  title: '無料キャリア診断｜可能性ラボ｜国家資格キャリアコンサルタントが伴走',
  description:
    '20〜30代の転職に。LINEで3問答えるだけの無料「市場価値診断」。国家資格キャリアコンサルタントが翌日までにフィードバック。相談料0円・オンライン完結・しつこい勧誘なし。',
  openGraph: {
    title: '無料キャリア診断｜可能性ラボ｜国家資格キャリアコンサルタントが伴走',
    description:
      '20〜30代の転職に。LINEで3問答えるだけの無料「市場価値診断」。国家資格キャリアコンサルタントが翌日までにフィードバック。相談料0円・オンライン完結・しつこい勧誘なし。',
    type: 'website',
    locale: 'ja_JP',
    siteName: '可能性ラボ',
  },
  twitter: {
    card: 'summary_large_image',
    title: '無料キャリア診断｜可能性ラボ｜国家資格キャリアコンサルタントが伴走',
    description:
      '20〜30代の転職に。LINEで3問答えるだけの無料「市場価値診断」。国家資格キャリアコンサルタントが翌日までにフィードバック。相談料0円・オンライン完結・しつこい勧誘なし。',
  },
}

/**
 * /lp/kanousei-lab — 可能性ラボ ランディングページ
 *
 * Section order:
 *   Analytics / Nav / Hero / StickyCtaSentinel / PainPoints / DiagnosisTeaser /
 *   FlowTimeline / TypesTeaser / ReasonsBand / Voices / Faq / FinalCta / Footer / StickyCta
 */
export default function KanouseiLabPage() {
  return (
    <>
      {/* Analytics — env-gated, renders nothing when env vars are absent */}
      <Analytics />

      {/* S0 — Navigation */}
      <LpNav />

      {/* S1 — Hero */}
      <Hero />

      {/* Sentinel: StickyCta watches this to know when hero has scrolled past */}
      <StickyCtaSentinel />

      {/* S2 — PainPoints */}
      <PainPoints />

      {/* S3 — DiagnosisTeaser */}
      <DiagnosisTeaser />

      {/* S4 — FlowTimeline */}
      <FlowTimeline />

      {/* S5 — TypesTeaser */}
      <TypesTeaser />

      {/* S6 — ReasonsBand */}
      <ReasonsBand />

      {/* S7 — Voices */}
      <Voices />

      {/* S8 — Faq */}
      <Faq />

      {/* S9 — FinalCta */}
      <FinalCta />

      {/* S10 — Footer */}
      <LpFooter />

      {/* S11 — Sticky CTA (client, IntersectionObserver-gated) */}
      <StickyCta />
    </>
  )
}
