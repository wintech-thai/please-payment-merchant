'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { client } from '@/lib/axios'
import { userApi } from '@/lib/api/user.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, Trash2, Ban, CheckCircle, MoreHorizontal, Key, Plus } from 'lucide-react'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface ApiKeyItem {
  keyId?: string; id?: string
  keyName?: string; name?: string
  keyDescription?: string; description?: string
  customRoleName?: string
  rolesList?: string
  keyStatus?: string
}

const getId = (k: ApiKeyItem) => k.keyId || k.id || ''
const getName = (k: ApiKeyItem) => k.keyName || k.name || ''
function isKeyActive(keyStatus?: string) {
  if (!keyStatus) return true
  return keyStatus.toLowerCase() === 'active'
}
function parseCsv(value?: string | null): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
function getOrgId() { return typeof window !== 'undefined' ? localStorage.getItem('orgId') || 'temp' : 'temp' }

function ApiKeysContent() {
  const { t } = useLang()
  const router = useRouter()
  const { selectedRowId, handleRowSelect } = useHighlightRow()

  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; keyId?: string; keyName?: string; bulk?: boolean }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const fetchKeys = async (currentPage: number, keyword: string = '') => {
    setLoading(true)
    const orgId = getOrgId()
    try {
      const [keysRes, countRes] = await Promise.allSettled([
        client.post(`/api/ApiKey/org/${orgId}/action/GetApiKeys`, { offset: (currentPage - 1) * itemsPerPage, limit: itemsPerPage, fullTextSearch: keyword || undefined }),
        client.post(`/api/ApiKey/org/${orgId}/action/GetApiKeyCount`, { fullTextSearch: keyword || undefined }),
      ])
      const raw = keysRes.status === 'fulfilled' ? (keysRes.value.data as any) : null
      setKeys(Array.isArray(raw) ? raw : (raw?.apiKeys ?? raw?.data ?? []))
      const cnt = countRes.status === 'fulfilled' ? (countRes.value.data as any) : null
      setTotal(typeof cnt === 'number' ? cnt : (cnt?.count ?? 0))
    } catch {
      toast.error(t.apiKeys.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchKeys(page, appliedSearch) }, [page, itemsPerPage])

  const handleSearchTrigger = () => {
    setAppliedSearch(searchTerm)
    setPage(1)
    fetchKeys(1, searchTerm)
  }

  const handleToggleActive = async (key: ApiKeyItem) => {
    const orgId = getOrgId()
    const id = getId(key)
    const active = isKeyActive(key.keyStatus)
    const name = getName(key) || id.slice(0, 8)
    try {
      const action = active ? 'DisableApiKeyById' : 'EnableApiKeyById'
      await client.post(`/api/ApiKey/org/${orgId}/action/${action}/${id}`, {})
      toast.success(`"${name}" ${active ? t.apiKeys.disabledSuccess : t.apiKeys.enabledSuccess}`)
      fetchKeys(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.apiKeys.failedToUpdateStatus
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    const orgId = getOrgId()
    setDeleting(true)
    try {
      if (deleteModal.bulk) {
        for (const id of selectedIds) await client.delete(`/api/ApiKey/org/${orgId}/action/DeleteApiKeyById/${id}`)
        toast.success(t.apiKeys.deletedBulk.replace('{count}', String(selectedIds.length)))
        setSelectedIds([])
      } else {
        await client.delete(`/api/ApiKey/org/${orgId}/action/DeleteApiKeyById/${deleteModal.keyId}`)
        toast.success(t.apiKeys.deletedSingle)
      }
      setDeleteModal({ open: false })
      fetchKeys(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.apiKeys.failedToDelete
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const q = appliedSearch.toLowerCase()
  const filteredKeys = q
    ? keys.filter(k => getName(k).toLowerCase().includes(q) || (k.keyDescription || '').toLowerCase().includes(q))
    : keys
  const displayTotal = appliedSearch ? filteredKeys.length : total

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredKeys.map(getId) : [])
  }
  const toggleOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const startRow = displayTotal === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, displayTotal)
  const totalPages = Math.ceil(displayTotal / itemsPerPage)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex items-start justify-between mb-4 flex-none">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.apiKeys.title}</h1>
          <p className="text-base text-gray-500 mt-1">{t.apiKeys.subtitle}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-3 flex-none">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 sm:min-w-[140px]">
            <option>{t.apiKeys.filterAll}</option>
            <option>{t.apiKeys.filterName}</option>
            <option>{t.apiKeys.filterDescription}</option>
          </select>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
            placeholder={t.apiKeys.searchPlaceholder}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 sm:min-w-[220px]" />
          <button onClick={handleSearchTrigger}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button onClick={() => router.push('/administration/api-keys/create')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-sm transition-all hover:shadow-md">
            <Plus className="w-4 h-4" />{t.apiKeys.addKey}
          </button>
          <button onClick={() => setDeleteModal({ open: true, bulk: true })} disabled={selectedIds.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" />{t.admin.delete}
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="min-w-full border-separate" style={{ borderSpacing: '0 5px' }}>
            <thead>
              <tr>
                <th className="w-12 px-4 pb-1">
                  <input type="checkbox" checked={filteredKeys.length > 0 && selectedIds.length === filteredKeys.length}
                    onChange={toggleAll} className="w-4 h-4 rounded accent-primary-600 cursor-pointer" />
                </th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apiKeys.colKeyName}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apiKeys.colDescription}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apiKeys.colCustomRole}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apiKeys.colRoles}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apiKeys.colStatus}</th>
                <th className="w-14 px-4 pb-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.apiKeys.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><LoadingSpinner /></td></tr>
              ) : filteredKeys.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <EmptyState icon={<Key className="w-7 h-7 text-gray-400" />} title={t.apiKeys.noKeysFound} subtitle={t.apiKeys.noKeysSubtitle} />
                </td></tr>
              ) : filteredKeys.map(key => {
                const id = getId(key)
                const active = isKeyActive(key.keyStatus)
                const roleList = parseCsv(key.rolesList)
                const isSelected = selectedRowId === id
                return (
                  <tr key={id} onClick={() => handleRowSelect(id)}
                    className={clsx('cursor-pointer transition-all',
                      isSelected ? '!bg-primary-100 shadow-sm' : 'bg-white shadow-sm hover:shadow-md hover:bg-amber-50/20')}>
                    <td className={clsx('pl-4 pr-2 py-3.5 rounded-l-xl border-l-[3px]', isSelected ? 'border-primary-500' : 'border-transparent')} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleOne(id)}
                        className="w-4 h-4 rounded accent-primary-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <Key className="w-3.5 h-3.5 text-primary-600" />
                        </div>
                        <button onClick={e => { e.stopPropagation(); router.push(`/administration/api-keys/${id}/update`) }}
                          className={clsx('text-sm font-semibold hover:underline text-left', isSelected ? 'text-primary-700' : 'text-gray-900 hover:text-primary-600')}>
                          {getName(key) || `Key ${id.slice(0, 8)}`}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 max-w-[200px] truncate">{key.keyDescription || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{key.customRoleName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {roleList.length ? roleList.map(r => <span key={r} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary-600 text-white">{r}</span>) : <span className="text-sm text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('inline-flex px-2.5 py-1 rounded-full text-xs font-semibold',
                        active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                        {key.keyStatus || 'Active'}
                      </span>
                    </td>
                    <td className="px-2 pr-4 py-3.5 text-center rounded-r-xl" onClick={e => e.stopPropagation()}>
                      <RowActions items={[
                        { label: t.apiKeys.disableKey, icon: <Ban className="w-4 h-4" />, danger: true, disabled: !active, onClick: () => handleToggleActive(key) },
                        { label: t.apiKeys.enableKey, icon: <CheckCircle className="w-4 h-4" />, disabled: active, onClick: () => handleToggleActive(key) },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end px-4 py-3 bg-white rounded-xl shadow-sm mt-1 gap-4 sm:gap-6 flex-none">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.admin.rowsPerPage}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{displayTotal === 0 ? '0-0' : `${startRow}-${endRow}`} of {displayTotal}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || displayTotal === 0 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false })}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {deleteModal.bulk ? t.apiKeys.deleteBulkTitle.replace('{count}', String(selectedIds.length)) : t.apiKeys.deleteKeyTitle}
              </h3>
              <p className="text-sm text-gray-500">
                {deleteModal.bulk
                  ? t.apiKeys.deleteBulkDesc.replace('{count}', String(selectedIds.length))
                  : <>{t.apiKeys.deleteSingleDesc} <span className="font-semibold text-gray-700">&ldquo;{deleteModal.keyName}&rdquo;</span>?</>}
                {' '}{t.apiKeys.deleteServiceWarning}
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setDeleteModal({ open: false })} className={clsx(cancelBtnCls, 'flex-1')}>{t.admin.cancel}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleting ? t.admin.deleting : t.admin.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type ActionItem = { label: string; icon: React.ReactNode; danger?: boolean; disabled?: boolean; onClick: () => void }

function RowActions({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v) }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (!item.disabled) { item.onClick(); setOpen(false) } }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
                item.disabled ? 'text-gray-300 cursor-not-allowed' : item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">{t.admin.loading}</span>
    </div>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <>
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <p className="text-base font-medium text-gray-500">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </>
  )
}

const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'

export default function ApiKeysPage() {
  return (
    <Suspense>
      <ApiKeysContent />
    </Suspense>
  )
}
