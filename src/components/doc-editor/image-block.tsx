'use client'

import { useRef, useState, useCallback } from 'react'
import { ImageIcon, Maximize2, AlignLeft, AlignCenter, AlignRight, Rows3 } from 'lucide-react'
import { fileToDataURL, isStorageNearLimit } from '@/lib/image-utils'

interface Props {
  src?: string
  alt?: string
  width?: string
  imageAlign?: string
  caption?: string
  wrapText?: 'none' | 'left' | 'right'
  onImageSet: (src: string, alt: string) => void
  onUpdateProps?: (data: Record<string, string>) => void
}

export default function ImageBlock({ src, alt, width, imageAlign, caption, wrapText, onImageSet, onUpdateProps }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [editCaption, setEditCaption] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const startX = useRef(0)
  const startW = useRef(0)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    if (isStorageNearLimit()) {
      alert('ストレージの容量が不足しています。不要なドキュメントを削除してください。')
      return
    }
    setLoading(true)
    try {
      const dataUrl = await fileToDataURL(file)
      onImageSet(dataUrl, file.name)
    } catch {
      alert('画像の読み込みに失敗しました。')
    }
    setLoading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setResizing(true)
      startX.current = e.clientX
      startW.current = imgRef.current?.offsetWidth || 300

      function onMove(ev: MouseEvent) {
        const diff = ev.clientX - startX.current
        const newW = Math.max(100, Math.min(800, startW.current + diff))
        if (imgRef.current) imgRef.current.style.width = `${newW}px`
      }

      function onUp(ev: MouseEvent) {
        const diff = ev.clientX - startX.current
        const newW = Math.max(100, Math.min(800, startW.current + diff))
        onUpdateProps?.({ width: `${newW}px` })
        setResizing(false)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [onUpdateProps],
  )

  const currentAlign = imageAlign || 'left'
  const currentWrap = wrapText || 'none'

  if (src) {
    const wrapStyle: React.CSSProperties =
      currentWrap === 'left'
        ? { float: 'left', marginRight: '1rem', marginBottom: '0.5rem' }
        : currentWrap === 'right'
          ? { float: 'right', marginLeft: '1rem', marginBottom: '0.5rem' }
          : {}

    return (
      <div
        className={`my-3 group relative ${currentWrap !== 'none' ? '' : currentAlign === 'center' ? 'flex flex-col items-center' : currentAlign === 'right' ? 'flex flex-col items-end' : ''}`}
        style={currentWrap !== 'none' ? { overflow: 'hidden' } : undefined}
      >
        <div className="relative inline-block" style={wrapStyle}>
          <img
            ref={imgRef}
            src={src}
            alt={alt || ''}
            className={`rounded-lg border border-slate-700 ${resizing ? '' : 'transition-all'}`}
            style={{ width: width || undefined, maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
          />
          {/* Resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            title="ドラッグでリサイズ"
          >
            <Maximize2 size={14} className="text-indigo-400" />
          </div>
          {/* Toolbar */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
            <button
              onClick={() => onUpdateProps?.({ imageAlign: 'left' })}
              className={`p-1 rounded ${currentAlign === 'left' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="左揃え"
            >
              <AlignLeft size={12} />
            </button>
            <button
              onClick={() => onUpdateProps?.({ imageAlign: 'center' })}
              className={`p-1 rounded ${currentAlign === 'center' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="中央揃え"
            >
              <AlignCenter size={12} />
            </button>
            <button
              onClick={() => onUpdateProps?.({ imageAlign: 'right' })}
              className={`p-1 rounded ${currentAlign === 'right' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="右揃え"
            >
              <AlignRight size={12} />
            </button>
            <div className="w-px h-4 bg-slate-600 mx-0.5" />
            <button
              onClick={() => onUpdateProps?.({ wrapText: currentWrap === 'left' ? 'none' : 'left' })}
              className={`p-1 rounded ${currentWrap === 'left' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="テキスト回り込み（左）"
            >
              <Rows3 size={12} style={{ transform: 'scaleX(-1)' }} />
            </button>
            <button
              onClick={() => onUpdateProps?.({ wrapText: currentWrap === 'right' ? 'none' : 'right' })}
              className={`p-1 rounded ${currentWrap === 'right' ? 'bg-indigo-500/30' : 'bg-slate-800/80'} text-slate-300 text-xs backdrop-blur-sm hover:bg-slate-700`}
              title="テキスト回り込み（右）"
            >
              <Rows3 size={12} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-2 py-1 bg-slate-800/80 text-slate-300 text-xs rounded backdrop-blur-sm hover:bg-slate-700"
            >
              変更
            </button>
          </div>
        </div>
        {/* Caption */}
        {editCaption ? (
          <input
            autoFocus
            type="text"
            defaultValue={caption || ''}
            placeholder="キャプションを入力..."
            className="mt-1 text-xs text-slate-400 bg-transparent border-b border-slate-700 focus:outline-none focus:border-indigo-500 text-center w-full max-w-md"
            onBlur={(e) => {
              onUpdateProps?.({ caption: e.target.value })
              setEditCaption(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation()
              setEditCaption(true)
            }}
            className="mt-1 text-xs text-slate-500 hover:text-slate-400 cursor-text text-center min-h-[1em]"
          >
            {caption || (
              <span className="opacity-0 group-hover:opacity-50 transition-opacity">クリックでキャプション追加</span>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`my-3 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
      }`}
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {loading ? (
        <div className="text-slate-400 text-sm animate-pulse">読み込み中...</div>
      ) : (
        <>
          <ImageIcon size={32} className="mb-2 text-slate-500" />
          <div className="text-slate-400 text-sm">クリックまたはドラッグ&ドロップで画像を追加</div>
          <div className="text-slate-600 text-xs mt-1">JPG, PNG, GIF 対応</div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
