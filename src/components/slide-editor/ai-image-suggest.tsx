'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Search, ImagePlus, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  slideContent: string
  onInsert: (imageUrl: string, alt: string) => void
}

const JP_PARTICLES = ['は', 'が', 'の', 'を', 'に', 'で', 'と', 'も', 'へ', 'から', 'まで', 'より', 'な', 'だ', 'です', 'ます', 'する', 'した', 'して', 'ある', 'ない', 'この', 'その', 'あの', 'どの', 'これ', 'それ', 'あれ', 'どれ']

const JP_EN_MAP: Record<string, string> = {
  'ビジネス': 'business',
  'テクノロジー': 'technology',
  'チーム': 'team',
  'マーケティング': 'marketing',
  'デザイン': 'design',
  'データ': 'data',
  'クラウド': 'cloud',
  'セキュリティ': 'security',
  'プロジェクト': 'project',
  'イノベーション': 'innovation',
  '成長': 'growth',
  '戦略': 'strategy',
  '分析': 'analytics',
  '開発': 'development',
  '管理': 'management',
  '会議': 'meeting',
  '報告': 'report',
  '計画': 'planning',
  '売上': 'sales',
  '顧客': 'customer',
  '製品': 'product',
  '市場': 'market',
  '環境': 'environment',
  '教育': 'education',
  '医療': 'medical',
  '金融': 'finance',
  '未来': 'future',
  '自然': 'nature',
  '都市': 'city',
  '人工知能': 'artificial intelligence',
  'AI': 'artificial intelligence',
  'DX': 'digital transformation',
  'コミュニケーション': 'communication',
  'リーダーシップ': 'leadership',
  'サステナビリティ': 'sustainability',
  'グローバル': 'global',
  'ネットワーク': 'network',
}

function extractKeywords(content: string): string[] {
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, ' ')

  // Try to translate known Japanese business terms first
  const translated: string[] = []
  for (const [jp, en] of Object.entries(JP_EN_MAP)) {
    if (text.includes(jp)) {
      translated.push(en)
    }
  }
  if (translated.length > 0) {
    return translated.slice(0, 3)
  }

  // Remove Japanese particles and split
  let cleaned = text
  for (const p of JP_PARTICLES) {
    cleaned = cleaned.replace(new RegExp(p, 'g'), ' ')
  }

  // Split on whitespace and punctuation, filter short/empty
  const words = cleaned
    .split(/[\s、。！？・「」『』（）\(\)\[\]{}<>,.;:!?\-_=+*/\d]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2)

  // Deduplicate
  const unique = [...new Set(words)]

  // If we have mostly ASCII, use as-is; otherwise try translation map on individual words
  const result: string[] = []
  for (const w of unique) {
    if (result.length >= 3) break
    const mapped = JP_EN_MAP[w]
    if (mapped) {
      result.push(mapped)
    } else if (/^[a-zA-Z\s]+$/.test(w) && w.length >= 2) {
      result.push(w.toLowerCase())
    } else if (w.length >= 2) {
      result.push(w)
    }
  }

  return result.length > 0 ? result : ['business', 'presentation']
}

function buildImageUrl(keyword: string, index: number): string {
  // Use Unsplash source embed with a unique sig per image to avoid caching duplicates
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)}&sig=${index}`
}

export default function AiImageSuggest({ open, onClose, slideContent, onInsert }: Props) {
  const extractedKeywords = useMemo(() => extractKeywords(slideContent), [slideContent])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({})
  const [imageCount] = useState(8)

  // Reset search query when slide content changes
  useEffect(() => {
    if (open) {
      setSearchQuery(extractedKeywords.join(' '))
      setLoadedImages({})
    }
  }, [open, extractedKeywords])

  const currentKeywords = searchQuery.trim() || extractedKeywords.join(' ')

  const images = useMemo(() => {
    const kw = currentKeywords.replace(/\s+/g, ',')
    return Array.from({ length: imageCount }, (_, i) => ({
      id: i,
      url: buildImageUrl(kw, i + Date.now()),
      alt: `${currentKeywords} image ${i + 1}`,
    }))
  }, [currentKeywords, imageCount])

  const handleSearch = useCallback(() => {
    setLoadedImages({})
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">AI画像提案</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Keywords display */}
        <div className="px-5 pt-3 pb-2">
          <div className="text-xs text-slate-400 mb-1.5">検出キーワード:</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {extractedKeywords.map((kw, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs border border-blue-500/30"
              >
                {kw}
              </span>
            ))}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="キーワードを編集して検索..."
              className="w-full pl-9 pr-20 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors"
            >
              検索
            </button>
          </div>
        </div>

        {/* Image grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="grid grid-cols-4 gap-3">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-800">
                {/* Shimmer placeholder */}
                {!loadedImages[img.id] && (
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    </div>
                  </div>
                )}
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${loadedImages[img.id] ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setLoadedImages(prev => ({ ...prev, [img.id]: true }))}
                  onError={() => setLoadedImages(prev => ({ ...prev, [img.id]: true }))}
                />
                {/* Hover overlay with insert button */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => onInsert(img.url, img.alt)}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-lg transition-all duration-200 transform scale-90 group-hover:scale-100"
                  >
                    挿入
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Unsplash から画像を取得しています
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
