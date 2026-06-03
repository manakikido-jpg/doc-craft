'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type Locale = 'ja' | 'en'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const STORAGE_KEY = 'doccraft-locale'

const translations: Record<Locale, Record<string, string>> = {
  ja: {
    // App
    'app.name': 'DocCraft',
    'app.tagline': '資料作成ツール',

    // Navigation
    'nav.home': 'ホーム',
    'nav.recent': '最近',
    'nav.back': '← 戻る',

    // Dashboard
    'dashboard.title': 'ホーム',
    'dashboard.noFiles': 'ファイルがありません',
    'dashboard.filesCount': '件のファイル',
    'dashboard.createFirst': '最初のファイルを作成しよう',
    'dashboard.createFirstDesc': 'スライドプレゼンテーションやドキュメントを作成できます。AIで自動生成も可能です。',
    'dashboard.newCreate': '新規作成',
    'dashboard.search': 'ドキュメントを検索...',
    'dashboard.all': 'すべて',
    'dashboard.slides': 'スライド',
    'dashboard.docs': 'ドキュメント',
    'dashboard.spreadsheets': 'スプレッドシート',
    'dashboard.sortUpdated': '更新日順',
    'dashboard.sortCreated': '作成日順',
    'dashboard.sortName': '名前順',
    'dashboard.noResults': 'に一致するファイルが見つかりません',
    'dashboard.loadMore': 'さらに表示',
    'dashboard.favorites': 'お気に入り',
    'dashboard.trash': 'ゴミ箱',
    'dashboard.import': 'インポート',
    'dashboard.folders': 'フォルダ',

    // Create modal
    'create.title': '新規作成',
    'create.slides': 'スライド',
    'create.slidesDesc': 'プレゼンテーション・ピッチデッキ',
    'create.doc': 'ドキュメント',
    'create.docDesc': 'レポート・議事録・仕様書',
    'create.createSlide': 'スライドを作成',
    'create.createDoc': 'ドキュメントを作成',
    'create.titleLabel': 'タイトル',
    'create.templateLabel': 'テンプレート',
    'create.aiToggle': 'AIで自動生成',
    'create.skillLabel': 'スキルを選択',
    'create.promptLabel': 'テーマ・内容を入力',
    'create.generate': 'で生成する',
    'create.create': '作成する',

    // Editor
    'editor.untitledPresentation': '無題のプレゼンテーション',
    'editor.untitledDoc': '無題のドキュメント',
    'editor.autoSaved': '自動保存済み',
    'editor.export': 'エクスポート',
    'editor.delete': '削除',
    'editor.present': '▶ 発表',
    'editor.undo': '元に戻す',
    'editor.redo': 'やり直し',
    'editor.addSlide': '+ スライド',
    'editor.aiGenerate': '✨ AI生成',
    'editor.notes': 'スピーカーノート',
    'editor.comments': 'コメント',
    'editor.share': '共有',
    'editor.shortcuts': 'ショートカット',
    'editor.versions': 'バージョン履歴',
    'editor.saveVersion': '保存',
    'editor.findReplace': '検索・置換',
    'editor.pageSettings': 'ページ設定',
    'editor.wordCount': '文字数',
    'editor.styles': 'スタイル',
    'editor.toc': '目次',
    'editor.pageBreak': '改ページ',
    'editor.sorterView': 'スライド一覧',
    'editor.bgImage': '背景画像',
    'editor.table': 'テーブル',
    'editor.connector': 'コネクター',
    'editor.alignment': '整列',
    'editor.bringToFront': '最前面へ',
    'editor.sendToBack': '最背面へ',
    'editor.group': 'グループ化',
    'editor.ungroup': 'グループ解除',
    'editor.animation': 'アニメーション',
    'editor.indent': 'インデント',
    'editor.lineSpacing': '行間',
    'editor.columns': '段組み',
    'editor.strikethrough': '取り消し線',
    'editor.superscript': '上付き',
    'editor.subscript': '下付き',
    'editor.highlight': 'ハイライト',
    'editor.bulletList': '箇条書き',
    'editor.numberedList': '番号リスト',
    'editor.hyperlink': 'ハイパーリンク',
    'editor.letterSpacing': '文字間隔',
    'editor.textShadow': 'テキスト影',
    'editor.fontFamily': 'フォント',
    'editor.fontSize': 'フォントサイズ',
    'editor.opacity': '透明度',
    'editor.shadow': '影',
    'editor.flip': '反転',
    'editor.flipH': '水平反転',
    'editor.flipV': '垂直反転',
    'editor.gradient': 'グラデーション',
    'editor.strokeStyle': '線スタイル',
    'editor.grid': 'グリッド',
    'editor.rulers': 'ルーラー',
    'editor.zoom': 'ズーム',
    'editor.lock': 'ロック',
    'editor.unlock': 'アンロック',
    'editor.crop': 'トリミング',
    'editor.filters': 'フィルター',
    'editor.video': '動画',
    'editor.audio': '音声',
    'editor.chart': 'グラフ',
    'editor.barChart': '棒グラフ',
    'editor.lineChart': '折れ線グラフ',
    'editor.pieChart': '円グラフ',
    'editor.donutChart': 'ドーナツグラフ',
    'editor.animationPanel': 'アニメーション設定',
    'editor.presenterView': '発表者ビュー',
    'editor.footer': 'フッター設定',
    'editor.slideNumber': 'スライド番号',
    'editor.laserPointer': 'レーザーポインター',
    'editor.penTool': 'ペンツール',
    'editor.properties': 'プロパティ',
    'editor.saving': '保存中...',
    'editor.saved': '✓ 保存済み',
    'editor.saveError': '保存エラー',
    'editor.print': '印刷',

    // File menu
    'file.file': 'ファイル',
    'file.export': 'エクスポート',
    'file.print': '印刷',
    'file.delete': '削除',

    // Edit actions
    'edit.undo': '元に戻す',
    'edit.redo': 'やり直す',
    'edit.copy': 'コピー',
    'edit.paste': '貼り付け',
    'edit.duplicate': '複製',
    'edit.cut': '切り取り',

    // Insert items
    'insert.text': 'テキスト',
    'insert.image': '画像',
    'insert.shape': '図形',
    'insert.table': 'テーブル',
    'insert.chart': 'グラフ',

    // View items
    'view.presentation': 'プレゼンテーション',
    'view.notes': 'ノート',
    'view.comments': 'コメント',

    // Slide actions
    'slide.add': 'スライドを追加',
    'slide.delete': 'スライドを削除',

    // Common
    'common.saved': '保存済み',
    'common.saving': '保存中',
    'common.cancel': 'キャンセル',
    'common.apply': '適用',
    'common.close': '閉じる',
    'common.ok': 'OK',
    'common.confirm': '確認',
    'common.search': '検索',
    'common.settings': '設定',

    // Common actions
    'action.delete': '削除',
    'action.duplicate': '複製',
    'action.cancel': 'キャンセル',
    'action.save': '保存',
    'action.close': '閉じる',
    'action.retry': '再試行',

    // Comments
    'comment.add': 'コメントを追加...',
    'comment.resolve': '✓ 解決',
    'comment.noComments': 'コメントはありません',

    // Theme
    'theme.customize': 'カスタマイズ',

    // Layout
    'layout.auto': '自動レイアウト',

    // Error pages
    'error.title': 'エラーが発生しました',
    'error.notFound': 'ページが見つかりません',
    'error.notFoundDesc': 'お探しのページは存在しないか、移動された可能性があります。',
    'error.backToDashboard': 'ダッシュボードへ戻る',

    // Features
    'feature.clipboard': 'クリップボード履歴',
    'feature.wordGoal': '目標文字数',
    'feature.compare': '文書の比較',
    'feature.footnoteEnd': '文末脚注',

    // Offline
    'offline.message': 'オフラインです — 変更はローカルに保存され、接続回復時に同期されます',

    // Language toggle
    'lang.toggle': '言語切替',
  },
  en: {
    // App
    'app.name': 'DocCraft',
    'app.tagline': 'Document Creation Tool',

    // Navigation
    'nav.home': 'Home',
    'nav.recent': 'Recent',
    'nav.back': '← Back',

    // Dashboard
    'dashboard.title': 'Home',
    'dashboard.noFiles': 'No files',
    'dashboard.filesCount': ' files',
    'dashboard.createFirst': 'Create your first file',
    'dashboard.createFirstDesc': 'Create slide presentations or documents. AI-powered generation available.',
    'dashboard.newCreate': 'New',
    'dashboard.search': 'Search documents...',
    'dashboard.all': 'All',
    'dashboard.slides': 'Slides',
    'dashboard.docs': 'Documents',
    'dashboard.spreadsheets': 'Spreadsheets',
    'dashboard.sortUpdated': 'Last updated',
    'dashboard.sortCreated': 'Created date',
    'dashboard.sortName': 'Name',
    'dashboard.noResults': 'No files matching ',
    'dashboard.loadMore': 'Load more',
    'dashboard.favorites': 'Favorites',
    'dashboard.trash': 'Trash',
    'dashboard.import': 'Import',
    'dashboard.folders': 'Folders',

    // Create modal
    'create.title': 'Create New',
    'create.slides': 'Slides',
    'create.slidesDesc': 'Presentations & Pitch Decks',
    'create.doc': 'Document',
    'create.docDesc': 'Reports, Minutes & Specs',
    'create.createSlide': 'Create Slides',
    'create.createDoc': 'Create Document',
    'create.titleLabel': 'Title',
    'create.templateLabel': 'Template',
    'create.aiToggle': 'Generate with AI',
    'create.skillLabel': 'Choose skill',
    'create.promptLabel': 'Enter topic or content',
    'create.generate': 'Generate',
    'create.create': 'Create',

    // Editor
    'editor.untitledPresentation': 'Untitled Presentation',
    'editor.untitledDoc': 'Untitled Document',
    'editor.autoSaved': 'Auto-saved',
    'editor.export': 'Export',
    'editor.delete': 'Delete',
    'editor.present': '▶ Present',
    'editor.undo': 'Undo',
    'editor.redo': 'Redo',
    'editor.addSlide': '+ Slide',
    'editor.aiGenerate': '✨ AI Generate',
    'editor.notes': 'Speaker Notes',
    'editor.comments': 'Comments',
    'editor.share': 'Share',
    'editor.shortcuts': 'Shortcuts',
    'editor.versions': 'Version History',
    'editor.saveVersion': 'Save',
    'editor.findReplace': 'Find & Replace',
    'editor.pageSettings': 'Page Settings',
    'editor.wordCount': 'Word Count',
    'editor.styles': 'Styles',
    'editor.toc': 'Table of Contents',
    'editor.pageBreak': 'Page Break',
    'editor.sorterView': 'Slide Sorter',
    'editor.bgImage': 'Background Image',
    'editor.table': 'Table',
    'editor.connector': 'Connector',
    'editor.alignment': 'Alignment',
    'editor.bringToFront': 'Bring to Front',
    'editor.sendToBack': 'Send to Back',
    'editor.group': 'Group',
    'editor.ungroup': 'Ungroup',
    'editor.animation': 'Animation',
    'editor.indent': 'Indent',
    'editor.lineSpacing': 'Line Spacing',
    'editor.columns': 'Columns',
    'editor.strikethrough': 'Strikethrough',
    'editor.superscript': 'Superscript',
    'editor.subscript': 'Subscript',
    'editor.highlight': 'Highlight',
    'editor.bulletList': 'Bullet List',
    'editor.numberedList': 'Numbered List',
    'editor.hyperlink': 'Hyperlink',
    'editor.letterSpacing': 'Letter Spacing',
    'editor.textShadow': 'Text Shadow',
    'editor.fontFamily': 'Font',
    'editor.fontSize': 'Font Size',
    'editor.opacity': 'Opacity',
    'editor.shadow': 'Shadow',
    'editor.flip': 'Flip',
    'editor.flipH': 'Flip Horizontal',
    'editor.flipV': 'Flip Vertical',
    'editor.gradient': 'Gradient',
    'editor.strokeStyle': 'Stroke Style',
    'editor.grid': 'Grid',
    'editor.rulers': 'Rulers',
    'editor.zoom': 'Zoom',
    'editor.lock': 'Lock',
    'editor.unlock': 'Unlock',
    'editor.crop': 'Crop',
    'editor.filters': 'Filters',
    'editor.video': 'Video',
    'editor.audio': 'Audio',
    'editor.chart': 'Chart',
    'editor.barChart': 'Bar Chart',
    'editor.lineChart': 'Line Chart',
    'editor.pieChart': 'Pie Chart',
    'editor.donutChart': 'Donut Chart',
    'editor.animationPanel': 'Animation Settings',
    'editor.presenterView': 'Presenter View',
    'editor.footer': 'Footer Settings',
    'editor.slideNumber': 'Slide Number',
    'editor.laserPointer': 'Laser Pointer',
    'editor.penTool': 'Pen Tool',
    'editor.properties': 'Properties',
    'editor.saving': 'Saving...',
    'editor.saved': '✓ Saved',
    'editor.saveError': 'Save error',
    'editor.print': 'Print',

    // File menu
    'file.file': 'File',
    'file.export': 'Export',
    'file.print': 'Print',
    'file.delete': 'Delete',

    // Edit actions
    'edit.undo': 'Undo',
    'edit.redo': 'Redo',
    'edit.copy': 'Copy',
    'edit.paste': 'Paste',
    'edit.duplicate': 'Duplicate',
    'edit.cut': 'Cut',

    // Insert items
    'insert.text': 'Text',
    'insert.image': 'Image',
    'insert.shape': 'Shape',
    'insert.table': 'Table',
    'insert.chart': 'Chart',

    // View items
    'view.presentation': 'Presentation',
    'view.notes': 'Notes',
    'view.comments': 'Comments',

    // Slide actions
    'slide.add': 'Add Slide',
    'slide.delete': 'Delete Slide',

    // Common
    'common.saved': 'Saved',
    'common.saving': 'Saving',
    'common.cancel': 'Cancel',
    'common.apply': 'Apply',
    'common.close': 'Close',
    'common.ok': 'OK',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.settings': 'Settings',

    // Common actions
    'action.delete': 'Delete',
    'action.duplicate': 'Duplicate',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.close': 'Close',
    'action.retry': 'Retry',

    // Comments
    'comment.add': 'Add a comment...',
    'comment.resolve': '✓ Resolve',
    'comment.noComments': 'No comments',

    // Theme
    'theme.customize': 'Customize',

    // Layout
    'layout.auto': 'Auto Layout',

    // Error pages
    'error.title': 'An error occurred',
    'error.notFound': 'Page not found',
    'error.notFoundDesc': 'The page you are looking for does not exist or has been moved.',
    'error.backToDashboard': 'Back to Dashboard',

    // Features
    'feature.clipboard': 'Clipboard History',
    'feature.wordGoal': 'Word Count Goal',
    'feature.compare': 'Compare Documents',
    'feature.footnoteEnd': 'Endnotes',

    // Offline
    'offline.message': 'You are offline — changes are saved locally and will sync when reconnected',

    // Language toggle
    'lang.toggle': 'Language',
  },
}

