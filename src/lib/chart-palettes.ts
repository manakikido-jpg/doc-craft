/** Selectable color palettes for charts. */
export const CHART_PALETTES: Record<string, string[]> = {
  default: ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'],
  mono: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
  pastel: ['#a5b4fc', '#fdba74', '#86efac', '#fde047', '#f9a8d4', '#67e8f9', '#c4b5fd', '#fca5a5'],
  vivid: ['#4f46e5', '#ea580c', '#16a34a', '#ca8a04', '#db2777', '#0891b2', '#7c3aed', '#dc2626'],
  ocean: ['#0ea5e9', '#06b6d4', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#0284c7', '#0d9488'],
  warm: ['#f97316', '#ef4444', '#eab308', '#ec4899', '#f59e0b', '#dc2626', '#d97706', '#be123c'],
}

export const CHART_PALETTE_LABELS: { value: string; label: string }[] = [
  { value: 'default', label: '標準' },
  { value: 'mono', label: 'モノクロ' },
  { value: 'pastel', label: 'パステル' },
  { value: 'vivid', label: 'ビビッド' },
  { value: 'ocean', label: 'オーシャン' },
  { value: 'warm', label: 'ウォーム' },
]

export function getPalette(theme?: string): string[] {
  return CHART_PALETTES[theme || 'default'] || CHART_PALETTES.default
}

/** True when an explicit theme is active and should override per-dataset colors. */
export function themeOverridesColors(theme?: string): boolean {
  return !!theme && theme !== 'default'
}
