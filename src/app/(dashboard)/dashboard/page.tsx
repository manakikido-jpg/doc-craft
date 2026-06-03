'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { DocumentMeta, DocumentType } from '@/types'
import { createDocFromTemplate, routeForDoc } from '@/lib/create-from-template'
import {
  listDocuments,
  deleteDocument,
  duplicateDocument,
  getFolders,
  saveFolders,
  getFolderMap,
  setDocFolder,
  getFavorites,
  toggleFavorite,
  moveToTrash,
  restoreFromTrash,
  permanentlyDelete,
  getTrashIds,
  isInTrash,
  purgeExpiredTrash,
  getTrashDeletedAt,
  searchDocumentContent,
  getAllTags,
  getAllDocTags,
  setDocTags,
} from '@/lib/storage/cloud-store'
import { useToast } from '@/components/shared/toast'
import DocumentCard from '@/components/dashboard/document-card'
import CreateModal from '@/components/dashboard/create-modal'
import ImportModal from '@/components/dashboard/import-modal'
import { logActivity, logStatusChange, getActivityLog, getDocStatus, setDocStatus, getAllDocStatuses, type ActivityEntry, type DocStatus } from '@/lib/activity-log'
import { DOC_TEMPLATES } from '@/lib/templates/doc-templates'
import { SPREADSHEET_TEMPLATES } from '@/lib/templates/spreadsheet-templates'
import { SLIDE_TEMPLATES } from '@/lib/templates/slide-templates'
import { DESIGN_TEMPLATES } from '@/lib/templates/design-templates'
import { getBrandSettings, saveBrandSettings, type BrandSettings } from '@/lib/themes'
import { t, getLocale } from '@/lib/i18n'
import {
  Search, X, FilePlus, Plus, Sun, Moon, LogOut, FolderOpen, Folder, FolderPlus, ChevronRight, Upload, Star, Trash2, Tag, FileText, LayoutGrid, Table2,
  List, Grid3X3, Pin, Calendar, Clock, AlertTriangle, Presentation, Check, Settings, Palette, CircleDot, Loader2,
} from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'

type FilterType = 'all' | 'slides' | 'doc' | 'spreadsheet' | 'design' | 'favorites'
type SortType = 'updated' | 'created' | 'name' | 'custom'
type DateFilter = 'all' | 'today' | 'week' | 'month'
type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | DocStatus

const PAGE_SIZE = 20

const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
function tagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ── localStorage helpers for pins & custom order ──
const PINS_KEY = 'doccraft:pinned-ids'
const CUSTOM_ORDER_KEY = 'doccraft:custom-order'

function getPinnedIds(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]') } catch { return [] }
}
function savePinnedIds(ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PINS_KEY, JSON.stringify(ids))
}
function getCustomOrder(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CUSTOM_ORDER_KEY) || '[]') } catch { return [] }
}
function saveCustomOrder(ids: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(ids))
}