// =========== Module-level locale (backward compat) ===========

let currentLocale: Locale = 'ja'

function initLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && translations[saved]) {
      currentLocale = saved
      return saved
    }
  }
  return currentLocale
}

// Initialize on module load (client-side)
if (typeof window !== 'undefined') {
  initLocale()
}

/**
 * Backward-compatible plain function for translating strings.
 * Works outside of React components. For React components, prefer useI18n().
 */
export function t(key: string): string {
  return translations[currentLocale]?.[key] || translations.ja[key] || key
}

export function setLocale(locale: Locale) {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && translations[saved]) {
      currentLocale = saved
    }
  }
  return currentLocale
}

export function getAvailableLocales(): { code: Locale; label: string }[] {
  return [
    { code: 'ja', label: '日本語' },
    { code: 'en', label: 'English' },
  ]
}

// =========== React Context ===========

const I18nContext = createContext<I18nContextType>({
  locale: 'ja',
  setLocale: () => {},
  t: (key: string) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ja')

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && translations[saved]) {
      setLocaleState(saved)
      currentLocale = saved
    }
  }, [])

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    currentLocale = newLocale
    localStorage.setItem(STORAGE_KEY, newLocale)
    // Update html lang attribute
    document.documentElement.lang = newLocale
  }, [])

  const translate = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] || translations.ja[key] || key
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t: translate }}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * React hook for i18n. Provides locale, setLocale, and t() that re-renders on locale change.
 */
export function useI18n(): I18nContextType {
  return useContext(I18nContext)
}
