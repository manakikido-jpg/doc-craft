import type { Metadata } from 'next'
import { LpNav } from './components/LpNav'
import { Hero } from './components/Hero'
import { LpFooter } from './components/LpFooter'
import { StickyCta, StickyCtaSentinel } from './components/StickyCta'

// ── Package B sections (to be inserted when implemented) ──
// import { PainPoints } from './components/PainPoints'
// import { FlowTimeline } from './components/FlowTimeline'
// import { ReasonsBand } from './components/ReasonsBand'
// import { Voices } from './components/Voices'
// import { Faq } from './components/Faq'

// ── Package C sections (to be inserted when implemented) ──
// import { DiagnosisTeaser } from './components/DiagnosisTeaser'
// import { TypesTeaser } from './components/TypesTeaser'
// import { FinalCta } from './components/FinalCta'
// import { Analytics } from './components/Analytics'

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
 * Section order (final, including B & C packages):
 *   Nav / Hero / PainPoints / DiagnosisTeaser / FlowTimeline /
 *   TypesTeaser / ReasonsBand / Voices / Faq / FinalCta / Footer / StickyCta
 *
 * Currently live: Nav, Hero, Footer, StickyCta (Package A).
 * B & C packages will be uncommented above and inserted below when ready.
 */
export default function KanouseiLabPage() {
  return (
    <>
      {/* S0 — Navigation */}
      <LpNav />

      {/* S1 — Hero */}
      <Hero />

      {/* Sentinel: StickyCta watches this to know when hero has scrolled past */}
      <StickyCtaSentinel />

      {/* ── S2 PainPoints (Package B) ── */}
      {/* <PainPoints /> */}

      {/* ── S3 DiagnosisTeaser (Package C) ── */}
      {/* <DiagnosisTeaser /> */}

      {/* ── S4 FlowTimeline (Package B) ── */}
      {/* <FlowTimeline /> */}

      {/* ── S5 TypesTeaser (Package C) ── */}
      {/* <TypesTeaser /> */}

      {/* ── S6 ReasonsBand (Package B) ── */}
      {/* <ReasonsBand /> */}

      {/* ── S7 Voices (Package B) ── */}
      {/* <Voices /> */}

      {/* ── S8 Faq (Package B) ── */}
      {/* <Faq /> */}

      {/* ── S9 FinalCta (Package C) ── */}
      {/* <FinalCta /> */}

      {/* S10 — Footer */}
      <LpFooter />

      {/* S11 — Sticky CTA (client, IntersectionObserver-gated) */}
      <StickyCta />

      {/* ── Analytics (Package C) ── */}
      {/* <Analytics /> */}
    </>
  )
}
