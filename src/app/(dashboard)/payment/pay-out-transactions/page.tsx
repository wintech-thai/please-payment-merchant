'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrgChange } from '@/hooks/useOrgChange'
import { useLang } from '@/context/LanguageContext'
import { paymentTxApi } from '@/lib/api/payment-tx.api'
import type { PayOutTxItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, TriangleAlert } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import AuditNoticeDrawer from '@/components/AuditNoticeDrawer'

const HIGHLIGHTED_KEY = 'payOutTransactions_highlightedId'
const FILTER_KEY = 'merchantPayOutTx_filter'

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { fromDate: new Date(tr.start * 1000).toISOString(), toDate: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  const startMs = unit === 'm' ? now - num * 60_000 : unit === 'h' ? now - num * 3_600_000 : now - num * 86_400_000
  return { fromDate: new Date(startMs).toISOString(), toDate: new Date(now).toISOString() }
}

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

function formatAge(createdDate?: string | null): string {
  if (!createdDate) return ''
  const diffMs = Date.now() - new Date(createdDate).getTime()
  if (diffMs < 0) return ''
  const totalMin = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}min`
  return `${hours}h ${mins}min`
}

function StatusBadge({ status, createdDate, statusReason, isPeerToPeer }: {
  status?: string | null
  createdDate?: string | null
  statusReason?: string | null
  isPeerToPeer?: boolean | null
}) {
  const s = status?.toLowerCase()
  const badgeEl = s === 'completed' || s === 'success' || s === 'paid' || s === 'approved' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{status}
    </span>
  ) : s === 'failed' || s === 'error' || s === 'rejected' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{status}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{status ?? '—'}
    </span>
  )
  const age = (s === 'pending' || s === 'processing') ? formatAge(createdDate) : null

  return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1">
        {badgeEl}
        {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
      </div>
      {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
      {(s === 'failed' || s === 'error' || s === 'rejected') && statusReason && (
        <span className="text-[11px] text-red-500 ml-1 truncate max-w-[140px]" title={statusReason}>{statusReason}</span>
      )}
    </div>
  )
}

export default function PayOutTransactionsPage() {
  const { t } = useLang()
  const m = t.payOutTx
  const router = useRouter()

  const [inputSearch, setInputSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [statusFilter, setStatusFilter] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.statusFilter ?? '') : ''
  )
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.timeRange ?? { type: 'relative', value: '30d' }) : { type: 'relative', value: '30d' }
  )
  const [items, setItems] = useState<PayOutTxItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [noticeTarget, setNoticeTarget] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' : ''
  )

  const load = useCallback(async (currentPage: number, limit: number, tr: TimeRangeValue, q: string, status: string) => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search: q, statusFilter: status, timeRange: tr }))
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: Record<string, unknown> = { offset: (currentPage - 1) * limit, limit, fromDate, toDate }
      if (q.trim()) payload.fullTextSearch = q.trim()
      if (status) payload.status = status

      const [listRes, countRes] = await Promise.allSettled([
        paymentTxApi.getPayOutTransactions(payload as any),
        paymentTxApi.getPayOutTransactionCount(payload as any),
      ])

      if (listRes.status === 'rejected') throw listRes.reason
      const d = listRes.value.data as any
      setItems(Array.isArray(d) ? d : (d?.payOutTransactions ?? d?.payInTransactions ?? d?.items ?? []))
      if (countRes.status === 'fulfilled') {
        const cd = countRes.value.data as any
        setTotal(typeof cd === 'number' ? cd : (cd?.count ?? 0))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.noData)
    } finally {
      setLoading(false)
    }
  }, [m.noData])

  useEffect(() => { load(1, itemsPerPage, timeRange, search, statusFilter) }, [])
  useOrgChange(() => load(1, itemsPerPage, timeRange, search, statusFilter))

  const handleSearch = () => {
    setSearch(inputSearch)
    setPage(1)
    load(1, itemsPerPage, timeRange, inputSearch, statusFilter)
  }

  const handleRefresh = () => {
    setPage(1)
    load(1, itemsPerPage, timeRange, search, statusFilter)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    load(1, itemsPerPage, tr, search, statusFilter)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  const cols = [m.colDate, m.colAmount, m.colFee, m.colDestBank, m.colSourceBank, m.colStatus, 'REF']

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-none">
        <h1 className="text-xl font-bold text-gray-900">{m.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex-none bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option>{m.searchField}</option>
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={m.search}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button onClick={handleSearch} disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60">
          <Search className="w-4 h-4" />
        </button>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); load(1, itemsPerPage, timeRange, search, e.target.value) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{m.statusAll}</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Failed">Failed</option>
          <option value="Error">Error</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
        <button onClick={handleRefresh} disabled={loading} title={m.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th key={col} className={clsx(
                    'px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                    (i === 1 || i === 2) ? 'text-right' : 'text-left'
                  )}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-400">{t.admin.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={cols.length} className="px-4 py-16 text-center">
                  <p className="text-sm font-semibold text-gray-500">{m.noData}</p>
                </td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id}
                  onClick={() => handleRowHighlight(item.id)}
                  className={clsx(
                    'cursor-pointer transition-colors',
                    highlightedId === item.id
                      ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                      : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                  )}>
                  {/* Date */}
                  <td
                    className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                    onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/payment/pay-out-transactions/${item.id}`) }}
                  >
                    <span className="text-sm text-gray-600 group-hover:text-primary-600 group-hover:underline">{formatDateTime(item.createdDate)}</span>
                    {item.refId1 && <p className="text-xs text-gray-400 mt-0.5">{item.refId1}</p>}
                  </td>
                  {/* Amount */}
                  <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-800 tabular-nums">
                      {formatAmount(item.txAmountDecimal ?? item.txAmount)}
                    </p>
                    <p className="text-xs text-gray-400">{item.currency ?? '—'}</p>
                  </td>
                  {/* Fee */}
                  <td className="px-4 py-3 border-b border-gray-100 text-right whitespace-nowrap">
                    {item.payoutFeeDecimal != null && item.payoutFeeDecimal > 0 ? (
                      <>
                        <p className="text-sm font-semibold tabular-nums text-gray-800">{formatAmount(item.payoutFeeDecimal)}</p>
                        {(() => { const pct = item.payOutFeePct ?? item.payoutFeePct; return pct != null && pct > 0 ? <p className="text-xs text-gray-400">{pct}%</p> : null })()}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">—</p>
                    )}
                    {item.payoutFeePayer && (
                      <span className={clsx(
                        'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full ring-1 mt-0.5',
                        item.payoutFeePayer.toLowerCase() === 'merchant'
                          ? 'bg-blue-50 text-blue-700 ring-blue-200'
                          : 'bg-orange-50 text-orange-700 ring-orange-200'
                      )}>
                        {item.payoutFeePayer}
                      </span>
                    )}
                  </td>
                  {/* Dest Bank */}
                  <td className="px-4 py-3 border-b border-gray-100 min-w-[180px]">
                    {item.payInBankCode || item.payInBankAccountNo ? (
                      <p className="text-sm font-semibold text-gray-800">
                        {[item.payInBankCode, item.payInBankAccountNo].filter(Boolean).join(' · ')}
                      </p>
                    ) : <p className="text-sm text-gray-400">—</p>}
                    {item.payInBankAccountName && <p className="text-xs text-gray-500 mt-0.5">{item.payInBankAccountName}</p>}
                    {item.payInPromptPayId && (
                      <div className="flex gap-1 mt-1">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">PromptPay</span>
                        <span className="text-[10px] text-gray-500">{item.payInPromptPayId}</span>
                      </div>
                    )}
                  </td>
                  {/* Source Bank */}
                  <td className="px-4 py-3 border-b border-gray-100 min-w-[160px]">
                    {(() => {
                      const isKnown = (v?: string | null) => v && v.toUpperCase() !== 'UNKNOWN'
                      const code = isKnown(item.payOutBankCode) ? item.payOutBankCode : null
                      const acctNo = isKnown(item.payOutBankAccountNo) ? item.payOutBankAccountNo : null
                      const acctName = isKnown(item.payOutBankAccountName) ? item.payOutBankAccountName : null
                      const promptPay = item.payOutPromptPayId
                      if (!code && !acctNo) return <p className="text-sm text-gray-400">—</p>
                      return (
                        <>
                          <p className="text-sm font-semibold text-gray-800">
                            {[code, acctNo].filter(Boolean).join(' · ')}
                          </p>
                          {acctName && <p className="text-xs text-gray-500 mt-0.5">{acctName}</p>}
                          {promptPay && (
                            <div className="flex gap-1 mt-1">
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">PromptPay</span>
                              <span className="text-[10px] text-gray-500">{promptPay}</span>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={item.status} createdDate={item.createdDate} statusReason={item.statusReason} isPeerToPeer={item.txIsPeerToPeer} />
                      {(item.noticeCount ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setNoticeTarget(item.id) }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
                        >
                          <TriangleAlert className="w-3 h-3" />
                          {item.noticeCount}
                        </button>
                      )}
                    </div>
                  </td>
                  {/* REF */}
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="flex flex-col gap-0.5">
                      {item.refId1 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId1}</span> : null}
                      {item.refId2 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId2}</span> : null}
                      {item.refId3 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId3}</span> : null}
                      {!item.refId1 && !item.refId2 && !item.refId3 && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-none">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{total}</span> {m.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select value={itemsPerPage} onChange={e => {
                const n = Number(e.target.value); setItemsPerPage(n); setPage(1); load(1, n, timeRange, search, statusFilter)
              }} className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
                {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setPage(p => p - 1); load(page - 1, itemsPerPage, timeRange, search, statusFilter) }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1, itemsPerPage, timeRange, search, statusFilter) }}
                  disabled={page >= totalPages || total === 0 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {noticeTarget && <AuditNoticeDrawer rowId={noticeTarget} onClose={() => setNoticeTarget(null)} />}
    </div>
  )
}
