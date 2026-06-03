'use client'

import { X } from 'lucide-react'

interface Props {
  onClose: () => void
}

interface ShortcutItem {
  keys: string
  description: string
}

interface ShortcutCategory {
  name: string
  shortcuts: ShortcutItem[]
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'ナビゲーション',
    shortcuts: [
      { keys: 'Ctrl+Home', description: 'シートの先頭に移動' },
      { keys: 'Ctrl+End', description: 'データの末尾に移動' },
      { keys: 'Ctrl+G', description: 'セルに移動' },
      { keys: 'Ctrl+↑↓←→', description: 'データ領域の端に移動' },
      { keys: 'Page Up/Down', description: 'ページ単位で移動' },
      { keys: 'Tab', description: '右のセルに移動' },
      { keys: 'Shift+Tab', description: '左のセルに移動' },
    ],
  },
  {
    name: '選択',
    shortcuts: [
      { keys: 'Ctrl+A', description: '全セルを選択' },
      { keys: 'Shift+矢印', description: '選択範囲を拡張' },
      { keys: 'Ctrl+Shift+End', description: 'データ末尾まで選択' },
      { keys: 'Shift+Space', description: '行全体を選択' },
      { keys: 'Ctrl+Space', description: '列全体を選択' },
    ],
  },
  {
    name: '編集',
    shortcuts: [
      { keys: 'F2', description: 'セルを編集モードに' },
      { keys: 'Enter', description: '入力確定して下に移動' },
      { keys: 'Escape', description: '入力をキャンセル' },
      { keys: 'Delete', description: 'セル内容を削除' },
      { keys: 'Ctrl+Z', description: '元に戻す' },
      { keys: 'Ctrl+Y', description: 'やり直し' },
      { keys: 'Ctrl+X', description: '切り取り' },
      { keys: 'Ctrl+C', description: 'コピー' },
      { keys: 'Ctrl+V', description: '貼り付け' },
      { keys: 'Ctrl+Shift+V', description: '形式を選択して貼り付け' },
      { keys: 'Ctrl+D', description: '下方向にコピー' },
      { keys: 'Ctrl+R', description: '右方向にコピー' },
      { keys: 'Ctrl+;', description: '今日の日付を入力' },
      { keys: 'Ctrl+Shift+;', description: '現在の時刻を入力' },
      { keys: 'F4', description: '絶対参照の切り替え ($)' },
    ],
  },
  {
    name: '書式',
    shortcuts: [
      { keys: 'Ctrl+B', description: '太字' },
      { keys: 'Ctrl+I', description: '斜体' },
      { keys: 'Ctrl+U', description: '下線' },
      { keys: 'Ctrl+1', description: 'セルの書式設定' },
    ],
  },
  {
    name: 'データ',
    shortcuts: [
      { keys: 'Ctrl+E', description: 'フラッシュフィル' },
      { keys: 'Ctrl+F', description: '検索' },
      { keys: 'Ctrl+H', description: '置換' },
      { keys: 'Ctrl+`', description: '数式表示の切り替え' },
    ],
  },
  {
    name: '表示',
    shortcuts: [
      { keys: 'Ctrl++', description: '拡大' },
      { keys: 'Ctrl+-', description: '縮小' },
      { keys: 'Ctrl+/', description: 'ショートカット一覧を表示' },
    ],
  },
]

export function SpreadsheetShortcutsHelp({ onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">キーボードショートカット</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          <div className="grid grid-cols-2 gap-6">
            {SHORTCUT_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">
                  {cat.name}
                </h4>
                <div className="space-y-1">
                  {cat.shortcuts.map((sc) => (
                    <div
                      key={sc.keys}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <span className="text-slate-300">{sc.description}</span>
                      <kbd className="ml-2 px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] text-slate-300 font-mono whitespace-nowrap">
                        {sc.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </>
  )
}
