'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, ChevronRight, Search, ExternalLink, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

function getTimeFilter(tr: TimeRangeValue) {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { fromDate: new Date(tr.start * 1000).toISOString(), toDate: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  const startMs = unit === 'm' ? now - num * 60_000 : unit === 'h' ? now - num * 3_600_000 : now - num * 86_400_000
  return { fromDate: new Date(startMs).toISOString(), toDate: new Date(now).toISOString() }
}

const PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_PAGE_SIZE = 25
const HIGHLIGHTED_KEY = 'payInRequests_highlightedId'

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

function StatusBadge({ status, createdDate }: { status?: string | null; createdDate?: string | null }) {
  const s = (status || '').toLowerCase()
  if (s === 'paid') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      {status}
    </span>
  )
  if (s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {status}
    </span>
  )
  const age = formatAge(createdDate)
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
        {status ?? 'Pending'}
      </span>
      {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
    </div>
  )
}

function BankAccountCell({ item }: { item: PayInRequestItem }) {
  const isPromptPay = item.payinAccountType?.toLowerCase() === 'promptpay'
  return (
    <div>
      {item.payinBankCode || item.payinBankAccountNo ? (
        <p className="text-sm font-semibold text-gray-800">{[item.payinBankCode, item.payinBankAccountNo].filter(Boolean).join(' · ')}</p>
      ) : (
        <p className="text-sm text-gray-400">—</p>
      )}
      {item.payinBankAccountName && <p className="text-xs text-gray-500 mt-0.5">{item.payinBankAccountName}</p>}
      <div className="flex gap-1 mt-1 flex-wrap">
        {item.payinAccountType && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">{item.payinAccountType}</span>
        )}
        {isPromptPay && item.payinPromptPayId && (
          <span className="text-[10px] text-gray-500">{item.payinPromptPayId}</span>
        )}
      </div>
    </div>
  )
}

export default function PayInRequestsPage() {
  const { t } = useLang()
  const tr = t.payInRequest
  const router = useRouter()

  const [items, setItems] = useState<PayInRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inputSearch, setInputSearch] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [highlightedId, setHighlightedId] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' : ''
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = {
        fullTextSearch: search || undefined,
        status: status || undefined,
        direction: 'PayIn',
        ...getTimeFilter(timeRange),
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }
      const [listRes, countRes] = await Promise.allSettled([
        paymentRequestApi.getPayInRequests(payload),
        paymentRequestApi.getPayInRequestCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const d = listRes.value.data as any
        setItems(Array.isArray(d) ? d : (d?.paymentRequests ?? d?.items ?? []))
      }
      if (countRes.status === 'fulfilled') {
        const d = countRes.value.data as any
        setTotal(typeof d === 'number' ? d : (d?.count ?? 0))
      }
    } catch {
      toast.error(tr.noData)
    } finally {
      setLoading(false)
    }
  }, [search, status, timeRange, page, pageSize])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const handleSearch = () => {
    setSearch(inputSearch)
    setPage(1)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex-none">
        <h1 className="text-xl font-bold text-gray-900">{tr.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{tr.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center flex-none">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary-300 whitespace-nowrap flex-shrink-0">
            <option>{tr.searchField}</option>
          </select>
          <input
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tr.search}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-300"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
        >
          <option value="">{tr.statusAll}</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Error">Error</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
        <button onClick={() => { setPage(1); load() }} disabled={loading} title={tr.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">{tr.colDate}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{tr.colMerchant}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{tr.colAmount}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{tr.colBankAccount}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{tr.colStatus}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{tr.colRef1}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{tr.colRef2}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">{tr.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">{tr.noData}</td>
                </tr>
              ) : items.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowHighlight(item.id)}
                  className={clsx(
                    'cursor-pointer transition-colors',
                    highlightedId === item.id
                      ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                      : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                  )}
                >
                  <td
                    className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                    onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/payment/pay-in-requests/${item.id}`) }}
                  >
                    <div className="text-sm font-medium text-gray-700 group-hover:text-primary-600 group-hover:underline">{item.createdDate ? new Date(item.createdDate).toLocaleString('th-TH') : '—'}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">{item.refId || '—'}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-800">{item.merchantCode || '—'}</div>
                    <div className="text-xs text-gray-400">{item.merchantName || ''}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {item.generatedAmount != null ? Number(item.generatedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </div>
                    {item.requestedAmount != null && item.requestedAmount !== item.generatedAmount && (
                      <div className="text-xs text-gray-400">{Number(item.requestedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    )}
                    <div className="text-[10px] text-gray-400">{item.currency || 'THB'}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100"><BankAccountCell item={item} /></td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <StatusBadge status={item.status} createdDate={item.createdDate} />
                    {item.status?.toLowerCase() === 'paid' && item.paymentTxId && (
                      <a
                        href={`/payment/pay-in-transactions/${item.paymentTxId}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline mt-1"
                      >
                        <span className="truncate max-w-[130px]">{item.paymentTxId}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100"><span className="text-sm text-gray-600">{item.refId1 || '—'}</span></td>
                  <td className="px-4 py-3 border-b border-gray-100"><span className="text-sm text-gray-600">{item.refId2 || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-none">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{total}</span> {tr.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${rangeStart}-${rangeEnd}`} of {total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
