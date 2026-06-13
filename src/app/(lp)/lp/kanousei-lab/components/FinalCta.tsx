import { CtaButton } from './CtaButton'
import { CTA_PRIMARY_LABEL, CTA_SECONDARY_INLINE_LABEL, CTA_MICROCOPY_FINAL } from '../copy'

/**
 * S9 — FinalCta
 * Server Component.
 * Full-width climax section using --lp-bg-alt background.
 * Motif: large radial glow SVG — the "single light fully lit" payoff.
 * Copy: exact from plan §3.
 * - PRIMARY large CtaButton
 * - SECONDARY text link (subdued, SECONDARY_BOOKING_URL via CtaButton variant="secondary")
 * - Microcopy line
 */
export function FinalCta() {
  return (
    <section
      className="lp-section lp-section-alt"
      aria-labelledby="final-cta-heading"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Large radial glow SVG — the climax "single light fully lit" motif */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <svg
          viewBox="0 0 800 600"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
          }}
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Central radial glow — warm terracotta, large and diffuse */}
            <radialGradient id="final-glow-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0742f" stopOpacity="0.22" />
              <stop offset="35%" stopColor="#e0742f" stopOpacity="0.10" />
              <stop offset="65%" stopColor="#e0742f" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#e0742f" stopOpacity="0" />
            </radialGradient>

            {/* Secondary warm ring */}
            <radialGradient id="final-glow-outer" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#faf6ef" stopOpacity="0" />
              <stop offset="55%" stopColor="#e0742f" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#e0742f" stopOpacity="0" />
            </radialGradient>

            {/* Light burst filter */}
            <filter id="final-burst" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Full-canvas glow wash */}
          <rect x="0" y="0" width="800" height="600" fill="url(#final-glow-core)" />
          <rect x="0" y="0" width="800" height="600" fill="url(#final-glow-outer)" />

          {/* The single warm light — now fully lit, large and luminous */}
          <circle cx="400" cy="300" r="48" fill="#e0742f" opacity="0.15" filter="url(#final-burst)" />
          <circle cx="400" cy="300" r="24" fill="#e0742f" opacity="0.20" filter="url(#final-burst)" />
          <circle cx="400" cy="300" r="10" fill="#e0742f" opacity="0.40" />
          <circle cx="400" cy="300" r="4" fill="#fff" opacity="0.70" />

          {/* Radiating spokes — fully opened compass */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30 * Math.PI) / 180
            const inner = 16
            const outer = 60 + (i % 3 === 0 ? 30 : 0)
            return (
              <line
                key={i}
                x1={400 + Math.cos(angle) * inner}
                y1={300 + Math.sin(angle) * inner}
                x2={400 + Math.cos(angle) * outer}
                y2={300 + Math.sin(angle) * outer}
                stroke="#e0742f"
                strokeWidth={i % 3 === 0 ? 1.2 : 0.6}
                strokeLinecap="round"
                opacity={i % 3 === 0 ? 0.3 : 0.15}
              />
            )
          })}

          {/* Outer compass ring — full circle, fully revealed */}
          <circle
            cx="400"
            cy="300"
            r="120"
            fill="none"
            stroke="#e0742f"
            strokeWidth="0.5"
            strokeDasharray="4 8"
            opacity="0.18"
          />
        </svg>
      </div>

      {/* Content — layered above the glow */}
      <div className="lp-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex flex-col items-center gap-8 text-center">
          {/* H2 */}
          <h2 id="final-cta-heading" className="lp-h2" style={{ maxWidth: '34rem', margin: '0 auto' }}>
            あなたの可能性は、まだ言葉になっていないだけ。
          </h2>

          {/* Body copy */}
          <p
            className="text-base md:text-lg mx-auto"
            style={{
              color: 'var(--lp-ink-soft)',
              maxWidth: '36rem',
              lineHeight: '1.8',
            }}
          >
            転職するかどうかは、その後で決めれば大丈夫。まずは3つの質問から、はじめの一歩を踏み出してみませんか。
          </p>

          {/* Primary CTA — large */}
          <div className="flex flex-col items-center gap-4">
            <CtaButton variant="primary" size="lg">
              {CTA_PRIMARY_LABEL}
            </CtaButton>

            {/* Microcopy */}
            <p className="text-sm" style={{ color: 'var(--lp-ink-soft)' }}>
              {CTA_MICROCOPY_FINAL}
            </p>
          </div>

          {/* SECONDARY text link — subdued */}
          <CtaButton variant="secondary" className="text-sm">
            {CTA_SECONDARY_INLINE_LABEL}
          </CtaButton>
        </div>
      </div>
    </section>
  )
}
