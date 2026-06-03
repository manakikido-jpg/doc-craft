// Activity log utility — stores last 50 actions in localStorage

export type DocStatus = '下書き' | 'レビュー中' | '承認済み' | '公開'

export interface ActivityEntry {
  id: string
  docId: string
  docTitle: string
  docType: 'slides' | 'doc' | 'spreadsheet' | 'design'
  action: 'created' | 'edited' | 'deleted' | 'duplicated' | 'restored' | 'status_changed' | 'shared' | 'template_used' | 'exported'
  timestamp: string
  // Optional fields for richer logging
  fromStatus?: DocStatus
  toStatus?: DocStatus
  comment?: string
  detail?: string
}

const ACTIVITY_KEY = 'doccraft:activity-log'
const MAX_ENTRIES = 50

function getEntries(): ActivityEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveEntries(entries: ActivityEntry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

let counter = 0
function activityId(): string {
  return `act_${Date.now()}_${++counter}`
}

export function logActivity(
  docId: string,
  docTitle: string,
  docType: 'slides' | 'doc' | 'spreadsheet' | 'design',
  action: ActivityEntry['action'],
): void {
  const entries = getEntries()
  entries.unshift({
    id: activityId(),
    docId,
    docTitle,
    docType,
    action,
    timestamp: new Date().toISOString(),
  })
  saveEntries(entries)
}

export function logStatusChange(
  docId: string,
  docTitle: string,
  docType: 'slides' | 'doc' | 'spreadsheet' | 'design',
  fromStatus: DocStatus,
  toStatus: DocStatus,
  comment?: string,
): void {
  const entries = getEntries()
  entries.unshift({
    id: activityId(),
    docId,
    docTitle,
    docType,
    action: 'status_changed',
    timestamp: new Date().toISOString(),
    fromStatus,
    toStatus,
    comment,
  })
  saveEntries(entries)
}

export function logDetailedActivity(
  docId: string,
  docTitle: string,
  docType: 'slides' | 'doc' | 'spreadsheet' | 'design',
  action: ActivityEntry['action'],
  detail?: string,
): void {
  const entries = getEntries()
  entries.unshift({
    id: activityId(),
    docId,
    docTitle,
    docType,
    action,
    timestamp: new Date().toISOString(),
    detail,
  })
  saveEntries(entries)
}

export function getActivityLog(): ActivityEntry[] {
  return getEntries()
}

export function getDocumentHistory(docId: string): ActivityEntry[] {
  return getEntries().filter((e) => e.docId === docId)
}

export function getRecentActivity(limit: number): ActivityEntry[] {
  return getEntries().slice(0, limit)
}

export function clearActivityLog(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVITY_KEY)
}

// ── Document status helpers ──
const STATUS_KEY_PREFIX = 'doccraft:doc-status:'

export function getDocStatus(docId: string): DocStatus {
  if (typeof window === 'undefined') return '下書き'
  return (localStorage.getItem(STATUS_KEY_PREFIX + docId) as DocStatus) || '下書き'
}

export function setDocStatus(docId: string, status: DocStatus): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STATUS_KEY_PREFIX + docId, status)
}

export function getAllDocStatuses(): Record<string, DocStatus> {
  if (typeof window === 'undefined') return {}
  const result: Record<string, DocStatus> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STATUS_KEY_PREFIX)) {
      const docId = key.slice(STATUS_KEY_PREFIX.length)
      result[docId] = localStorage.getItem(key) as DocStatus
    }
  }
  return result
}
