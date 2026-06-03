import type { Slide, DesignCanvasSize, DesignCanvasPreset, SlideElement } from '@/types'
import { generateId } from '@/lib/utils'
import { getPresetByKey } from '@/lib/design-presets'

export interface DesignTemplate {
  id: string
  name: string
  description: string
  icon: string
  preset: DesignCanvasPreset
  buildCanvas: () => { canvas: Slide; canvasSize: DesignCanvasSize }
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  // ── 1. SNS投稿 シンプル ──
  {
    id: 'sns-simple',
    name: 'SNS投稿 シンプル',
    description: 'シンプルなテキスト中心のSNS投稿デザイン',
    icon: 'square',
    preset: 'instagram-post',
    buildCanvas: () => {
      const canvasSize = getPresetByKey('instagram-post')!
      const elements: SlideElement[] = [
        // Solid dark-blue background
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          fill: '#1e3a5f',
          zIndex: 0,
        },
        // Centered heading text
        {
          id: generateId(),
          type: 'title',
          content: 'ここにメッセージを入力',
          x: 10,
          y: 35,
          w: 80,
          h: 30,
          fontSize: 56,
          fontWeight: '700',
          align: 'center',
          color: '#ffffff',
          zIndex: 2,
        },
        // Accent circle in bottom-right
        {
          id: generateId(),
          type: 'shape',
          shape: 'circle',
          x: 72,
          y: 72,
          w: 22,
          h: 22,
          fill: '#3b82f6',
          gradientFill: { color1: '#3b82f6', color2: '#06b6d4', angle: 135 },
          opacity: 0.8,
          zIndex: 1,
        },
      ]

      return {
        canvas: {
          id: generateId(),
          themeKey: 'dark-blue',
          elements,
        },
        canvasSize,
      }
    },
  },

  // ── 2. SNS投稿 写真メイン ──
  {
    id: 'sns-photo',
    name: 'SNS投稿 写真メイン',
    description: '写真を主役にしたSNS投稿デザイン',
    icon: 'image',
    preset: 'instagram-post',
    buildCanvas: () => {
      const canvasSize = getPresetByKey('instagram-post')!
      const elements: SlideElement[] = [
        // Large image placeholder
        {
          id: generateId(),
          type: 'image',
          src: '',
          alt: '写真をドラッグ&ドロップ',
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          zIndex: 0,
        },
        // Semi-transparent overlay rect at bottom
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 70,
          w: 100,
          h: 30,
          fill: 'rgba(0,0,0,0.55)',
          gradientFill: { color1: 'rgba(0,0,0,0)', color2: 'rgba(0,0,0,0.7)', angle: 180 },
          zIndex: 1,
        },
        // Overlay text at bottom
        {
          id: generateId(),
          type: 'title',
          content: 'キャプションを入力',
          x: 6,
          y: 78,
          w: 88,
          h: 16,
          fontSize: 42,
          fontWeight: '700',
          align: 'left',
          color: '#ffffff',
          zIndex: 2,
        },
      ]

      return {
        canvas: {
          id: generateId(),
          themeKey: 'white-clean',
          elements,
        },
        canvasSize,
      }
    },
  },

  // ── 3. YouTubeサムネイル ──
  {
    id: 'youtube-thumbnail',
    name: 'YouTubeサムネイル',
    description: '目を引くYouTubeサムネイルデザイン',
    icon: 'play',
    preset: 'youtube-thumbnail',
    buildCanvas: () => {
      const canvasSize = getPresetByKey('youtube-thumbnail')!
      const elements: SlideElement[] = [
        // Gradient background rect
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          fill: '#0f172a',
          gradientFill: { color1: '#1e293b', color2: '#7c3aed', angle: 135 },
          zIndex: 0,
        },
        // Large bold title
        {
          id: generateId(),
          type: 'title',
          content: '動画タイトルを入力',
          x: 5,
          y: 20,
          w: 60,
          h: 40,
          fontSize: 72,
          fontWeight: '900',
          align: 'left',
          color: '#ffffff',
          textShadow: true,
          zIndex: 2,
        },
        // Subtitle
        {
          id: generateId(),
          type: 'subtitle',
          content: 'サブタイトル・補足テキスト',
          x: 5,
          y: 65,
          w: 55,
          h: 15,
          fontSize: 28,
          fontWeight: '500',
          align: 'left',
          color: '#e2e8f0',
          zIndex: 2,
        },
        // Accent shape right side
        {
          id: generateId(),
          type: 'shape',
          shape: 'circle',
          x: 68,
          y: 15,
          w: 28,
          h: 50,
          fill: '#f59e0b',
          gradientFill: { color1: '#f59e0b', color2: '#ef4444', angle: 180 },
          opacity: 0.9,
          zIndex: 1,
        },
      ]

      return {
        canvas: {
          id: generateId(),
          themeKey: 'dark-blue',
          elements,
        },
        canvasSize,
      }
    },
  },

  // ── 4. バナー CTA ──
  {
    id: 'banner-cta',
    name: 'バナー CTA',
    description: 'CTA付き横長バナーデザイン',
    icon: 'mouse-pointer-click',
    preset: 'banner-wide',
    buildCanvas: () => {
      const canvasSize = getPresetByKey('banner-wide')!
      const elements: SlideElement[] = [
        // Gradient background
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          fill: '#1e3a5f',
          gradientFill: { color1: '#0f172a', color2: '#1e40af', angle: 90 },
          zIndex: 0,
        },
        // Headline left-aligned
        {
          id: generateId(),
          type: 'title',
          content: 'キャンペーン見出しを入力',
          x: 5,
          y: 18,
          w: 55,
          h: 35,
          fontSize: 48,
          fontWeight: '800',
          align: 'left',
          color: '#ffffff',
          zIndex: 2,
        },
        // Subtext
        {
          id: generateId(),
          type: 'body',
          content: '詳細テキストや期間などを記載します',
          x: 5,
          y: 58,
          w: 50,
          h: 20,
          fontSize: 20,
          fontWeight: '400',
          align: 'left',
          color: '#cbd5e1',
          zIndex: 2,
        },
        // CTA button (rect shape with text)
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 70,
          y: 30,
          w: 24,
          h: 40,
          fill: '#f59e0b',
          gradientFill: { color1: '#f59e0b', color2: '#f97316', angle: 180 },
          cornerRadius: 12,
          textContent: '詳しくはこちら',
          textColor: '#0f172a',
          textFontSize: 22,
          zIndex: 2,
        },
      ]

      return {
        canvas: {
          id: generateId(),
          themeKey: 'dark-blue',
          elements,
        },
        canvasSize,
      }
    },
  },

  // ── 5. 名刺 ミニマル ──
  {
    id: 'business-card-minimal',
    name: '名刺 ミニマル',
    description: 'ミニマルな名刺デザイン',
    icon: 'credit-card',
    preset: 'business-card',
    buildCanvas: () => {
      const canvasSize = getPresetByKey('business-card')!
      const elements: SlideElement[] = [
        // White background
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          fill: '#ffffff',
          zIndex: 0,
        },
        // Accent line at top
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          w: 100,
          h: 2,
          fill: '#1e40af',
          gradientFill: { color1: '#3b82f6', color2: '#06b6d4', angle: 90 },
          zIndex: 1,
        },
        // Name (large)
        {
          id: generateId(),
          type: 'title',
          content: '山田 太郎',
          x: 8,
          y: 20,
          w: 84,
          h: 20,
          fontSize: 36,
          fontWeight: '700',
          align: 'left',
          color: '#0f172a',
          zIndex: 2,
        },
        // Title (smaller)
        {
          id: generateId(),
          type: 'subtitle',
          content: 'プロダクトデザイナー',
          x: 8,
          y: 42,
          w: 84,
          h: 12,
          fontSize: 18,
          fontWeight: '400',
          align: 'left',
          color: '#64748b',
          zIndex: 2,
        },
        // Contact: email
        {
          id: generateId(),
          type: 'label',
          content: 'taro.yamada@example.com',
          x: 8,
          y: 68,
          w: 84,
          h: 10,
          fontSize: 14,
          fontWeight: '400',
          align: 'left',
          color: '#475569',
          zIndex: 2,
        },
        // Contact: phone
        {
          id: generateId(),
          type: 'label',
          content: '090-1234-5678',
          x: 8,
          y: 80,
          w: 84,
          h: 10,
          fontSize: 14,
          fontWeight: '400',
          align: 'left',
          color: '#475569',
          zIndex: 2,
        },
      ]

      return {
        canvas: {
          id: generateId(),
          themeKey: 'white-clean',
          elements,
        },
        canvasSize,
      }
    },
  },

  // ── 6. Instagramストーリー ──
  {
    id: 'instagram-story',
    name: 'Instagramストーリー',
    description: '縦型レイアウトのストーリーデザイン',
    icon: 'smartphone',
    preset: 'instagram-story',
    buildCanvas: () => {
      const canvasSize = getPresetByKey('instagram-story')!
      const elements: SlideElement[] = [
        // Gradient background
        {
          id: generateId(),
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          fill: '#4c1d95',
          gradientFill: { color1: '#4c1d95', color2: '#be185d', angle: 180 },
          zIndex: 0,
        },
        // Decorative circle top
        {
          id: generateId(),
          type: 'shape',
          shape: 'circle',
          x: -10,
          y: -3,
          w: 40,
          h: 12,
          fill: '#a855f7',
          opacity: 0.4,
          zIndex: 1,
        },
        // Decorative circle top-right
        {
          id: generateId(),
          type: 'shape',
          shape: 'circle',
          x: 70,
          y: 2,
          w: 35,
          h: 10,
          fill: '#ec4899',
          opacity: 0.35,
          zIndex: 1,
        },
        // Large text in center
        {
          id: generateId(),
          type: 'title',
          content: 'メインテキストを\nここに入力',
          x: 8,
          y: 38,
          w: 84,
          h: 20,
          fontSize: 52,
          fontWeight: '800',
          align: 'center',
          color: '#ffffff',
          textShadow: true,
          zIndex: 3,
        },
        // Subtitle below center
        {
          id: generateId(),
          type: 'subtitle',
          content: 'サブテキストや日付を入力',
          x: 15,
          y: 60,
          w: 70,
          h: 8,
          fontSize: 24,
          fontWeight: '400',
          align: 'center',
          color: '#f0abfc',
          zIndex: 3,
        },
        // Decorative diamond bottom
        {
          id: generateId(),
          type: 'shape',
          shape: 'diamond',
          x: 35,
          y: 82,
          w: 30,
          h: 10,
          fill: '#f472b6',
          gradientFill: { color1: '#f472b6', color2: '#a855f7', angle: 45 },
          opacity: 0.5,
          zIndex: 1,
        },
        // Decorative circle bottom-left
        {
          id: generateId(),
          type: 'shape',
          shape: 'circle',
          x: -5,
          y: 88,
          w: 30,
          h: 9,
          fill: '#7c3aed',
          opacity: 0.3,
          zIndex: 1,
        },
      ]

      return {
        canvas: {
          id: generateId(),
          themeKey: 'dark-blue',
          elements,
        },
        canvasSize,
      }
    },
  },
]
