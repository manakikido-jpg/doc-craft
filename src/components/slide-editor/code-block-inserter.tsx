'use client'

import { useState, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onInsert: (svgDataUrl: string) => void
}

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'SQL',
  'JSON', 'Bash', 'Go', 'Rust', 'Java', 'C++',
] as const

type Language = (typeof LANGUAGES)[number]

const KEYWORDS = new Set([
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while',
  'class', 'import', 'export', 'from', 'def', 'async', 'await', 'new', 'this',
  'true', 'false', 'null', 'undefined', 'try', 'catch', 'throw', 'finally',
  'switch', 'case', 'break', 'continue', 'default', 'do', 'in', 'of',
  'yield', 'with', 'as', 'type', 'interface', 'enum', 'extends', 'implements',
  'package', 'public', 'private', 'protected', 'static', 'final', 'void',
  'struct', 'fn', 'use', 'mod', 'pub', 'impl', 'trait', 'match', 'loop',
  'select', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'where',
  'and', 'or', 'not', 'is', 'elif', 'pass', 'lambda', 'raise', 'except',
  'go', 'func', 'defer', 'chan', 'range', 'map', 'make', 'append',
  'println', 'printf', 'fmt', 'include', 'using', 'namespace', 'template',
])

const TYPE_KEYWORDS = new Set([
  'string', 'number', 'boolean', 'int', 'float', 'double', 'char', 'byte',
  'long', 'short', 'i32', 'u32', 'i64', 'u64', 'f32', 'f64', 'usize',
  'str', 'bool', 'Vec', 'String', 'Option', 'Result', 'Array', 'Map',
  'Set', 'Promise', 'void', 'any', 'never', 'unknown', 'object',
])

interface Token {
  text: string
  color: string
}

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  // Check for comment
  const trimmed = line.trimStart()
  if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return [{ text: line, color: '#6a9955' }]
  }

  while (i < line.length) {
    // Whitespace
    if (/\s/.test(line[i])) {
      let ws = ''
      while (i < line.length && /\s/.test(line[i])) {
        ws += line[i]
        i++
      }
      tokens.push({ text: ws, color: '#e2e8f0' })
      continue
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i]
      let str = quote
      i++
      while (i < line.length && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < line.length) {
          str += line[i] + line[i + 1]
          i += 2
        } else {
          str += line[i]
          i++
        }
      }
      if (i < line.length) {
        str += line[i]
        i++
      }
      tokens.push({ text: str, color: '#ce9178' })
      continue
    }

    // Numbers
    if (/[0-9]/.test(line[i])) {
      let num = ''
      while (i < line.length && /[0-9.xXa-fA-F]/.test(line[i])) {
        num += line[i]
        i++
      }
      tokens.push({ text: num, color: '#b5cea8' })
      continue
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let word = ''
      while (i < line.length && /[a-zA-Z0-9_$]/.test(line[i])) {
        word += line[i]
        i++
      }
      if (KEYWORDS.has(word)) {
        tokens.push({ text: word, color: '#569cd6' })
      } else if (TYPE_KEYWORDS.has(word)) {
        tokens.push({ text: word, color: '#c586c0' })
      } else {
        tokens.push({ text: word, color: '#e2e8f0' })
      }
      continue
    }

    // Operators / punctuation
    tokens.push({ text: line[i], color: '#e2e8f0' })
    i++
  }

  return tokens
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function codeToSvgDataUrl(
  code: string,
  _language: Language,
  fontSize: number,
  showLineNumbers: boolean,
): string {
  const lines = code.split('\n')
  const lineHeight = fontSize * 1.5
  const padding = 20
  const lineNumWidth = showLineNumbers ? (String(lines.length).length * fontSize * 0.65 + 20) : 0
  const charWidth = fontSize * 0.6

  // Estimate max line width
  const maxLineLen = Math.max(...lines.map(l => l.length), 20)
  const contentWidth = maxLineLen * charWidth + lineNumWidth + padding * 2
  const width = Math.max(contentWidth, 300)
  const height = lines.length * lineHeight + padding * 2 + 8
  const cornerRadius = 12

  const svgLines: string[] = []

  // Background
  svgLines.push(`<rect width="${width}" height="${height}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#1e1e2e"/>`)

  // Title bar dots
  svgLines.push(`<circle cx="${padding}" cy="14" r="5" fill="#ff5f57"/>`)
  svgLines.push(`<circle cx="${padding + 16}" cy="14" r="5" fill="#ffbd2e"/>`)
  svgLines.push(`<circle cx="${padding + 32}" cy="14" r="5" fill="#28c840"/>`)

  const startY = 36

  lines.forEach((line, idx) => {
    const lineY = startY + idx * lineHeight + fontSize

    // Line number
    if (showLineNumbers) {
      const lineNum = String(idx + 1)
      svgLines.push(
        `<text x="${padding + lineNumWidth - 8}" y="${lineY}" font-size="${fontSize}" fill="#6a6a8a" font-family="'Consolas','Monaco',monospace" text-anchor="end">${lineNum}</text>`
      )
    }

    // Tokenize and render
    const tokens = tokenizeLine(line)
    let xPos = padding + lineNumWidth + 4
    for (const token of tokens) {
      const escaped = escapeXml(token.text)
      // Replace spaces with explicit positioning
      const displayText = escaped.replace(/ /g, ' ')
      svgLines.push(
        `<text x="${xPos}" y="${lineY}" font-size="${fontSize}" fill="${token.color}" font-family="'Consolas','Monaco',monospace">${displayText}</text>`
      )
      xPos += token.text.length * charWidth
    }
  })

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${svgLines.join('\n  ')}
</svg>`

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

const DEFAULT_CODE = `function greet(name) {
  const message = "Hello, " + name
  return message
}`

export default function CodeBlockInserter({ open, onClose, onInsert }: Props) {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [language, setLanguage] = useState<Language>('JavaScript')
  const [fontSize, setFontSize] = useState(14)
  const [showLineNumbers, setShowLineNumbers] = useState(true)

  const previewDataUrl = useMemo(() => {
    if (!code.trim()) return null
    try {
      return codeToSvgDataUrl(code, language, fontSize, showLineNumbers)
    } catch {
      return null
    }
  }, [code, language, fontSize, showLineNumbers])

  const handleInsert = useCallback(() => {
    if (!code.trim() || !previewDataUrl) return
    onInsert(previewDataUrl)
    onClose()
  }, [code, previewDataUrl, onInsert, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[700px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
          <h2 className="text-base font-semibold text-slate-100">コードブロック</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Controls row */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">言語</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as Language)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs text-slate-400 mb-1">フォントサイズ</label>
              <select
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[12, 13, 14, 16, 18, 20, 22, 24].map(s => (
                  <option key={s} value={s}>{s}px</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 pb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={e => setShowLineNumbers(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              行番号
            </label>
          </div>

          {/* Code textarea */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">コード</label>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="コードを入力..."
              className="w-full h-40 bg-[#1e1e2e] border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
              spellCheck={false}
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">プレビュー</label>
            <div className="w-full min-h-[80px] bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center p-4 overflow-auto">
              {previewDataUrl ? (
                <img src={previewDataUrl} alt="コードブロックプレビュー" className="max-w-full" />
              ) : (
                <span className="text-slate-500 text-sm">コードを入力するとプレビューされます</span>
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
            disabled={!code.trim() || !previewDataUrl}
            className="px-4 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            挿入
          </button>
        </div>
      </div>
    </div>
  )
}
