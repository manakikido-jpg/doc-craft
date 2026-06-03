'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Download,
  Globe,
  FileText,
  Presentation,
  ImageIcon,
  Upload,
  Printer,
} from 'lucide-react'

interface Props {
  onExportHTML: () => void
  onExportPDF: () => void
  onExportPPTX: () => void
  onExportImages: () => void
  onImportPPTX: () => void
  onPrint: () => void
}

export default function ExportMenu({
  onExportHTML,
  onExportPDF,
  onExportPPTX,
  onExportImages,
  onImportPPTX,
  onPrint,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    let top = rect.bottom + 4
    let left = rect.left

    requestAnimationFrame(() => {
      if (!dropdownRef.current) return
      const dd = dropdownRef.current.getBoundingClientRect()
      if (top + dd.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - dd.height - 4)
      }
      if (left + dd.width > window.innerWidth - 8) {
        left = window.innerWidth - dd.width - 8
      }
      left = Math.max(8, left)
      setPos({ top, left })
    })

    setPos({ top, left })
  }, [open])

  const items: {
    type: 'item' | 'divider'
    icon?: React.ReactNode
    label?: string
    desc?: string
    onClick?: () => void
  }[] = [
    {
      type: 'item',
      icon: <Globe size={15} />,
      label: 'HTML',
      desc: 'Webページとして保存',
      onClick: onExportHTML,
    },
    {
      type: 'item',
      icon: <FileText size={15} />,
      label: 'PDF',
      desc: 'PDFとして保存',
      onClick: onExportPDF,
    },
    {
      type: 'item',
      icon: <Presentation size={15} />,
      label: 'PPTX',
      desc: 'PowerPointとして保存',
      onClick: onExportPPTX,
    },
    {
      type: 'item',
      icon: <ImageIcon size={15} />,
      label: '画像',
      desc: '各スライドを画像として保存',
      onClick: onExportImages,
    },
    { type: 'divider' },
    {
      type: 'item',
      icon: <Upload size={15} />,
      label: 'PPTXインポート',
      desc: 'PowerPointファイルを読み込み',
      onClick: onImportPPTX,
    },
    { type: 'divider' },
    {
      type: 'item',
      icon: <Printer size={15} />,
      label: '印刷',
      desc: 'プレゼンテーションを印刷',
      onClick: onPrint,
    },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded transition-colors min-w-[32px] text-slate-400 hover:bg-slate-700 hover:text-white"
        title="エクスポート"
        aria-label="エクスポート"
      >
        <Download size={15} />
        <span className="text-[9px] leading-none max-md:hidden">エクスポート</span>
      </button>

      {open && pos && (
        <div
          ref={dropdownRef}
          className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[9999] w-64 py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={`divider-${i}`}
                  className="my-1 border-t border-slate-700"
                />
              )
            }
            return (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.()
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <span className="text-slate-400 flex-shrink-0">{item.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-[10px] text-slate-500">{item.desc}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
