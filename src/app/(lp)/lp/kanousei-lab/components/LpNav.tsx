'use client'

import { CtaButton } from './CtaButton'
import { CTA_NAV_LABEL, SITE_NAME } from '../copy'

/**
 * S0 — LpNav
 * Sticky, client component. Semi-transparent washi paper bar.
 * Left: site logo in serif. Right: compact primary CTA.
 */
export function LpNav() {
  return (
    <header className="lp-nav" role="banner">
      <div className="lp-container">
        <nav className="flex items-center justify-between py-3 md:py-4" aria-label="サイトナビゲーション">
          {/* Logo */}
          <a
            href="/lp/kanousei-lab"
            className="text-xl font-bold tracking-wide no-underline"
            style={{
              fontFamily: 'var(--lp-font-serif), serif',
              color: 'var(--lp-ink)',
            }}
            aria-label={`${SITE_NAME} トップへ`}
          >
            {SITE_NAME}
          </a>

          {/* Primary CTA — compact */}
          <CtaButton variant="primary" className="text-sm px-4 py-2.5 rounded-lg shadow-none" eventName="nav_cta_click">
            {CTA_NAV_LABEL}
          </CtaButton>
        </nav>
      </div>
    </header>
  )
}
