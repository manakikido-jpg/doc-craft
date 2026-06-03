'use client'

import { useState } from 'react'
import { Globe, Video, Film, PenTool, Map, Presentation, Sheet, Code2, MessageCircle, ShieldAlert } from 'lucide-react'

interface Props {
  url?: string
  onUpdateData?: (data: Record<string, string>) => void
}

type EmbedService = {
  name: string
  icon: React.ReactNode
  type: 'iframe' | 'tweet'
}

function detectService(url: string): EmbedService | null {
  if (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)/)) return { name: 'YouTube', icon: <Video size={14} />, type: 'iframe' }
  if (url.match(/vimeo\.com\//)) return { name: 'Vimeo', icon: <Film size={14} />, type: 'iframe' }
  if (url.includes('figma.com')) return { name: 'Figma', icon: <PenTool size={14} />, type: 'iframe' }
  if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) return { name: 'Google Maps', icon: <Map size={14} />, type: 'iframe' }
  if (url.includes('docs.google.com/presentation')) return { name: 'Google Slides', icon: <Presentation size={14} />, type: 'iframe' }
  if (url.includes('docs.google.com/spreadsheets')) return { name: 'Google Sheets', icon: <Sheet size={14} />, type: 'iframe' }
  if (url.includes('codepen.io')) return { name: 'CodePen', icon: <Code2 size={14} />, type: 'iframe' }
  if (url.includes('twitter.com') || url.includes('x.com')) return { name: 'Twitter/X', icon: <MessageCircle size={14} />, type: 'tweet' }
  return null
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
  // Google Slides
  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([^/]+)/)
  if (slidesMatch) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false&delayms=3000`
  // Google Sheets
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlembed`
  // CodePen
  const codepenMatch = url.match(/codepen\.io\/([^/]+)\/(?:pen|full|details)\/([^/?]+)/)
  if (codepenMatch) return `https://codepen.io/${codepenMatch[1]}/embed/${codepenMatch[2]}?default-tab=result&theme-id=dark`
  // Twitter/X - use platform embed
  if (url.includes('twitter.com') || url.includes('x.com')) return url
  return null
}

export default function EmbedBlock({ url, onUpdateData }: Props) {
  const [input, setInput] = useState('')

  if (url) {
    const embedUrl = getEmbedUrl(url)
    const service = detectService(url)
    if (embedUrl) {
      // Twitter/X embed: show as blockquote with link
      if (service?.type === 'tweet') {
        return (
          <div className="my-3 rounded-lg overflow-hidden border border-slate-700 group relative p-4 bg-slate-800/50">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
              {service.icon}
              <span className="text-xs font-medium">{service.name}</span>
            </div>
            <blockquote className="border-l-2 border-sky-500 pl-3 py-1">
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline text-sm break-all"
              >
                {embedUrl}
              </a>
              <p className="text-xs text-slate-500 mt-1">ツイートを表示するにはリンクをクリックしてください</p>
            </blockquote>
            <button
              onClick={() => onUpdateData?.({ url: '' })}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-800/80 text-slate-300 text-xs rounded-md backdrop-blur-sm hover:bg-slate-700 transition-all"
            >
              変更
            </button>
          </div>
        )
      }
      return (
        <div className="my-3 rounded-lg overflow-hidden border border-slate-700 group relative">
          {service && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 text-slate-400 border-b border-slate-700">
              {service.icon}
              <span className="text-xs font-medium">{service.name}</span>
            </div>
          )}
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
    // Fallback: render as generic iframe for any URL
    let domain = ''
    try {
      domain = new URL(url).hostname
    } catch {
      domain = url
    }
    return (
      <div className="my-3 rounded-lg overflow-hidden border border-slate-700 group relative">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 text-slate-400 border-b border-slate-700">
          <Globe size={14} />
          <span className="text-xs font-medium">{domain}</span>
          <span className="flex items-center gap-1 ml-auto text-[10px] text-amber-400/80">
            <ShieldAlert size={10} />
            外部サイトを埋め込んでいます
          </span>
        </div>
        <iframe
          src={url}
          className="w-full aspect-video"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <button
          onClick={() => onUpdateData?.({ url: '' })}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 bg-slate-800/80 text-slate-300 text-xs rounded-md backdrop-blur-sm hover:bg-slate-700 transition-all"
        >
          変更
        </button>
      </div>
    )
  }

  return (
    <div className="my-3 border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
      <Globe size={28} className="mb-2 text-slate-500" />
      <p className="text-slate-400 text-sm mb-3">YouTube, Vimeo, Figma, Google Slides/Sheets, CodePen, Twitter/X または任意のURLを入力</p>
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