export default function DashboardPage() {
  const { confirm, addToast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentView = searchParams.get('view') // 'templates' | 'activity' | null

  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  // Tracks the template card currently being created from (shows a spinner / blocks double-clicks)
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null)

  // Create a document directly from a gallery template card and open its editor.
  const handleCreateFromTemplate = useCallback(async (type: DocumentType, templateId: string) => {
    if (creatingTemplate) return
    setCreatingTemplate(`${type}:${templateId}`)
    try {
      const id = await createDocFromTemplate(type, templateId)
      if (id) {
        router.push(routeForDoc(type, id))
      } else {
        addToast('作成に失敗しました。もう一度お試しください。', 'error')
        setCreatingTemplate(null)
      }
    } catch {
      addToast('作成に失敗しました。もう一度お試しください。', 'error')
      setCreatingTemplate(null)
    }
  }, [creatingTemplate, router, addToast])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('updated')
  const [folders, setFolders] = useState<string[]>([])
  const [folderMap, setFolderMapState] = useState<Record<string, string>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [favorites, setFavoritesState] = useState<string[]>([])
  const [showTrash, setShowTrash] = useState(false)
  const [trashIds, setTrashIds] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Full-text search state
  const [contentSearchResults, setContentSearchResults] = useState<Record<string, string[]>>({})

  // Tags state
  const [allTags, setAllTags] = useState<string[]>([])
  const [docTagsMap, setDocTagsMap] = useState<Record<string, string[]>>({})
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Drag-and-drop folder state
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)

  // ── New feature states ──
  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectMode = selectedIds.size > 0

  // Advanced search filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  // Pins
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Custom drag reorder
  const [dragReorderId, setDragReorderId] = useState<string | null>(null)
  const [dragOverReorderId, setDragOverReorderId] = useState<string | null>(null)
  const [customOrder, setCustomOrder] = useState<string[]>([])

  // Document statuses
  const [docStatusMap, setDocStatusMap] = useState<Record<string, DocStatus>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Activity log
  const [activityLog, setActivityLogState] = useState<ActivityEntry[]>([])

  // Mobile sidebar
  const [mobileSidebar, setMobileSidebar] = useState(false)

  // Loading state
  const [loading, setLoading] = useState(true)

  // Brand settings state
  const [brandSettingsOpen, setBrandSettingsOpen] = useState(false)
  const [brandSettings, setBrandSettingsState] = useState<BrandSettings>({ companyName: '', logoUrl: '', primaryColor: '#6366f1', secondaryColor: '#8b5cf6' })

  // Initialize locale on mount
  useEffect(() => {
    getLocale()
    setPinnedIds(getPinnedIds())
    setCustomOrder(getCustomOrder())
    const saved = getBrandSettings()
    if (saved) setBrandSettingsState(saved)
  }, [])

  async function refresh() {
    const list = await listDocuments()
    setDocs(list)
    setFolders(getFolders())
    setFolderMapState(getFolderMap())
    setFavoritesState(getFavorites())
    setTrashIds(getTrashIds())
    setAllTags(getAllTags())
    setDocTagsMap(getAllDocTags())
    setPinnedIds(getPinnedIds())
    setCustomOrder(getCustomOrder())
    setActivityLogState(getActivityLog())
    setDocStatusMap(getAllDocStatuses())
  }

  useEffect(() => {
    setLoading(true)
    purgeExpiredTrash().then((purgedIds) => {
      if (purgedIds.length > 0) {
        addToast(`${purgedIds.length}件のドキュメントが期限切れのため完全に削除されました`, 'info')
      }
      refresh().finally(() => setLoading(false))
    })
  }, [])

  // Keyboard shortcut: Ctrl+N / Cmd+N to open create modal
  // Keyboard shortcut: Ctrl+S / Cmd+S to show save feedback (#2)
  // NOTE: For individual editor pages (slides, docs, spreadsheets), a similar
  // Ctrl+S handler should be added in each editor component.
  const [showSaveToast, setShowSaveToast] = useState(false)
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setModalOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        setShowSaveToast(true)
        if (saveToastTimer.current) clearTimeout(saveToastTimer.current)
        saveToastTimer.current = setTimeout(() => setShowSaveToast(false), 2000)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (saveToastTimer.current) clearTimeout(saveToastTimer.current)
    }
  }, [])

  // Onboarding state (#11)
  const [showOnboarding, setShowOnboarding] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('doccraft_onboarded')) {
      // Show onboarding after a brief delay so content loads first
      const timer = setTimeout(() => setShowOnboarding(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function dismissOnboarding() {
    setShowOnboarding(false)
    localStorage.setItem('doccraft_onboarded', '1')
  }

  // Debounced content search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim().length >= 2) {
        searchDocumentContent(search).then((results) => {
          const map: Record<string, string[]> = {}
          results.forEach((r) => {
            map[r.id] = r.matches
          })
          setContentSearchResults(map)
        })
      } else {
        setContentSearchResults({})
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset visible count when filter/sort/search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filterType, sortBy, search, activeFolder, showTrash, dateFilter, tagFilter, statusFilter])

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name || folders.includes(name)) return
    const updated = [...folders, name]
    saveFolders(updated)
    setFolders(updated)
    setNewFolderName('')
    setShowNewFolder(false)
  }

  async function handleDeleteFolder(name: string) {
    if (!(await confirm(`フォルダ「${name}」を削除しますか？中のファイルは「すべて」に残ります。`))) return
    const updated = folders.filter((f) => f !== name)
    saveFolders(updated)
    setFolders(updated)
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

  const handleSetDocTags = useCallback((docId: string, tags: string[]) => {
    setDocTags(docId, tags)
    setAllTags(getAllTags())
    setDocTagsMap(getAllDocTags())
  }, [])

  // Bulk action picker states
  const [bulkFolderPickerOpen, setBulkFolderPickerOpen] = useState(false)
  const [bulkTagPickerOpen, setBulkTagPickerOpen] = useState(false)

  // ── Bulk select handlers ──
  function handleSelect(id: string, selected: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)))
    }
  }

  async function handleBulkDelete() {
    if (!(await confirm(`${selectedIds.size}件のドキュメントをゴミ箱に移動しますか？`))) return
    for (const id of selectedIds) {
      const doc = docs.find(d => d.id === id)
      moveToTrash(id)
      if (doc) logActivity(doc.id, doc.title, doc.type, 'deleted')
    }
    setSelectedIds(new Set())
    refresh()
  }

  function handleBulkMoveToFolder(targetFolder: string) {
    for (const id of selectedIds) {
      setDocFolder(id, targetFolder)
    }
    setFolderMapState(getFolderMap())
    addToast(`${selectedIds.size}件を「${targetFolder}」に移動しました`, 'info')
    setBulkFolderPickerOpen(false)
    setSelectedIds(new Set())
  }

  function handleBulkAddTag(tag: string) {
    for (const id of selectedIds) {
      const current = docTagsMap[id] || []
      if (!current.includes(tag)) {
        setDocTags(id, [...current, tag])
      }
    }
    setAllTags(getAllTags())
    setDocTagsMap(getAllDocTags())
    addToast(`${selectedIds.size}件に「${tag}」タグを追加しました`, 'info')
    setBulkTagPickerOpen(false)
    setSelectedIds(new Set())
  }

  // ── Pin handlers ──
  function handleTogglePin(id: string) {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      savePinnedIds(next)
      return next
    })
  }

  // ── Drag reorder handlers ──
  function handleDragReorderStart(e: React.DragEvent, id: string) {
    setDragReorderId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragReorderOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== dragReorderId) setDragOverReorderId(id)
  }

  function handleDragReorderDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragReorderId || dragReorderId === targetId) {
      setDragReorderId(null)
      setDragOverReorderId(null)
      return
    }
    // Compute new order
    const currentList = filtered.map(d => d.id)
    const fromIndex = currentList.indexOf(dragReorderId)
    const toIndex = currentList.indexOf(targetId)
    if (fromIndex < 0 || toIndex < 0) return
    const newOrder = [...currentList]
    newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, dragReorderId)
    setCustomOrder(newOrder)
    saveCustomOrder(newOrder)
    setDragReorderId(null)
    setDragOverReorderId(null)
  }

  // Docs split into active and trashed
  const activeDocs = useMemo(() => docs.filter((d) => !trashIds.includes(d.id)), [docs, trashIds])
  const trashedDocs = useMemo(() => docs.filter((d) => trashIds.includes(d.id)), [docs, trashIds])

  const filtered = useMemo(() => {
    if (showTrash) return trashedDocs

    let result = activeDocs

    // Filter by folder
    if (activeFolder) {
      result = result.filter((d) => folderMap[d.id] === activeFolder)
    }

    // Filter by tag (sidebar)
    if (activeTag) {
      result = result.filter((d) => (docTagsMap[d.id] || []).includes(activeTag))
    }

    // Filter by tag filter pill
    if (tagFilter) {
      result = result.filter((d) => (docTagsMap[d.id] || []).includes(tagFilter))
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((d) => (docStatusMap[d.id] || '下書き') === statusFilter)
    }

    // Date range filter
    if (dateFilter !== 'all') {
      const now = Date.now()
      const day = 24 * 60 * 60 * 1000
      result = result.filter((d) => {
        const updated = new Date(d.updatedAt).getTime()
        switch (dateFilter) {
          case 'today': return now - updated < day
          case 'week': return now - updated < 7 * day
          case 'month': return now - updated < 30 * day
          default: return true
        }
      })
    }

    // Filter by type (favorites is a special filter)
    if (filterType === 'favorites') {
      result = result.filter((d) => favorites.includes(d.id))
    } else if (filterType !== 'all') {
      result = result.filter((d) => d.type === filterType)
    }

    // Search: title match OR content match — highlight via contentSearchResults
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((d) => d.title.toLowerCase().includes(q) || contentSearchResults[d.id])
    }

    // Sort
    if (sortBy === 'custom') {
      // Custom order from localStorage
      const orderMap = new Map(customOrder.map((id, i) => [id, i]))
      result = [...result].sort((a, b) => {
        const ia = orderMap.get(a.id) ?? 9999
        const ib = orderMap.get(b.id) ?? 9999
        return ia - ib
      })
    } else {
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
    }

    // Pinned items first (always, regardless of sort)
    result = [...result].sort((a, b) => {
      const aPin = pinnedIds.includes(a.id) ? 1 : 0
      const bPin = pinnedIds.includes(b.id) ? 1 : 0
      return bPin - aPin
    })

    // Sort favorites first when not in favorites-only view (after pinned)
    if (filterType !== 'favorites' && sortBy !== 'custom') {
      result = [...result].sort((a, b) => {
        // Keep pinned order stable
        const aPinned = pinnedIds.includes(a.id)
        const bPinned = pinnedIds.includes(b.id)
        if (aPinned !== bPinned) return aPinned ? -1 : 1
        const aFav = favorites.includes(a.id) ? 1 : 0
        const bFav = favorites.includes(b.id) ? 1 : 0
        return bFav - aFav
      })
    }

    return result
  }, [activeDocs, trashedDocs, showTrash, search, filterType, sortBy, activeFolder, folderMap, favorites, contentSearchResults, activeTag, docTagsMap, dateFilter, tagFilter, pinnedIds, customOrder, statusFilter, docStatusMap])

  async function handleDelete(id: string) {
    const doc = docs.find(d => d.id === id)
    moveToTrash(id)
    if (doc) logActivity(doc.id, doc.title, doc.type, 'deleted')
    refresh()
  }

  async function handleDuplicate(id: string) {
    const doc = docs.find(d => d.id === id)
    await duplicateDocument(id)
    if (doc) logActivity(doc.id, doc.title, doc.type, 'duplicated')
    refresh()
  }

  function handleToggleFavorite(id: string) {
    toggleFavorite(id)
    setFavoritesState(getFavorites())
  }

  function handleStatusChange(docId: string, newStatus: DocStatus, comment?: string) {
    const doc = docs.find(d => d.id === docId)
    if (!doc) return
    const oldStatus = (docStatusMap[docId] as DocStatus) || '下書き'
    if (oldStatus === newStatus) return
    setDocStatus(docId, newStatus)
    logStatusChange(docId, doc.title, doc.type, oldStatus, newStatus, comment)
    setDocStatusMap(prev => ({ ...prev, [docId]: newStatus }))

    const STATUS_LABELS: Record<DocStatus, string> = {
      '下書き': '下書き',
      'レビュー中': 'レビュー中',
      '承認済み': '承認済み',
      '公開': '公開',
    }

    if (newStatus === 'レビュー中' && oldStatus === '下書き') {
      addToast(`「${doc.title}」のレビューを依頼しました`, 'success')
    } else if (newStatus === '承認済み') {
      addToast(`「${doc.title}」を承認しました`, 'success')
    } else if (newStatus === '下書き' && oldStatus === 'レビュー中') {
      addToast(`「${doc.title}」を差し戻しました${comment ? `（${comment}）` : ''}`, 'info')
    } else {
      addToast(`「${doc.title}」のステータスを「${STATUS_LABELS[newStatus]}」に変更しました`, 'info')
    }
  }

  function handleRestore(id: string) {
    const doc = docs.find(d => d.id === id)
    restoreFromTrash(id)
    if (doc) logActivity(doc.id, doc.title, doc.type, 'restored')
    refresh()
  }

  async function handlePermanentDelete(id: string) {
    await permanentlyDelete(id)
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

  // Computed stats
  const slidesCount = useMemo(() => activeDocs.filter(d => d.type === 'slides').length, [activeDocs])
  const docsCount = useMemo(() => activeDocs.filter(d => d.type === 'doc').length, [activeDocs])
  const spreadsheetsCount = useMemo(() => activeDocs.filter(d => d.type === 'spreadsheet').length, [activeDocs])
  const designsCount = useMemo(() => activeDocs.filter(d => d.type === 'design').length, [activeDocs])

  // Recent files for carousel (#8) - 5 most recently updated
  const recentFiles = useMemo(() => {
    return [...activeDocs]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
  }, [activeDocs])

  // ── Template Gallery View ──
  if (currentView === 'templates') {
    return (
      <div className="min-h-screen theme-bg-primary p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">テンプレート</h1>
            <p className="text-sm text-slate-400">テンプレートを選んで素早くドキュメントを作成できます</p>
          </div>

          {/* Slides templates */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Presentation size={16} /> スライド
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SLIDE_TEMPLATES.filter(t => !!t.buildSlides || t.id === 'blank').map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreateFromTemplate('slides', tpl.id)}
                  disabled={!!creatingTemplate}
                  className="group relative p-4 theme-bg-secondary border theme-border-primary rounded-xl hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all text-left disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-indigo-600/30 to-violet-600/30 flex items-center justify-center mb-3">
                    <Presentation size={28} className="text-indigo-400/60 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-white">{tpl.name}</p>
                  <p className="text-[11px] text-slate-400">{tpl.description}</p>
                  {creatingTemplate === `slides:${tpl.id}` && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-sm">
                      <Loader2 size={22} className="animate-spin text-indigo-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Doc templates */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={16} /> ドキュメント
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {DOC_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreateFromTemplate('doc', tpl.id)}
                  disabled={!!creatingTemplate}
                  className="group relative p-4 theme-bg-secondary border theme-border-primary rounded-xl hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all text-left disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-emerald-600/30 to-teal-600/30 flex items-center justify-center mb-3">
                    <FileText size={28} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-white">{tpl.name}</p>
                  <p className="text-[11px] text-slate-400">{tpl.description}</p>
                  {creatingTemplate === `doc:${tpl.id}` && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-sm">
                      <Loader2 size={22} className="animate-spin text-emerald-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Spreadsheet templates */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Table2 size={16} /> スプレッドシート
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {SPREADSHEET_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreateFromTemplate('spreadsheet', tpl.id)}
                  disabled={!!creatingTemplate}
                  className="group relative p-4 theme-bg-secondary border theme-border-primary rounded-xl hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all text-left disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-cyan-600/30 to-blue-600/30 flex items-center justify-center mb-3">
                    <Table2 size={28} className="text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-white">{tpl.name}</p>
                  <p className="text-[11px] text-slate-400">{tpl.description}</p>
                  {creatingTemplate === `spreadsheet:${tpl.id}` && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-sm">
                      <Loader2 size={22} className="animate-spin text-cyan-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Design templates */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Palette size={16} /> デザイン
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {DESIGN_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleCreateFromTemplate('design', tpl.id)}
                  disabled={!!creatingTemplate}
                  className="group relative p-4 theme-bg-secondary border theme-border-primary rounded-xl hover:border-pink-500/50 hover:bg-slate-800/80 transition-all text-left disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-pink-600/30 to-rose-600/30 flex items-center justify-center mb-3">
                    <Palette size={28} className="text-pink-400/60 group-hover:text-pink-400 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-white">{tpl.name}</p>
                  <p className="text-[11px] text-slate-400">{tpl.description}</p>
                  {creatingTemplate === `design:${tpl.id}` && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/60 backdrop-blur-sm">
                      <Loader2 size={22} className="animate-spin text-pink-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <CreateModal open={modalOpen} onClose={handleModalClose} />
      </div>
    )
  }

  // ── Activity Log View ──
  if (currentView === 'activity') {
    const ACTION_LABELS: Record<string, string> = {
      created: '作成',
      edited: '編集',
      deleted: '削除',
      duplicated: '複製',
      restored: '復元',
      status_changed: 'ステータス変更',
      shared: '共有',
      template_used: 'テンプレート使用',
      exported: 'エクスポート',
    }
    const ACTION_COLORS: Record<string, string> = {
      created: 'text-emerald-400',
      edited: 'text-indigo-400',
      deleted: 'text-red-400',
      duplicated: 'text-violet-400',
      restored: 'text-amber-400',
      status_changed: 'text-cyan-400',
      shared: 'text-blue-400',
      template_used: 'text-pink-400',
      exported: 'text-teal-400',
    }

    return (
      <div className="min-h-screen theme-bg-primary p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">アクティビティ</h1>
            <p className="text-sm text-slate-400">最近の操作履歴（最大50件）</p>
          </div>

          {activityLog.length === 0 ? (
            <div className="text-center py-16">
              <Clock size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">まだアクティビティがありません</p>
            </div>
          ) : (
            <div className="space-y-1">
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-slate-800/40 border border-slate-700/30 rounded-lg">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    entry.action === 'created' ? 'bg-emerald-400' :
                    entry.action === 'deleted' ? 'bg-red-400' :
                    entry.action === 'duplicated' ? 'bg-violet-400' :
                    entry.action === 'restored' ? 'bg-amber-400' :
                    entry.action === 'status_changed' ? 'bg-cyan-400' :
                    entry.action === 'shared' ? 'bg-blue-400' :
                    entry.action === 'template_used' ? 'bg-pink-400' :
                    entry.action === 'exported' ? 'bg-teal-400' :
                    'bg-indigo-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white font-medium truncate">{entry.docTitle}</span>
                    <span className={`ml-2 text-xs font-medium ${ACTION_COLORS[entry.action] || 'text-slate-400'}`}>
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    {entry.action === 'status_changed' && entry.fromStatus && entry.toStatus && (
                      <span className="ml-1 text-[11px] text-slate-500">
                        ({entry.fromStatus} → {entry.toStatus})
                      </span>
                    )}
                    {entry.comment && (
                      <span className="ml-1 text-[11px] text-slate-500 italic">
                        &ldquo;{entry.comment}&rdquo;
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main Dashboard View ──
  return (
    <div className="min-h-screen theme-bg-primary p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with branding */}
        <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b theme-border-primary">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* DocCraft logo / Company logo */}
              {brandSettings.logoUrl ? (
                <img src={brandSettings.logoUrl} alt={brandSettings.companyName || 'Logo'} className="w-10 h-10 rounded-xl object-contain bg-slate-800/80 border border-slate-700/50" />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg"
                  style={{
                    background: brandSettings.primaryColor && brandSettings.primaryColor !== '#6366f1'
                      ? `linear-gradient(135deg, ${brandSettings.primaryColor}, ${brandSettings.secondaryColor || brandSettings.primaryColor})`
                      : 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    boxShadow: `0 10px 15px -3px ${brandSettings.primaryColor || '#6366f1'}40`,
                  }}
                >
                  D
                </div>
              )}
              <span className="text-xl font-bold theme-text-primary tracking-tight">DocCraft</span>
              {brandSettings.companyName && (
                <span className="text-xs text-slate-400 hidden sm:inline ml-1">| {brandSettings.companyName}</span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {user && <span className="text-xs text-slate-500 hidden sm:inline">{user.email}</span>}
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
                onClick={() => setBrandSettingsOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700/80 hover:border-indigo-500/60 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
                title="ブランド設定"
                aria-label="ブランド設定"
              >
                <Palette size={16} />
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-700/80 hover:border-indigo-500/60 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-indigo-400 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
                title="ファイルインポート"
                aria-label="ファイルインポート"
              >
                <Upload size={16} />
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 text-white font-semibold px-4 sm:px-5 py-2.5 rounded-xl transition-all duration-200 text-sm shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                  style={{
                    background: brandSettings.primaryColor && brandSettings.primaryColor !== '#6366f1'
                      ? `linear-gradient(to right, ${brandSettings.primaryColor}, ${brandSettings.secondaryColor || brandSettings.primaryColor})`
                      : 'linear-gradient(to right, #4f46e5, #7c3aed)',
                    boxShadow: `0 10px 15px -3px ${brandSettings.primaryColor || '#6366f1'}40`,
                  }}
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">{t('dashboard.newCreate')}</span>
                </button>
                <span className="hidden sm:inline text-[10px] text-slate-500 font-mono bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-0.5">Ctrl+N</span>
              </div>
            </div>
          </div>
          {/* Greeting and file count below brand */}
          <div className="mt-4">
            <p className="text-slate-500 text-xs mb-1 tracking-wide">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold theme-text-primary tracking-tight">{t('dashboard.title')}</h1>
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
        </div>

        {/* Quick stats row */}
        {docs.length > 0 && (
          <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="theme-bg-secondary border theme-border-primary rounded-xl p-3 sm:p-4 flex items-center gap-3">
              <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <LayoutGrid size={16} className="text-blue-400 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-white">{slidesCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400">スライド</p>
              </div>
            </div>
            <div className="theme-bg-secondary border theme-border-primary rounded-xl p-3 sm:p-4 flex items-center gap-3">
              <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <FileText size={16} className="text-violet-400 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-white">{docsCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400">ドキュメント</p>
              </div>
            </div>
            <div className="theme-bg-secondary border theme-border-primary rounded-xl p-3 sm:p-4 flex items-center gap-3">
              <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Table2 size={16} className="text-emerald-400 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-white">{spreadsheetsCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400">スプレッドシート</p>
              </div>
            </div>
            <div className="theme-bg-secondary border theme-border-primary rounded-xl p-3 sm:p-4 flex items-center gap-3">
              <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                <Palette size={16} className="text-pink-400 sm:w-[18px] sm:h-[18px]" />
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-white">{designsCount}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-400">デザイン</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Files Carousel (#8) */}
        {recentFiles.length > 0 && !showTrash && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={12} />
              最近のファイル
            </h2>
            <div className="flex gap-3 overflow-x-auto recent-carousel pb-2">
              {recentFiles.map((doc) => {
                const docHref = doc.type === 'slides' ? `/slides/${doc.id}` : doc.type === 'spreadsheet' ? `/spreadsheets/${doc.id}` : doc.type === 'design' ? `/designs/${doc.id}` : `/docs/${doc.id}`
                const typeBg = doc.type === 'slides' ? 'from-indigo-600/30 to-violet-600/30' : doc.type === 'spreadsheet' ? 'from-cyan-600/30 to-blue-600/30' : doc.type === 'design' ? 'from-pink-600/30 to-rose-600/30' : 'from-emerald-600/30 to-teal-600/30'
                const typeIcon = doc.type === 'slides' ? <Presentation size={14} className="text-indigo-400/60" /> : doc.type === 'spreadsheet' ? <Table2 size={14} className="text-cyan-400/60" /> : doc.type === 'design' ? <Palette size={14} className="text-pink-400/60" /> : <FileText size={14} className="text-emerald-400/60" />
                const updatedMs = Date.now() - new Date(doc.updatedAt).getTime()
                const mins = Math.floor(updatedMs / 60000)
                const timeLabel = mins < 1 ? 'たった今' : mins < 60 ? `${mins}分前` : mins < 1440 ? `${Math.floor(mins / 60)}時間前` : `${Math.floor(mins / 1440)}日前`
                return (
                  <a
                    key={doc.id}
                    href={docHref}
                    className="flex-shrink-0 w-40 theme-bg-secondary border theme-border-primary rounded-xl overflow-hidden hover:border-slate-600/60 hover:bg-slate-800/80 transition-all group"
                  >
                    <div className={`h-16 bg-gradient-to-br ${typeBg} flex items-center justify-center`}>
                      {typeIcon}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-white truncate">{doc.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{timeLabel}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Breadcrumb Navigation (#23) */}
        {docs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 text-xs text-slate-500">
            <button
              onClick={() => { setActiveFolder(null); setActiveTag(null); setShowTrash(false); setFilterType('all') }}
              className={`hover:text-white transition-colors ${!activeFolder && !showTrash && !activeTag ? 'text-indigo-400 font-medium' : ''}`}
            >
              ホーム
            </button>
            {activeFolder && (
              <>
                <ChevronRight size={12} />
                <span className="text-indigo-400 font-medium">{activeFolder}</span>
              </>
            )}
            {showTrash && (
              <>
                <ChevronRight size={12} />
                <span className="text-red-400 font-medium">ゴミ箱</span>
              </>
            )}
            {activeTag && (
              <>
                <ChevronRight size={12} />
                <span style={{ color: tagColor(activeTag) }} className="font-medium">{activeTag}</span>
              </>
            )}
            {filterType === 'favorites' && !showTrash && (
              <>
                <ChevronRight size={12} />
                <span className="text-amber-400 font-medium">お気に入り</span>
              </>
            )}
          </div>
        )}

        {/* Search & Filter Bar */}
        {docs.length > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 group/search">
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
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
              {search.trim() && (
                <span className="text-xs text-slate-400 whitespace-nowrap px-2 py-1">{filtered.length}件の検索結果</span>
              )}

              <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-xl p-1 border border-slate-700 overflow-x-auto">
                {(
                  [
                    ['all', t('dashboard.all')],
                    ['slides', t('dashboard.slides')],
                    ['doc', t('dashboard.docs')],
                    ['spreadsheet', t('dashboard.spreadsheets')],
                    ['design', 'デザイン'],
                  ] as [FilterType, string][]
                ).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setFilterType(val); setShowTrash(false) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      filterType === val && !showTrash ? 'bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                >
                  <option value="updated">{t('dashboard.sortUpdated')}</option>
                  <option value="created">{t('dashboard.sortCreated')}</option>
                  <option value="name">{t('dashboard.sortName')}</option>
                  <option value="custom">カスタム</option>
                </select>

                {/* Grid/List toggle */}
                <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                      viewMode === 'grid' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:text-white'
                    }`}
                    title="グリッド表示"
                  >
                    <Grid3X3 size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                      viewMode === 'list' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:text-white'
                    }`}
                    title="リスト表示"
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter pills row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date range pills */}
              <div className="flex items-center gap-1">
                <Calendar size={12} className="text-slate-500" />
                {([
                  ['all', 'すべて'],
                  ['today', '今日'],
                  ['week', '今週'],
                  ['month', '今月'],
                ] as [DateFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDateFilter(val)}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                      dateFilter === val ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1">
                <CircleDot size={12} className="text-slate-500" />
                {([
                  ['all', 'すべて'],
                  ['下書き', '下書き'],
                  ['レビュー中', 'レビュー中'],
                  ['承認済み', '承認済み'],
                  ['公開', '公開'],
                ] as [StatusFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStatusFilter(val)}
                    className={`px-2 py-1 rounded-full text-[10px] font-medium transition-all ${
                      statusFilter === val ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tag filter dropdown */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag size={12} className="text-slate-500" />
                  <select
                    value={tagFilter || ''}
                    onChange={(e) => setTagFilter(e.target.value || null)}
                    className="bg-slate-800/60 border border-slate-700/50 rounded-full px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">すべてのタグ</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  {(tagFilter || activeTag) && (
                    <button
                      onClick={() => { setTagFilter(null); setActiveTag(null) }}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                    >
                      <X size={10} />
                      タグクリア
                    </button>
                  )}
                </div>
              )}

              {/* Select all checkbox */}
              {!showTrash && filtered.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border border-slate-700/50 hover:border-indigo-500/50 bg-slate-800/60 hover:bg-indigo-500/10"
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedIds.size === filtered.length && filtered.length > 0
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : selectedIds.size > 0
                        ? 'bg-indigo-500/40 border-indigo-400 text-white'
                        : 'border-slate-500 hover:border-indigo-400'
                  }`}>
                    {selectedIds.size > 0 && <Check size={9} />}
                  </span>
                  <span className={selectedIds.size > 0 ? 'text-indigo-400' : 'text-slate-400'}>
                    {selectedIds.size === filtered.length && filtered.length > 0 ? '全選択解除' : '全選択'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-5">
          {/* Sidebar */}
          {docs.length > 0 && (
            <div className="w-48 flex-shrink-0 hidden md:block">
              <div className="sticky top-8">
                {/* Navigation label */}
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 block">ナビゲーション</span>

                {/* Favorites & Trash quick access */}
                <button
                  onClick={() => { setFilterType('favorites'); setShowTrash(false) }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all mb-0.5 ${
                    filterType === 'favorites' && !showTrash ? 'bg-amber-500/15 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Star size={14} />
                  お気に入り
                  <span className="ml-auto bg-slate-700/60 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{favorites.length}</span>
                </button>
                <button
                  onClick={() => { setShowTrash(!showTrash); if (!showTrash) setFilterType('all') }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all mb-3 ${
                    showTrash ? 'bg-red-500/15 text-red-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Trash2 size={14} />
                  ゴミ箱
                  <span className="ml-auto bg-slate-700/60 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{trashIds.length}</span>
                </button>

                {/* Folders */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">フォルダ</span>
                  <button onClick={() => setShowNewFolder(!showNewFolder)} className="text-slate-500 hover:text-indigo-400 transition-colors" title="フォルダ追加">
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
                    <button onClick={handleCreateFolder} className="text-xs text-indigo-400 hover:text-indigo-300 px-1">
                      追加
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActiveFolder(null)}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolder('__all__') }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOverFolder(null)
                    const docId = e.dataTransfer.getData('text/doccraft-id')
                    if (docId) handleMoveToFolder(docId, null)
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                    dragOverFolder === '__all__'
                      ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/50 scale-[1.02]'
                      : !activeFolder ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FolderOpen size={14} />
                  すべて
                  <span className="ml-auto text-[10px] text-slate-500">{activeDocs.length}</span>
                </button>

                {folders.map((folder) => {
                  const count = activeDocs.filter((d) => folderMap[d.id] === folder).length
                  return (
                    <div key={folder} className="group flex items-center">
                      <button
                        onClick={() => setActiveFolder(activeFolder === folder ? null : folder)}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolder(folder) }}
                        onDragLeave={() => setDragOverFolder(null)}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOverFolder(null)
                          const docId = e.dataTransfer.getData('text/doccraft-id')
                          if (docId) handleMoveToFolder(docId, folder)
                        }}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                          dragOverFolder === folder
                            ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-400/50 scale-[1.02]'
                            : activeFolder === folder ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
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

                {/* Tags section */}
                {allTags.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-1 mb-2">
                      <Tag size={10} className="text-slate-500" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">タグ</span>
                    </div>
                    <button
                      onClick={() => setActiveTag(null)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all mb-0.5 ${
                        !activeTag ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      すべてのタグ
                    </button>
                    <div className="flex flex-wrap gap-1">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 border ${
                            activeTag === tag ? 'border-white/30 shadow-sm' : 'border-transparent hover:border-white/20'
                          }`}
                          style={{
                            backgroundColor: tagColor(tag) + '20',
                            color: tagColor(tag),
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb moved to top-level (#23) - tag clear button kept here */}
            {activeTag && (
              <div className="flex items-center gap-1 mb-4 text-xs text-slate-500">
                <Tag size={10} />
                <span style={{ color: tagColor(activeTag) }} className="font-medium">
                  {activeTag}
                </span>
                <button onClick={() => setActiveTag(null)} className="ml-1 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Trash view with auto-delete notice */}
            {showTrash && (
              <>
                <div className="flex items-center gap-2 mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-300">ゴミ箱内のドキュメントは30日後に自動削除されます</span>
                </div>
                <div className="flex items-center gap-2 mb-4 text-xs text-red-400">
                  <Trash2 size={12} />
                  <span className="font-medium">ゴミ箱</span>
                  <span className="text-slate-500">({trashIds.length}件)</span>
                </div>
              </>
            )}

            {/* Custom sort drag hint */}
            {sortBy === 'custom' && !showTrash && filtered.length > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <span className="text-[11px] text-indigo-300">ドラッグ＆ドロップでカードを並び替えできます</span>
              </div>
            )}

            {loading ? (
              /* Loading skeleton */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700/40 rounded-xl overflow-hidden animate-pulse">
                    <div className="h-36 bg-slate-700/30" />
                    <div className="p-3.5 space-y-2.5">
                      <div className="h-4 bg-slate-700/40 rounded w-3/4" />
                      <div className="h-3 bg-slate-700/30 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : docs.length === 0 ? (
              <EmptyState onCreate={() => setModalOpen(true)} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                {showTrash ? (
                  <>
                    <Trash2 size={40} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-500 text-sm">ゴミ箱は空です</p>
                  </>
                ) : search.trim() ? (
                  <>
                    <Search size={40} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm font-medium mb-1">{`「${search}」に一致するドキュメントはありません`}</p>
                    <p className="text-slate-500 text-xs">別のキーワードで検索してみてください</p>
                  </>
                ) : activeFolder ? (
                  <>
                    <Folder size={40} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm font-medium mb-1">このフォルダは空です</p>
                    <p className="text-slate-500 text-xs">ドキュメントをドラッグしてフォルダに追加できます</p>
                  </>
                ) : (filterType !== 'all' || dateFilter !== 'all' || tagFilter || activeTag || statusFilter !== 'all') ? (
                  <>
                    <Search size={40} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm font-medium mb-1">条件に一致するドキュメントはありません</p>
                    <p className="text-slate-500 text-xs">フィルター条件を変更してみてください</p>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">{t('dashboard.noResults')}</p>
                )}
              </div>
            ) : viewMode === 'list' ? (
              /* ── List View ── */
              <div className="space-y-1.5">
                {/* List header */}
                <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {!showTrash && (
                    <button
                      onClick={handleSelectAll}
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 hover:border-indigo-400'
                      }`}
                    >
                      {selectedIds.size === filtered.length && filtered.length > 0 && <Check size={12} className="text-white" />}
                    </button>
                  )}
                  <span className="flex-1">名前</span>
                  <span className="w-16 text-center">タイプ</span>
                  <span className="w-28 text-right">更新日</span>
                  <span className="w-28">タグ</span>
                  <span className="w-24 text-right">操作</span>
                </div>
                {filtered.slice(0, visibleCount).map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    folders={folders}
                    currentFolder={folderMap[doc.id] || null}
                    onMoveToFolder={(folder) => handleMoveToFolder(doc.id, folder)}
                    isFavorite={favorites.includes(doc.id)}
                    onToggleFavorite={() => handleToggleFavorite(doc.id)}
                    isTrash={showTrash && trashIds.includes(doc.id)}
                    trashedAt={showTrash ? getTrashDeletedAt(doc.id) : null}
                    onRestore={handleRestore}
                    onPermanentDelete={handlePermanentDelete}
                    contentMatches={contentSearchResults[doc.id]}
                    tags={docTagsMap[doc.id] || []}
                    allTags={allTags}
                    onSetTags={(tags) => handleSetDocTags(doc.id, tags)}
                    isSelected={selectedIds.has(doc.id)}
                    onSelect={handleSelect}
                    selectMode={selectMode}
                    isPinned={pinnedIds.includes(doc.id)}
                    onTogglePin={handleTogglePin}
                    listView={true}
                    draggableReorder={sortBy === 'custom'}
                    onDragReorderStart={handleDragReorderStart}
                    onDragReorderOver={handleDragReorderOver}
                    onDragReorderDrop={handleDragReorderDrop}
                    dragOverReorderId={dragOverReorderId}
                    docStatus={(docStatusMap[doc.id] as DocStatus) || '下書き'}
                    onStatusChange={handleStatusChange}
                    contentSnippet={contentSearchResults[doc.id]?.[0] || doc.title}
                  />
                ))}
              </div>
            ) : (
              /* ── Grid View ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.slice(0, visibleCount).map((doc, i) => (
                  <div key={doc.id} className="animate-[fadeSlideUp_0.4s_ease-out_both]" style={{ animationDelay: `${i * 60}ms` }}>
                    <DocumentCard
                      doc={doc}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      folders={folders}
                      currentFolder={folderMap[doc.id] || null}
                      onMoveToFolder={(folder) => handleMoveToFolder(doc.id, folder)}
                      isFavorite={favorites.includes(doc.id)}
                      onToggleFavorite={() => handleToggleFavorite(doc.id)}
                      isTrash={showTrash && trashIds.includes(doc.id)}
                      trashedAt={showTrash ? getTrashDeletedAt(doc.id) : null}
                      onRestore={handleRestore}
                      onPermanentDelete={handlePermanentDelete}
                      contentMatches={contentSearchResults[doc.id]}
                      tags={docTagsMap[doc.id] || []}
                      allTags={allTags}
                      onSetTags={(tags) => handleSetDocTags(doc.id, tags)}
                      isSelected={selectedIds.has(doc.id)}
                      onSelect={handleSelect}
                      selectMode={selectMode}
                      isPinned={pinnedIds.includes(doc.id)}
                      onTogglePin={handleTogglePin}
                      draggableReorder={sortBy === 'custom'}
                      onDragReorderStart={handleDragReorderStart}
                      onDragReorderOver={handleDragReorderOver}
                      onDragReorderDrop={handleDragReorderDrop}
                      dragOverReorderId={dragOverReorderId}
                      docStatus={(docStatusMap[doc.id] as DocStatus) || '下書き'}
                      onStatusChange={handleStatusChange}
                      contentSnippet={contentSearchResults[doc.id]?.[0] || doc.title}
                    />
                  </div>
                ))}
                {visibleCount < filtered.length && (
                  <div className="col-span-full flex justify-center py-4">
                    <button
                      onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
                    >
                      さらに表示 ({filtered.length - visibleCount} 件)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Load more for list view */}
            {viewMode === 'list' && visibleCount < filtered.length && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
                >
                  さらに表示 ({filtered.length - visibleCount} 件)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating bulk action bar */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/50 animate-[fadeSlideUp_0.2s_ease-out]">
          <span className="text-sm text-white font-medium mr-2">{selectedIds.size}件選択中</span>
          {/* Folder move picker */}
          <div className="relative">
            <button
              onClick={() => {
                if (folders.length === 0) { addToast('まずフォルダを作成してください', 'info'); return }
                setBulkFolderPickerOpen(!bulkFolderPickerOpen)
                setBulkTagPickerOpen(false)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-700/80 rounded-lg transition-colors"
            >
              <Folder size={12} />
              フォルダに移動
            </button>
            {bulkFolderPickerOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-1.5 min-w-[160px] max-h-48 overflow-y-auto">
                {folders.map(f => (
                  <button
                    key={f}
                    onClick={() => handleBulkMoveToFolder(f)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors text-left"
                  >
                    <Folder size={12} className="text-slate-500 flex-shrink-0" />
                    <span className="truncate">{f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Tag picker */}
          <div className="relative">
            <button
              onClick={() => {
                if (allTags.length === 0) { addToast('まずタグを作成してください', 'info'); return }
                setBulkTagPickerOpen(!bulkTagPickerOpen)
                setBulkFolderPickerOpen(false)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
            >
              <Tag size={12} />
              タグ付け
            </button>
            {bulkTagPickerOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-1.5 min-w-[160px] max-h-48 overflow-y-auto">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleBulkAddTag(tag)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-700 rounded-lg transition-colors text-left"
                    style={{ color: tagColor(tag) }}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tagColor(tag) }} />
                    <span className="truncate">{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            削除
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkFolderPickerOpen(false); setBulkTagPickerOpen(false) }}
            className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Brand Settings Modal */}
      {brandSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={() => setBrandSettingsOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Palette size={16} className="text-indigo-400" /> ブランド設定</h2>
              <button onClick={() => setBrandSettingsOpen(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">会社名</label>
                <input
                  type="text"
                  value={brandSettings.companyName}
                  onChange={(e) => setBrandSettingsState({ ...brandSettings, companyName: e.target.value })}
                  placeholder="株式会社サンプル"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">ロゴURL</label>
                <input
                  type="text"
                  value={brandSettings.logoUrl}
                  onChange={(e) => setBrandSettingsState({ ...brandSettings, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {brandSettings.logoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={brandSettings.logoUrl} alt="Logo preview" className="w-8 h-8 rounded object-contain bg-slate-800 border border-slate-700" />
                    <span className="text-[10px] text-slate-500">プレビュー</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">ブランドカラー</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandSettings.primaryColor}
                      onChange={(e) => setBrandSettingsState({ ...brandSettings, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandSettings.primaryColor}
                      onChange={(e) => setBrandSettingsState({ ...brandSettings, primaryColor: e.target.value })}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">サブカラー</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandSettings.secondaryColor}
                      onChange={(e) => setBrandSettingsState({ ...brandSettings, secondaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={brandSettings.secondaryColor}
                      onChange={(e) => setBrandSettingsState({ ...brandSettings, secondaryColor: e.target.value })}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div className="rounded-lg p-3 border border-slate-700/50" style={{
                background: `linear-gradient(135deg, ${brandSettings.primaryColor}20, ${brandSettings.secondaryColor}20)`,
              }}>
                <div className="flex items-center gap-2 mb-2">
                  {brandSettings.logoUrl && <img src={brandSettings.logoUrl} alt="" className="w-6 h-6 rounded object-contain" />}
                  <span className="text-xs font-medium text-white">{brandSettings.companyName || 'プレビュー'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded" style={{ background: brandSettings.primaryColor }} />
                  <div className="w-6 h-6 rounded" style={{ background: brandSettings.secondaryColor }} />
                  <span className="text-[10px] text-slate-400">カラーパレット</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    saveBrandSettings(brandSettings)
                    setBrandSettingsOpen(false)
                    addToast('ブランド設定を保存しました', 'success')
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{
                    background: `linear-gradient(to right, ${brandSettings.primaryColor}, ${brandSettings.secondaryColor})`,
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    const reset: BrandSettings = { companyName: '', logoUrl: '', primaryColor: '#6366f1', secondaryColor: '#8b5cf6' }
                    setBrandSettingsState(reset)
                    saveBrandSettings(reset)
                    addToast('ブランド設定をリセットしました', 'info')
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 hover:text-white hover:border-slate-500 transition-all"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ctrl+S Save Toast (#2) */}
      {showSaveToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 bg-emerald-500/90 backdrop-blur-md text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/20 animate-save-toast-in flex items-center gap-2">
          <Check size={16} />
          保存しました
        </div>
      )}

      {/* Onboarding Overlay (#11) */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-onboarding" onClick={dismissOnboarding}>
          <div
            className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-500/10 p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                D
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">DocCraft へようこそ!</h2>
                <p className="text-xs text-slate-400">はじめての方向けガイド</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 theme-bg-secondary border theme-border-primary rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Plus size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">「+ 新規作成」ボタン</p>
                  <p className="text-[11px] text-slate-400">スライド、ドキュメント、スプレッドシートを作成できます（Ctrl+N）</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 theme-bg-secondary border theme-border-primary rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Search size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">検索バー</p>
                  <p className="text-[11px] text-slate-400">タイトルやコンテンツの全文検索ができます</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 theme-bg-secondary border theme-border-primary rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <LayoutGrid size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">タイプフィルター</p>
                  <p className="text-[11px] text-slate-400">「すべて / スライド / ドキュメント / 表計算」で絞り込み</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 theme-bg-secondary border theme-border-primary rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Presentation size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">テンプレートギャラリー</p>
                  <p className="text-[11px] text-slate-400">サイドバーの「テンプレート」からテンプレートを活用できます</p>
                </div>
              </div>
            </div>
            <button
              onClick={dismissOnboarding}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20"
            >
              了解
            </button>
          </div>
        </div>
      )}

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
    <div className="relative flex flex-col items-center justify-center py-16 sm:py-32 text-center overflow-hidden">
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
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">{t('dashboard.createFirst')}</h2>
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
