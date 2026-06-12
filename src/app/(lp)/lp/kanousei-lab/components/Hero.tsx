import { CtaButton } from './CtaButton'
import { HeroVisual } from './HeroVisual'
import { CTA_PRIMARY_LABEL, CTA_MICROCOPY } from '../copy'

/**
 * S1 — Hero
 * Server Component. Left: copy + CTA. Right: HeroVisual (compass SVG).
 * Copy is exact from plan §3.
 */
export function Hero() {
  return (
    <section className="lp-section" aria-labelledby="hero-heading">
      <div className="lp-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Left column: copy ── */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {/* Upper label */}
            <p className="lp-label">国家資格キャリアコンサルタントによる、無料1on1</p>

            {/* H1 */}
            <h1
              id="hero-heading"
              className="text-3xl md:text-4xl xl:text-5xl font-bold leading-snug tracking-tight"
              style={{ fontFamily: 'var(--lp-font-serif), serif', color: 'var(--lp-ink)' }}
            >
              {'「転職したい。でも、何から始めればいいか分からない」'}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl font-medium" style={{ color: 'var(--lp-ink-soft)' }}>
              {'そんなあなたへ。まずは3つの質問に答えるだけ。あなたの“市場価値”が見えてきます。'}
            </p>

            {/* Body copy */}
            <p className="text-base leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>
              可能性ラボは、20〜30代の転職を考えるあなたのための無料キャリアコーチング。プロのキャリアコンサルタントが、あなたの強みと進む道を一緒に見つけます。
            </p>

            {/* Primary CTA + microcopy */}
            <div className="flex flex-col items-start gap-3">
              <CtaButton variant="primary" size="lg" eventName="hero_cta_click">
                {CTA_PRIMARY_LABEL}
              </CtaButton>
              <p className="text-sm" style={{ color: 'var(--lp-ink-soft)' }}>
                {CTA_MICROCOPY}
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-2" role="list" aria-label="信頼の実績">
              {[
                { icon: '✓', label: '国家資格保有のコンサルタント' },
                { icon: '✓', label: '相談料0円' },
                { icon: '✓', label: 'オンライン完結' },
              ].map(({ icon, label }) => (
                <div key={label} className="lp-badge" role="listitem">
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: 'var(--lp-accent)' }}
                    aria-hidden="true"
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: visual ── */}
          <div className="relative flex items-center justify-center order-first lg:order-last" aria-hidden="true">
            {/* Warm glow behind the visual */}
            <div
              className="absolute inset-0 rounded-full opacity-30 blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--lp-glow) 0%, transparent 70%)' }}
            />
            <div className="relative w-full max-w-xs md:max-w-sm lg:max-w-full">
              <HeroVisual />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
