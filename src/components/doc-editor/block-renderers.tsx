'use client'

import { useRef } from 'react'
import type { DrawingStroke } from '@/types'
import { registerBlock, type BlockRendererProps } from './block-registry'
import ImageBlock from './image-block'
import CodeBlock from './code-block'
import EmbedBlock from './embed-block'
import TableBlock from './table-block'
import CalloutBlock from './callout-block'
import FootnoteBlock from './footnote-block'
import MathBlock from './math-block'
import DrawingBlock from './drawing-block'
import TextboxBlock from './textbox-block'
import ColumnsBlock from './columns-block'
import SignatureBlock from './signature-block'
import CoverPageBlock from './cover-page-block'

// ── Divider ──

function DividerRenderer({ block, onUpdateData }: BlockRendererProps) {
  const divStyle = block.data?.dividerStyle || block.dividerStyle || 'solid'
  const divColor = block.data?.dividerColor || block.dividerColor || '#334155'
  const divWidth = parseInt(block.data?.dividerWidth || '0') || (divStyle === 'thick' ? 4 : divStyle === 'double' ? 3 : divStyle === 'dashed' || divStyle === 'dotted' ? 2 : 1)

  const dividerEl = (() => {
    switch (divStyle) {
      case 'dashed':
        return <hr className="flex-1" style={{ borderTop: `${divWidth}px dashed ${divColor}`, borderBottom: 'none' }} />
      case 'dotted':
        return <hr className="flex-1" style={{ borderTop: `${divWidth}px dotted ${divColor}`, borderBottom: 'none' }} />
      case 'double':
        return <hr className="flex-1" style={{ borderTop: `${divWidth}px double ${divColor}`, borderBottom: 'none' }} />
      case 'thick':
        return <hr className="flex-1" style={{ borderTop: `${divWidth}px solid ${divColor}`, borderBottom: 'none' }} />
      case 'gradient':
        return (
          <div
            className="flex-1 rounded"
            style={{ height: `${divWidth}px`, background: `linear-gradient(90deg, transparent, ${divColor}, transparent)` }}
          />
        )
      default:
        return <hr className="flex-1" style={{ borderTop: `${divWidth}px solid ${divColor}`, borderBottom: 'none' }} />
    }
  })()

  return (
    <div className="flex-1 relative">
      {dividerEl}
      {/* Style picker on hover */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 z-10">
        {(['solid', 'dashed', 'dotted', 'double', 'thick', 'gradient'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onUpdateData?.(block.id, { dividerStyle: s } as Record<string, string>)}
            className={`text-[9px] px-1 py-0.5 rounded transition-colors ${divStyle === s ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
          >
            {s === 'solid'
              ? '―'
              : s === 'dashed'
                ? '- -'
                : s === 'dotted'
                  ? '···'
                  : s === 'double'
                    ? '═'
                    : s === 'thick'
                      ? '━'
                      : '∿'}
          </button>
        ))}
        <div className="w-px h-3 bg-slate-600 mx-0.5" />
        {[1, 2, 3, 4, 6].map((w) => (
          <button
            key={w}
            onClick={() => onUpdateData?.(block.id, { dividerWidth: String(w) } as Record<string, string>)}
            className={`text-[9px] px-1 py-0.5 rounded transition-colors ${divWidth === w ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-white'}`}
            title={`${w}px`}
          >
            <div style={{ width: 12, height: w, background: 'currentColor', borderRadius: 1 }} />
          </button>
        ))}
        <div className="w-px h-3 bg-slate-600 mx-0.5" />
        <input
          type="color"
          value={divColor}
          onChange={(e) => onUpdateData?.(block.id, { dividerColor: e.target.value } as Record<string, string>)}
          className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
        />
      </div>
    </div>
  )
}

// ── Page Break ──

function PageBreakRenderer({ block, pageBreakNumber, totalPageBreaks }: BlockRendererProps) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-dashed border-slate-600" />
        <span className="text-xs text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
          改ページ
        </span>
        <hr className="flex-1 border-dashed border-slate-600" />
      </div>
      {pageBreakNumber != null && totalPageBreaks != null && (
        <div className="text-center text-[10px] text-slate-500 font-mono mt-1">
          ページ {pageBreakNumber} / {totalPageBreaks + 1}
        </div>
      )}
    </div>
  )
}

