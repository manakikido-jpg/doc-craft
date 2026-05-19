'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'

interface Props {
  url?: string
  onUpdateData?: (data: Record<string, string>) => void
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  // Figma
  if (url.includes('figma.com')) return `https://www.figma.com/embed?embed_host=doccraft&url=${encodeURIComponent(url)}`
  // Google Maps
  if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) return url.replace('/maps/', '/maps/embed/')
  return null
}

export default function EmbedBlock({ url, onUpdateData }: Props) {
  const [input, setInput] = useState('')

  if (url) {
    const embedUrl = getEmbedUrl(url)
    if (embedUrl) {
      return (
        <div className="my-3 rounded-lg overflow-hidden border border-slate-700 group relative">
          <iframe src={embedUrl} className="w-full aspect-video" allowFullScreen allow="autoplay; encrypted-media" />
          <button
            onClick={() => onUpdateData?.({ url: '' })}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-800/80 text-slate-300 text-xs rounded-md backdrop-blur-sm hover:bg-slate-700 transition-all"
          >
            変更
          </button>
        </div>
      )
    }
    // Fallback: show as link
    return (
      <div className="my-3 p-4 rounded-lg border border-slate-700 bg-slate-800/50">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline text-sm break-all"
        >
          {url}
        </a>
        <button
          onClick={() => onUpdateData?.({ url: '' })}
          className="ml-3 text-xs text-slate-500 hover:text-slate-300"
        >
          変更
        </button>
      </div>
    )
  }

  return (
    <div className="my-3 border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
      <Globe size={28} className="mb-2 text-slate-500" />
      <p className="text-slate-400 text-sm mb-3">YouTube, Vimeo, Figma のURLを入力</p>
      <div className="flex gap-2 max-w-md mx-auto">
        <input
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              onUpdateData?.({ url: input.trim() })
            }
          }}
        />
        <button
          onClick={() => {
            if (input.trim()) onUpdateData?.({ url: input.trim() })
          }}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          埋め込み
        </button>
      </div>
    </div>
  )
}
