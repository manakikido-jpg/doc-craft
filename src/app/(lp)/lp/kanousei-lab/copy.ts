/**
 * Shared copy strings for 可能性ラボ LP.
 * Single source of truth — edit here to update all occurrences.
 */

/** Primary CTA label — used in Nav, Hero, S3, S4, S9, Sticky */
export const CTA_PRIMARY_LABEL = 'LINEで無料の市場価値診断を受ける'

/** Nav primary button label (shorter variant) */
export const CTA_NAV_LABEL = '無料診断をはじめる'

/** Secondary CTA label — used in S9 only */
export const CTA_SECONDARY_LABEL = '無料カウンセリングを予約する'

/** S9 secondary CTA as inline text link */
export const CTA_SECONDARY_INLINE_LABEL = 'すぐに相談したい方は、無料カウンセリングを予約する'

/** S4 flow timeline CTA */
export const CTA_FLOW_LABEL = 'まずはLINEで診断からはじめる'

/** Micro-copy beneath primary CTA */
export const CTA_MICROCOPY = '所要3分・登録無料・しつこい勧誘はありません'

/** S9 micro-copy */
export const CTA_MICROCOPY_FINAL = '登録無料・3分・しつこい勧誘なし'

/** Site name */
export const SITE_NAME = '可能性ラボ'

/** Site tagline for footer */
export const SITE_TAGLINE = '国家資格キャリアコンサルタントによる無料キャリアコーチング'

/** GTM event names for CV tracking */
export const GTM_EVENT_LINE = 'cta_line_friend'
export const GTM_EVENT_BOOKING = 'cta_booking'
// Note: 診断完了 event fires from LINE side — not tracked from this LP.
// Future: implement webhook-based postback to capture completion on the LP side.