// ── TOC ──

function TocRenderer({ block, headingBlocks, onUpdate }: BlockRendererProps) {
  const headings = headingBlocks || []
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 my-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-400">目次</h3>
        <button
          onClick={() => onUpdate(block.content || `updated-${Date.now()}`)}
          className="text-[10px] px-2 py-0.5 rounded border border-slate-600 text-slate-400 hover:text-indigo-400 hover:border-indigo-500 transition-colors"
          title="目次を更新"
        >
          目次を更新
        </button>
      </div>
      {headings.length === 0 ? (
        <p className="text-xs text-slate-500">見出しがありません</p>
      ) : (
        <ul className="space-y-1">
          {headings.map((h) => {
            const headingText = h.content?.replace(/<[^>]*>/g, '').trim() || '(空の見出し)'
            return (
              <li
                key={h.id}
                className={`text-sm cursor-pointer hover:text-indigo-400 transition-colors flex items-center gap-1 ${
                  h.type === 'h1'
                    ? 'text-white font-medium'
                    : h.type === 'h2'
                      ? 'text-slate-300 pl-4'
                      : h.type === 'h3'
                        ? 'text-slate-400 pl-8'
                        : h.type === 'h4'
                          ? 'text-slate-400 pl-12'
                          : h.type === 'h5'
                            ? 'text-slate-500 pl-16'
                            : 'text-slate-500 pl-20'
                }`}
                onClick={() => {
                  const el = document.querySelector(`[data-block-id="${h.id}"]`)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    el.classList.add('ring-2', 'ring-indigo-500/50')
                    setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500/50'), 1500)
                  }
                }}
              >
                <span className="text-[10px] text-slate-600 mr-1">
                  {h.type === 'h1' ? '■' : h.type === 'h2' ? '□' : h.type === 'h3' ? '・' : '·'}
                </span>
                {headingText}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Image ──

function ImageRenderer({ block, onUpdateData }: BlockRendererProps) {
  return (
    <ImageBlock
      src={block.data?.src}
      alt={block.data?.alt}
      width={block.data?.width}
      imageAlign={block.data?.imageAlign}
      caption={block.data?.caption}
      wrapText={block.data?.wrapText as 'none' | 'left' | 'right' | undefined}
      wrapStyle={block.data?.wrapStyle as 'inline' | 'square' | 'tight' | 'behind' | 'infront' | undefined}
      brightness={block.data?.brightness}
      contrast={block.data?.contrast}
      onImageSet={(src, alt) => onUpdateData?.(block.id, { src, alt })}
      onUpdateProps={(data) => onUpdateData?.(block.id, data)}
    />
  )
}

// ── Code ──

function CodeRenderer({ block, onUpdate, onUpdateData }: BlockRendererProps) {
  return (
    <CodeBlock
      content={block.content}
      language={block.data?.language}
      onUpdate={onUpdate}
      onUpdateData={(data) => onUpdateData?.(block.id, data)}
    />
  )
}

// ── Embed ──

function EmbedRenderer({ block, onUpdateData }: BlockRendererProps) {
  return <EmbedBlock url={block.data?.url} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
}

// ── Table ──

function TableRenderer({ block, onUpdateData }: BlockRendererProps) {
  return <TableBlock data={block.data} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
}

// ── Callout ──

function CalloutRenderer({ block, onUpdate, onSetCalloutVariant, inputRef, handleKeyDown }: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <CalloutBlock
      content={block.content}
      variant={block.calloutVariant || 'info'}
      onUpdate={onUpdate}
      onVariantChange={(variant) => onSetCalloutVariant?.(block.id, variant)}
      inputRef={(el) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el
        inputRef(el)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

// ── Footnote ──

function FootnoteRenderer({ block, footnoteIndex, onUpdate, inputRef, handleKeyDown }: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <FootnoteBlock
      content={block.content}
      footnoteIndex={footnoteIndex || 1}
      onUpdate={onUpdate}
      inputRef={(el) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el
        inputRef(el)
      }}
      onKeyDown={handleKeyDown}
    />
  )
}

// ── Math ──

function MathRenderer({ block, onUpdate }: BlockRendererProps) {
  return <MathBlock content={block.content} onUpdate={onUpdate} />
}

// ── Checklist ──

function ChecklistRenderer({ block, onUpdate, onToggleChecked, inputRef, handleKeyDown, handlePaste }: BlockRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="flex items-start gap-2 py-0.5">
      <input
        type="checkbox"
        checked={!!block.checked}
        onChange={() => onToggleChecked?.(block.id)}
        className="mt-1.5 accent-indigo-500 w-4 h-4 cursor-pointer flex-shrink-0"
      />
      <div
        ref={(el) => {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = el
          inputRef(el)
        }}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="チェック項目..."
        className={`flex-1 focus:outline-none text-base leading-7 min-h-[1.5em] ${
          block.checked ? 'text-slate-500 line-through' : 'text-slate-300'
        }`}
        onBlur={(e) => {
          const html = e.currentTarget.innerHTML
          onUpdate(html)
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  )
}

// ── Drawing ──

function DrawingRenderer({ block, onUpdateData }: BlockRendererProps) {
  let parsedStrokes: DrawingStroke[] = []
  try {
    parsedStrokes = block.data?.strokesJson ? JSON.parse(block.data.strokesJson) : block.strokes || []
  } catch { /* ignore */ }
  return (
    <DrawingBlock
      strokes={parsedStrokes}
      onUpdate={(strokes) => {
        onUpdateData?.(block.id, { strokesJson: JSON.stringify(strokes) })
      }}
    />
  )
}

// ── Textbox ──

function TextboxRenderer({ block, onUpdate, onUpdateData }: BlockRendererProps) {
  return (
    <TextboxBlock
      content={block.content}
      data={block.data}
      onUpdate={onUpdate}
      onUpdateData={(data) => onUpdateData?.(block.id, data)}
    />
  )
}

// ── Columns ──

function ColumnsRenderer({ block, onUpdate, onUpdateData }: BlockRendererProps) {
  return (
    <ColumnsBlock
      content={block.content}
      data={block.data}
      onUpdate={onUpdate}
      onUpdateData={(data) => onUpdateData?.(block.id, data)}
    />
  )
}

// ── Signature ──

function SignatureRenderer({ block, onUpdateData }: BlockRendererProps) {
  return <SignatureBlock data={block.data} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
}

// ── Cover Page ──

function CoverPageRenderer({ block, onUpdateData }: BlockRendererProps) {
  return <CoverPageBlock data={block.data} onUpdateData={(data) => onUpdateData?.(block.id, data)} />
}

// ── Section Break ──

function SectionBreakRenderer() {
  return (
    <div className="flex-1 flex items-center gap-3">
      <hr className="flex-1 border-double border-slate-600" />
      <span className="text-xs text-slate-500 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
        § セクション区切り
      </span>
      <hr className="flex-1 border-double border-slate-600" />
    </div>
  )
}

// ── Column Break ──

function ColumnBreakRenderer() {
  return (
    <div className="flex-1 flex items-center gap-3">
      <hr className="flex-1 border-dotted border-indigo-400/40" />
      <span className="text-xs text-indigo-400/60 font-mono px-2 py-0.5 rounded bg-indigo-500/5 border border-indigo-400/20">
        段区切り
      </span>
      <hr className="flex-1 border-dotted border-indigo-400/40" />
    </div>
  )
}

// ── Register all block renderers ──

export function registerAllBlocks(): void {
  registerBlock('divider', DividerRenderer)
  registerBlock('page-break', PageBreakRenderer)
  registerBlock('toc', TocRenderer)
  registerBlock('image', ImageRenderer)
  registerBlock('code', CodeRenderer)
  registerBlock('embed', EmbedRenderer)
  registerBlock('table', TableRenderer)
  registerBlock('callout', CalloutRenderer)
  registerBlock('footnote', FootnoteRenderer)
  registerBlock('math', MathRenderer)
  registerBlock('checklist', ChecklistRenderer)
  registerBlock('drawing', DrawingRenderer)
  registerBlock('textbox', TextboxRenderer)
  registerBlock('columns', ColumnsRenderer)
  registerBlock('signature', SignatureRenderer)
  registerBlock('cover-page', CoverPageRenderer)
  registerBlock('section-break', SectionBreakRenderer)
  registerBlock('column-break', ColumnBreakRenderer)
}

// Auto-register on module load
registerAllBlocks()
