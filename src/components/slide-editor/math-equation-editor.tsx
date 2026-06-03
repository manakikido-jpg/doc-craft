'use client'

import { useState, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (svgDataUrl: string, latex: string) => void
  initialLatex?: string
}

const GREEK_MAP: Record<string, string> = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
  '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
  '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
  '\\sigma': 'σ', '\\tau': 'τ', '\\phi': 'φ', '\\chi': 'χ',
  '\\psi': 'ψ', '\\omega': 'ω',
  '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
  '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π', '\\Sigma': 'Σ',
  '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  '\\infty': '∞', '\\pm': '±', '\\times': '×', '\\div': '÷',
  '\\leq': '≤', '\\geq': '≥', '\\neq': '≠',
  '\\rightarrow': '→', '\\Rightarrow': '⇒',
  '\\sum': '∑', '\\int': '∫', '\\sqrt': '√',
}

const SYMBOL_BUTTONS = [
  { label: '∑', insert: '\\sum' },
  { label: '∫', insert: '\\int' },
  { label: '√', insert: '\\sqrt{}' },
  { label: '∞', insert: '\\infty' },
  { label: 'π', insert: '\\pi' },
  { label: 'θ', insert: '\\theta' },
  { label: 'α', insert: '\\alpha' },
  { label: 'β', insert: '\\beta' },
  { label: 'Δ', insert: '\\Delta' },
  { label: '≤', insert: '\\leq' },
  { label: '≥', insert: '\\geq' },
  { label: '≠', insert: '\\neq' },
  { label: '±', insert: '\\pm' },
  { label: '×', insert: '\\times' },
  { label: '÷', insert: '\\div' },
  { label: '→', insert: '\\rightarrow' },
  { label: '⇒', insert: '\\Rightarrow' },
]

interface ParsedNode {
  type: 'text' | 'frac' | 'sup' | 'sub' | 'sqrt' | 'group'
  content?: string
  children?: ParsedNode[]
  numerator?: ParsedNode[]
  denominator?: ParsedNode[]
  base?: ParsedNode[]
  exponent?: ParsedNode[]
  subscriptContent?: ParsedNode[]
  radicand?: ParsedNode[]
}

function extractBraceContent(latex: string, startIndex: number): { content: string; endIndex: number } {
  if (startIndex >= latex.length || latex[startIndex] !== '{') {
    return { content: '', endIndex: startIndex }
  }
  let depth = 0
  let i = startIndex
  while (i < latex.length) {
    if (latex[i] === '{') depth++
    else if (latex[i] === '}') {
      depth--
      if (depth === 0) return { content: latex.slice(startIndex + 1, i), endIndex: i + 1 }
    }
    i++
  }
  return { content: latex.slice(startIndex + 1), endIndex: latex.length }
}

function parseLatex(latex: string): ParsedNode[] {
  const nodes: ParsedNode[] = []
  let i = 0
  let textBuffer = ''

  const flushText = () => {
    if (textBuffer.length > 0) {
      nodes.push({ type: 'text', content: textBuffer })
      textBuffer = ''
    }
  }

  while (i < latex.length) {
    if (latex[i] === '\\') {
      // Find command name
      let cmd = '\\'
      let j = i + 1
      while (j < latex.length && /[a-zA-Z]/.test(latex[j])) {
        cmd += latex[j]
        j++
      }

      if (cmd === '\\frac') {
        flushText()
        const num = extractBraceContent(latex, j)
        const den = extractBraceContent(latex, num.endIndex)
        nodes.push({
          type: 'frac',
          numerator: parseLatex(num.content),
          denominator: parseLatex(den.content),
        })
        i = den.endIndex
      } else if (cmd === '\\sqrt') {
        flushText()
        const rad = extractBraceContent(latex, j)
        nodes.push({
          type: 'sqrt',
          radicand: parseLatex(rad.content),
        })
        i = rad.endIndex
      } else if (GREEK_MAP[cmd]) {
        flushText()
        nodes.push({ type: 'text', content: GREEK_MAP[cmd] })
        i = j
      } else {
        // Unknown command - render as text
        textBuffer += cmd
        i = j
      }
    } else if (latex[i] === '^') {
      flushText()
      i++
      if (i < latex.length && latex[i] === '{') {
        const content = extractBraceContent(latex, i)
        nodes.push({
          type: 'sup',
          exponent: parseLatex(content.content),
        })
        i = content.endIndex
      } else if (i < latex.length) {
        nodes.push({
          type: 'sup',
          exponent: [{ type: 'text', content: latex[i] }],
        })
        i++
      }
    } else if (latex[i] === '_') {
      flushText()
      i++
      if (i < latex.length && latex[i] === '{') {
        const content = extractBraceContent(latex, i)
        nodes.push({
          type: 'sub',
          subscriptContent: parseLatex(content.content),
        })
        i = content.endIndex
      } else if (i < latex.length) {
        nodes.push({
          type: 'sub',
          subscriptContent: [{ type: 'text', content: latex[i] }],
        })
        i++
      }
    } else if (latex[i] === '{') {
      flushText()
      const content = extractBraceContent(latex, i)
      nodes.push({
        type: 'group',
        children: parseLatex(content.content),
      })
      i = content.endIndex
    } else if (latex[i] === ' ') {
      textBuffer += ' '
      i++
    } else {
      textBuffer += latex[i]
      i++
    }
  }
  flushText()
  return nodes
}

interface RenderResult {
  svgParts: string[]
  width: number
  height: number
  baseline: number // distance from top to baseline
}

