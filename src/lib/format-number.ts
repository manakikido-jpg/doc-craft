/**
 * Number formatting helpers for chart axes and data labels.
 * Kept pure + deterministic (no locale dependence) so they can be unit-tested.
 */

function trim(n: number): string {
  // One decimal place, but drop a trailing ".0".
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** Insert thousands separators into an integer-ish number: 1234567 → "1,234,567". */
export function formatThousands(n: number): string {
  if (!isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  const neg = rounded < 0
  const abs = Math.abs(rounded)
  const intPart = Math.floor(abs)
  const frac = abs - intPart
  const intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fracStr = frac > 0 ? String(Math.round(frac * 100) / 100).slice(1) : ''
  return (neg ? '-' : '') + intStr + fracStr
}

/**
 * Compact notation for axis ticks: 12345 → "12.3K", 2_500_000 → "2.5M".
 * Numbers below 10,000 keep thousands separators (e.g. "1,234").
 */
export function formatCompact(n: number): string {
  if (!isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e9) return trim(n / 1e9) + 'B'
  if (abs >= 1e6) return trim(n / 1e6) + 'M'
  if (abs >= 1e4) return trim(n / 1e3) + 'K'
  return formatThousands(n)
}
