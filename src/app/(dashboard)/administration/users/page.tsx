'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useOrgChange } from '@/hooks/useOrgChange'
import { userApi } from '@/lib/api/user.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, Trash2, Key, Ban, CheckCircle, MoreHorizontal, X, Users, Check, Plus, UserPlus } from 'lucide-react'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface UserItem {
  orgUserId: string
  userName?: string
  userEmail?: string; tmpUserEmail?: string
  tags?: string
  customRoleName?: string; customRoleId?: string
  rolesList?: string
  isOrgInitialUser?: string
  userStatus?: string
}

function isActive(status?: string) { return status?.toLowerCase() === 'active' }
function parseCsv(value?: string | null): string[] {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean)
}
function processUrl(url: string): string {
  if (!url) return url
  try {
    const parsed = new URL(url)
    parsed.host = window.location.host
    parsed.protocol = window.location.protocol
    return parsed.toString()
  } catch {
    const m = url.match(/^https?:\/\/[^/]+(\/.*)?$/)
    if (m) return window.location.origin + (m[1] ?? '')
  }
  return url
}

function UsersContent() {
  const { t } = useLang()
  const router = useRouter()
  const { selectedRowId, handleRowSelect } = useHighlightRow()

  const [users, setUsers] = useState<UserItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; userId?: string; userName?: string; bulk?: boolean }>({ open: false })
  const [resetLinkModal, setResetLinkModal] = useState<{ open: boolean; link?: string; loading?: boolean }>({ open: false })
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = async (currentPage: number, keyword: string = '') => {
    setLoading(true)
    try {
      const [usersRes, countRes] = await Promise.allSettled([
        userApi.getUsers({ offset: (currentPage - 1) * itemsPerPage, limit: itemsPerPage, fullTextSearch: keyword || undefined }),
        userApi.getUserCount({ fullTextSearch: keyword || undefined }),
      ])
      if (usersRes.status === 'rejected') throw usersRes.reason
      const raw = usersRes.value.data as any
      setUsers(Array.isArray(raw) ? raw : (raw?.users ?? raw?.data ?? []))
      const cnt = countRes.status === 'fulfilled' ? (countRes.value.data as any) : null
      setTotal(typeof cnt === 'number' ? cnt : (cnt?.count ?? 0))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.users.failedToLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers(page, appliedSearch) }, [page, itemsPerPage])
  useOrgChange(() => fetchUsers(1, ''))

  const handleSearchTrigger = () => {
    setAppliedSearch(searchTerm)
    setPage(1)
    fetchUsers(1, searchTerm)
  }

  const handleDisable = async (user: UserItem) => {
    try {
      await userApi.disableUserById(user.orgUserId)
      toast.success(`${user.userName} ${t.users.disabledSuccess}`)
      fetchUsers(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.users.failedToDisable
      toast.error(msg)
    }
  }

  const handleEnable = async (user: UserItem) => {
    try {
      await userApi.enableUserById(user.orgUserId)
      toast.success(`${user.userName} ${t.users.enabledSuccess}`)
      fetchUsers(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.users.failedToEnable
      toast.error(msg)
    }
  }

  const handleGetResetLink = async (userId: string) => {
    setResetLinkModal({ open: true, loading: true })
    try {
      const res = await userApi.getForgotPasswordLink(userId)
      const raw = (res.data as any)?.forgotPasswordUrl ?? (res.data as any)?.resetLink ?? ''
      setResetLinkModal({ open: true, link: raw ? processUrl(raw) : '' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.users.failedToGetResetLink)
      setResetLinkModal({ open: false })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (deleteModal.bulk) {
        for (const id of selectedIds) await userApi.deleteUserById(id)
        toast.success(t.users.deletedBulk.replace('{count}', String(selectedIds.length)))
        setSelectedIds([])
      } else {
        await userApi.deleteUserById(deleteModal.userId!)
        toast.success(t.users.deletedSingle)
      }
      setDeleteModal({ open: false })
      fetchUsers(page, appliedSearch)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.users.failedToDelete
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const q = appliedSearch.toLowerCase()
  const filteredUsers = q
    ? users.filter(u => (u.userName || '').toLowerCase().includes(q) || (u.userEmail || '').toLowerCase().includes(q) || (u.tags || '').toLowerCase().includes(q))
    : users
  const displayTotal = appliedSearch ? filteredUsers.length : total

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredUsers.map(u => u.orgUserId) : [])
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
          <h1 className="text-2xl font-bold text-gray-900">{t.users.title}</h1>
          <p className="text-base text-gray-500 mt-1">{t.users.subtitle}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-3 flex-none">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 sm:min-w-[140px]">
            <option>{t.admin.all}</option>
            <option>{t.users.fieldUsername}</option>
            <option>{t.users.fieldEmail}</option>
          </select>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
            placeholder={t.users.searchPlaceholder}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 sm:min-w-[220px]" />
          <button onClick={handleSearchTrigger}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button onClick={() => router.push('/administration/users/invite')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-sm transition-all hover:shadow-md">
            <UserPlus className="w-4 h-4" />{t.users.addUser}
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
                  <input type="checkbox" checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                    onChange={toggleAll} className="w-4 h-4 rounded accent-primary-600 cursor-pointer" />
                </th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colUsername}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colTags}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colCustomRole}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colRoles}</th>
                <th className="px-4 pb-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colInitialUser}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colStatus}</th>
                <th className="w-14 px-4 pb-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.users.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-20 text-center"><LoadingSpinner /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center">
                  <EmptyState icon={<Users className="w-7 h-7 text-gray-400" />} title={t.users.noUsersFound} subtitle={t.users.noUsersSubtitle} />
                </td></tr>
              ) : filteredUsers.map(user => {
                const tagList = parseCsv(user.tags)
                const roleList = parseCsv(user.rolesList)
                const active = isActive(user.userStatus)
                const isPending = user.userStatus?.toLowerCase() === 'pending'
                const isInitial = user.isOrgInitialUser === 'YES'
                const isSelected = selectedRowId === user.orgUserId
                const isOwner = user.rolesList?.includes('OWNER') ?? false
                const statusColor = user.userStatus?.toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  user.userStatus?.toLowerCase() === 'disabled' ? 'bg-gray-100 text-gray-500' :
                  user.userStatus?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                const initials = (user.userName || '?').slice(0, 2).toUpperCase()
                return (
                  <tr key={user.orgUserId} onClick={() => handleRowSelect(user.orgUserId)}
                    className={clsx('cursor-pointer transition-all',
                      isSelected ? '!bg-primary-100 shadow-sm' : 'bg-white shadow-sm hover:shadow-md hover:bg-amber-50/20')}>
                    <td className={clsx('pl-4 pr-2 py-3.5 rounded-l-xl border-l-[3px]', isSelected ? 'border-primary-500' : 'border-transparent')} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(user.orgUserId)} onChange={() => toggleOne(user.orgUserId)}
                        className="w-4 h-4 rounded accent-primary-600 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)), rgb(var(--color-primary-500)))' }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={e => { e.stopPropagation(); router.push(`/administration/users/${user.orgUserId}/update`) }}
                              className={clsx('text-sm font-semibold hover:underline text-left', isSelected ? 'text-primary-700' : 'text-gray-900 hover:text-primary-600')}>
                              {user.userName}
                            </button>
                            {isOwner && <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded font-semibold">Owner</span>}
                          </div>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{user.userEmail || user.tmpUserEmail || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {tagList.length ? tagList.map(tag => <TagBadge key={tag}>{tag}</TagBadge>) : <span className="text-sm text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{user.customRoleName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {roleList.length ? roleList.map(r => <span key={r} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary-600 text-white">{r}</span>) : <span className="text-sm text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isInitial ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-200 mx-auto" />}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('inline-flex px-2.5 py-1 rounded-full text-xs font-semibold', statusColor)}>
                        {user.userStatus || 'Active'}
                      </span>
                    </td>
                    <td className="px-2 pr-4 py-3.5 text-center rounded-r-xl" onClick={e => e.stopPropagation()}>
                      <RowActions items={[
                        { label: t.users.disableUser, icon: <Ban className="w-4 h-4" />, danger: true, disabled: isPending || !active, onClick: () => handleDisable(user) },
                        { label: t.users.enableUser, icon: <CheckCircle className="w-4 h-4" />, disabled: isPending || active, onClick: () => handleEnable(user) },
                        { label: t.users.resetPasswordLink, icon: <Key className="w-4 h-4" />, disabled: isPending || !active, onClick: () => handleGetResetLink(user.orgUserId) },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
      {deleteModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false })}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {deleteModal.bulk ? t.users.deleteBulkTitle.replace('{count}', String(selectedIds.length)) : t.users.deleteUserTitle}
              </h3>
              <p className="text-sm text-gray-500">
                {deleteModal.bulk
                  ? t.users.deleteBulkDesc.replace('{count}', String(selectedIds.length))
                  : <>{t.users.deleteSingleDesc} <span className="font-semibold text-gray-700">&ldquo;{deleteModal.userName}&rdquo;</span>?</>}
                {' '}{t.users.deleteCannotUndo}
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

      {/* Reset Link Modal */}
      {resetLinkModal.open && (
        <ResetLinkModal
          link={resetLinkModal.link}
          loading={resetLinkModal.loading}
          onClose={() => setResetLinkModal({ open: false })}
        />
      )}
    </div>
  )
}

function ResetLinkModal({ link, loading, onClose }: { link?: string; loading?: boolean; onClose: () => void }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-7 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-800)) 40%, rgb(var(--color-primary-500)) 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t.users.resetLinkTitle}</h2>
              <p className="text-xs text-orange-200 mt-0.5">{t.users.resetLinkSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-7 py-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{t.users.generatingLink}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
                <span className="flex-1 text-sm text-primary-800 break-all line-clamp-2 font-mono">{link}</span>
                <button
                  onClick={handleCopy}
                  className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', copied ? 'bg-green-100 text-green-700' : 'bg-white border border-primary-200 text-primary-600 hover:bg-primary-100')}
                >
                  {copied ? t.users.copied : t.users.copy}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">{t.users.resetLinkExpiry}</p>
            </>
          )}
        </div>
        <div className="flex justify-end px-7 pb-5">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{t.users.close}</button>
        </div>
      </div>
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
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
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

export default function UsersPage() {
  return (
    <Suspense>
      <UsersContent />
    </Suspense>
  )
}