function renderNodes(nodes: ParsedNode[], fontSize: number, x: number, y: number): RenderResult {
  const parts: string[] = []
  let curX = x
  let maxHeight = fontSize
  let baseline = fontSize * 0.8

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        const text = node.content || ''
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        parts.push(`<text x="${curX}" y="${y + baseline}" font-size="${fontSize}" fill="#e2e8f0" font-family="'Times New Roman', serif">${escaped}</text>`)
        curX += text.length * fontSize * 0.6
        break
      }
      case 'frac': {
        const numResult = renderNodes(node.numerator || [], fontSize * 0.8, 0, 0)
        const denResult = renderNodes(node.denominator || [], fontSize * 0.8, 0, 0)
        const fracWidth = Math.max(numResult.width, denResult.width) + 8
        const numX = curX + (fracWidth - numResult.width) / 2
        const denX = curX + (fracWidth - denResult.width) / 2
        const lineY = y + baseline - fontSize * 0.2
        // Numerator above line
        const numParts = renderNodes(node.numerator || [], fontSize * 0.8, numX, lineY - numResult.height - 2)
        parts.push(...numParts.svgParts)
        // Fraction line
        parts.push(`<line x1="${curX}" y1="${lineY}" x2="${curX + fracWidth}" y2="${lineY}" stroke="#e2e8f0" stroke-width="1.5"/>`)
        // Denominator below line
        const denParts = renderNodes(node.denominator || [], fontSize * 0.8, denX, lineY + 4)
        parts.push(...denParts.svgParts)
        curX += fracWidth + 4
        maxHeight = Math.max(maxHeight, numResult.height + denResult.height + 10)
        break
      }
      case 'sup': {
        const supResult = renderNodes(node.exponent || [], fontSize * 0.65, curX, y - fontSize * 0.3)
        parts.push(...supResult.svgParts)
        curX += supResult.width + 2
        break
      }
      case 'sub': {
        const subResult = renderNodes(node.subscriptContent || [], fontSize * 0.65, curX, y + fontSize * 0.35)
        parts.push(...subResult.svgParts)
        curX += subResult.width + 2
        break
      }
      case 'sqrt': {
        const radResult = renderNodes(node.radicand || [], fontSize, curX + fontSize * 0.7, y)
        const sqrtW = radResult.width + fontSize * 0.8
        const sqrtH = maxHeight + 4
        // Radical sign
        parts.push(`<path d="M${curX + 2},${y + baseline - 2} L${curX + fontSize * 0.25},${y + sqrtH} L${curX + fontSize * 0.6},${y + 2} L${curX + sqrtW},${y + 2}" stroke="#e2e8f0" stroke-width="1.5" fill="none"/>`)
        parts.push(...radResult.svgParts)
        curX += sqrtW + 4
        break
      }
      case 'group': {
        const groupResult = renderNodes(node.children || [], fontSize, curX, y)
        parts.push(...groupResult.svgParts)
        curX += groupResult.width
        break
      }
    }
  }

  return { svgParts: parts, width: curX - x, height: maxHeight, baseline }
}

function latexToSvgDataUrl(latex: string): string {
  const fontSize = 28
  const padding = 16
  const parsed = parseLatex(latex)
  const result = renderNodes(parsed, fontSize, padding, padding)
  const width = Math.max(result.width + padding * 2, 60)
  const height = Math.max(result.height + padding * 2, 50)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="transparent"/>
    ${result.svgParts.join('\n    ')}
  </svg>`

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

export default function MathEquationEditor({ open, onClose, onInsert, initialLatex }: Props) {
  const [latex, setLatex] = useState(initialLatex || '')

  const previewDataUrl = useMemo(() => {
    if (!latex.trim()) return null
    try {
      return latexToSvgDataUrl(latex)
    } catch {
      return null
    }
  }, [latex])

  const handleInsertSymbol = useCallback((symbol: string) => {
    setLatex(prev => prev + symbol)
  }, [])

  const handleInsert = useCallback(() => {
    if (!latex.trim() || !previewDataUrl) return
    onInsert(previewDataUrl, latex)
    onClose()
  }, [latex, previewDataUrl, onInsert, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[640px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h2 className="text-base font-semibold text-slate-100">数式エディタ</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* LaTeX input */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">LaTeX</label>
            <textarea
              value={latex}
              onChange={e => setLatex(e.target.value)}
              placeholder="例: \frac{a}{b} + x^{2}"
              className="w-full h-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
            />
          </div>

          {/* Symbol buttons */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">記号</label>
            <div className="flex flex-wrap gap-1">
              {SYMBOL_BUTTONS.map(s => (
                <button
                  key={s.insert}
                  onClick={() => handleInsertSymbol(s.insert)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-lg text-slate-200 transition-colors"
                  title={s.insert}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template buttons */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">テンプレート</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleInsertSymbol('\\frac{a}{b}')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 transition-colors"
              >
                分数 a/b
              </button>
              <button
                onClick={() => handleInsertSymbol('^{}')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 transition-colors"
              >
                上付き x^n
              </button>
              <button
                onClick={() => handleInsertSymbol('_{}')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 transition-colors"
              >
                下付き x_n
              </button>
              <button
                onClick={() => handleInsertSymbol('\\sqrt{}')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 transition-colors"
              >
                平方根
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">プレビュー</label>
            <div className="w-full min-h-[80px] bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center p-4">
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="数式プレビュー" className="max-w-full max-h-[120px]" />
              ) : (
                <span className="text-slate-500 text-sm">LaTeXを入力すると数式がプレビューされます</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleInsert}
            disabled={!latex.trim() || !previewDataUrl}
            className="px-4 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            挿入
          </button>
        </div>
      </div>
    </div>
  )
}
