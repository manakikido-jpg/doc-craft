import type { DesignCanvasPreset, DesignCanvasSize } from '@/types'

export const DESIGN_CANVAS_PRESETS: DesignCanvasSize[] = [
  { preset: 'instagram-post', width: 1080, height: 1080, label: 'Instagram投稿' },
  { preset: 'instagram-story', width: 1080, height: 1920, label: 'Instagramストーリー' },
  { preset: 'twitter-post', width: 1200, height: 675, label: 'X(Twitter)投稿' },
  { preset: 'twitter-header', width: 1500, height: 500, label: 'Xヘッダー' },
  { preset: 'facebook-post', width: 1200, height: 630, label: 'Facebook投稿' },
  { preset: 'facebook-cover', width: 820, height: 312, label: 'Facebookカバー' },
  { preset: 'youtube-thumbnail', width: 1280, height: 720, label: 'YouTubeサムネイル' },
  { preset: 'poster-a4', width: 2480, height: 3508, label: 'ポスター (A4)' },
  { preset: 'business-card', width: 1050, height: 600, label: '名刺' },
  { preset: 'presentation-16:9', width: 1920, height: 1080, label: 'プレゼン (16:9)' },
  { preset: 'banner-wide', width: 1920, height: 480, label: 'バナー (横長)' },
]

export interface PresetCategory {
  label: string
  presets: DesignCanvasPreset[]
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: 'SNS',
    presets: ['instagram-post', 'instagram-story', 'twitter-post', 'twitter-header', 'facebook-post', 'facebook-cover', 'youtube-thumbnail'],
  },
  {
    label: '印刷',
    presets: ['poster-a4', 'business-card'],
  },
  {
    label: 'その他',
    presets: ['presentation-16:9', 'banner-wide'],
  },
]

export function getPresetByKey(preset: DesignCanvasPreset): DesignCanvasSize | undefined {
  return DESIGN_CANVAS_PRESETS.find((p) => p.preset === preset)
}

export function getDefaultPreset(): DesignCanvasSize {
  return DESIGN_CANVAS_PRESETS[0] // Instagram投稿 1080x1080
}
