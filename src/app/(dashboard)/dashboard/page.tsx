'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DocumentMeta } from '@/types'
import { listDocuments, deleteDocument, duplicateDocument, getFolders, saveFolders, getFolderMap, setDocFolder } from '@/lib/cloud-store'
import DocumentCard from '@/components/dashboard/document-card'
import CreateModal from '@/components/dashboard/create-modal'
import ImportModal from '@/components/dashboard/import-modal'
import { t, getLocale } from '@/lib/i18n'
import { Search, X, FilePlus, Plus, Sun, Moon, LogOut, FolderOpen, Folder, FolderPlus, ChevronRight, Upload } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'

type FilterType = 'all' | 'slides' | 'doc' | 'spreadsheet'
type SortType = 'updated' | 'created' | 'name'

export default function DashboardPage() {
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('updated')
  const [folders, setFolders] = useState<string[]>([])
  const [folderMap, setFolderMapState] = useState<Record<string, string>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  // Initialize locale on mount
  useEffect(() => {
    getLocale()
  }, [])

  async function refresh() {
    const list = await listDocuments()
    setDocs(list)
    setFolders(getFolders())
    setFolderMapState(getFolderMap())
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name || folders.includes(name)) return
    const updated = [...folders, name]
    saveFolders(updated)
    setFolders(updated)
    setNewFolderName('')
    setShowNewFolder(false)
  }

  function handleDeleteFolder(name: string) {
    if (!window.confirm(`フォルダ「${name}」を削除しますか？中のファイルは「すべて」に残ります。`)) return
    const updated = folders.filter((f) => f !== name)
    saveFolders(updated)
    setFolders(updated)
    // Remove folder assignments
    const map = getFolderMap()
    for (const [docId, folder] of Object.entries(map)) {
      if (folder === name) setDocFolder(docId, null)
    }
    setFolderMapState(getFolderMap())
    if (activeFolder === name) setActiveFolder(null)
  }

  function handleMoveToFolder(docId: string, folder: string | null) {
    setDocFolder(docId, folder)
    setFolderMapState(getFolderMap())
  }

  const filtered = useMemo(() => {
    let result = docs

    // Filter by folder
    if (activeFolder) {
      result = result.filter((d) => folderMap[d.id] === activeFolder)
    }

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((d) => d.type === filterType)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q))
    }

    // Sort
    switch (sortBy) {
      case 'created':
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'name':
        result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'ja'))
        break
      case 'updated':
      default:
        break
    }

    return result
  }, [docs, search, filterType, sortBy, activeFolder, folderMap])

  async function handleDelete(id: string) {
    await deleteDocument(id)
    refresh()
  }

  async function handleDuplicate(id: string) {
    await duplicateDocument(id)
    refresh()
  }

  function handleModalClose() {
    setModalOpen(false)
    refresh()
  }

  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 6) return 'おやすみなさい'
    if (h < 12) return 'おはようございます'
    if (h < 18) return 'こんにちは'
    return 'こんばんは'
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-slate-500 text-xs mb-1 tracking-wide">{greeting}</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-sm mt-1.5">
              {docs.length > 0 ? (
                <>
                  <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-bold">{docs.length}</span>
                  <span className="text-slate-400"> {t('dashboard.filesCount')}</span>
                </>
              ) : (
                <span className="text-slate-400">{t('dashboard.noFiles')}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-slate-500 hidden sm:inline">{user.email}</span>
            )}
            <button
              onClick={signOut}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700/80 hover:border-red-500/60 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-red-400 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/10"
              title="ログアウト"
              aria-label="ログアウト"
            >
              <LogOut size={16} />
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700/80 hover:border-slate-500/60 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-amber-300 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/10"
              title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700/80 hover:border-indigo-500/60 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
              title="ファイルインポート"
              aria-label="ファイルインポート"
            >
              <Upload size={16} />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              <Plus size={18} />
              {t('dashboard.newCreate')}
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {docs.length > 0 && (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm group/search">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within/search:text-indigo-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.search')}
                className="w-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all duration-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-xl p-1 border border-slate-700">
              {(
                [
                  ['all', t('dashboard.all')],
                  ['slides', t('dashboard.slides')],
                  ['doc', t('dashboard.docs')],
                  ['spreadsheet', t('dashboard.spreadsheets')],
                ] as [FilterType, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilterType(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    filterType === val
                      ? 'bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
            >
              <option value="updated">{t('dashboard.sortUpdated')}</option>
              <option value="created">{t('dashboard.sortCreated')}</option>
              <option value="name">{t('dashboard.sortName')}</option>
            </select>
          </div>
        )}

        <div className="flex gap-6">
          {/* Folder sidebar */}
          {docs.length > 0 && (
            <div className="w-48 flex-shrink-0 hidden md:block">
              <div className="sticky top-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">フォルダ</span>
                  <button
                    onClick={() => setShowNewFolder(!showNewFolder)}
                    className="text-slate-500 hover:text-indigo-400 transition-colors"
                    title="フォルダ追加"
                  >
                    <FolderPlus size={14} />
                  </button>
                </div>

                {showNewFolder && (
                  <div className="flex items-center gap-1 mb-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      placeholder="フォルダ名"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <button onClick={handleCreateFolder} className="text-xs text-indigo-400 hover:text-indigo-300 px-1">追加</button>
                  </div>
                )}

                <button
                  onClick={() => setActiveFolder(null)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                    !activeFolder ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FolderOpen size={14} />
                  すべて
                  <span className="ml-auto text-[10px] text-slate-500">{docs.length}</span>
                </button>

                {folders.map((folder) => {
                  const count = docs.filter((d) => folderMap[d.id] === folder).length
                  return (
                    <div key={folder} className="group flex items-center">
                      <button
                        onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                          activeFolder === folder ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Folder size={14} />
                        <span className="truncate">{folder}</span>
                        <span className="ml-auto text-[10px] text-slate-500">{count}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-0.5 transition-all"
                        title="フォルダ削除"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {activeFolder && (
              <div className="flex items-center gap-1 mb-4 text-xs text-slate-500">
                <button onClick={() => setActiveFolder(null)} className="hover:text-white transition-colors">すべて</button>
                <ChevronRight size={12} />
                <span className="text-indigo-400 font-medium">{activeFolder}</span>
              </div>
            )}

            {docs.length === 0 ? (
              <EmptyState onCreate={() => setModalOpen(true)} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-500 text-sm">
                  {activeFolder ? `「${activeFolder}」フォルダは空です` : `${t('dashboard.noResults')}「${search}」`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((doc, i) => (
                  <div key={doc.id} className="animate-[fadeSlideUp_0.4s_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
                    <DocumentCard
                      doc={doc}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      folders={folders}
                      currentFolder={folderMap[doc.id] || null}
                      onMoveToFolder={(folder) => handleMoveToFolder(doc.id, folder)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateModal open={modalOpen} onClose={handleModalClose} />
      <ImportModal open={importOpen} onClose={() => { setImportOpen(false); refresh() }} />

      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes floatBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-32 text-center overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      <div
        className="w-24 h-24 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10"
        style={{ animation: 'floatBounce 3s ease-in-out infinite' }}
      >
        <FilePlus size={40} className="text-indigo-400/60" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{t('dashboard.createFirst')}</h2>
      <p className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">{t('dashboard.createFirstDesc')}</p>
      <button
        onClick={onCreate}
        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
      >
        {t('dashboard.newCreate')}
      </button>
    </div>
  )
}
