'use client'

/**
 * Analytics — env-gated client component.
 *
 * Renders GTM and Microsoft Clarity scripts ONLY when the respective
 * environment variables are set to non-empty values:
 *   - NEXT_PUBLIC_GTM_ID   → Google Tag Manager (also covers GA4 via GTM)
 *   - NEXT_PUBLIC_CLARITY_ID → Microsoft Clarity
 *
 * When either variable is absent or empty, the corresponding script is NOT
 * injected. This prevents console errors and phantom hits from placeholder IDs.
 *
 * Per plan §5: NEVER inject the dummy placeholder IDs from constants.ts as
 * live analytics snippets.
 *
 * CV event reference (for GTM trigger configuration):
 *   - "cta_line_friend" — fired via window.dataLayer.push when user clicks
 *     any primary CTA (LINEで無料の市場価値診断を受ける). Implemented in CtaButton.tsx.
 *   - "cta_booking"     — fired via window.dataLayer.push when user clicks
 *     the secondary booking CTA. Implemented in CtaButton.tsx.
 *   - "診断完了"         — LINE-side event. Fires after the user completes the
 *     3-question diagnosis inside the LINE conversation. NOT fired from this LP.
 *     Future measurement point: implement webhook-based postback or LINE
 *     Messaging API event forwarding to capture completion on the LP side.
 */

import Script from 'next/script'

export function Analytics() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  // If neither analytics service is configured, render nothing at all.
  if (!gtmId && !clarityId) {
    return null
  }

  return (
    <>
      {/* ── Google Tag Manager ── */}
      {gtmId && (
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
            `.trim(),
          }}
        />
      )}

      {/* ── Microsoft Clarity ── */}
      {clarityId && (
        <Script
          id="clarity-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${clarityId}");
            `.trim(),
          }}
        />
      )}
    </>
  )
}
