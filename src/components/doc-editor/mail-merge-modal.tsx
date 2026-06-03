'use client'

import { useState, useMemo } from 'react'
import { X, Plus, Trash2, FileDown, Copy } from 'lucide-react'
import type { Block } from '@/types'

interface Props {
  blocks: Block[]
  onApply: (mergedBlocks: Block[]) => void
  onClose: () => void
}

function extractVariables(blocks: Block[]): string[] {
  const vars = new Set<string>()
  blocks.forEach((b) => {
    const matches = b.content.match(/\{\{(.+?)\}\}/g)
    if (matches) {
      matches.forEach((m) => vars.add(m.replace(/\{\{|\}\}/g, '').trim()))
    }
  })
  return Array.from(vars)
}

function applyMerge(blocks: Block[], data: Record<string, string>): Block[] {
  return blocks.map((b) => {
    let content = b.content
    Object.entries(data).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
    })
    return { ...b, content }
  })
}

export default function MailMergeModal({ blocks, onApply, onClose }: Props) {
  const variables = useMemo(() => extractVariables(blocks), [blocks])
  const [dataRows, setDataRows] = useState<Record<string, string>[]>([
    Object.fromEntries(variables.map((v) => [v, ''])),
  ])
  const [previewIdx, setPreviewIdx] = useState(0)

  function addRow() {
    setDataRows([...dataRows, Object.fromEntries(variables.map((v) => [v, '']))])
  }

  function removeRow(idx: number) {
    if (dataRows.length <= 1) return
    setDataRows(dataRows.filter((_, i) => i !== idx))
  }

  function updateField(rowIdx: number, field: string, value: string) {
    setDataRows(dataRows.map((r, i) => (i === rowIdx ? { ...r, [field]: value } : r)))
  }

  function handleApply() {
    if (dataRows.length === 0) return
    const merged = applyMerge(blocks, dataRows[previewIdx])
    onApply(merged)
  }

  const previewBlocks = useMemo(
    () => (dataRows[previewIdx] ? applyMerge(blocks, dataRows[previewIdx]) : blocks),
    [blocks, dataRows, previewIdx],
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-sm font-medium text-white flex items-center gap-2">
            <Copy size={16} />
            差し込み印刷
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {variables.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-sm mb-2">テンプレート変数が見つかりません</div>
              <div className="text-slate-500 text-xs">
                ドキュメント内に <code className="bg-slate-800 px-1 rounded">{'{{変数名}}'}</code> の形式で
                プレースホルダーを追加してください。
              </div>
              <div className="text-slate-600 text-xs mt-3">
                例: {'{{氏名}}'}, {'{{会社名}}'}, {'{{日付}}'}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="text-xs text-slate-400 mb-2">
                  検出された変数: {variables.map((v) => (
                    <span key={v} className="inline-block bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-[10px] mr-1">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Data table */}
              <div className="mb-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[10px] text-slate-500 text-left px-2 py-1 border-b border-slate-800 w-8">#</th>
                      {variables.map((v) => (
                        <th key={v} className="text-[10px] text-slate-400 text-left px-2 py-1 border-b border-slate-800 font-medium">
                          {v}
                        </th>
                      ))}
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row, ri) => (
                      <tr key={ri} className={ri === previewIdx ? 'bg-indigo-500/5' : ''}>
                        <td className="text-[10px] text-slate-600 px-2 py-1">{ri + 1}</td>
                        {variables.map((v) => (
                          <td key={v} className="px-1 py-1">
                            <input
                              type="text"
                              value={row[v] || ''}
                              onChange={(e) => updateField(ri, v, e.target.value)}
                              placeholder={v}
                              className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                        ))}
                        <td className="px-1">
                          <button onClick={() => removeRow(ri)} className="text-slate-600 hover:text-red-400 p-0.5">
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={addRow}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <Plus size={10} /> 行を追加
                </button>
              </div>

              {/* Preview */}
              <div className="border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500">プレビュー</span>
                  <div className="flex items-center gap-1">
                    {dataRows.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewIdx(i)}
                        className={`text-[10px] w-5 h-5 rounded ${
                          i === previewIdx ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {previewBlocks.slice(0, 10).map((b) => (
                    <div key={b.id} className="text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: b.content || '<span class="text-slate-600">（空）</span>' }} />
                  ))}
                  {previewBlocks.length > 10 && (
                    <div className="text-[10px] text-slate-600">…他 {previewBlocks.length - 10} ブロック</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-white">
            キャンセル
          </button>
          {variables.length > 0 && (
            <button
              onClick={handleApply}
              className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1"
            >
              <FileDown size={12} /> 差し込み適用
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
