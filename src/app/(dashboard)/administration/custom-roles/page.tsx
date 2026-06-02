'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { userApi } from '@/lib/api/user.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, ShieldCheck, Trash2, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface CustomRoleItem {
  roleId?: string; customRoleId?: string; id?: string
  roleName?: string; customRoleName?: string; name?: string
  roleDescription?: string; description?: string
  tags?: string | string[]
}

const getId = (r: CustomRoleItem) => r.roleId || r.customRoleId || r.id || ''
const getName = (r: CustomRoleItem) => r.roleName || r.customRoleName || r.name || '—'
const getDesc = (r: CustomRoleItem) => r.roleDescription || r.description || ''

function CustomRolesContent() {
  const { t } = useLang()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [roles, setRoles] = useState<CustomRoleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedRowId, setSelectedRowId] = useState<string | null>(highlightIdParam)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (highlightIdParam) {
      setSelectedRowId(highlightIdParam)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('highlight')
      window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    }
  }, [highlightIdParam, pathname, searchParams])

  const fetchRoles = async (currentPage: number, keyword: string = '') => {
    setLoading(true)
    try {
      const [rolesRes, countRes] = await Promise.allSettled([
        userApi.getCustomRoles({ offset: (currentPage - 1) * itemsPerPage, limit: itemsPerPage, fullTextSearch: keyword || undefined }),
        userApi.getCustomRoleCount(),
      ])
      const raw = rolesRes.status === 'fulfilled' ? (rolesRes.value.data as any) : null
      setRoles(Array.isArray(raw) ? raw : (raw?.customRoles ?? raw?.data ?? []))
      const cnt = countRes.status === 'fulfilled' ? (countRes.value.data as any) : null
      setTotal(typeof cnt === 'number' ? cnt : (cnt?.count ?? 0))
    } catch {
      toast.error(t.customRoles.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoles(page, appliedSearch) }, [page, itemsPerPage])

  const handleSearchTrigger = () => {
    setAppliedSearch(searchTerm)
    setPage(1)
    fetchRoles(1, searchTerm)
  }

  const handleDelete = async () => {
    if (selectedIds.length === 0) return
    setDeleting(true)
    try {
      for (const id of selectedIds) await userApi.deleteCustomRoleById(id)
      toast.success(t.customRoles.deletedSuccess)
      setSelectedIds([])
      setDeleteModal(false)
      fetchRoles(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.customRoles.failedToDelete
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const q = appliedSearch.toLowerCase()
  const filteredRoles = q
    ? roles.filter(r => getName(r).toLowerCase().includes(q) || getDesc(r).toLowerCase().includes(q))
    : roles
  const displayTotal = appliedSearch ? filteredRoles.length : total

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredRoles.map(getId) : [])
  }
  const toggleOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const startRow = displayTotal === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, displayTotal)
  const totalPages = Math.ceil(displayTotal / itemsPerPage)

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.customRoles.title}</h1>
          <p className="text-base text-gray-500 mt-1">{t.customRoles.subtitle}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 sm:min-w-[140px]">
              <option>{t.customRoles.filterAll}</option>
              <option>{t.customRoles.filterName}</option>
              <option>{t.customRoles.filterTags}</option>
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
              placeholder={t.customRoles.searchPlaceholder}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 sm:min-w-[220px]"
            />
            <button
              onClick={handleSearchTrigger}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => window.location.href = '/administration/custom-roles/create'}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors uppercase"
            >
              {t.customRoles.addRole}
            </button>
            <button
              onClick={() => setDeleteModal(true)}
              disabled={selectedIds.length === 0}
              className="px-5 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors uppercase disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.admin.delete}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="w-12 px-6 py-3.5">
                  <input
                    type="checkbox"
                    checked={filteredRoles.length > 0 && selectedIds.length === filteredRoles.length}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.customRoles.colRoleName}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.customRoles.colDescription}</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.customRoles.colTags}</th>
                <th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.customRoles.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><LoadingSpinner /></td></tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <EmptyState
                      icon={<ShieldCheck className="w-7 h-7 text-gray-400" />}
                      title={appliedSearch ? `${t.customRoles.noResultsFor} "${appliedSearch}"` : t.customRoles.noRolesFound}
                      subtitle={appliedSearch ? t.customRoles.tryDifferentSearch : t.customRoles.noRolesSubtitle}
                    />
                  </td>
                </tr>
              ) : filteredRoles.map(role => {
                const id = getId(role)
                const isSelected = selectedRowId === id
                const raw = role.tags
                const tagList: string[] = Array.isArray(raw)
                  ? (raw as string[])
                  : raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : []
                return (
                  <tr
                    key={id}
                    onClick={() => setSelectedRowId(id)}
                    className={clsx(
                      'border-l-[3px] transition-all cursor-pointer',
                      isSelected ? '!bg-primary-100 border-l-primary-500' : 'border-l-transparent hover:bg-gray-50/50'
                    )}
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleOne(id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={e => { e.stopPropagation(); window.location.href = `/administration/custom-roles/${id}/update` }}
                        className={clsx('text-sm font-semibold hover:underline text-left', isSelected ? 'text-primary-700' : 'text-gray-900 hover:text-primary-600')}
                      >
                        {getName(role)}
                      </button>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <span className="text-sm text-gray-500 line-clamp-1">{getDesc(role) || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {tagList.length > 0
                          ? tagList.map(tag => <TagBadge key={tag}>{tag}</TagBadge>)
                          : <span className="text-sm text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                      <ThreeDotMenu label={t.customRoles.noActionsAvailable} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.admin.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{displayTotal === 0 ? '0-0' : `${startRow}-${endRow}`} of {displayTotal}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || displayTotal === 0 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {selectedIds.length > 1 ? t.customRoles.deleteBulkTitle.replace('{count}', String(selectedIds.length)) : t.customRoles.deleteRoleTitle}
              </h3>
              <p className="text-sm text-gray-500">{t.customRoles.deleteDesc} {t.customRoles.deleteCannotUndo}</p>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setDeleteModal(false)} className={clsx(cancelBtnCls, 'flex-1')}>{t.admin.cancel}</button>
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

function ThreeDotMenu({ label }: { label: string }) {
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
          <p className="px-4 py-2 text-xs text-gray-400">{label}</p>
        </div>
      )}
    </div>
  )
}

function TagBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-md">{children}</span>
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

export default function CustomRolesPage() {
  return (
    <Suspense>
      <CustomRolesContent />
    </Suspense>
  )
}
