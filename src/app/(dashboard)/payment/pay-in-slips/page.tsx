'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentSlipApi } from '@/lib/api/payment-slip.api'
import type { PayInSlipItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Loader2, Upload, ChevronLeft, ChevronRight, Search, RefreshCw, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

const PAGE_SIZE_OPTIONS = [25, 50, 100]
const DEFAULT_PAGE_SIZE = 25
const HIGHLIGHTED_KEY = 'payInSlip_highlightedId'

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
      {status}
    </span>
  )
  if (s === 'rejected') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
      {status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
      {status ?? 'Pending'}
    </span>
  )
}

export default function PayInSlipsPage() {
  const { t } = useLang()
  const tr = t.payInSlip
  const router = useRouter()

  const [items, setItems] = useState<PayInSlipItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [inputSearch, setInputSearch] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [highlightedId, setHighlightedId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(HIGHLIGHTED_KEY) ?? ''
    }
    return ''
  })

  const load = useCallback(async (currentPage: number, limit: number, q: string, st: string) => {
    setLoading(true)
    try {
      const payload = {
        fullTextSearch: q.trim() || undefined,
        status: st || undefined,
        direction: 'PayIn',
        offset: (currentPage - 1) * limit,
        limit,
      }
      const [listRes, countRes] = await Promise.allSettled([
        paymentSlipApi.getPayInDocuments(payload),
        paymentSlipApi.getPayInDocumentCount(payload),
      ])
      if (listRes.status === 'fulfilled') {
        const d = listRes.value.data as any
        setItems(Array.isArray(d) ? d : (d?.payInDocuments ?? d?.items ?? []))
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
  }, [tr.noData])

  useEffect(() => { load(1, DEFAULT_PAGE_SIZE, '', '') }, [])

  const handleSearch = () => {
    setSearch(inputSearch)
    setPage(1)
    load(1, pageSize, inputSearch, status)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  const handleNavigate = (id: string) => {
    handleRowHighlight(id)
    router.push(`/payment/pay-in-slips/${id}`)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-none">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tr.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tr.subtitle}</p>
        </div>
        <button onClick={() => router.push('/payment/pay-in-slips/upload')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
          <Upload className="w-4 h-4" />
          {tr.uploadBtn}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center flex-none">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={inputSearch}
            onChange={e => setInputSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={tr.search}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button onClick={handleSearch} disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60">
          <Search className="w-4 h-4" />
        </button>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); load(1, pageSize, search, e.target.value) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">{tr.filterAll}</option>
          <option value="Pending">{tr.filterPending}</option>
          <option value="Approved">{tr.filterApproved}</option>
          <option value="Rejected">{tr.filterRejected}</option>
        </select>
        <button onClick={() => { setPage(1); load(1, pageSize, search, status) }} disabled={loading} title={tr.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="border-separate border-spacing-0 table-fixed min-w-[800px] w-full text-sm">
            <colgroup>
              <col className="w-[160px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[200px]" />
              <col className="w-[160px]" />
              <col className="w-[160px]" />
            </colgroup>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">{tr.colRefId}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">{tr.colMerchant}</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">{tr.colAmount}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">{tr.colBankAccount}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">{tr.colStatus}</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 whitespace-nowrap">{tr.colCreatedDate}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">{t.common.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">{tr.noData}</td></tr>
              ) : items.map((item, idx) => {
                const isHighlighted = highlightedId === item.id
                return (
                  <tr
                    key={item.id}
                    onClick={() => handleRowHighlight(item.id)}
                    className={clsx(
                      'cursor-pointer transition-colors',
                      isHighlighted
                        ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                    )}
                  >
                    {/* Ref ID — click navigates to detail */}
                    <td
                      className="px-4 py-3 border-b border-gray-100 overflow-hidden cursor-pointer group"
                      onClick={e => { e.stopPropagation(); handleNavigate(item.id) }}
                    >
                      <span className="text-sm text-gray-800 truncate block group-hover:text-primary-600 group-hover:underline">
                        {item.refId ?? '—'}
                      </span>
                    </td>

                    {/* Merchant */}
                    <td className="px-4 py-3 border-b border-gray-100 overflow-hidden">
                      <div className="text-sm font-semibold text-gray-800 truncate">{item.merchantCode || '—'}</div>
                      {item.merchantName && <div className="text-xs text-gray-400 truncate">{item.merchantName}</div>}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 border-b border-gray-100 text-right">
                      <div className="text-sm font-semibold tabular-nums text-gray-800">
                        {item.txAmountDecimal != null
                          ? Number(item.txAmountDecimal).toLocaleString('en-US', { minimumFractionDigits: 2 })
                          : '—'}
                      </div>
                      <div className="text-[10px] text-gray-400">{item.currency || 'THB'}</div>
                    </td>

                    {/* Bank Account */}
                    <td className="px-4 py-3 border-b border-gray-100 overflow-hidden">
                      <div className="text-sm font-semibold text-gray-800 truncate">
                        {[item.payInBankCode, item.payInBankAccountNo].filter(Boolean).join(' · ') || '—'}
                      </div>
                      {item.payInBankAccountName && (
                        <div className="text-xs text-gray-500 truncate">{item.payInBankAccountName}</div>
                      )}
                      {(item.payInAccountType || item.payInPromptPayId) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.payInAccountType && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
                              {item.payInAccountType}
                            </span>
                          )}
                          {item.payInAccountType?.toLowerCase() === 'promptpay' && item.payInPromptPayId && (
                            <span className="text-[10px] text-gray-500">{item.payInPromptPayId}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 border-b border-gray-100">
                      <StatusBadge status={item.status} />
                      {item.status?.toLowerCase() === 'approved' && item.paymentTransactionId && (
                        <a
                          href={`/payment/pay-in-transactions/${item.paymentTransactionId}`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 mt-1 text-[11px] text-primary-600 hover:text-primary-800 hover:underline"
                        >
                          <span className="truncate max-w-[120px]">{item.paymentTransactionId}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      )}
                      {item.rejectReason && (
                        <p className="text-[11px] text-red-500 mt-1 truncate max-w-[140px]" title={item.rejectReason ?? undefined}>
                          {item.rejectReason}
                        </p>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {item.createdDate ? new Date(item.createdDate).toLocaleString('th-TH') : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-none">
          <span className="text-sm text-gray-500">
            <span className="font-bold text-gray-800">{total.toLocaleString()}</span> {tr.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select value={pageSize} onChange={e => {
                const n = Number(e.target.value); setPageSize(n); setPage(1); load(1, n, search, status)
              }} className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setPage(p => p - 1); load(page - 1, pageSize, search, status) }}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => { setPage(p => p + 1); load(page + 1, pageSize, search, status) }}
                  disabled={page >= totalPages || total === 0 || loading}
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
