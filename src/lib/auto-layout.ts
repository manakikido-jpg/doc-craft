import type { SlideTextElement, Slide } from '@/types'

interface LayoutConfig {
  name: string
  description: string
  match: (elementCount: number, hasLongBody: boolean) => boolean
  apply: (elements: SlideTextElement[]) => SlideTextElement[]
}

const LAYOUTS: LayoutConfig[] = [
  {
    name: 'title-only',
    description: '中央タイトル',
    match: (count, hasLong) => count === 1 && !hasLong,
    apply: (elements) =>
      elements.map((e) => ({
        ...e,
        x: 10,
        y: 35,
        w: 80,
        fontSize: e.type === 'title' ? 56 : 48,
        align: 'center' as const,
      })),
  },
  {
    name: 'title-subtitle',
    description: 'タイトル+サブタイトル',
    match: (count) => count === 2,
    apply: (elements) => {
      const title = elements.find((e) => e.type === 'title')
      const other = elements.find((e) => e.type !== 'title') || elements[1]
      return [
        title ? { ...title, x: 10, y: 28, w: 80, fontSize: 48, align: 'center' as const } : elements[0],
        other
          ? {
              ...other,
              x: 15,
              y: 55,
              w: 70,
              fontSize: 22,
              fontWeight: '400',
              align: 'center' as const,
              type: 'subtitle' as const,
            }
          : elements[1],
      ].filter(Boolean) as SlideTextElement[]
    },
  },
  {
    name: 'title-body-left',
    description: '左揃えタイトル+本文',
    match: (count, hasLong) => count >= 2 && hasLong,
    apply: (elements) => {
      const title = elements.find((e) => e.type === 'title')
      const others = elements.filter((e) => e !== title)
      const result: SlideTextElement[] = []
      if (title) {
        result.push({ ...title, x: 8, y: 10, w: 84, fontSize: 40, align: 'left' as const })
      }
      others.forEach((e, i) => {
        result.push({
          ...e,
          x: 8,
          y: 28 + i * 18,
          w: 84,
          fontSize: 20,
          fontWeight: '400',
          align: 'left' as const,
        })
      })
      return result
    },
  },
  {
    name: 'two-column',
    description: '2カラムレイアウト',
    match: (count) => count >= 3,
    apply: (elements) => {
      const title = elements.find((e) => e.type === 'title')
      const others = elements.filter((e) => e !== title)
      const result: SlideTextElement[] = []
      if (title) {
        result.push({ ...title, x: 8, y: 8, w: 84, fontSize: 36, align: 'left' as const })
      }
      const half = Math.ceil(others.length / 2)
      others.forEach((e, i) => {
        const isLeft = i < half
        result.push({
          ...e,
          x: isLeft ? 8 : 52,
          y: 28 + (isLeft ? i : i - half) * 16,
          w: 40,
          fontSize: 18,
          fontWeight: '400',
          align: 'left' as const,
        })
      })
      return result
    },
  },
]

/** Auto-select and apply best layout for a slide based on content */
export function autoLayout(slide: Slide): Slide {
  const textElements = slide.elements.filter(
    (e): e is SlideTextElement =>
      e.type !== 'image' &&
      e.type !== 'shape' &&
      e.type !== 'table' &&
      e.type !== 'connector' &&
      e.type !== 'video' &&
      e.type !== 'audio' &&
      e.type !== 'chart',
  )
  if (textElements.length === 0) return slide

  const hasLongBody = textElements.some((e) => e.type !== 'title' && e.content.length > 60)

  const layout = LAYOUTS.find((l) => l.match(textElements.length, hasLongBody))
  if (!layout) return slide

  const updated = layout.apply(textElements)
  const nonText = slide.elements.filter(
    (e) =>
      e.type === 'image' ||
      e.type === 'shape' ||
      e.type === 'table' ||
      e.type === 'connector' ||
      e.type === 'video' ||
      e.type === 'audio' ||
      e.type === 'chart',
  )

  return {
    ...slide,
    elements: [...updated, ...nonText],
  }
}

/** Suggest layout name for a given slide */
export function suggestLayoutName(slide: Slide): string {
  const textCount = slide.elements.filter(
    (e) =>
      e.type !== 'image' &&
      e.type !== 'shape' &&
      e.type !== 'table' &&
      e.type !== 'connector' &&
      e.type !== 'video' &&
      e.type !== 'audio' &&
      e.type !== 'chart',
  ).length
  const hasLong = slide.elements.some(
    (e) =>
      e.type !== 'image' &&
      e.type !== 'shape' &&
      e.type !== 'table' &&
      e.type !== 'connector' &&
      e.type !== 'video' &&
      e.type !== 'audio' &&
      e.type !== 'chart' &&
      'content' in e &&
      e.content.length > 60,
  )
  const layout = LAYOUTS.find((l) => l.match(textCount, hasLong))
  return layout?.description || '自動レイアウト'
}
