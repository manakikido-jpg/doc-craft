import { CtaButton } from './CtaButton'
import { CTA_FLOW_LABEL, GTM_EVENT_LINE } from '../copy'

/**
 * S4 — FlowTimeline
 * Server Component. Vertical timeline with 道 (path) line + 灯 (warm light dots) motif.
 * A thin vertical --lp-line with terracotta light dots at each step, growing emphasis.
 * 4 steps with exact copy from plan §3, closing PRIMARY CTA.
 */

interface Step {
  day: string
  title: string
  body: string
  dotSize: number
  dotOpacity: number
}

const STEPS: Step[] = [
  {
    day: 'Day 0',
    title: 'LINE友だち追加 & 3問診断',
    body: 'LINEを追加して、3つの質問に回答。今のあなたの状況をお聞かせください。',
    dotSize: 10,
    dotOpacity: 0.5,
  },
  {
    day: '翌日',
    title: 'あなた専用のフィードバック',
    body: 'キャリアコンサルタントが診断結果と、あなたに合った選択肢をコメントでお届けします。',
    dotSize: 12,
    dotOpacity: 0.65,
  },
  {
    day: 'Day 5–7',
    title: '無料オンライン面談（30分）',
    body: 'もっと相談したい方は、Zoomで30分の無料カウンセリングへ。希望者のみ・無理な勧誘はありません。',
    dotSize: 14,
    dotOpacity: 0.8,
  },
  {
    day: 'あなたのペースで',
    title: '求人のご紹介',
    body: '納得できたら、提携企業の中からあなたに合う求人をご紹介。年収アップやキャリアチェンジを後押しします。',
    dotSize: 18,
    dotOpacity: 1,
  },
]

export function FlowTimeline() {
  return (
    <section className="lp-section" aria-labelledby="flow-heading">
      <div className="lp-container">
        {/* Heading */}
        <h2 id="flow-heading" className="lp-h2 text-center mb-16">
          ご相談の流れ
        </h2>

        {/* Timeline — 道ライン with 灯 dots */}
        <div className="relative">
          {/*
           * 道 (path) line — thin vertical line running through all steps.
           * Starts 24px from top (center of first dot) and ends 24px from bottom.
           * On mobile it's offset-left; on md+ it's centered.
           */}
          <div
            className="absolute left-[19px] md:left-1/2 top-6 bottom-6 w-px md:-translate-x-1/2"
            style={{ backgroundColor: 'var(--lp-line)' }}
            aria-hidden="true"
          />

          <ol className="relative flex flex-col gap-12 md:gap-16 list-none p-0 m-0">
            {STEPS.map((step, i) => {
              const isEven = i % 2 === 0
              return (
                <li key={i} className="relative flex items-start gap-0 md:gap-0">
                  {/*
                   * Layout on md+: alternating left / right.
                   * On mobile: all left-aligned, dot at fixed left position.
                   */}
                  <div
                    className={[
                      'flex w-full items-start gap-6',
                      // On md+: even items have content left, dot center, empty right;
                      //          odd items have empty left, dot center, content right.
                      'md:grid md:grid-cols-[1fr_auto_1fr]',
                    ].join(' ')}
                  >
                    {/* Left content slot (md+: even steps) */}
                    <div
                      className={[
                        'hidden md:block',
                        isEven ? 'text-right pr-8' : '',
                        !isEven ? 'invisible' : '',
                      ].join(' ')}
                    >
                      {isEven && <StepContent step={step} align="right" stepIndex={i} />}
                    </div>

                    {/* 灯 dot — centered on the 道 line */}
                    <div className="flex flex-col items-center flex-shrink-0 z-10">
                      {/* Outer glow ring (grows with step) */}
                      <div
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: step.dotSize + 14,
                          height: step.dotSize + 14,
                          backgroundColor: `rgba(224, 116, 47, ${step.dotOpacity * 0.15})`,
                        }}
                        aria-hidden="true"
                      >
                        {/* Terracotta light dot */}
                        <div
                          className="rounded-full"
                          style={{
                            width: step.dotSize,
                            height: step.dotSize,
                            backgroundColor: 'var(--lp-glow)',
                            opacity: step.dotOpacity,
                            boxShadow: `0 0 ${step.dotSize}px rgba(224, 116, 47, ${step.dotOpacity * 0.5})`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Right content slot (md+: odd steps; mobile: all steps) */}
                    <div
                      className={[
                        'pl-6 md:pl-8 flex-1 md:flex-none',
                        !isEven ? 'text-left' : '',
                        isEven ? 'md:invisible md:hidden' : '',
                      ].join(' ')}
                    >
                      {/* Mobile: always show here. md+: only odd steps */}
                      <div className="md:hidden">
                        <StepContent step={step} align="left" stepIndex={i} />
                      </div>
                      {!isEven && (
                        <div className="hidden md:block">
                          <StepContent step={step} align="left" stepIndex={i} />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Closing PRIMARY CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          {/* Final 灯 — larger warm glow before CTA */}
          <div aria-hidden="true" className="mb-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              {/* Outer glow */}
              <circle cx="20" cy="20" r="20" fill="rgba(224, 116, 47, 0.12)" />
              {/* Mid glow */}
              <circle cx="20" cy="20" r="12" fill="rgba(224, 116, 47, 0.25)" />
              {/* Core dot */}
              <circle cx="20" cy="20" r="6" fill="var(--lp-glow)" />
            </svg>
          </div>

          <CtaButton variant="primary" size="lg" eventName={GTM_EVENT_LINE}>
            {CTA_FLOW_LABEL}
          </CtaButton>
        </div>
      </div>
    </section>
  )
}

/** Inner step content block — shared between left/right layout */
function StepContent({ step, align, stepIndex }: { step: Step; align: 'left' | 'right'; stepIndex: number }) {
  return (
    <div className={['flex flex-col gap-2', align === 'right' ? 'items-end' : 'items-start'].join(' ')}>
      {/* Day label */}
      <p
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ color: 'var(--lp-glow)', fontFamily: 'var(--font-geist-sans, monospace)' }}
      >
        STEP {stepIndex + 1}&#x3000;{step.day}
      </p>
      {/* Step title */}
      <h3
        className="text-lg md:text-xl font-bold"
        style={{ fontFamily: 'var(--lp-font-serif), serif', color: 'var(--lp-ink)' }}
      >
        {step.title}
      </h3>
      {/* Step body */}
      <p className="text-sm md:text-base leading-relaxed max-w-xs" style={{ color: 'var(--lp-ink-soft)' }}>
        {step.body}
      </p>
    </div>
  )
}
