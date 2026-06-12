import { Zen_Old_Mincho } from 'next/font/google'
import './lp.css'

/**
 * Zen Old Mincho — primary serif for LP headings.
 * Fallback chain (plan §1): Shippori Mincho → Noto Serif JP → Georgia.
 * subsets: ['latin'] only (per plan §1 spec).
 */
const zenOldMincho = Zen_Old_Mincho({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--lp-font-serif',
  fallback: ['Shippori Mincho', 'Noto Serif JP', 'Georgia', 'serif'],
})

/**
 * GTM noscript — env-gated.
 * Renders nothing when NEXT_PUBLIC_GTM_ID is unset or empty.
 * Per plan §5: never inject a placeholder/dummy ID into a real snippet.
 */
function GtmNoscript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  if (!gtmId) return null

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}

export default function LpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* GTM noscript must be placed immediately after opening body tag.
          Since we cannot edit <body> (root layout owns it), we place it as
          the first child rendered by this layout, which Next.js hoists
          into the body stream before any other LP content. */}
      <GtmNoscript />
      <div
        className={zenOldMincho.variable}
        style={
          {
            '--lp-font-serif': `var(${zenOldMincho.variable})`,
          } as React.CSSProperties
        }
      >
        {/*
         * .lp-root provides:
         *  - full-bleed light background (overrides dark body from globals.css)
         *  - all --lp-* CSS variable definitions (see lp.css)
         *  - --lp-font-serif set to the loaded Zen Old Mincho variable
         */}
        <div className="lp-root">{children}</div>
      </div>
    </>
  )
}
