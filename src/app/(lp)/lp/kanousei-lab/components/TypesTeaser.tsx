/**
 * S5 — TypesTeaser
 * Server Component.
 * 16-type career teaser with compass figure (4 axes as cardinal directions).
 * Copy: exact from plan §3.
 */
export function TypesTeaser() {
  /** Type-name chips — representative examples from 16 types */
  const typeChips = ['未来の指揮官', '人を灯す案内人', '…など全16タイプ']

  /** 4-axis compass label mapping: cardinal direction → axis label */
  const axes = [
    { dir: 'N', label: '創造', x: 100, y: 12, textX: 100, textY: 8, tickX1: 100, tickY1: 26, tickX2: 100, tickY2: 38 },
    {
      dir: 'S',
      label: '実行',
      x: 100,
      y: 188,
      textX: 100,
      textY: 196,
      tickX1: 100,
      tickY1: 162,
      tickX2: 100,
      tickY2: 174,
    },
    {
      dir: 'E',
      label: '対人',
      x: 188,
      y: 100,
      textX: 196,
      textY: 104,
      tickX1: 162,
      tickY1: 100,
      tickX2: 174,
      tickY2: 100,
    },
    { dir: 'W', label: '内省', x: 12, y: 100, textX: 4, textY: 104, tickX1: 26, tickY1: 100, tickX2: 38, tickY2: 100 },
  ]

  return (
    <section className="lp-section" aria-labelledby="types-heading">
      <div className="lp-container">
        <div className="flex flex-col items-center gap-10 md:gap-14">
          {/* Heading */}
          <div className="text-center">
            <h2 id="types-heading" className="lp-h2 mb-4">
              あなたは16タイプのうち、どの「キャリアの星」？
            </h2>
            <p
              className="text-base md:text-lg mx-auto"
              style={{ color: 'var(--lp-ink-soft)', maxWidth: '38rem', lineHeight: '1.8' }}
            >
              可能性ラボ独自の職業タイプ診断は、4つの軸からあなたの働き方の個性を読み解きます。
            </p>
          </div>

          {/* Compass figure — 4 axes as cardinal directions */}
          <div className="flex flex-col items-center gap-8" aria-hidden="true">
            {/* Compass SVG with 4-axis labels */}
            <svg
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              className="w-56 h-56 md:w-72 md:h-72"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="types-glow" cx="50%" cy="50%" r="45%">
                  <stop offset="0%" stopColor="#e0742f" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#e0742f" stopOpacity="0" />
                </radialGradient>
                <filter id="types-light" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Soft background glow */}
              <circle cx="100" cy="100" r="90" fill="url(#types-glow)" />

              {/* Outer ring (dashed) */}
              <circle cx="100" cy="100" r="78" fill="none" stroke="#e4daca" strokeWidth="0.75" strokeDasharray="3 5" />

              {/* Inner ring */}
              <circle cx="100" cy="100" r="55" fill="none" stroke="#e4daca" strokeWidth="0.5" opacity="0.5" />

              {/* Cross axes — the 4 cardinal directions */}
              {/* Vertical axis (N–S) */}
              <line x1="100" y1="22" x2="100" y2="178" stroke="#e4daca" strokeWidth="1" opacity="0.7" />
              {/* Horizontal axis (E–W) */}
              <line x1="22" y1="100" x2="178" y2="100" stroke="#e4daca" strokeWidth="1" opacity="0.7" />

              {/* Diagonal cross — softer */}
              <line x1="45" y1="45" x2="155" y2="155" stroke="#e4daca" strokeWidth="0.5" opacity="0.35" />
              <line x1="155" y1="45" x2="45" y2="155" stroke="#e4daca" strokeWidth="0.5" opacity="0.35" />

              {/* Cardinal axis tick marks */}
              {axes.map((ax) => (
                <line
                  key={ax.dir}
                  x1={ax.tickX1}
                  y1={ax.tickY1}
                  x2={ax.tickX2}
                  y2={ax.tickY2}
                  stroke="#5c544b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ))}

              {/* Axis labels */}
              {axes.map((ax) => (
                <text
                  key={`label-${ax.dir}`}
                  x={ax.textX}
                  y={ax.textY}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="#5c544b"
                  fontFamily="var(--font-geist-sans, system-ui, sans-serif)"
                  letterSpacing="0.04em"
                >
                  {ax.label}
                </text>
              ))}

              {/* Ordinal tick marks */}
              {[45, 135, 225, 315].map((angle) => {
                const rad = (angle * Math.PI) / 180
                const x1 = 100 + Math.cos(rad) * 55
                const y1 = 100 + Math.sin(rad) * 55
                const x2 = 100 + Math.cos(rad) * 64
                const y2 = 100 + Math.sin(rad) * 64
                return (
                  <line
                    key={angle}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#e4daca"
                    strokeWidth="0.75"
                    strokeLinecap="round"
                  />
                )
              })}

              {/* North needle (terracotta — the lit direction) */}
              <polygon points="100,36 96,100 100,92 104,100" fill="#e0742f" opacity="0.85" filter="url(#types-light)" />

              {/* South needle */}
              <polygon points="100,164 97.5,100 100,108 102.5,100" fill="#5c544b" opacity="0.35" />

              {/* East needle */}
              <polygon points="164,100 100,96 108,100 100,104" fill="#5c544b" opacity="0.25" />

              {/* West needle */}
              <polygon points="36,100 100,96 92,100 100,104" fill="#5c544b" opacity="0.25" />

              {/* Center hub */}
              <circle cx="100" cy="100" r="7" fill="#faf6ef" stroke="#e4daca" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="3" fill="#e0742f" opacity="0.8" />

              {/* North light — warm glow */}
              <circle cx="100" cy="41" r="5" fill="#e0742f" opacity="0.8" filter="url(#types-light)" />
              <circle cx="100" cy="41" r="2.5" fill="#fff" opacity="0.85" />

              {/* 16 small dots at cardinal/ordinal positions on inner ring */}
              {Array.from({ length: 16 }, (_, i) => {
                const angle = (i * 360) / 16
                const rad = ((angle - 90) * Math.PI) / 180
                const x = 100 + Math.cos(rad) * 55
                const y = 100 + Math.sin(rad) * 55
                const isCardinal = i % 4 === 0
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isCardinal ? 2.5 : 1.5}
                    fill={isCardinal ? '#e0742f' : '#e4daca'}
                    opacity={isCardinal ? 0.7 : 0.5}
                  />
                )
              })}
            </svg>
          </div>

          {/* Type-name chips */}
          <div className="flex flex-wrap justify-center gap-3" aria-label="タイプ例">
            {typeChips.map((chip, i) => (
              <span
                key={chip}
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: i === typeChips.length - 1 ? 'transparent' : 'var(--lp-bg-alt)',
                  border: `1px solid ${i === typeChips.length - 1 ? 'var(--lp-line)' : 'var(--lp-line)'}`,
                  color: i === typeChips.length - 1 ? 'var(--lp-ink-soft)' : 'var(--lp-ink)',
                  fontStyle: i === typeChips.length - 1 ? 'italic' : 'normal',
                }}
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Supplementary note */}
          <p className="text-sm text-center" style={{ color: 'var(--lp-ink-soft)' }}>
            診断を受けた方には、あなたのタイプもあわせてお伝えします。
          </p>
        </div>
      </div>
    </section>
  )
}
