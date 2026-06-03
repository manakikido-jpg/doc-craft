'use client'

import { useRef, useState, useMemo } from 'react'
import { Copy, Check, WrapText } from 'lucide-react'

interface Props {
  content: string
  language?: string
  onUpdate: (content: string) => void
  onUpdateData?: (data: Record<string, string>) => void
}

// Simple syntax highlighting rules per language
const HIGHLIGHT_RULES: Record<string, { pattern: RegExp; className: string }[]> = {
  javascript: [
    { pattern: /(\/\/.*$)/gm, className: 'text-slate-500 italic' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-slate-500 italic' },
    {
      pattern:
        /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|import|export|from|default|new|this|typeof|instanceof|try|catch|finally|throw|async|await|yield)\b/g,
      className: 'text-purple-400',
    },
    { pattern: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-amber-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-amber-300' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'text-emerald-300' },
    {
      pattern: /\b(console|document|window|Math|JSON|Array|Object|String|Number|Boolean|Promise|Map|Set)\b/g,
      className: 'text-cyan-400',
    },
  ],
  typescript: [
    { pattern: /(\/\/.*$)/gm, className: 'text-slate-500 italic' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-slate-500 italic' },
    {
      pattern:
        /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|import|export|from|default|new|this|typeof|instanceof|try|catch|finally|throw|async|await|yield|type|interface|enum|implements|extends|abstract|declare|namespace|module|readonly|keyof|infer|as|is)\b/g,
      className: 'text-purple-400',
    },
    {
      pattern: /\b(true|false|null|undefined|NaN|Infinity|void|never|any|unknown|string|number|boolean)\b/g,
      className: 'text-amber-400',
    },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-amber-300' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, className: 'text-emerald-300' },
    {
      pattern:
        /\b(console|document|window|Math|JSON|Array|Object|String|Number|Boolean|Promise|Map|Set|Record|Partial|Required|Readonly|Pick|Omit)\b/g,
      className: 'text-cyan-400',
    },
  ],
  python: [
    { pattern: /(#.*$)/gm, className: 'text-slate-500 italic' },
    { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, className: 'text-slate-500 italic' },
    {
      pattern:
        /\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|in|is|global|nonlocal|assert|del|async|await)\b/g,
      className: 'text-purple-400',
    },
    { pattern: /\b(True|False|None)\b/g, className: 'text-amber-400' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-amber-300' },
    { pattern: /(f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*')/g, className: 'text-emerald-300' },
    {
      pattern:
        /\b(print|len|range|int|str|float|list|dict|set|tuple|type|isinstance|enumerate|zip|map|filter|sorted|reversed|open|input|super|property|staticmethod|classmethod)\b/g,
      className: 'text-cyan-400',
    },
    { pattern: /(@\w+)/g, className: 'text-yellow-400' },
  ],
  html: [
    { pattern: /(&lt;!--[\s\S]*?--&gt;|<!--[\s\S]*?-->)/g, className: 'text-slate-500 italic' },
    { pattern: /(&lt;\/?)([\w-]+)/g, className: 'text-rose-400' },
    { pattern: /\b([\w-]+)(?==)/g, className: 'text-amber-300' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-emerald-300' },
  ],
  css: [
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'text-slate-500 italic' },
    { pattern: /([.#][\w-]+)/g, className: 'text-amber-300' },
    { pattern: /\b([\w-]+)(?=\s*:)/g, className: 'text-cyan-400' },
    { pattern: /\b(\d+\.?\d*(px|rem|em|%|vh|vw|s|ms)?)\b/g, className: 'text-amber-400' },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-emerald-300' },
  ],
  json: [
    { pattern: /("(?:[^"\\]|\\.)*")(?=\s*:)/g, className: 'text-cyan-400' },
    { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, className: 'text-emerald-300' },
    { pattern: /\b(true|false|null)\b/g, className: 'text-amber-400' },
    { pattern: /\b(-?\d+\.?\d*)\b/g, className: 'text-amber-300' },
  ],
  sql: [
    { pattern: /(--.*$)/gm, className: 'text-slate-500 italic' },
    {
      pattern:
        /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|LIKE|BETWEEN|EXISTS|CASE|WHEN|THEN|ELSE|END|VALUES|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|CASCADE)\b/gi,
      className: 'text-purple-400',
    },
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'text-emerald-300' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'text-amber-300' },
  ],
  bash: [
    { pattern: /(#.*$)/gm, className: 'text-slate-500 italic' },
    {
      pattern:
        /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|in|echo|exit|export|source|alias|cd|ls|grep|sed|awk|cat|chmod|chown|mkdir|rm|mv|cp|find|xargs|pipe|sudo|apt|npm|yarn|git|docker)\b/g,
      className: 'text-purple-400',
    },
    { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, className: 'text-emerald-300' },
    { pattern: /(\$[\w{]+}?)/g, className: 'text-cyan-400' },
  ],
}

function highlightCode(code: string, lang: string): string {
  const rules = HIGHLIGHT_RULES[lang]
  if (!rules) return escapeHtml(code)

  // Tokenize to avoid double-highlighting
  const tokens: { start: number; end: number; html: string }[] = []
  const escaped = escapeHtml(code)

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
    let match
    while ((match = regex.exec(escaped)) !== null) {
      const start = match.index
      const end = start + match[0].length
      // Check overlap
      if (!tokens.some((t) => (start >= t.start && start < t.end) || (end > t.start && end <= t.end))) {
        tokens.push({ start, end, html: `<span class="${rule.className}">${match[0]}</span>` })
      }
    }
  }

  // Sort by start position and build result
  tokens.sort((a, b) => b.start - a.start)
  let result = escaped
  for (const t of tokens) {
    result = result.slice(0, t.start) + t.html + result.slice(t.end)
  }
  return result
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default function CodeBlock({ content, language = 'plaintext', onUpdate, onUpdateData }: Props) {
  const editRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wordWrap, setWordWrap] = useState(true)

  const highlighted = useMemo(() => highlightCode(content, language), [content, language])
  const lineCount = (content || '').split('\n').length

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="my-3 rounded-lg border border-slate-700 overflow-hidden bg-slate-900">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onUpdateData?.({ language: e.target.value })}
            className="text-xs bg-transparent text-slate-400 border-none focus:outline-none cursor-pointer"
          >
            <option value="plaintext">Plain Text</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="sql">SQL</option>
            <option value="bash">Bash</option>
          </select>
          <span className="text-[10px] text-slate-600">{lineCount} 行</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded transition-colors ${wordWrap ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            title="折り返し"
          >
            <WrapText size={12} />
          </button>
          <button
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-700"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" /> コピー済み
              </>
            ) : (
              <>
                <Copy size={12} /> コピー
              </>
            )}
          </button>
        </div>
      </div>
      <div className="relative flex">
        {/* Line numbers */}
        <div
          className="select-none text-right pr-3 pl-3 py-4 text-xs font-mono text-slate-600 border-r border-slate-800 bg-slate-900/50 flex-shrink-0"
          style={{ minWidth: '3rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} style={{ lineHeight: '1.5rem' }}>
              {i + 1}
            </div>
          ))}
        </div>
        {editing ? (
          <textarea
            ref={editRef}
            autoFocus
            defaultValue={content}
            className={`flex-1 p-4 text-sm font-mono text-emerald-300 bg-transparent focus:outline-none resize-none min-h-[3em] ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'}`}
            style={{ lineHeight: '1.5rem' }}
            onBlur={(e) => {
              onUpdate(e.target.value)
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault()
                const textarea = e.currentTarget
                const start = textarea.selectionStart
                const end = textarea.selectionEnd
                const value = textarea.value
                textarea.value = value.substring(0, start) + '  ' + value.substring(end)
                textarea.selectionStart = textarea.selectionEnd = start + 2
              }
            }}
            spellCheck={false}
          />
        ) : (
          <pre
            onClick={() => setEditing(true)}
            className={`flex-1 p-4 text-sm font-mono text-emerald-300 cursor-text min-h-[3em] ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'}`}
            style={{ lineHeight: '1.5rem' }}
            data-placeholder="コードを入力..."
            dangerouslySetInnerHTML={{ __html: highlighted || '<span class="text-slate-600">コードを入力...</span>' }}
          />
        )}
      </div>
    </div>
  )
}
