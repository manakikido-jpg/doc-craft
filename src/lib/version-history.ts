export interface VersionEntry {
  id: string
  docId: string
  timestamp: string
  title: string
  label?: string  // user-set label like "ピッチデック v2"
}

const VERSION_META_KEY = 'doccraft:versions:'
const VERSION_DATA_KEY = 'doccraft:vdata:'
const MAX_VERSIONS = 30

export function getVersions(docId: string): VersionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(VERSION_META_KEY + docId) || '[]')
  } catch { return [] }
}

export function saveVersion(docId: string, title: string, data: string): string {
  const versions = getVersions(docId)
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const entry: VersionEntry = {
    id,
    docId,
    timestamp: new Date().toISOString(),
    title,
  }
  versions.unshift(entry)
  // Keep max versions, remove oldest
  while (versions.length > MAX_VERSIONS) {
    const old = versions.pop()
    if (old) localStorage.removeItem(VERSION_DATA_KEY + old.id)
  }
  localStorage.setItem(VERSION_META_KEY + docId, JSON.stringify(versions))
  localStorage.setItem(VERSION_DATA_KEY + id, data)
  return id
}

export function getVersionData(versionId: string): string | null {
  return localStorage.getItem(VERSION_DATA_KEY + versionId)
}

export function deleteVersion(docId: string, versionId: string): void {
  const versions = getVersions(docId).filter(v => v.id !== versionId)
  localStorage.setItem(VERSION_META_KEY + docId, JSON.stringify(versions))
  localStorage.removeItem(VERSION_DATA_KEY + versionId)
}

export function labelVersion(docId: string, versionId: string, label: string): void {
  const versions = getVersions(docId)
  const v = versions.find(v => v.id === versionId)
  if (v) {
    v.label = label
    localStorage.setItem(VERSION_META_KEY + docId, JSON.stringify(versions))
  }
}
