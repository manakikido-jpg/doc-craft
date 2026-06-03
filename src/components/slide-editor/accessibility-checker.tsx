'use client'

import { useState, useMemo } from 'react'
import { X, AlertTriangle, CheckCircle2, Info, Image, Type, Contrast } from 'lucide-react'
import type { Slide, SlideElement, SlideTextElement, SlideImageElement } from '@/types'
import { SLIDE_THEMES } from '@/lib/themes'

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  slideIndex: number
  elementId?: string
  category: string
  message: string
  suggestion: string
}

interface Props {
  open: boolean
  onClose: () => void
  slides: Slide[]
  onNavigate: (slideId: string, elementId?: string) => void
}

function checkContrast(fg: string, bg: string): number {
  // Simple luminance check — not full WCAG but good enough
  function luminance(hex: string): number {
    const c = hex.replace('#', '')
    if (c.length < 6) return 0.5
    const r = parseInt(c.slice(0, 2), 16) / 255
    const g = parseInt(c.slice(2, 4), 16) / 255
    const b = parseInt(c.slice(4, 6), 16) / 255
    const srgb = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  }
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function runChecks(slides: Slide[]): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = []

  slides.forEach((slide, si) => {
    // Check for title
    const hasTitle = slide.elements.some(el => el.type === 'title')
    if (!hasTitle) {
      issues.push({
        type: 'warning',
        slideIndex: si,
        category: '構造',
        message: `スライド ${si + 1}: タイトルがありません`,
        suggestion: 'スライドにタイトル要素を追加してください',
      })
    }

    slide.elements.forEach(el => {
      // Image alt text
      if (el.type === 'image') {
        const img = el as SlideImageElement
        if (!img.alt || img.alt.trim() === '') {
          issues.push({
            type: 'error',
            slideIndex: si,
            elementId: el.id,
            category: '画像',
            message: `スライド ${si + 1}: 代替テキストのない画像`,
            suggestion: '画像にAltテキストを設定してください',
          })
        }
      }

      // Small text
      if (el.type === 'title' || el.type === 'subtitle' || el.type === 'body' || el.type === 'label') {
        const txt = el as SlideTextElement
        if (txt.fontSize < 18) {
          issues.push({
            type: 'warning',
            slideIndex: si,
            elementId: el.id,
            category: 'テキスト',
            message: `スライド ${si + 1}: フォントサイズが小さい (${txt.fontSize}px)`,
            suggestion: '読みやすさのため18px以上を推奨します',
          })
        }

        // Low contrast text
        const baseTheme = SLIDE_THEMES[slide.themeKey]
        const theme = baseTheme && slide.customTheme ? { ...baseTheme, ...slide.customTheme } : baseTheme
        if (theme) {
          const textColor = txt.color || (txt.type === 'title' ? theme.titleColor : theme.bodyColor)
          const bgColor = theme.background
          // Only check contrast for simple hex color backgrounds (not gradients)
          if (textColor && bgColor && /^#[0-9a-fA-F]{6}$/.test(textColor) && /^#[0-9a-fA-F]{6}$/.test(bgColor)) {
            const ratio = checkContrast(textColor, bgColor)
            if (ratio < 4.5) {
              issues.push({
                type: 'warning',
                slideIndex: si,
                elementId: el.id,
                category: 'コントラスト',
                message: `スライド ${si + 1}: テキストのコントラスト比が低い (${ratio.toFixed(1)}:1)`,
                suggestion: 'WCAG AA基準の4.5:1以上のコントラスト比を推奨します',
              })
            }
          }
        }

        // Empty text
        if (!txt.content || txt.content.trim() === '') {
          issues.push({
            type: 'info',
            slideIndex: si,
            elementId: el.id,
            category: 'テキスト',
            message: `スライド ${si + 1}: 空のテキスト要素`,
            suggestion: 'テキストを入力するか、不要なら削除してください',
          })
        }
      }

      // Low opacity
      if (el.opacity !== undefined && el.opacity < 30) {
        issues.push({
          type: 'warning',
          slideIndex: si,
          elementId: el.id,
          category: '視認性',
          message: `スライド ${si + 1}: 不透明度が低い要素 (${el.opacity}%)`,
          suggestion: '見えにくい場合は不透明度を上げてください',
        })
      }
    })

    // Too many elements
    if (slide.elements.length > 15) {
      issues.push({
        type: 'info',
        slideIndex: si,
        category: '構成',
        message: `スライド ${si + 1}: 要素が多すぎます (${slide.elements.length}個)`,
        suggestion: '内容を複数のスライドに分割することを検討してください',
      })
    }
  })

  return issues
}

export default function AccessibilityChecker({ open, onClose, slides, onNavigate }: Props) {
  const issues = useMemo(() => runChecks(slides), [slides])
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  if (!open) return null

  const filtered = filter === 'all' ? issues : issues.filter(i => i.type === filter)
  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  const infoCount = issues.filter(i => i.type === 'info').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[520px] max-h-[80vh] flex flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-100">アクセシビリティチェック</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-800">
          {issues.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={18} />
              <span className="text-sm font-medium">問題は見つかりませんでした</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setFilter('all')}
                className={`text-xs px-2 py-1 rounded ${filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                すべて ({issues.length})
              </button>
              {errorCount > 0 && (
                <button
                  onClick={() => setFilter('error')}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${filter === 'error' ? 'bg-red-900/40 text-red-300' : 'text-red-400 hover:text-red-300'}`}
                >
                  <AlertTriangle size={12} /> エラー ({errorCount})
                </button>
              )}
              {warningCount > 0 && (
                <button
                  onClick={() => setFilter('warning')}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${filter === 'warning' ? 'bg-amber-900/40 text-amber-300' : 'text-amber-400 hover:text-amber-300'}`}
                >
                  <AlertTriangle size={12} /> 警告 ({warningCount})
                </button>
              )}
              {infoCount > 0 && (
                <button
                  onClick={() => setFilter('info')}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${filter === 'info' ? 'bg-blue-900/40 text-blue-300' : 'text-blue-400 hover:text-blue-300'}`}
                >
                  <Info size={12} /> 情報 ({infoCount})
                </button>
              )}
            </>
          )}
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.map((issue, i) => (
            <button
              key={i}
              onClick={() => {
                onNavigate(slides[issue.slideIndex].id, issue.elementId)
                onClose()
              }}
              className="w-full text-left p-3 rounded-lg hover:bg-slate-800 transition group"
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0">
                  {issue.type === 'error' && <AlertTriangle size={14} className="text-red-400" />}
                  {issue.type === 'warning' && <AlertTriangle size={14} className="text-amber-400" />}
                  {issue.type === 'info' && <Info size={14} className="text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200">{issue.message}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{issue.suggestion}</div>
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0">{issue.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
