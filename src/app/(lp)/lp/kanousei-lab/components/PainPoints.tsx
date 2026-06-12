/**
 * S2 — PainPoints
 * Server Component. 4 speech-bubble / sticky-note cards with warm borders,
 * staggered layout, closing line.
 * Copy exact from plan §3 S2.
 */
export function PainPoints() {
  const cards = [
    { text: '今の年収、本当に適正なのか分からない', rotate: '-rotate-1' },
    { text: '営業を続けるべきか、別の道もあるのか', rotate: 'rotate-1' },
    { text: '未経験の職種に挑戦したいけど、自信がない', rotate: '-rotate-1' },
    { text: '転職サイトを開いては、そっと閉じてしまう', rotate: 'rotate-1' },
  ]

  return (
    <section className="lp-section lp-section-alt" aria-labelledby="pain-heading">
      <div className="lp-container">
        {/* Heading */}
        <h2 id="pain-heading" className="lp-h2 text-center mb-12">
          こんなモヤモヤ、抱えていませんか？
        </h2>

        {/* Cards grid — staggered with slight rotation */}
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 list-none p-0 m-0"
          role="list"
          aria-label="よくある転職の悩み"
        >
          {cards.map(({ text, rotate }, i) => (
            <li key={i} className={['lp-card flex items-start gap-4 transition-transform', rotate].join(' ')}>
              {/* Speech bubble tail indicator — small terracotta quote mark */}
              <span
                className="text-3xl leading-none flex-shrink-0 mt-1 select-none"
                style={{ color: 'var(--lp-glow)', fontFamily: 'Georgia, serif' }}
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <p className="text-base md:text-lg font-medium leading-relaxed" style={{ color: 'var(--lp-ink)' }}>
                {text}
              </p>
            </li>
          ))}
        </ul>

        {/* Closing line */}
        <div className="mt-12 text-center">
          {/* Decorative separator line */}
          <div className="flex items-center justify-center gap-4 mb-6" aria-hidden="true">
            <div className="h-px flex-1 max-w-24" style={{ backgroundColor: 'var(--lp-line)' }} />
            {/* Small terracotta dot — 一灯 motif */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="5" fill="var(--lp-glow)" opacity="0.7" />
            </svg>
            <div className="h-px flex-1 max-w-24" style={{ backgroundColor: 'var(--lp-line)' }} />
          </div>
          <p className="text-base md:text-lg font-semibold" style={{ color: 'var(--lp-ink)' }}>
            ひとつでも当てはまるなら、それは&ldquo;動き出すサイン&rdquo;かもしれません。
          </p>
        </div>
      </div>
    </section>
  )
}
