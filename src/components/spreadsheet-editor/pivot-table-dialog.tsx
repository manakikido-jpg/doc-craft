'use client'

import { useState, useMemo } from 'react'
import { X, Table2, ArrowRight } from 'lucide-react'
import type { Sheet } from '@/types'
import type { SelectionRange } from './spreadsheet-editor'
import { colIndexToLetter } from '@/lib/formula-engine'

interface Props {
  sheet: Sheet
  selectionRange: SelectionRange | null
  computedValues: Record<string, string | number>
  onInsertPivot: (result: PivotResult) => void
  onClose: () => void
}

export interface PivotResult {
  headers: string[]
  rows: string[][]
}

type AggFunc = 'sum' | 'count' | 'avg' | 'max' | 'min'

const AGG_LABELS: Record<AggFunc, string> = {
  sum: '合計',
  count: '個数',
  avg: '平均',
  max: '最大',
  min: '最小',
}

export default function PivotTableDialog({ sheet, selectionRange, computedValues, onInsertPivot, onClose }: Props) {
  // Get header row from selection
  const range = selectionRange || { startRow: 0, startCol: 0, endRow: Math.min(sheet.rowCount - 1, 49), endCol: Math.min(sheet.colCount - 1, 25) }

  const columnNames = useMemo(() => {
    const names: { col: number; name: string }[] = []
    for (let c = range.startCol; c <= range.endCol; c++) {
      const key = `${range.startRow}-${c}`
      const val = computedValues[key] ?? sheet.cells[key]?.value ?? ''
      names.push({ col: c, name: String(val) || colIndexToLetter(c) })
    }
    return names
  }, [range, computedValues, sheet.cells])

  const [rowField, setRowField] = useState<number>(range.startCol)
  const [valueField, setValueField] = useState<number>(range.startCol + 1 <= range.endCol ? range.startCol + 1 : range.startCol)
  const [aggFunc, setAggFunc] = useState<AggFunc>('sum')

  // Build pivot data
  const pivotResult = useMemo((): PivotResult => {
    const grouped: Record<string, number[]> = {}

    // Data rows (skip header)
    for (let r = range.startRow + 1; r <= range.endRow; r++) {
      const rowKey = `${r}-${rowField}`
      const valKey = `${r}-${valueField}`
      const rowLabel = String(computedValues[rowKey] ?? sheet.cells[rowKey]?.value ?? '')
      const rawVal = computedValues[valKey] ?? sheet.cells[valKey]?.value ?? ''
      const numVal = Number(rawVal)

      if (!rowLabel) continue
      if (!grouped[rowLabel]) grouped[rowLabel] = []
      if (!isNaN(numVal) && rawVal !== '') {
        grouped[rowLabel].push(numVal)
      }
    }

    // Aggregate
    const headers = [
      columnNames.find((c) => c.col === rowField)?.name || '行',
      `${AGG_LABELS[aggFunc]}(${columnNames.find((c) => c.col === valueField)?.name || '値'})`,
    ]

    const rows: string[][] = []
    const entries = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0], 'ja'))

    let grandTotal: number[] = []

    for (const [label, values] of entries) {
      let result: number
      switch (aggFunc) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0)
          break
        case 'count':
          result = values.length
          break
        case 'avg':
          result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
          break
        case 'max':
          result = values.length > 0 ? Math.max(...values) : 0
          break
        case 'min':
          result = values.length > 0 ? Math.min(...values) : 0
          break
      }
      rows.push([label, aggFunc === 'avg' ? result.toFixed(2) : String(result)])
      grandTotal = grandTotal.concat(values)
    }

    // Grand total
    if (rows.length > 0) {
      let total: number
      switch (aggFunc) {
        case 'sum':
          total = grandTotal.reduce((a, b) => a + b, 0)
          break
        case 'count':
          total = grandTotal.length
          break
        case 'avg':
          total = grandTotal.length > 0 ? grandTotal.reduce((a, b) => a + b, 0) / grandTotal.length : 0
          break
        case 'max':
          total = grandTotal.length > 0 ? Math.max(...grandTotal) : 0
          break
        case 'min':
          total = grandTotal.length > 0 ? Math.min(...grandTotal) : 0
          break
      }
      rows.push(['合計', aggFunc === 'avg' ? total.toFixed(2) : String(total)])
    }

    return { headers, rows }
  }, [range, rowField, valueField, aggFunc, computedValues, sheet.cells, columnNames])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-scale-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Table2 size={18} className="text-cyan-400" />
            ピボットテーブル
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">行フィールド</label>
              <select
                value={rowField}
                onChange={(e) => setRowField(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {columnNames.map((c) => (
                  <option key={c.col} value={c.col}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">値フィールド</label>
              <select
                value={valueField}
                onChange={(e) => setValueField(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {columnNames.map((c) => (
                  <option key={c.col} value={c.col}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">集計方法</label>
              <select
                value={aggFunc}
                onChange={(e) => setAggFunc(e.target.value as AggFunc)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {Object.entries(AGG_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            データ範囲: {colIndexToLetter(range.startCol)}{range.startRow + 1} : {colIndexToLetter(range.endCol)}{range.endRow + 1}
            （{range.endRow - range.startRow}行 × {range.endCol - range.startCol + 1}列）
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">プレビュー</p>
          {pivotResult.rows.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">データがありません</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {pivotResult.headers.map((h, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 bg-cyan-500/10 text-cyan-300 font-semibold border-b border-slate-700 text-xs"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pivotResult.rows.map((row, ri) => {
                  const isTotal = ri === pivotResult.rows.length - 1
                  return (
                    <tr
                      key={ri}
                      className={`${isTotal ? 'bg-slate-800/50 font-semibold' : 'hover:bg-slate-800/30'} border-b border-slate-800`}
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className={`px-3 py-1.5 text-slate-300 ${ci > 0 ? 'text-right font-mono' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">{pivotResult.rows.length - 1}グループ</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onInsertPivot(pivotResult)
                onClose()
              }}
              disabled={pivotResult.rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight size={14} />
              新しいシートに挿入
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
