'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  content: string
  onUpdate: (content: string) => void
}

// Simple math renderer — renders common LaTeX-like notation to display
function renderMath(expr: string): string {
  if (!expr.trim()) return '<span style="color:#64748b;font-style:italic">数式を入力...</span>'

  const html = expr
    // Fractions: \frac{a}{b}
    .replace(
      /\\frac\{([^}]*)\}\{([^}]*)\}/g,
      '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle"><span style="border-bottom:1px solid currentColor;padding:0 4px">$1</span><span style="padding:0 4px">$2</span></span>',
    )
    // Square root: \sqrt{x}
    .replace(/\\sqrt\{([^}]*)\}/g, '√<span style="text-decoration:overline;padding:0 2px">$1</span>')
    // Superscript: ^{x} or ^x
    .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>')
    .replace(/\^(\w)/g, '<sup>$1</sup>')
    // Subscript: _{x} or _x
    .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
    .replace(/_(\w)/g, '<sub>$1</sub>')
    // Sum, product, integral
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\int/g, '∫')
    .replace(/\\infty/g, '∞')
    // Greek letters
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\phi/g, 'φ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Sigma/g, 'Σ')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\Pi/g, 'Π')
    .replace(/\\Phi/g, 'Φ')
    // Operators
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\cdot/g, '·')
    // Arrows
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Leftarrow/g, '⇐')
    // Misc
    .replace(/\\partial/g, '∂')
    .replace(/\\nabla/g, '∇')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    .replace(/\\in/g, '∈')
    .replace(/\\notin/g, '∉')

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
