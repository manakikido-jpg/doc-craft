'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  content: string
  onUpdate: (content: string) => void
}

// Simple math renderer — renders common LaTeX-like notation to display
function renderMath(expr: string): string {
  if (!expr.trim()) return '<span style="color:#64748b;font-style:italic">数式を入力...</span>'

  let html = expr

  // Matrices: \begin{pmatrix}...\end{pmatrix}, \begin{bmatrix}...\end{bmatrix}
  html = html.replace(
    /\\begin\{(pmatrix|bmatrix|matrix)\}([\s\S]*?)\\end\{\1\}/g,
    (_match, type: string, body: string) => {
      const leftBracket = type === 'pmatrix' ? '(' : type === 'bmatrix' ? '[' : ''
      const rightBracket = type === 'pmatrix' ? ')' : type === 'bmatrix' ? ']' : ''
      const rows = body.split('\\\\').map(r => r.trim()).filter(r => r.length > 0)
      const cellsHtml = rows.map(row => {
        const cols = row.split('&').map(c => c.trim())
        return '<div style="display:flex;gap:12px;justify-content:center">' +
          cols.map(c => `<span style="min-width:20px;text-align:center">${c}</span>`).join('') +
          '</div>'
      }).join('')
      return `<span style="display:inline-flex;align-items:center;vertical-align:middle;gap:2px"><span style="font-size:1.5em;font-weight:100">${leftBracket}</span><span style="display:inline-flex;flex-direction:column;gap:2px;padding:4px 0">${cellsHtml}</span><span style="font-size:1.5em;font-weight:100">${rightBracket}</span></span>`
    },
  )

  // Sum/Product with limits: \sum_{lower}^{upper} or \prod_{lower}^{upper}
  html = html.replace(
    /\\(sum|prod)_\{([^}]*)\}\^\{([^}]*)\}/g,
    (_match, op: string, lower: string, upper: string) => {
      const symbol = op === 'sum' ? '∑' : '∏'
      return `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px"><span style="font-size:0.6em;line-height:1">${upper}</span><span style="font-size:1.4em;line-height:1">${symbol}</span><span style="font-size:0.6em;line-height:1">${lower}</span></span>`
    },
  )

  // Fractions: \frac{a}{b}
  html = html.replace(
    /\\frac\{([^}]*)\}\{([^}]*)\}/g,
    '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle"><span style="border-bottom:1px solid currentColor;padding:0 4px">$1</span><span style="padding:0 4px">$2</span></span>',
  )

  // Square root: \sqrt{x}
  html = html.replace(
    /\\sqrt\{([^}]*)\}/g,
    '<span style="display:inline-flex;align-items:center;vertical-align:middle"><span style="font-size:1.1em;margin-right:1px">&#8730;</span><span style="border-top:1px solid currentColor;padding:0 3px 0 2px">$1</span></span>',
  )

  // Superscript: ^{x} or ^x
  html = html.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
  html = html.replace(/\^(\w)/g, '<sup>$1</sup>')
  // Subscript: _{x,y} or _{x} or _x (handles comma-separated nested subscripts)
  html = html.replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
  html = html.replace(/_(\w)/g, '<sub>$1</sub>')
  // Sum, product, integral (standalone without limits)
  html = html.replace(/\\sum/g, '∑')
  html = html.replace(/\\prod/g, '∏')
  html = html.replace(/\\int/g, '∫')
  html = html.replace(/\\infty/g, '∞')
  // Greek letters
  html = html.replace(/\\alpha/g, 'α')
  html = html.replace(/\\beta/g, 'β')
  html = html.replace(/\\gamma/g, 'γ')
  html = html.replace(/\\delta/g, 'δ')
  html = html.replace(/\\epsilon/g, 'ε')
  html = html.replace(/\\theta/g, 'θ')
  html = html.replace(/\\lambda/g, 'λ')
  html = html.replace(/\\mu/g, 'μ')
  html = html.replace(/\\pi/g, 'π')
  html = html.replace(/\\sigma/g, 'σ')
  html = html.replace(/\\omega/g, 'ω')
  html = html.replace(/\\phi/g, 'φ')
  html = html.replace(/\\Delta/g, 'Δ')
  html = html.replace(/\\Sigma/g, 'Σ')
  html = html.replace(/\\Omega/g, 'Ω')
  html = html.replace(/\\Pi/g, 'Π')
  html = html.replace(/\\Phi/g, 'Φ')
  // Operators
  html = html.replace(/\\times/g, '×')
  html = html.replace(/\\div/g, '÷')
  html = html.replace(/\\pm/g, '±')
  html = html.replace(/\\leq/g, '≤')
  html = html.replace(/\\geq/g, '≥')
  html = html.replace(/\\neq/g, '≠')
  html = html.replace(/\\approx/g, '≈')
  html = html.replace(/\\cdot/g, '·')
  // Arrows
  html = html.replace(/\\rightarrow/g, '→')
  html = html.replace(/\\leftarrow/g, '←')
  html = html.replace(/\\Rightarrow/g, '⇒')
  html = html.replace(/\\Leftarrow/g, '⇐')
  // Misc
  html = html.replace(/\\partial/g, '∂')
  html = html.replace(/\\nabla/g, '∇')
  html = html.replace(/\\forall/g, '∀')
  html = html.replace(/\\exists/g, '∃')
  html = html.replace(/\\in/g, '∈')
  html = html.replace(/\\notin/g, '∉')

  return html
}

export default function MathBlock({ content, onUpdate }: Props) {
  const [editing, setEditing] = useState(!content)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [localContent, setLocalContent] = useState(content)

  useEffect(() => {
    setLocalContent(content)
  }, [content])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  if (editing) {
    return (
      <div className="my-3 bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 font-mono">数式エディタ (LaTeX風)</span>
          <button
            onClick={() => {
              onUpdate(localContent)
              setEditing(false)
            }}
            className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500"
          >
            完了
          </button>
        </div>
        <textarea
          ref={inputRef}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={() => {
            onUpdate(localContent)
            setEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onUpdate(localContent)
              setEditing(false)
            }
          }}
          className="w-full bg-slate-900 text-emerald-400 font-mono text-sm p-3 rounded border border-slate-600 focus:border-indigo-500 focus:outline-none resize-none"
          rows={2}
          placeholder="例: E = mc^2, \frac{a}{b}, \sum_{i=1}^{n} x_i"
        />
        <div className="mt-2 text-xs text-slate-500">
          プレビュー:
          <div
            className="mt-1 text-lg text-white font-serif"
            dangerouslySetInnerHTML={{ __html: renderMath(localContent) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="my-3 bg-slate-800/30 border border-slate-700/50 rounded-lg px-6 py-4 cursor-pointer hover:border-slate-600 transition-colors text-center"
      onClick={() => setEditing(true)}
    >
      <div className="text-xl text-white font-serif" dangerouslySetInnerHTML={{ __html: renderMath(content) }} />
    </div>
  )
}
