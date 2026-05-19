'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onInsert: (char: string) => void
  onClose: () => void
}

const CATEGORIES: { label: string; chars: string[] }[] = [
  {
    label: '一般記号',
    chars: [
      '©',
      '®',
      '™',
      '§',
      '¶',
      '†',
      '‡',
      '•',
      '…',
      '–',
      '—',
      '‹',
      '›',
      '«',
      '»',
      '°',
      '±',
      '×',
      '÷',
      '¬',
      '¢',
      '£',
      '¥',
      '€',
      '¤',
      '∞',
      '¿',
      '¡',
    ],
  },
  {
    label: '矢印',
    chars: ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓', '⇔', '⇕', '▲', '▼', '◀', '▶', '△', '▽', '◁', '▷'],
  },
  {
    label: '数学記号',
    chars: [
      '∑',
      '∏',
      '∫',
      '∂',
      '√',
      '∝',
      '∞',
      '∠',
      '∩',
      '∪',
      '⊂',
      '⊃',
      '⊆',
      '⊇',
      '≈',
      '≠',
      '≤',
      '≥',
      '≡',
      '∀',
      '∃',
      '∅',
      '∈',
      '∉',
      '±',
      '∓',
      '×',
      '÷',
    ],
  },
  {
    label: 'ギリシャ文字',
    chars: [
      'α',
      'β',
      'γ',
      'δ',
      'ε',
      'ζ',
      'η',
      'θ',
      'ι',
      'κ',
      'λ',
      'μ',
      'ν',
      'ξ',
      'ο',
      'π',
      'ρ',
      'σ',
      'τ',
      'υ',
      'φ',
      'χ',
      'ψ',
      'ω',
      'Α',
      'Β',
      'Γ',
      'Δ',
      'Ε',
      'Ζ',
      'Η',
      'Θ',
      'Λ',
      'Π',
      'Σ',
      'Φ',
      'Ψ',
      'Ω',
    ],
  },
  {
    label: '装飾',
    chars: [
      '★',
      '☆',
      '♠',
      '♣',
      '♥',
      '♦',
      '♪',
      '♫',
      '♬',
      '✓',
      '✗',
      '✦',
      '✧',
      '✪',
      '✫',
      '✰',
      '❤',
      '❖',
      '☀',
      '☁',
      '☂',
      '☃',
      '⚡',
      '⚙',
      '☎',
      '✉',
      '✂',
      '✏',
    ],
  },
  {
    label: '罫線',
    chars: [
      '─',
      '│',
      '┌',
      '┐',
      '└',
      '┘',
      '├',
      '┤',
      '┬',
      '┴',
      '┼',
      '═',
      '║',
      '╔',
      '╗',
      '╚',
      '╝',
      '╠',
      '╣',
      '╦',
      '╩',
      '╬',
      '━',
      '┃',
      '┏',
      '┓',
      '┗',
      '┛',
    ],
  },
]

export default function SpecialCharsModal({ onInsert, onClose }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [recentChars, setRecentChars] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dc-recent-chars') || '[]')
    } catch {
      return []
    }
  })

  function handleInsert(char: string) {
    onInsert(char)
    const next = [char, ...recentChars.filter((c) => c !== char)].slice(0, 12)
    setRecentChars(next)
    localStorage.setItem('dc-recent-chars', JSON.stringify(next))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[480px] max-h-[420px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-sm font-medium text-white">特殊文字の挿入</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Recent */}
        {recentChars.length > 0 && (
          <div className="px-4 pt-2 pb-1">
            <div className="text-[10px] text-slate-500 mb-1">最近使用</div>
            <div className="flex flex-wrap gap-1">
              {recentChars.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleInsert(c)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-slate-800 text-white hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-base"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex gap-0.5 px-4 pt-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`text-[10px] px-2 py-1 rounded-t whitespace-nowrap transition-colors ${
                activeTab === i ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Character grid */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {CATEGORIES[activeTab].chars.map((c, i) => (
              <button
                key={i}
                onClick={() => handleInsert(c)}
                className="w-9 h-9 flex items-center justify-center rounded bg-slate-800/50 text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-lg border border-slate-700/50"
                title={`U+${c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
