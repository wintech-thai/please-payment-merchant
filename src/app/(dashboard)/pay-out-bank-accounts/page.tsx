'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname } from 'next/navigation'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, Plus, ChevronLeft, ChevronRight, MoreHorizontal, Ban, CheckCircle, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const HIGHLIGHT_KEY = 'payout_bank_account_highlight'

function StatusBadge({ status }: { status?: string | null }) {
  const lower = status?.toLowerCase()
  const cfg =
    lower === 'active'
      ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
      : lower === 'pending'
        ? { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' }
        : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {status ?? '—'}
    </span>
  )
}

function ConfirmDialog({ title, accountName, desc, confirmLabel, onConfirm, onCancel }: {
  title: string; accountName?: string; desc: string; confirmLabel: string
  onConfirm: () => void; onCancel: () => void
}) {
  const { t } = useLang()
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }}>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        {accountName && <p className="text-sm font-semibold text-white/90 mb-2">&ldquo;{accountName}&rdquo;</p>}
        <p className="text-sm text-white/60 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {t.admin.cancel}
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors uppercase">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ bulk, count, accountName, onConfirm, onCancel, deleting }: {
  bulk?: boolean; count?: number; accountName?: string
  onConfirm: () => void; onCancel: () => void; deleting: boolean
}) {
  const { t } = useLang()
  const m = { ...t.bankAccount, ...t.payOutBankAccount }
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden text-center px-8 py-8" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-900)) 100%)' }} onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
          <Trash2 className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {bulk ? m.deleteBulkTitle.replace('{count}', String(count)) : m.deleteTitle}
        </h3>
        <p className="text-sm text-white/60 mb-7">
          {bulk
            ? m.deleteBulkDesc.replace('{count}', String(count))
            : <>{m.deleteSingleDesc} <span className="font-semibold text-white/90">&ldquo;{accountName}&rdquo;</span>?</>}
          {' '}{m.deleteCannotUndo}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors uppercase">
            {t.admin.cancel}
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600/80 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors uppercase">
            {deleting ? t.admin.deleting : t.admin.delete}
          </button>
        </div>
      </div>
    </div>
  )
}

function isAccountActive(status: string | null | undefined): boolean {
  if (!status) return true
  return status.toLowerCase() === 'active'
}

