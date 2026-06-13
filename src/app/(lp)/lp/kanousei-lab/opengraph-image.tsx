import { ImageResponse } from 'next/og'

/**
 * OG image for /lp/kanousei-lab — plan §4 / §3.
 *
 * Generated with ImageResponse (next/og / @vercel/og / satori).
 * Constraints:
 *   - ImageResponse supports flexbox only; no CSS grid, no external fonts required.
 *   - Washi background: #FAF6EF
 *   - Single warm light motif: terracotta (#E0742F) radial glow
 *   - Headline: 「無料キャリア診断｜可能性ラボ」
 *   - Subline:  「国家資格キャリアコンサルタントが伴走」
 */

// Image metadata — required named exports per Next.js opengraph-image convention
export const alt = '無料キャリア診断｜可能性ラボ｜国家資格キャリアコンサルタントが伴走'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Image generation — default export must be a function returning ImageResponse
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF6EF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Washi texture suggestion — faint warm circle */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,116,47,0.12) 0%, rgba(224,116,47,0.04) 40%, transparent 70%)',
        }}
      />

      {/* Outer decorative ring — compass motif */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          height: 520,
          borderRadius: '50%',
          border: '1px solid rgba(228,218,202,0.6)',
        }}
      />

      {/* Inner ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: '1px solid rgba(228,218,202,0.4)',
        }}
      />

      {/* The single warm light — center glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,116,47,0.55) 0%, rgba(224,116,47,0.20) 40%, transparent 70%)',
        }}
      />

      {/* Light dot core */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#E0742F',
          opacity: 0.85,
        }}
      />

      {/* Content — centered above the glow */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        {/* Site label */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: '#5C544B',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          可能性ラボ
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            color: '#2A2622',
            lineHeight: 1.3,
            letterSpacing: '0.02em',
          }}
        >
          無料キャリア診断
        </div>

        {/* Divider */}
        <div
          style={{
            width: 64,
            height: 2,
            backgroundColor: '#E0742F',
            opacity: 0.6,
            borderRadius: 2,
          }}
        />

        {/* Subline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: '#5C544B',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
          }}
        >
          国家資格キャリアコンサルタントが伴走
        </div>

        {/* Trust badge row */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 8,
          }}
        >
          {['所要3分', '登録無料', 'オンライン完結'].map((badge) => (
            <div
              key={badge}
              style={{
                fontSize: 18,
                color: '#5C544B',
                padding: '6px 20px',
                borderRadius: 20,
                border: '1px solid #E4DACA',
                backgroundColor: 'rgba(243,236,224,0.6)',
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  )
}
