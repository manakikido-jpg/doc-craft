import { SITE_NAME, SITE_TAGLINE } from '../copy'

/**
 * S10 — LpFooter
 * Server Component. Dark deep-green band (--lp-deep).
 * Copy from plan §3 S10.
 */
export function LpFooter() {
  return (
    <footer className="lp-section-deep" role="contentinfo">
      <div className="lp-container">
        <div className="py-12 md:py-16 flex flex-col items-center gap-8 text-center">
          {/* Brand */}
          <div className="flex flex-col items-center gap-2">
            <p
              className="text-2xl font-bold tracking-wide"
              style={{ fontFamily: 'var(--lp-font-serif), serif', color: 'var(--lp-deep-text)' }}
            >
              {SITE_NAME}
            </p>
            <p className="text-sm" style={{ color: 'rgba(250,246,239,0.65)' }}>
              {SITE_NAME}｜{SITE_TAGLINE}
            </p>
          </div>

          {/* Divider */}
          <div className="w-24 h-px" style={{ backgroundColor: 'rgba(228,218,202,0.25)' }} />

          {/* Nav links */}
          <nav aria-label="フッターナビゲーション">
            <ul className="flex flex-wrap justify-center gap-6 md:gap-8">
              {[
                { label: '運営会社', href: '#' },
                { label: 'プライバシーポリシー', href: '#' },
                { label: 'お問い合わせ', href: '#' },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-sm transition-opacity duration-200 hover:opacity-80"
                    style={{ color: 'rgba(250,246,239,0.7)', textDecoration: 'none' }}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Copyright */}
          <p className="text-xs" style={{ color: 'rgba(250,246,239,0.4)' }}>
            © 2026 {SITE_NAME}
          </p>
        </div>
      </div>
    </footer>
  )
}
