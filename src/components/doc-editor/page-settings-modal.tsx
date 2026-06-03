'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { PageSettings, HeaderFooterSettings } from '@/types'

interface Props {
  pageSettings?: PageSettings
  headerFooter?: HeaderFooterSettings
  pageBorder?: { style: string; color: string; width: number }
  onSavePageSettings: (settings: PageSettings) => void
  onSaveHeaderFooter: (settings: HeaderFooterSettings) => void
  onSavePageBorder: (border: { style: string; color: string; width: number } | undefined) => void
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
  pageBorder,
  onSavePageSettings,
  onSaveHeaderFooter,
  onSavePageBorder,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'page' | 'header'>('page')
  const [page, setPage] = useState<PageSettings>(pageSettings || DEFAULT_PAGE)
  const [hf, setHf] = useState<HeaderFooterSettings>(headerFooter || {})
  const [border, setBorder] = useState<{ style: string; color: string; width: number }>(
    pageBorder || { style: 'none', color: '#000000', width: 1 }
  )

  function handleSave() {
    if (tab === 'page') {
      onSavePageSettings(page)
      onSavePageBorder(border.style === 'none' ? undefined : border)
    } else {
      onSaveHeaderFooter(hf)
    }
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
                  <option value="a4">A4 (210x297mm)</option>
                  <option value="letter">Letter (216x279mm)</option>
                  <option value="legal">Legal (216x356mm)</option>
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
                        page.mirrorMargins
                          ? { marginTop: '上余白', marginBottom: '下余白', marginLeft: '内側余白', marginRight: '外側余白' }[key]
                          : { marginTop: '上余白', marginBottom: '下余白', marginLeft: '左余白', marginRight: '右余白' }[key]
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
              <label className="flex items-center gap-2 text-xs text-slate-300 mt-3">
                <input
                  type="checkbox"
                  checked={!!page.mirrorMargins}
                  onChange={(e) => setPage({ ...page, mirrorMargins: e.target.checked })}
                  className="accent-indigo-500"
                />
                見開き（ミラーマージン）
              </label>

              {/* Hyphenation setting (#21) */}
              <div className="mt-3 pt-3 border-t border-slate-700">
                <label className="text-xs text-slate-400 mb-1 block">ハイフネーション</label>
                <select
                  value={page.hyphens || 'none'}
                  onChange={(e) => setPage({ ...page, hyphens: e.target.value as PageSettings['hyphens'] })}
                  className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="none">なし</option>
                  <option value="auto">自動</option>
                  <option value="manual">手動</option>
                </select>
              </div>

              {/* Vertical alignment (#23) */}
              <div className="mt-3 pt-3 border-t border-slate-700">
                <label className="text-xs text-slate-400 mb-1 block">ページ垂直配置</label>
                <select
                  value={page.verticalAlign || 'top'}
                  onChange={(e) => setPage({ ...page, verticalAlign: e.target.value as PageSettings['verticalAlign'] })}
                  className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="top">上揃え</option>
                  <option value="center">中央揃え</option>
                  <option value="justify">均等割り付け</option>
                  <option value="bottom">下揃え</option>
                </select>
              </div>

              {/* Page background color (#24) */}
              <div className="mt-3 pt-3 border-t border-slate-700">
                <label className="text-xs text-slate-400 mb-1 block">ページ背景色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={page.pageBackground || '#ffffff'}
                    onChange={(e) => setPage({ ...page, pageBackground: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="text-xs text-slate-400">{page.pageBackground || '#ffffff'}</span>
                  {page.pageBackground && page.pageBackground !== '#ffffff' && (
                    <button
                      onClick={() => setPage({ ...page, pageBackground: undefined })}
                      className="text-[10px] text-slate-500 hover:text-white px-1.5 py-0.5 rounded border border-slate-700 hover:bg-slate-800"
                    >
                      リセット
                    </button>
                  )}
                </div>
              </div>

              {/* Page border settings */}
              <div className="mt-4 pt-3 border-t border-slate-700">
                <label className="text-xs text-slate-400 mb-2 block font-medium">ページ罫線</label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">スタイル</label>
                    <select
                      value={border.style}
                      onChange={(e) => setBorder({ ...border, style: e.target.value })}
                      className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="none">なし</option>
                      <option value="solid">実線</option>
                      <option value="dashed">破線</option>
                      <option value="dotted">点線</option>
                      <option value="double">二重線</option>
                    </select>
                  </div>
                  {border.style !== 'none' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">色</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={border.color}
                            onChange={(e) => setBorder({ ...border, color: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer border border-slate-700 bg-transparent"
                          />
                          <span className="text-xs text-slate-400">{border.color}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">太さ ({border.width}px)</label>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          value={border.width}
                          onChange={(e) => setBorder({ ...border, width: Number(e.target.value) })}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs text-slate-300 mb-3">
                <input
                  type="checkbox"
                  checked={!!hf.differentFirstPage}
                  onChange={(e) => setHf({ ...hf, differentFirstPage: e.target.checked })}
                  className="accent-indigo-500"
                />
                最初のページのヘッダー/フッターを非表示
              </label>

              {/* Odd/even page headers (#20) */}
              <label className="flex items-center gap-2 text-xs text-slate-300 mb-3">
                <input
                  type="checkbox"
                  checked={!!hf.differentOddEven}
                  onChange={(e) => setHf({ ...hf, differentOddEven: e.target.checked })}
                  className="accent-indigo-500"
                />
                奇数/偶数ページ別
              </label>

              {hf.differentOddEven ? (
                <>
                  {/* Odd page header/footer */}
                  <div className="border border-slate-700 rounded p-3 space-y-2">
                    <h4 className="text-xs font-medium text-indigo-400">奇数ページ</h4>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ヘッダー左</label>
                      <input
                        type="text"
                        value={hf.oddHeaderLeft || ''}
                        onChange={(e) => setHf({ ...hf, oddHeaderLeft: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ヘッダー中央</label>
                      <input
                        type="text"
                        value={hf.oddHeaderCenter || ''}
                        onChange={(e) => setHf({ ...hf, oddHeaderCenter: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ヘッダー右</label>
                      <input
                        type="text"
                        value={hf.oddHeaderRight || ''}
                        onChange={(e) => setHf({ ...hf, oddHeaderRight: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">フッター左</label>
                      <input
                        type="text"
                        value={hf.oddFooterLeft || ''}
                        onChange={(e) => setHf({ ...hf, oddFooterLeft: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">フッター中央</label>
                      <input
                        type="text"
                        value={hf.oddFooterCenter || ''}
                        onChange={(e) => setHf({ ...hf, oddFooterCenter: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">フッター右</label>
                      <input
                        type="text"
                        value={hf.oddFooterRight || ''}
                        onChange={(e) => setHf({ ...hf, oddFooterRight: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Even page header/footer */}
                  <div className="border border-slate-700 rounded p-3 space-y-2 mt-3">
                    <h4 className="text-xs font-medium text-indigo-400">偶数ページ</h4>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ヘッダー左</label>
                      <input
                        type="text"
                        value={hf.evenHeaderLeft || ''}
                        onChange={(e) => setHf({ ...hf, evenHeaderLeft: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ヘッダー中央</label>
                      <input
                        type="text"
                        value={hf.evenHeaderCenter || ''}
                        onChange={(e) => setHf({ ...hf, evenHeaderCenter: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">ヘッダー右</label>
                      <input
                        type="text"
                        value={hf.evenHeaderRight || ''}
                        onChange={(e) => setHf({ ...hf, evenHeaderRight: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">フッター左</label>
                      <input
                        type="text"
                        value={hf.evenFooterLeft || ''}
                        onChange={(e) => setHf({ ...hf, evenFooterLeft: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">フッター中央</label>
                      <input
                        type="text"
                        value={hf.evenFooterCenter || ''}
                        onChange={(e) => setHf({ ...hf, evenFooterCenter: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">フッター右</label>
                      <input
                        type="text"
                        value={hf.evenFooterRight || ''}
                        onChange={(e) => setHf({ ...hf, evenFooterRight: e.target.value })}
                        className="w-full bg-slate-800 text-white text-sm rounded px-2 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
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
                </>
              )}

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
