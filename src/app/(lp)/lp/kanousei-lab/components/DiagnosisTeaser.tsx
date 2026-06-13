import { CtaButton } from './CtaButton'
import { CTA_PRIMARY_LABEL } from '../copy'

/**
 * S3 — DiagnosisTeaser
 * Server Component.
 * Large central teaser card for the 3-question market-value diagnosis.
 * Motif: compass SVG + large 「3問」 emphasis.
 * Copy: exact from plan §3.
 */
export function DiagnosisTeaser() {
  return (
    <section className="lp-section lp-section-alt" aria-labelledby="diagnosis-heading">
      <div className="lp-container">
        {/* Central teaser card */}
        <div className="lp-card mx-auto max-w-3xl" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
          {/* Compass SVG + 3問 emphasis — decorative motif */}
          <div className="flex flex-col items-center gap-4 mb-8" aria-hidden="true">
            {/* Compact compass with the single warm light */}
            <svg
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              className="w-28 h-28 md:w-36 md:h-36"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="diag-glow" cx="50%" cy="40%" r="40%">
                  <stop offset="0%" stopColor="#e0742f" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#e0742f" stopOpacity="0" />
                </radialGradient>
                <filter id="diag-light" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background glow */}
              <circle cx="100" cy="96" r="80" fill="url(#diag-glow)" />

              {/* Outer ring */}
              <circle cx="100" cy="100" r="74" fill="none" stroke="#e4daca" strokeWidth="0.75" strokeDasharray="3 5" />

              {/* Inner ring */}
              <circle cx="100" cy="100" r="58" fill="none" stroke="#e4daca" strokeWidth="0.5" opacity="0.6" />

              {/* Cardinal ticks */}
              <line x1="100" y1="27" x2="100" y2="40" stroke="#5c544b" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="100" y1="160" x2="100" y2="173" stroke="#e4daca" strokeWidth="1" strokeLinecap="round" />
              <line x1="160" y1="100" x2="173" y2="100" stroke="#e4daca" strokeWidth="1" strokeLinecap="round" />
              <line x1="27" y1="100" x2="40" y2="100" stroke="#e4daca" strokeWidth="1" strokeLinecap="round" />

              {/* North needle (terracotta) */}
              <polygon points="100,36 95,100 100,92 105,100" fill="#e0742f" opacity="0.9" filter="url(#diag-light)" />

              {/* South needle */}
              <polygon points="100,164 97,100 100,108 103,100" fill="#5c544b" opacity="0.4" />

              {/* Center hub */}
              <circle cx="100" cy="100" r="6" fill="#faf6ef" stroke="#e4daca" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="2.5" fill="#e0742f" opacity="0.8" />

              {/* North light — the single warm glow */}
              <circle cx="100" cy="41" r="5" fill="#e0742f" opacity="0.85" filter="url(#diag-light)" />
              <circle cx="100" cy="41" r="2.5" fill="#fff" opacity="0.9" />

              {/* Radiating lines from north light */}
              <line
                x1="100"
                y1="31"
                x2="100"
                y2="24"
                stroke="#e0742f"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.5"
              />
              <line
                x1="107"
                y1="34"
                x2="112"
                y2="29"
                stroke="#e0742f"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.4"
              />
              <line
                x1="93"
                y1="34"
                x2="88"
                y2="29"
                stroke="#e0742f"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.4"
              />
            </svg>

            {/* Large 「3問」 emphasis */}
            <div className="flex items-baseline gap-1">
              <span
                className="font-bold leading-none"
                style={{
                  fontSize: 'clamp(3rem, 10vw, 5rem)',
                  color: 'var(--lp-glow)',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  lineHeight: 1,
                }}
              >
                3
              </span>
              <span
                className="font-bold"
                style={{
                  fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
                  color: 'var(--lp-ink)',
                  fontFamily: 'var(--lp-font-serif), serif',
                }}
              >
                問
              </span>
            </div>
          </div>

          {/* Heading — h2 */}
          <h2 id="diagnosis-heading" className="lp-h2 mb-4">
            まずは、たった3問の「市場価値診断」から。
          </h2>

          {/* Body copy */}
          <p
            className="text-base md:text-lg mb-8 mx-auto"
            style={{ color: 'var(--lp-ink-soft)', maxWidth: '44rem', lineHeight: '1.8' }}
          >
            転職の第一歩は、自分を知ること。LINEで3つの質問に答えるだけで、あなたの市場価値とキャリアの方向性を、国家資格キャリアコンサルタントが翌日までに無料でフィードバックします。
          </p>

          {/* Bullet list */}
          <ul
            className="text-left mx-auto mb-8 flex flex-col gap-3"
            style={{ maxWidth: '32rem', color: 'var(--lp-ink-soft)' }}
            aria-label="診断の特徴"
          >
            {[
              '面談の前に、まず自分の現在地が分かる',
              'その場で売り込まれることはありません',
              '結果は翌日、あなた専用のコメントでお届け',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: 'var(--lp-accent)' }}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Primary CTA */}
          <div className="flex justify-center">
            <CtaButton variant="primary" size="lg">
              {CTA_PRIMARY_LABEL}
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  )
}
