/**
 * HeroVisual — signature inline SVG for S1 Hero.
 * Concept: 「一灯のコンパス」— a compass rose with a single warm light (terracotta glow).
 * Hand-crafted feeling: fine strokes, radial warmth, washi texture suggestion.
 * aria-hidden: true — decorative only.
 */
export function HeroVisual() {
  return (
    <div className="flex items-center justify-center w-full h-full" aria-hidden="true">
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-sm md:max-w-md"
        aria-hidden="true"
        role="img"
      >
        <defs>
          {/* Radial glow — terracotta dawn light */}
          <radialGradient id="hero-glow" cx="50%" cy="48%" r="42%">
            <stop offset="0%" stopColor="var(--lp-glow)" stopOpacity="0.55" />
            <stop offset="40%" stopColor="var(--lp-glow)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--lp-glow)" stopOpacity="0" />
          </radialGradient>

          {/* Washi paper texture — faint noise circle */}
          <radialGradient id="paper-ring" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="var(--lp-bg-alt)" stopOpacity="0" />
            <stop offset="90%" stopColor="var(--lp-line)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--lp-line)" stopOpacity="0" />
          </radialGradient>

          {/* Compass outer ring gradient */}
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--lp-line)" />
            <stop offset="50%" stopColor="var(--lp-glow)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--lp-line)" />
          </linearGradient>

          {/* Soft shadow filter for the light dot */}
          <filter id="glow-filter" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Faint halo for the north needle tip */}
          <filter id="needle-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Background glow wash ── */}
        <circle cx="200" cy="192" r="160" fill="url(#hero-glow)" />
        <circle cx="200" cy="200" r="185" fill="url(#paper-ring)" />

        {/* ── Outer compass ring ── */}
        <circle cx="200" cy="200" r="148" fill="none" stroke="url(#ring-grad)" strokeWidth="1" strokeDasharray="4 6" />

        {/* ── Secondary ring ── */}
        <circle cx="200" cy="200" r="120" fill="none" stroke="var(--lp-line)" strokeWidth="0.75" opacity="0.6" />

        {/* ── Cardinal tick marks ── */}
        {/* North */}
        <line x1="200" y1="55" x2="200" y2="78" stroke="var(--lp-ink-soft)" strokeWidth="1.5" strokeLinecap="round" />
        {/* South */}
        <line x1="200" y1="322" x2="200" y2="345" stroke="var(--lp-line)" strokeWidth="1" strokeLinecap="round" />
        {/* East */}
        <line x1="322" y1="200" x2="345" y2="200" stroke="var(--lp-line)" strokeWidth="1" strokeLinecap="round" />
        {/* West */}
        <line x1="55" y1="200" x2="78" y2="200" stroke="var(--lp-line)" strokeWidth="1" strokeLinecap="round" />

        {/* ── Ordinal tick marks (minor) ── */}
        {[45, 135, 225, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180
          const x1 = 200 + Math.cos(rad) * 120
          const y1 = 200 + Math.sin(rad) * 120
          const x2 = 200 + Math.cos(rad) * 132
          const y2 = 200 + Math.sin(rad) * 132
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--lp-line)"
              strokeWidth="0.75"
              strokeLinecap="round"
            />
          )
        })}

        {/* ── Compass needle — North (terracotta, the single warm light) ── */}
        {/* North needle: points upward, terracotta flame shape */}
        <polygon
          points="200,72 193,200 200,188 207,200"
          fill="var(--lp-glow)"
          opacity="0.9"
          filter="url(#needle-glow)"
        />

        {/* South needle: ink-soft, smaller */}
        <polygon points="200,328 195,200 200,212 205,200" fill="var(--lp-ink-soft)" opacity="0.45" />

        {/* ── Compass center hub ── */}
        <circle cx="200" cy="200" r="10" fill="var(--lp-bg)" stroke="var(--lp-line)" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="3.5" fill="var(--lp-glow)" opacity="0.8" />

        {/* ── The single warm light — North tip glow ── */}
        <circle cx="200" cy="82" r="7" fill="var(--lp-glow)" opacity="0.85" filter="url(#glow-filter)" />
        <circle cx="200" cy="82" r="3.5" fill="#fff" opacity="0.9" />

        {/* ── Radiating light lines from the north light ── */}
        {[
          { angle: -90, len: 14 },
          { angle: -75, len: 9 },
          { angle: -105, len: 9 },
          { angle: -60, len: 5 },
          { angle: -120, len: 5 },
        ].map(({ angle, len }) => {
          const rad = (angle * Math.PI) / 180
          return (
            <line
              key={angle}
              x1={200 + Math.cos(rad) * 10}
              y1={82 + Math.sin(rad) * 10}
              x2={200 + Math.cos(rad) * (10 + len)}
              y2={82 + Math.sin(rad) * (10 + len)}
              stroke="var(--lp-glow)"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.55"
            />
          )
        })}

        {/* ── Cardinal direction labels ── */}
        <text
          x="200"
          y="46"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="var(--lp-glow)"
          letterSpacing="0.06em"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          N
        </text>
        <text
          x="200"
          y="362"
          textAnchor="middle"
          fontSize="10"
          fill="var(--lp-line)"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          S
        </text>
        <text
          x="360"
          y="205"
          textAnchor="middle"
          fontSize="10"
          fill="var(--lp-line)"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          E
        </text>
        <text
          x="40"
          y="205"
          textAnchor="middle"
          fontSize="10"
          fill="var(--lp-line)"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          W
        </text>

        {/* ── Subtle "道" path line descending from center ── */}
        <line
          x1="200"
          y1="210"
          x2="200"
          y2="320"
          stroke="var(--lp-line)"
          strokeWidth="1"
          strokeDasharray="2 6"
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
