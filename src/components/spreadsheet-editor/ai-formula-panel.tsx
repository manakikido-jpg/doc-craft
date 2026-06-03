'use client'

import { useState, useMemo } from 'react'
import { Sparkles, X, Zap, ArrowRight, Copy, Check } from 'lucide-react'
import { colIndexToLetter } from '@/lib/formula-engine'
import type { Sheet } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'

interface Props {
  open: boolean
  onClose: () => void
  activeSheet: Sheet
  selectedCell: { row: number; col: number } | null
  selectionRange: SelectionRange | null
  computedValues: Record<string, string | number>
  onInsertFormula: (formula: string) => void
}

interface Suggestion {
  label: string
  description: string
  formula: string
  category: 'aggregate' | 'lookup' | 'conditional' | 'text' | 'date' | 'analysis'
}

export default function AiFormulaPanel({ open, onClose, activeSheet, selectedCell, selectionRange, computedValues, onInsertFormula }: Props) {
  const [prompt, setPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string; formula?: string }[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Analyze selected range to suggest formulas
  const suggestions = useMemo(() => {
    const results: Suggestion[] = []
    if (!activeSheet || !selectedCell) return results

    const range = selectionRange || { startRow: selectedCell.row, startCol: selectedCell.col, endRow: selectedCell.row, endCol: selectedCell.col }
    const startRef = `${colIndexToLetter(range.startCol)}${range.startRow + 1}`
    const endRef = `${colIndexToLetter(range.endCol)}${range.endRow + 1}`
    const rangeRef = startRef === endRef ? startRef : `${startRef}:${endRef}`
    const isMultiCell = range.endRow > range.startRow || range.endCol > range.startCol

    // Collect values in range
    const hasNumbers = []
    const hasText = []
    for (let r = range.startRow; r <= range.endRow; r++) {
      for (let c = range.startCol; c <= range.endCol; c++) {
        const v = computedValues[`${r}-${c}`]
        if (v !== undefined) {
          if (typeof v === 'number' || !isNaN(Number(v))) hasNumbers.push(v)
          else hasText.push(String(v))
        }
      }
    }

    if (isMultiCell && hasNumbers.length > 0) {
      results.push(
        { label: '合計', description: `選択範囲の合計を計算`, formula: `=SUM(${rangeRef})`, category: 'aggregate' },
        { label: '平均', description: `選択範囲の平均を計算`, formula: `=AVERAGE(${rangeRef})`, category: 'aggregate' },
        { label: '最大値', description: `選択範囲の最大値`, formula: `=MAX(${rangeRef})`, category: 'aggregate' },
        { label: '最小値', description: `選択範囲の最小値`, formula: `=MIN(${rangeRef})`, category: 'aggregate' },
        { label: '個数', description: `数値セルの個数`, formula: `=COUNT(${rangeRef})`, category: 'aggregate' },
        { label: '中央値', description: `選択範囲の中央値`, formula: `=MEDIAN(${rangeRef})`, category: 'aggregate' },
      )
    }

    if (isMultiCell) {
      results.push(
        { label: '空白でない数', description: `空白でないセルの個数`, formula: `=COUNTA(${rangeRef})`, category: 'aggregate' },
      )
    }

    // Suggest conditional formulas
    const cellRef = `${colIndexToLetter(selectedCell.col)}${selectedCell.row + 1}`
    results.push(
      { label: '条件分岐', description: `セルの値に応じて結果を変える`, formula: `=IF(${cellRef}>0, "正", "負")`, category: 'conditional' },
      { label: 'エラー処理', description: `エラー時に代替値を返す`, formula: `=IFERROR(${cellRef}/B1, 0)`, category: 'conditional' },
    )

    if (isMultiCell) {
      results.push(
        { label: '条件付き合計', description: `条件に一致するセルの合計`, formula: `=SUMIF(${rangeRef}, ">0")`, category: 'conditional' },
        { label: '条件付き個数', description: `条件に一致するセルの個数`, formula: `=COUNTIF(${rangeRef}, "<>0")`, category: 'conditional' },
      )
    }

    // Lookup suggestions
    results.push(
      { label: '縦方向検索', description: `テーブルから値を検索`, formula: `=VLOOKUP(${cellRef}, A1:D10, 2, 0)`, category: 'lookup' },
      { label: 'INDEX+MATCH', description: `柔軟な検索`, formula: `=INDEX(B1:B10, MATCH(${cellRef}, A1:A10, 0))`, category: 'lookup' },
    )

    // Text suggestions if text values exist
    if (hasText.length > 0) {
      results.push(
        { label: '文字列結合', description: `セルのテキストを結合`, formula: `=CONCAT(${cellRef}, " ", B${selectedCell.row + 1})`, category: 'text' },
        { label: '文字数', description: `テキストの文字数を取得`, formula: `=LEN(${cellRef})`, category: 'text' },
      )
    }

    // Date suggestions
    results.push(
      { label: '今日の日付', description: `本日の日付を挿入`, formula: `=TODAY()`, category: 'date' },
      { label: '日数差', description: `2つの日付間の日数`, formula: `=DATEDIF(A1, B1, "D")`, category: 'date' },
    )

    return results
  }, [activeSheet, selectedCell, selectionRange, computedValues])

  // Mock AI chat response
  function handleAsk() {
    if (!prompt.trim() || isThinking) return
    const userMsg = prompt.trim()
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }])
    setPrompt('')
    setIsThinking(true)

    setTimeout(() => {
      const cellRef = selectedCell ? `${colIndexToLetter(selectedCell.col)}${selectedCell.row + 1}` : 'A1'
      const range = selectionRange
        ? `${colIndexToLetter(selectionRange.startCol)}${selectionRange.startRow + 1}:${colIndexToLetter(selectionRange.endCol)}${selectionRange.endRow + 1}`
        : 'A1:A10'

      let aiResponse = { text: '', formula: '' }

      const lower = userMsg.toLowerCase()
      if (lower.includes('合計') || lower.includes('sum') || lower.includes('足')) {
        aiResponse = { text: `選択範囲の合計を計算します。SUM関数を使います。`, formula: `=SUM(${range})` }
      } else if (lower.includes('平均') || lower.includes('average')) {
        aiResponse = { text: `平均値を計算するにはAVERAGE関数を使います。`, formula: `=AVERAGE(${range})` }
      } else if (lower.includes('最大') || lower.includes('max')) {
        aiResponse = { text: `最大値を求めるにはMAX関数を使います。`, formula: `=MAX(${range})` }
      } else if (lower.includes('最小') || lower.includes('min')) {
        aiResponse = { text: `最小値を求めるにはMIN関数を使います。`, formula: `=MIN(${range})` }
      } else if (lower.includes('条件') || lower.includes('if') || lower.includes('もし')) {
        aiResponse = { text: `条件分岐にはIF関数を使います。条件、真の値、偽の値を指定してください。`, formula: `=IF(${cellRef}>0, "該当", "非該当")` }
      } else if (lower.includes('検索') || lower.includes('vlookup') || lower.includes('探')) {
        aiResponse = { text: `テーブルから値を検索するにはVLOOKUP関数が便利です。`, formula: `=VLOOKUP(${cellRef}, A1:D10, 2, FALSE)` }
      } else if (lower.includes('重複') || lower.includes('duplicate') || lower.includes('ユニーク')) {
        aiResponse = { text: `重複チェックにはCOUNTIF関数を使います。1より大きければ重複です。`, formula: `=COUNTIF(${range}, ${cellRef})>1` }
      } else if (lower.includes('順位') || lower.includes('rank') || lower.includes('ランク')) {
        aiResponse = { text: `順位を求めるにはRANK関数を使います。`, formula: `=RANK(${cellRef}, ${range})` }
      } else if (lower.includes('日付') || lower.includes('date') || lower.includes('今日')) {
        aiResponse = { text: `今日の日付にはTODAY()、現在日時にはNOW()を使います。`, formula: `=TODAY()` }
      } else if (lower.includes('割合') || lower.includes('パーセント') || lower.includes('%')) {
        aiResponse = { text: `割合の計算は値÷合計で求められます。`, formula: `=${cellRef}/SUM(${range})*100` }
      } else if (lower.includes('成長') || lower.includes('前月比') || lower.includes('増減')) {
        aiResponse = { text: `前月比の成長率を計算します。(今月-先月)/先月 × 100 です。`, formula: `=(${cellRef}-A1)/A1*100` }
      } else if (lower.includes('結合') || lower.includes('concat') || lower.includes('つなげ')) {
        aiResponse = { text: `文字列の結合にはCONCAT関数を使います。`, formula: `=CONCAT(${cellRef}, " ", B${selectedCell?.row ? selectedCell.row + 1 : 1})` }
      } else if (lower.includes('四捨五入') || lower.includes('round')) {
        aiResponse = { text: `四捨五入にはROUND関数を使います。第2引数で小数点以下の桁数を指定します。`, formula: `=ROUND(${cellRef}, 2)` }
      } else {
        aiResponse = { text: `「${userMsg}」に関連する数式を提案します。選択セルの範囲に基づいて、以下の関数をお試しください。`, formula: `=SUM(${range})` }
      }

      setChatHistory(prev => [...prev, { role: 'ai', ...aiResponse }])
      setIsThinking(false)
    }, 800)
  }

  function handleCopy(formula: string, idx: number) {
    navigator.clipboard.writeText(formula).catch(() => {})
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  if (!open) return null

  const categoryLabels: Record<string, string> = {
    aggregate: '集計',
    lookup: '検索',
    conditional: '条件',
    text: 'テキスト',
    date: '日付',
    analysis: '分析',
  }
  const categoryColors: Record<string, string> = {
    aggregate: 'bg-blue-500/20 text-blue-400',
    lookup: 'bg-purple-500/20 text-purple-400',
    conditional: 'bg-amber-500/20 text-amber-400',
    text: 'bg-green-500/20 text-green-400',
    date: 'bg-rose-500/20 text-rose-400',
    analysis: 'bg-cyan-500/20 text-cyan-400',
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          <span className="text-white font-semibold text-sm">AI数式アシスタント</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
      </div>

      {/* Suggestions */}
      <div className="p-3 border-b border-slate-800">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">おすすめの数式</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {suggestions.slice(0, 8).map((s, i) => (
            <button
              key={i}
              onClick={() => onInsertFormula(s.formula)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${categoryColors[s.category] || ''}`}>
                  {categoryLabels[s.category] || s.category}
                </span>
                <span className="text-xs text-white font-medium">{s.label}</span>
              </div>
              <div className="text-[10px] text-slate-500 mb-1">{s.description}</div>
              <code className="text-[10px] text-indigo-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded group-hover:bg-slate-700">
                {s.formula}
              </code>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatHistory.length === 0 && (
          <div className="text-center py-8">
            <Zap size={32} className="mx-auto text-slate-700 mb-3" />
            <p className="text-xs text-slate-500">やりたいことを日本語で入力してください</p>
            <div className="mt-3 space-y-1">
              {['合計を計算したい', '条件で分けたい', '重複を見つけたい', '前月比の成長率'].map(q => (
                <button
                  key={q}
                  onClick={() => { setPrompt(q); }}
                  className="block mx-auto text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  「{q}」
                </button>
              ))}
            </div>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              <p className="text-xs">{msg.text}</p>
              {msg.formula && (
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs font-mono text-indigo-300 bg-slate-900/50 px-2 py-1 rounded flex-1">
                    {msg.formula}
                  </code>
                  <button
                    onClick={() => handleCopy(msg.formula!, i)}
                    className="shrink-0 text-slate-400 hover:text-white"
                    title="コピー"
                  >
                    {copiedIdx === i ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => onInsertFormula(msg.formula!)}
                    className="shrink-0 text-indigo-400 hover:text-indigo-300"
                    title="セルに挿入"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAsk() }}
            placeholder="例: 売上の合計を計算したい"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleAsk}
            disabled={isThinking || !prompt.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
          >
            <Sparkles size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
