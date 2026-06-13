/**
 * S6 — ReasonsBand
 * Server Component. Full-width --lp-deep (deep green-ink) inverted band.
 * #FAF6EF text, 3 columns with exact copy from plan §3.
 * Small inline SVG icons (aria-hidden) designed inline.
 */

interface Reason {
  title: string
  body: string
  icon: React.ReactNode
}

const REASONS: Reason[] = [
  {
    title: '国家資格をもつプロが対応',
    body: 'キャリア相談の国家資格「キャリアコンサルタント」を保有する専門家が、あなた一人ひとりに向き合います。',
    icon: (
      // Graduation cap / credential icon
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="14"
          width="24"
          height="12"
          rx="3"
          fill="rgba(250,246,239,0.15)"
          stroke="rgba(250,246,239,0.6)"
          strokeWidth="1.5"
        />
        <path
          d="M16 4L28 11L16 18L4 11L16 4Z"
          fill="rgba(250,246,239,0.15)"
          stroke="rgba(250,246,239,0.6)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="11" r="2" fill="var(--lp-glow)" />
        <line x1="28" y1="11" x2="28" y2="20" stroke="rgba(250,246,239,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="28" cy="21" r="2" fill="rgba(250,246,239,0.5)" />
      </svg>
    ),
  },
  {
    title: '相談はすべて無料',
    body: '診断も面談も0円。費用を気にせず、まずは話してみることから始められます。',
    icon: (
      // Gift / zero-cost icon — circle with ¥0
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="12" fill="rgba(250,246,239,0.1)" stroke="rgba(250,246,239,0.6)" strokeWidth="1.5" />
        <text
          x="16"
          y="21"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--lp-glow)"
          fontFamily="system-ui, sans-serif"
          letterSpacing="-0.5"
        >
          ¥0
        </text>
      </svg>
    ),
  },
  {
    title: 'オンラインで完結',
    body: 'LINEとZoomで、自宅からあなたのペースで。忙しくても続けられます。',
    icon: (
      // Monitor + chat bubble icon
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="6"
          width="18"
          height="13"
          rx="2.5"
          fill="rgba(250,246,239,0.15)"
          stroke="rgba(250,246,239,0.6)"
          strokeWidth="1.5"
        />
        <line x1="13" y1="19" x2="13" y2="23" stroke="rgba(250,246,239,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9" y1="23" x2="17" y2="23" stroke="rgba(250,246,239,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <rect
          x="20"
          y="14"
          width="8"
          height="7"
          rx="2"
          fill="rgba(250,246,239,0.15)"
          stroke="rgba(224,116,47,0.7)"
          strokeWidth="1.5"
        />
        <circle cx="22" cy="17.5" r="1" fill="var(--lp-glow)" />
        <circle cx="24" cy="17.5" r="1" fill="var(--lp-glow)" />
        <circle cx="26" cy="17.5" r="1" fill="var(--lp-glow)" />
        <path d="M22 21L20 24" stroke="rgba(224,116,47,0.7)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function ReasonsBand() {
  return (
    <section className="lp-section lp-section-deep" aria-labelledby="reasons-heading">
      <div className="lp-container">
        {/* Heading */}
        <h2 id="reasons-heading" className="lp-h2 text-center mb-12" style={{ color: 'var(--lp-deep-text)' }}>
          可能性ラボが選ばれる理由
        </h2>

        {/* 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {REASONS.map(({ title, body, icon }, i) => (
            <div
              key={i}
              className="flex flex-col items-center md:items-start text-center md:text-left gap-4 p-6 rounded-2xl"
              style={{
                backgroundColor: 'rgba(250, 246, 239, 0.05)',
                border: '1px solid rgba(250, 246, 239, 0.1)',
              }}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
                style={{ backgroundColor: 'rgba(250, 246, 239, 0.08)' }}
                aria-hidden="true"
              >
                {icon}
              </div>

              {/* Title */}
              <h3
                className="text-xl font-bold"
                style={{ fontFamily: 'var(--lp-font-serif), serif', color: 'var(--lp-deep-text)' }}
              >
                {title}
              </h3>

              {/* Body */}
              <p className="text-sm md:text-base leading-relaxed" style={{ color: 'rgba(250, 246, 239, 0.8)' }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
