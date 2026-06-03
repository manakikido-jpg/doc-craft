'use client'

import { useState, useCallback } from 'react'
import { X, Database, RefreshCw, Download } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onImportData: (data: Record<string, { value: string }>, rowCount: number, colCount: number) => void
}

export default function DataConnectionDialog({ open, onClose, onImportData }: Props) {
  const [csvUrl, setCsvUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUrl, setLastUrl] = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null)

  const parseCSV = useCallback((text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    return lines.map((line) => {
      const cols: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            current += '"'
            i++
          } else if (ch === '"') {
            inQuotes = false
          } else {
            current += ch
          }
        } else {
          if (ch === '"') {
            inQuotes = true
          } else if (ch === ',') {
            cols.push(current)
            current = ''
          } else {
            current += ch
          }
        }
      }
      cols.push(current)
      return cols
    })
  }, [])

  const fetchAndParse = useCallback(async (url: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const text = await response.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        throw new Error('CSVデータが空です')
      }
      setPreviewRows(rows.slice(0, 5))
      setLastUrl(url)

      // Convert to cell data
      const cells: Record<string, { value: string }> = {}
      let maxCol = 0
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
          if (rows[r][c]) {
            cells[`${r}-${c}`] = { value: rows[r][c] }
          }
          if (c > maxCol) maxCol = c
        }
      }
      onImportData(cells, rows.length, maxCol + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [parseCSV, onImportData])

  const handleFetch = useCallback(() => {
    if (!csvUrl.trim()) return
    fetchAndParse(csvUrl.trim())
  }, [csvUrl, fetchAndParse])

  const handleRefresh = useCallback(() => {
    if (!lastUrl) return
    fetchAndParse(lastUrl)
  }, [lastUrl, fetchAndParse])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database size={18} className="text-emerald-400" />
            データ接続
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* URL input */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              CSV URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
                placeholder="https://example.com/data.csv"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-slate-500 focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFetch()
                }}
              />
              <button
                onClick={handleFetch}
                disabled={loading || !csvUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                取得
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw size={16} className="text-emerald-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-400">データ取得中...</span>
            </div>
          )}

          {/* Preview */}
          {previewRows && previewRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  プレビュー (先頭5行)
                </span>
                {lastUrl && (
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                  >
                    <RefreshCw size={11} />
                    再取得
                  </button>
                )}
              </div>
              <div className="overflow-x-auto bg-slate-800/50 rounded-lg border border-slate-700">
                <table className="text-xs w-full">
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className={ri === 0 ? 'bg-slate-700/50 font-semibold' : 'border-t border-slate-700/50'}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 text-slate-300 whitespace-nowrap max-w-[120px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
