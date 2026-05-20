'use client'

import { X, Layout } from 'lucide-react'
import type { SlideElement, SlideThemeKey } from '@/types'
import { generateId } from '@/lib/utils'

interface Props {
  onApplyLayout: (elements: SlideElement[]) => void
  onClose: () => void
  themeKey: SlideThemeKey
}

interface LayoutPreset {
  id: string
  name: string
  description: string
  preview: React.ReactNode
  buildElements: () => SlideElement[]
}

const SLIDE_W = 960
const SLIDE_H = 540

function makeText(
  overrides: Partial<import('@/types').SlideTextElement>,
): import('@/types').SlideTextElement {
  return {
    id: generateId(),
    type: 'title',
    x: 0,
    y: 0,
    w: 100,
    h: 50,
    content: '',
    fontSize: 36,
    fontWeight: '700',
    align: 'left',
    ...overrides,
  }
}

const LAYOUTS: LayoutPreset[] = [
  {
    id: 'title-slide',
    name: 'タイトルスライド',
    description: '大きなタイトルとサブタイトル',
    preview: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
        <div className="w-3/4 h-2 bg-white/40 rounded" />
        <div className="w-1/2 h-1.5 bg-white/20 rounded mt-1" />
      </div>
    ),
    buildElements: () => [
      makeText({
        type: 'title',
        x: SLIDE_W * 0.1,
        y: SLIDE_H * 0.3,
        w: SLIDE_W * 0.8,
        h: 80,
        content: 'タイトルを入力',
        fontSize: 48,
        fontWeight: '700',
        align: 'center',
      }),
      makeText({
        type: 'subtitle',
        x: SLIDE_W * 0.15,
        y: SLIDE_H * 0.55,
        w: SLIDE_W * 0.7,
        h: 50,
        content: 'サブタイトル',
        fontSize: 24,
        fontWeight: '400',
        align: 'center',
      }),
    ],
  },
  {
    id: 'title-content',
    name: 'タイトル + コンテンツ',
    description: 'タイトルと本文エリア',
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-2">
        <div className="w-2/3 h-1.5 bg-white/40 rounded" />
        <div className="flex-1 border border-white/10 rounded mt-1 p-1">
          <div className="w-full h-1 bg-white/15 rounded mb-0.5" />
          <div className="w-3/4 h-1 bg-white/15 rounded mb-0.5" />
          <div className="w-5/6 h-1 bg-white/15 rounded" />
        </div>
      </div>
    ),
    buildElements: () => [
      makeText({
        type: 'title',
        x: SLIDE_W * 0.06,
        y: 30,
        w: SLIDE_W * 0.88,
        h: 60,
        content: 'タイトル',
        fontSize: 36,
        fontWeight: '700',
        align: 'left',
      }),
      makeText({
        type: 'body',
        x: SLIDE_W * 0.06,
        y: 110,
        w: SLIDE_W * 0.88,
        h: SLIDE_H - 140,
        content: '本文テキスト',
        fontSize: 20,
        fontWeight: '400',
        align: 'left',
      }),
    ],
  },
  {
    id: 'two-column',
    name: '2カラム',
    description: 'タイトルと2つのコンテンツ領域',
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-2">
        <div className="w-2/3 h-1.5 bg-white/40 rounded" />
        <div className="flex-1 flex gap-1 mt-1">
          <div className="flex-1 border border-white/10 rounded p-1">
            <div className="w-full h-1 bg-white/15 rounded mb-0.5" />
            <div className="w-3/4 h-1 bg-white/15 rounded" />
          </div>
          <div className="flex-1 border border-white/10 rounded p-1">
            <div className="w-full h-1 bg-white/15 rounded mb-0.5" />
            <div className="w-3/4 h-1 bg-white/15 rounded" />
          </div>
        </div>
      </div>
    ),
    buildElements: () => [
      makeText({
        type: 'title',
        x: SLIDE_W * 0.06,
        y: 30,
        w: SLIDE_W * 0.88,
        h: 60,
        content: 'タイトル',
        fontSize: 36,
        fontWeight: '700',
        align: 'left',
      }),
      makeText({
        type: 'body',
        x: SLIDE_W * 0.06,
        y: 110,
        w: SLIDE_W * 0.42,
        h: SLIDE_H - 140,
        content: '左の内容',
        fontSize: 18,
        fontWeight: '400',
        align: 'left',
      }),
      makeText({
        type: 'body',
        x: SLIDE_W * 0.52,
        y: 110,
        w: SLIDE_W * 0.42,
        h: SLIDE_H - 140,
        content: '右の内容',
        fontSize: 18,
        fontWeight: '400',
        align: 'left',
      }),
    ],
  },
  {
    id: 'section-header',
    name: 'セクション見出し',
    description: '大きなテキストのセクション区切り',
    preview: (
      <div className="w-full h-full flex items-center justify-center p-2">
        <div className="w-2/3 h-2.5 bg-white/40 rounded" />
      </div>
    ),
    buildElements: () => [
      makeText({
        type: 'title',
        x: SLIDE_W * 0.1,
        y: SLIDE_H * 0.35,
        w: SLIDE_W * 0.8,
        h: 80,
        content: 'セクション名',
        fontSize: 44,
        fontWeight: '700',
        align: 'center',
      }),
    ],
  },
  {
    id: 'title-image-right',
    name: 'タイトル + 画像右',
    description: '左にテキスト、右に画像スペース',
    preview: (
      <div className="w-full h-full flex gap-1 p-2">
        <div className="flex-1 flex flex-col gap-0.5 justify-center">
          <div className="w-full h-1.5 bg-white/40 rounded" />
          <div className="w-3/4 h-1 bg-white/15 rounded" />
          <div className="w-5/6 h-1 bg-white/15 rounded" />
        </div>
        <div className="flex-1 border border-dashed border-white/20 rounded flex items-center justify-center">
          <div className="w-4 h-3 bg-white/10 rounded" />
        </div>
      </div>
    ),
    buildElements: () => [
      makeText({
        type: 'title',
        x: SLIDE_W * 0.06,
        y: SLIDE_H * 0.15,
        w: SLIDE_W * 0.42,
        h: 60,
        content: 'タイトル',
        fontSize: 32,
        fontWeight: '700',
        align: 'left',
      }),
      makeText({
        type: 'body',
        x: SLIDE_W * 0.06,
        y: SLIDE_H * 0.35,
        w: SLIDE_W * 0.42,
        h: SLIDE_H * 0.5,
        content: '説明テキスト',
        fontSize: 18,
        fontWeight: '400',
        align: 'left',
      }),
      {
        id: generateId(),
        type: 'shape' as const,
        shape: 'rect' as const,
        x: SLIDE_W * 0.52,
        y: SLIDE_H * 0.08,
        w: SLIDE_W * 0.42,
        h: SLIDE_H * 0.84,
        fill: 'rgba(99, 102, 241, 0.15)',
        stroke: 'rgba(99, 102, 241, 0.3)',
        strokeWidth: 1,
      },
    ],
  },
  {
    id: 'comparison',
    name: '比較',
    description: '2つの項目を比較するレイアウト',
    preview: (
      <div className="w-full h-full flex flex-col gap-1 p-2">
        <div className="w-1/2 h-1.5 bg-white/40 rounded mx-auto" />
        <div className="flex-1 flex gap-1 mt-0.5">
          <div className="flex-1 flex flex-col items-center gap-0.5 pt-1">
            <div className="w-1/2 h-1 bg-emerald-400/40 rounded" />
            <div className="w-3/4 h-0.5 bg-white/15 rounded" />
            <div className="w-2/3 h-0.5 bg-white/15 rounded" />
          </div>
          <div className="w-px bg-white/10" />
          <div className="flex-1 flex flex-col items-center gap-0.5 pt-1">
            <div className="w-1/2 h-1 bg-rose-400/40 rounded" />
            <div className="w-3/4 h-0.5 bg-white/15 rounded" />
            <div className="w-2/3 h-0.5 bg-white/15 rounded" />
          </div>
        </div>
      </div>
    ),
    buildElements: () => [
      makeText({
        type: 'title',
        x: SLIDE_W * 0.1,
        y: 20,
        w: SLIDE_W * 0.8,
        h: 50,
        content: '比較タイトル',
        fontSize: 32,
        fontWeight: '700',
        align: 'center',
      }),
      makeText({
        type: 'label',
        x: SLIDE_W * 0.06,
        y: 85,
        w: SLIDE_W * 0.42,
        h: 35,
        content: '項目A',
        fontSize: 22,
        fontWeight: '600',
        align: 'center',
        color: '#34d399',
      }),
      makeText({
        type: 'body',
        x: SLIDE_W * 0.06,
        y: 125,
        w: SLIDE_W * 0.42,
        h: SLIDE_H - 155,
        content: '内容A',
        fontSize: 16,
        fontWeight: '400',
        align: 'left',
      }),
      makeText({
        type: 'label',
        x: SLIDE_W * 0.52,
        y: 85,
        w: SLIDE_W * 0.42,
        h: 35,
        content: '項目B',
        fontSize: 22,
        fontWeight: '600',
        align: 'center',
        color: '#fb7185',
      }),
      makeText({
        type: 'body',
        x: SLIDE_W * 0.52,
        y: 125,
        w: SLIDE_W * 0.42,
        h: SLIDE_H - 155,
        content: '内容B',
        fontSize: 16,
        fontWeight: '400',
        align: 'left',
      }),
    ],
  },
  {
    id: 'blank',
    name: '空白',
    description: '自由にレイアウト',
    preview: (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[8px] text-white/20">空白</div>
      </div>
    ),
    buildElements: () => [],
  },
]

export default function SlideLayoutPanel({ onApplyLayout, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layout size={18} className="text-indigo-400" />
            スライドレイアウト
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => {
                onApplyLayout(layout.buildElements())
                onClose()
              }}
              className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-slate-800 transition-all"
              title={layout.description}
            >
              <div className="w-full aspect-[16/9] bg-slate-800 group-hover:bg-slate-700 border border-slate-700 group-hover:border-indigo-500/50 rounded-lg overflow-hidden transition-all">
                {layout.preview}
              </div>
              <span className="text-[11px] text-slate-400 group-hover:text-white transition-colors font-medium">
                {layout.name}
              </span>
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
          レイアウトを適用すると現在のスライド要素が置き換わります
        </div>
      </div>
    </div>
  )
}
