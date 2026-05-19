import type { Slide, SlideTextElement } from '@/types'
import { generateId } from './utils'

export interface SlideTemplate {
  id: string
  name: string
  description: string
  buildSlide: (themeKey?: string) => Slide
}

function el(overrides: Partial<SlideTextElement>): SlideTextElement {
  return {
    id: generateId(),
    type: 'title',
    content: '',
    x: 10,
    y: 40,
    w: 80,
    h: 15,
    fontSize: 48,
    fontWeight: '700',
    align: 'center',
    ...overrides,
  }
}

export const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    id: 'blank',
    name: 'ブランク',
    description: 'タイトルのみ',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [el({ content: 'タイトルを入力', x: 10, y: 38, w: 80, fontSize: 56, align: 'center' })],
    }),
  },
  {
    id: 'title-content',
    name: 'タイトル + コンテンツ',
    description: 'タイトルと本文',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: 'タイトル', x: 8, y: 12, w: 84, fontSize: 42, align: 'left', type: 'title' }),
        el({
          content: 'ここに本文を入力してください。内容を簡潔にまとめて記載します。',
          x: 8,
          y: 34,
          w: 84,
          fontSize: 22,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
      ],
    }),
  },
  {
    id: 'section-break',
    name: 'セクション区切り',
    description: '大きな中央タイトル',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: 'セクション 1', x: 10, y: 30, w: 80, fontSize: 64, align: 'center', type: 'title' }),
        el({
          content: 'サブタイトルまたは説明',
          x: 20,
          y: 56,
          w: 60,
          fontSize: 20,
          fontWeight: '400',
          align: 'center',
          type: 'subtitle',
        }),
      ],
    }),
  },
  {
    id: 'bullets',
    name: 'キーポイント',
    description: 'タイトル + 箇条書き',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: 'キーポイント', x: 8, y: 10, w: 84, fontSize: 40, align: 'left', type: 'title' }),
        el({
          content:
            '• ポイント 1 をここに入力\n• ポイント 2 をここに入力\n• ポイント 3 をここに入力\n• ポイント 4 をここに入力',
          x: 8,
          y: 30,
          w: 84,
          fontSize: 22,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
      ],
    }),
  },
  {
    id: 'two-column',
    name: '2カラム',
    description: '左右2列レイアウト',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: 'タイトル', x: 8, y: 8, w: 84, fontSize: 38, align: 'left', type: 'title' }),
        el({
          content: '左側の内容\nここに説明を記載',
          x: 8,
          y: 30,
          w: 40,
          fontSize: 20,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
        el({
          content: '右側の内容\nここに説明を記載',
          x: 52,
          y: 30,
          w: 40,
          fontSize: 20,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
      ],
    }),
  },
  {
    id: 'closing',
    name: 'クロージング',
    description: 'ありがとう / 締めスライド',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({
          content: 'ご清聴ありがとうございました',
          x: 10,
          y: 33,
          w: 80,
          fontSize: 48,
          align: 'center',
          type: 'title',
        }),
        el({
          content: 'お問い合わせ先を入力',
          x: 20,
          y: 60,
          w: 60,
          fontSize: 18,
          fontWeight: '400',
          align: 'center',
          type: 'subtitle',
        }),
      ],
    }),
  },
  {
    id: 'quote',
    name: '引用',
    description: '大きな引用テキスト',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({
          content: '"ここに印象的な引用を入力"',
          x: 10,
          y: 25,
          w: 80,
          fontSize: 36,
          fontWeight: '300',
          align: 'center',
          type: 'body',
        }),
        el({
          content: '— 引用元',
          x: 20,
          y: 62,
          w: 60,
          fontSize: 18,
          fontWeight: '400',
          align: 'center',
          type: 'subtitle',
        }),
      ],
    }),
  },
  {
    id: 'stats',
    name: '数値ハイライト',
    description: '3つの主要指標',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: '主要指標', x: 8, y: 8, w: 84, fontSize: 36, align: 'center', type: 'title' }),
        el({
          content: '150%\n成長率',
          x: 5,
          y: 35,
          w: 28,
          fontSize: 28,
          fontWeight: '700',
          align: 'center',
          type: 'body',
        }),
        el({
          content: '10,000+\nユーザー数',
          x: 36,
          y: 35,
          w: 28,
          fontSize: 28,
          fontWeight: '700',
          align: 'center',
          type: 'body',
        }),
        el({
          content: '99.9%\n稼働率',
          x: 67,
          y: 35,
          w: 28,
          fontSize: 28,
          fontWeight: '700',
          align: 'center',
          type: 'body',
        }),
      ],
    }),
  },
  {
    id: 'timeline',
    name: 'タイムライン',
    description: 'ステップ・時系列',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: 'ロードマップ', x: 8, y: 8, w: 84, fontSize: 36, align: 'left', type: 'title' }),
        el({
          content: 'Phase 1 — 調査・企画\nPhase 2 — 設計・開発\nPhase 3 — テスト・検証\nPhase 4 — リリース・運用',
          x: 8,
          y: 30,
          w: 84,
          fontSize: 22,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
      ],
    }),
  },
  {
    id: 'comparison',
    name: '比較',
    description: 'Before/After・A vs B',
    buildSlide: (themeKey = 'dark-blue') => ({
      id: generateId(),
      themeKey: themeKey as Slide['themeKey'],
      elements: [
        el({ content: '比較', x: 8, y: 8, w: 84, fontSize: 36, align: 'center', type: 'title' }),
        el({
          content: 'Before\n• 課題 1\n• 課題 2\n• 課題 3',
          x: 5,
          y: 28,
          w: 42,
          fontSize: 20,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
        el({
          content: 'After\n• 改善 1\n• 改善 2\n• 改善 3',
          x: 53,
          y: 28,
          w: 42,
          fontSize: 20,
          fontWeight: '400',
          align: 'left',
          type: 'body',
        }),
      ],
    }),
  },
]
