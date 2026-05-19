'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { PageSettings, HeaderFooterSettings } from '@/types'

interface Props {
  pageSettings?: PageSettings
  headerFooter?: HeaderFooterSettings
  onSavePageSettings: (settings: PageSettings) => void
  onSaveHeaderFooter: (settings: HeaderFooterSettings) => void
  onClose: () => void
}

const DEFAULT_PAGE: PageSettings = {
  size: 'a4',
  orientation: 'portrait',
  marginTop: 25,
  marginBottom: 25,
  marginLeft: 20,
  marginRight: 20,
}

export default function PageSettingsModal({
  pageSettings,
  headerFooter,
  onSavePageSettings,
  onSaveHeaderFooter,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'page' | 'header'>('page')
  const [page, setPage] = useState<PageSettings>(pageSettings || DEFAULT_PAGE)
  const [hf, setHf] = useState<HeaderFooterSettings>(headerFooter || {})

  function handleSave() {
    if (tab === 'page') onSavePageSettings(page)
    else onSaveHeaderFooter(hf)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="text-sm font-medium text-white">ページ設定</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setTab('page')}
            className={`flex-1 py-2 text-xs text-center transition-colors ${tab === 'page' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            用紙・余白
          </button>
          <button
            onClick={() => setTab('header')}
            className={`flex-1 py-2 text-xs text-center transition-colors ${tab === 'header' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            ヘッダー・フッター
          </button>
        </div>

        <div className="p-4 space-y-3">
          {tab === 'page' ? (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">用紙サイズ</label>
                <select
                  value={page.size}
                  onChange={(e) => setPage({ ...page, size: e.target.value as PageSettings['size'] })}
                  className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="a4">A4 (210×297mm)</option>
                  <option value="letter">Letter (216×279mm)</option>
                  <option value="legal">Legal (216×356mm)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">向き</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage({ ...page, orientation: 'portrait' })}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${page.orientation === 'portrait' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    縦
                  </button>
                  <button
                    onClick={() => setPage({ ...page, orientation: 'landscape' })}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${page.orientation === 'landscape' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    横
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs text-slate-400 mb-1 block">
                      {
                        { marginTop: '上余白', marginBottom: '下余白', marginLeft: '左余白', marginRight: '右余白' }[
                          key
                        ]
                      }{' '}
                      (mm)
                    </label>
                    <input
                      type="number"
                      value={page[key]}
                      onChange={(e) => setPage({ ...page, [key]: Number(e.target.value) })}
                      className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      min={0}
                      max={100}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ヘッダー左</label>
                <input
                  type="text"
                  value={hf.headerLeft || ''}
                  onChange={(e) => setHf({ ...hf, headerLeft: e.target.value })}
                  className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                  placeholder="例: 文書タイトル"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ヘッダー中央</label>
                <input
                  type="text"
                  value={hf.headerCenter || ''}
                  onChange={(e) => setHf({ ...hf, headerCenter: e.target.value })}
                  className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">フッター左</label>
                <input
                  type="text"
                  value={hf.footerLeft || ''}
                  onChange={(e) => setHf({ ...hf, footerLeft: e.target.value })}
                  className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hf.showPageNumbers ?? false}
                  onChange={(e) => setHf({ ...hf, showPageNumbers: e.target.checked })}
                  className="rounded border-slate-700"
                />
                <label className="text-xs text-slate-300">ページ番号を表示</label>
              </div>
              {hf.showPageNumbers && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">ページ番号位置</label>
                  <select
                    value={hf.pageNumberPosition || 'center'}
                    onChange={(e) =>
                      setHf({ ...hf, pageNumberPosition: e.target.value as 'left' | 'center' | 'right' })
                    }
                    className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="left">左</option>
                    <option value="center">中央</option>
                    <option value="right">右</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
