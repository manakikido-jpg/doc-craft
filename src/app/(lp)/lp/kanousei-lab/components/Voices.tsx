/**
 * S7 — Voices
 * Server Component. 3 quote cards with before/after label chips.
 *
 * ⚠️ IMPORTANT: The quotes and results below are ILLUSTRATIVE EXAMPLE COPY
 * created for design purposes only. They do NOT represent real client results,
 * testimonials, or outcomes. Replace with verified real testimonials before launch.
 */

interface Voice {
  quote: string
  profile: string
  result: string
}

// ILLUSTRATIVE COPY — not real client testimonials. See component-level comment above.
const VOICES: Voice[] = [
  {
    quote: '「何から始めればいいか分からなかったけど、診断で自分の強みがはっきりしました」',
    profile: '20代・営業職',
    result: '年収 +60万円',
  },
  {
    quote: '「営業の経験が、別の職種でも武器になると気づけた」',
    profile: '30代・法人営業',
    result: '未経験職種へキャリアチェンジ',
  },
  {
    quote: '「売り込まれるのが不安だったけど、本当に親身でした」',
    profile: '20代・販売職',
    result: '面談から2週間で内定',
  },
]

export function Voices() {
  return (
    <section className="lp-section lp-section-alt" aria-labelledby="voices-heading">
      <div className="lp-container">
        {/* Heading */}
        <h2 id="voices-heading" className="lp-h2 text-center mb-12">
          相談した方の声
        </h2>

        {/* Quote cards grid */}
        <ul
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 list-none p-0 m-0"
          role="list"
          aria-label="相談者の声"
        >
          {VOICES.map(({ quote, profile, result }, i) => (
            <li key={i} className="lp-card flex flex-col gap-4">
              {/* Large opening quote mark — decorative */}
              <span
                className="text-5xl leading-none select-none block"
                style={{ color: 'var(--lp-glow)', fontFamily: 'Georgia, serif', opacity: 0.5 }}
                aria-hidden="true"
              >
                &ldquo;
              </span>

              {/* Quote text */}
              <blockquote
                className="text-base md:text-lg font-medium leading-relaxed flex-1"
                style={{ color: 'var(--lp-ink)' }}
              >
                {quote}
              </blockquote>

              {/* Profile + result chip row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: 'var(--lp-line)' }}>
                {/* Profile */}
                <p className="text-sm font-medium" style={{ color: 'var(--lp-ink-soft)' }}>
                  {profile}
                </p>

                {/* Before/After result chip */}
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(31, 122, 90, 0.1)',
                    color: 'var(--lp-accent)',
                    border: '1px solid rgba(31, 122, 90, 0.2)',
                  }}
                >
                  {/* Small upward arrow icon */}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M5 8V2M5 2L2 5M5 2L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {result}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* Disclaimer — links to the important code comment */}
        <p className="mt-8 text-xs text-center" style={{ color: 'var(--lp-ink-soft)', opacity: 0.7 }}>
          ※ 掲載の声・実績は例示コピーです。実際の顧客結果を保証するものではありません。
        </p>
      </div>
    </section>
  )
}
