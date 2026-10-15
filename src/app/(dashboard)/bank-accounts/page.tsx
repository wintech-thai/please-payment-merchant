'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, MoreHorizontal, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatRange(min?: number | null, max?: number | null) {
  if (min == null && max == null) return '—'
  if (min != null && max != null) return `${fmtNum(min)} - ${fmtNum(max)}`
  if (min != null) return `${fmtNum(min)} -`
  return `- ${fmtNum(max!)}`
}

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

function BankAccountsPageInner() {
  const { t } = useLang()
  const m = t.bankAccount
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [accounts, setAccounts] = useState<BankAccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('bank_account_highlight')
    return null
  })
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    bankAccountApi.getMyBankAccounts()
      .then(res => setAccounts(res.data.bankAccounts))
      .catch(() => toast.error(m.failedToLoad))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`bank-account-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!openActionId) return
      const ref = menuRefs.current[openActionId]
      if (ref && !ref.contains(e.target as Node)) setOpenActionId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openActionId])

  const filtered = accounts.filter(a => {
    const matchesSearch = !search.trim() ||
      (a.accountName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.accountNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.bankCode ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || a.accountType === filterType
    const matchesLevel = !filterLevel || a.accountLevel === filterLevel
    return matchesSearch && matchesType && matchesLevel
  })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const paged = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const cols = [m.colBank, m.colAccountNumber, m.colAccountName, m.colPromptPayId, m.colAccountType, m.colAccountLevel, m.colPayInRange, m.colDailyQuota, m.colStatus, m.colBalance, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
        </div>
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
          <option value="Native">{m.accountTypeNative}</option>
          <option value="PromptPay">{m.accountTypePromptPay}</option>
        </select>
        <select
          value={filterLevel}
          onChange={e => { setFilterLevel(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
        >
          <option value="">{m.filterAllLevels}</option>
          <option value="Global">{m.accountLevelGlobal}</option>
          <option value="Selected">{m.accountLevelSelected}</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
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
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">{m.noAccountsFound}</div>
        ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[1300px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === cols.length - 2 ? 'text-right' : 'text-left',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl',
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(acc => {
                const rowId = acc.bankAccountId ?? acc.accountId
                const highlighted = !!rowId && selectedRowId === rowId
                return (
                  <tr
                    key={rowId}
                    id={`bank-account-row-${rowId}`}
                    onClick={() => {
                      const next = selectedRowId === rowId ? null : rowId
                      setSelectedRowId(next)
                      if (next) sessionStorage.setItem('bank_account_highlight', next)
                      else sessionStorage.removeItem('bank_account_highlight')
                    }}
                    className={clsx('cursor-pointer transition-colors', highlighted ? 'bg-primary-50' : 'hover:bg-gray-50')}
                  >
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <Link
                        href={`/bank-accounts/${rowId}`}
                        onClick={e => { e.stopPropagation(); sessionStorage.setItem('bank_account_highlight', rowId) }}
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
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-gray-500">
                      {acc.promptPayId ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm whitespace-nowrap">
                      <span className="text-gray-600">{acc.accountType ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap">
                      {acc.accountLevel ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700 whitespace-nowrap tabular-nums">
                      {formatRange(acc.payinMinAmount, acc.payinMaxAmount)}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700 whitespace-nowrap tabular-nums">
                      {acc.dailyQuota != null ? fmtNum(acc.dailyQuota) : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <StatusBadge status={acc.status} />
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm whitespace-nowrap text-right">
                      {acc.currentBalanceDecimal != null || acc.currentBalance != null || acc.currentWalletBalanceDecimal != null || acc.currentWalletBalance != null ? (
                        <Link
                          href={`/bank-accounts/${rowId}/wallet`}
                          onClick={e => { e.stopPropagation(); sessionStorage.setItem('bank_account_highlight', rowId) }}
                          className="tabular-nums text-gray-700 hover:underline hover:text-primary-600"
                        >
                          {(acc.currentBalanceDecimal ?? acc.currentBalance ?? acc.currentWalletBalanceDecimal ?? acc.currentWalletBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="relative" ref={el => { menuRefs.current[rowId] = el }}>
                        <button
                          onClick={() => setOpenActionId(prev => prev === rowId ? null : rowId)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openActionId === rowId && (
                          <div className="absolute right-0 top-9 z-50 w-48 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden">
                            <button
                              onClick={() => { setOpenActionId(null); sessionStorage.setItem('bank_account_highlight', rowId); router.push(`/bank-accounts/${rowId}/wallet`) }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Wallet className="w-4 h-4 flex-shrink-0" />
                              {m.txSummaryAction}
                            </button>
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

export default function BankAccountsPage() {
  return (
    <Suspense>
      <BankAccountsPageInner />
    </Suspense>
  )
}