function PayOutBankAccountsPageInner() {
  const { t } = useLang()
  const m = { ...t.bankAccount, ...t.payOutBankAccount }
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [accounts, setAccounts] = useState<BankAccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem(HIGHLIGHT_KEY)
    return null
  })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'enable' | 'disable'; account: BankAccountItem } | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; accountId?: string; accountName?: string; bulk?: boolean }>({ open: false })
  const [deleting, setDeleting] = useState(false)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openMenuId) {
        const ref = menuRefs.current[openMenuId]
        if (ref && !ref.contains(e.target as Node)) setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuId])

  const fetchAccounts = () => {
    setLoading(true)
    bankAccountApi.getMyPayOutBankAccounts()
      .then(res => setAccounts(res.data.bankAccounts))
      .catch(() => toast.error(m.failedToLoad))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAccounts() }, [])

  const handleToggleActive = async (account: BankAccountItem) => {
    const rowId = account.bankAccountId ?? account.accountId
    const active = isAccountActive(account.status)
    const name = account.accountName || account.accountNumber || rowId.slice(0, 8)
    try {
      if (active) {
        await bankAccountApi.disablePayOutBankAccountById(rowId)
        toast.success(`"${name}" ${m.disabledSuccess}`)
      } else {
        await bankAccountApi.enablePayOutBankAccountById(rowId)
        toast.success(`"${name}" ${m.enabledSuccess}`)
      }
      fetchAccounts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (active ? m.failedToDisable : m.failedToEnable))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (deleteModal.bulk) {
        for (const id of selectedIds) await bankAccountApi.deletePayOutBankAccountById(id)
        toast.success(m.deletedBulk.replace('{count}', String(selectedIds.length)))
        setSelectedIds([])
      } else {
        await bankAccountApi.deletePayOutBankAccountById(deleteModal.accountId!)
        toast.success(m.deletedSingle)
      }
      setDeleteModal({ open: false })
      fetchAccounts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failedToDelete)
    } finally {
      setDeleting(false)
    }
  }

  const toggleOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    sessionStorage.setItem(HIGHLIGHT_KEY, highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`payout-bank-account-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  const filtered = accounts.filter(a => {
    if (filterType && a.accountType !== filterType) return false
    if (filterLevel && a.accountLevel !== filterLevel) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (a.accountName ?? '').toLowerCase().includes(q) ||
      (a.accountNumber ?? '').toLowerCase().includes(q) ||
      (a.bankCode ?? '').toLowerCase().includes(q)
  })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const paged = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const cols = ['', m.colBank, m.colAccountNumber, m.colAccountName, m.colAccountType, m.colAccountLevel, m.colStatus, m.colBalance, m.colAction]
  const balanceColIndex = 7

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.type === 'enable' ? m.confirmEnableTitle : m.confirmDisableTitle}
          accountName={confirmDialog.account.accountName || confirmDialog.account.accountNumber || ''}
          desc={confirmDialog.type === 'enable' ? m.confirmEnableDesc : m.confirmDisableDesc}
          confirmLabel={t.admin.yes}
          onConfirm={() => { handleToggleActive(confirmDialog.account); setConfirmDialog(null) }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {deleteModal.open && (
        <DeleteModal
          bulk={deleteModal.bulk}
          count={selectedIds.length}
          accountName={deleteModal.accountName}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal({ open: false })}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
        <Link
          href="/pay-out-bank-accounts/add"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {m.addAccount}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex-none flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-56 max-w-xs bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={m.searchPlaceholder}
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
        >
          <option value="">{m.filterAllTypes}</option>
          <option value="Native">Native</option>
          <option value="PromptPay">PromptPay</option>
        </select>
        <select
          value={filterLevel}
          onChange={e => { setFilterLevel(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
        >
          <option value="">{m.filterAllLevels}</option>
          <option value="Selected">Selected</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
        <button
          onClick={() => setDeleteModal({ open: true, bulk: true })}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.admin.delete} {selectedIds.length > 0 && `(${selectedIds.length})`}
        </button>
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        {!loading && (
          <div className="flex-none px-4 pt-3 pb-1">
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{total}</span> {m.title}
            </span>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.admin.loading}
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm gap-1">
            <span>{m.noAccountsFound}</span>
            <span className="text-xs text-gray-300">{m.noAccountsSubtitle}</span>
          </div>
        ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === cols.length - 1 || i === balanceColIndex ? 'text-right' : 'text-left',
                      i === 0 && 'rounded-tl-xl w-12',
                      i === cols.length - 1 && 'rounded-tr-xl',
                    )}
                  >
                    {i === 0 ? null : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((acc, idx) => {
                const rowId = acc.bankAccountId ?? acc.accountId
                const highlighted = !!rowId && selectedRowId === rowId
                return (
                  <tr
                    key={rowId}
                    id={`payout-bank-account-row-${rowId}`}
                    onClick={() => {
                      const next = selectedRowId === rowId ? null : rowId
                      setSelectedRowId(next)
                      if (next) sessionStorage.setItem(HIGHLIGHT_KEY, next)
                      else sessionStorage.removeItem(HIGHLIGHT_KEY)
                    }}
                    className={clsx(
                      'cursor-pointer transition-colors',
                      highlighted
                        ? 'bg-primary-100'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                    )}
                  >
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(rowId)}
                        onChange={() => toggleOne(rowId)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <Link
                        href={`/pay-out-bank-accounts/${rowId}/update`}
                        onClick={e => { e.stopPropagation(); sessionStorage.setItem(HIGHLIGHT_KEY, rowId) }}
                        className={clsx('font-semibold text-sm hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800 hover:text-primary-600')}
                      >
                        {acc.bankName || acc.bankCode || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-gray-600 whitespace-nowrap text-sm">
                      {acc.accountNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-gray-700">
                      {acc.accountName ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm whitespace-nowrap">
                      <span className="text-gray-600">{acc.accountType ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                      {acc.accountLevel ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <StatusBadge status={acc.status} />
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm whitespace-nowrap text-right">
                      {acc.currentWalletBalanceDecimal != null || acc.currentWalletBalance != null ? (
                        <span className="tabular-nums text-gray-700">
                          {(acc.currentWalletBalanceDecimal ?? acc.currentWalletBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                      <div className="relative inline-block" ref={el => { menuRefs.current[rowId] = el }}>
                        <button
                          onClick={e => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const spaceBelow = window.innerHeight - rect.bottom
                            const right = window.innerWidth - rect.right
                            if (spaceBelow < 120) {
                              setMenuPos({ bottom: window.innerHeight - rect.top + 4, right })
                            } else {
                              setMenuPos({ top: rect.bottom + 4, right })
                            }
                            setOpenMenuId(prev => prev === rowId ? null : rowId)
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenuId === rowId && (
                          <div className="fixed w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-[9999]"
                            style={{ top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }}>
                            {isAccountActive(acc.status) ? (
                              <button
                                onClick={() => { setOpenMenuId(null); setConfirmDialog({ type: 'disable', account: acc }) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Ban className="w-4 h-4 flex-shrink-0" />
                                {m.disableAction}
                              </button>
                            ) : (
                              <button
                                onClick={() => { setOpenMenuId(null); setConfirmDialog({ type: 'enable', account: acc }) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                {m.enableAction}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination Footer */}
        {!loading && total > 0 && (
          <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{m.rowsPerPage}</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PayOutBankAccountsPage() {
  return (
    <Suspense>
      <PayOutBankAccountsPageInner />
    </Suspense>
  )
}
