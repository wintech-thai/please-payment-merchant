'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrgChange } from '@/hooks/useOrgChange'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayOutRequestItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
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
const HIGHLIGHTED_KEY = 'payOutRequests_highlightedId'

function AccountTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null
  return (
    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
      {type}
    </span>
  )
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = (status || '').toLowerCase()
  const map: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  const dot: Record<string, string> = {
    paid: 'bg-green-500', approved: 'bg-green-500',
    pending: 'bg-amber-500',
    rejected: 'bg-red-500', failed: 'bg-red-500',
    cancelled: 'bg-gray-400',
  }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', map[s] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot[s] ?? 'bg-gray-400')} />
      {status || '—'}
    </span>
  )
}

export default function PayOutRequestsPage() {
  const { t } = useLang()
  const tr = t.payOutRequest
  const router = useRouter()

  const [items, setItems] = useState<PayOutRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inputSearch, setInputSearch] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item?: PayOutRequestItem }>({ open: false })
  const [highlightedId, setHighlightedId] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' : ''
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const payload = {
        fullTextSearch: search || undefined,
        status: status || undefined,
        direction: 'PayOut',
        ...getTimeFilter(timeRange),
        offset: (page - 1) * pageSize,
        limit: pageSize,
      }
      const [listRes, countRes] = await Promise.allSettled([
        paymentRequestApi.getPayOutRequests(payload),
        paymentRequestApi.getPayOutRequestCount(payload),
      ])
      if (listRes.status === 'rejected') throw listRes.reason
      const d = listRes.value.data as any
      const raw: any[] = Array.isArray(d) ? d : (d?.paymentRequests ?? d?.items ?? [])
      setItems(raw.map((item: any) => ({
        ...item,
        isPayInBankAccountOverride: item.isPayInBankAccountOverride ?? item.isPayinBankAccountOverride ?? false,
      })))
      if (countRes.status === 'fulfilled') {
        const d = countRes.value.data as any
        setTotal(typeof d === 'number' ? d : (d?.count ?? 0))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tr.failedToLoad)
    } finally {
      setLoading(false)
    }
  }, [search, status, timeRange, page, pageSize, refreshKey])

  useEffect(() => { load() }, [load])
  useOrgChange(() => setRefreshKey(k => k + 1))

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
  }

  const handleRowHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem(HIGHLIGHTED_KEY, id)
  }

  function handleDelete(e: React.MouseEvent, item: PayOutRequestItem) {
    e.stopPropagation()
    if (item.status?.toLowerCase() !== 'pending') return
    setDeleteModal({ open: true, item })
  }

  async function confirmDelete() {
    if (!deleteModal.item) return
    setDeletingId(deleteModal.item.id)
    setDeleteModal({ open: false })
    try {
      await paymentRequestApi.deletePayOutRequestById(deleteModal.item.id)
      toast.success(tr.toastDeleteSuccess)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tr.toastDeleteFailed)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-none">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tr.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tr.subtitle}</p>
        </div>
        <button onClick={() => router.push('/payment/pay-out-requests/add')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition">
          <Plus className="w-4 h-4" />{tr.addBtn}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center flex-none">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary-300 flex-shrink-0">
            <option>{tr.searchField}</option>
          </select>
          <input value={inputSearch} onChange={e => setInputSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(inputSearch); setPage(1) } }}
            placeholder={tr.search}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-300"
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
          <option value="">{tr.statusAll}</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
          <option value="Paid">Paid</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
        <button onClick={() => { setSearch(inputSearch); setPage(1); setRefreshKey(k => k + 1) }} disabled={loading} title={tr.refresh}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colDate}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colMerchant}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colAmount}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colFee}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colDestBank}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colSourceBank}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colStatus}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colRefId1}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{tr.colRefId2}</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">{t.common.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-16 text-center text-sm text-gray-400">{tr.noData}</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id}
                  onClick={() => handleRowHighlight(item.id)}
                  className={clsx(
                    'cursor-pointer transition-colors',
                    highlightedId === item.id
                      ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                      : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                  )}>
                  <td
                    className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer group"
                    onClick={e => { e.stopPropagation(); handleRowHighlight(item.id); router.push(`/payment/pay-out-requests/${item.id}`) }}
                  >
                    <div className="text-sm font-medium text-gray-700 group-hover:text-primary-600 group-hover:underline">{item.createdDate ? new Date(item.createdDate).toLocaleString('th-TH') : '—'}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">{item.refId || '—'}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-800">{item.merchantCode || '—'}</div>
                    <div className="text-xs text-gray-400">{item.merchantName || ''}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {item.requestedAmount != null ? Number(item.requestedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'}
                    </div>
                    <div className="text-[10px] text-gray-400">{item.currency || 'THB'}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right text-sm font-semibold text-gray-800">
                    {item.payoutFeeDecimal != null ? Number(item.payoutFeeDecimal).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'}
                    {item.payoutFeePct != null && <div className="text-[10px] font-normal text-gray-400">{item.payoutFeePct}%</div>}
                  </td>
                  {/* TO BANK ACCOUNT — payinBank fields (override if flag set) */}
                  <td className="px-4 py-3 border-b border-gray-100">
                    {(() => {
                      const isOverride = item.isPayInBankAccountOverride
                      const bankCode = isOverride ? item.payinBankCodeOverride : item.payinBankCode
                      const bankAccountNo = isOverride ? item.payinBankAccountNoOverride : item.payinBankAccountNo
                      const bankAccountName = isOverride ? item.payinBankAccountNameOverride : item.payinBankAccountName
                      const promptPayId = isOverride ? item.payinPromptPayIdOverride : item.payinPromptPayId
                      const accountType = isOverride ? item.payinAccountTypeOverride : item.payinAccountType
                      if (!bankCode && !bankAccountNo) return <span className="text-gray-300">—</span>
                      return (
                        <>
                          <div className="text-sm font-semibold text-gray-800">
                            {bankCode || '—'}{bankAccountNo ? ` · ${bankAccountNo}` : ''}
                          </div>
                          {bankAccountName && <div className="text-xs text-gray-400 mt-0.5">{bankAccountName}</div>}
                          {(accountType || promptPayId) && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {accountType && <AccountTypeBadge type={accountType} />}
                              {promptPayId && <span className="text-[10px] text-gray-500">{promptPayId}</span>}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </td>
                  {/* FROM BANK ACCOUNT — payoutBank fields (merchant's sending bank) */}
                  <td className="px-4 py-3 border-b border-gray-100">
                    {item.payoutBankCode || item.payoutBankAccountNo ? (
                      <>
                        <div className="text-sm font-semibold text-gray-800">
                          {item.payoutBankCode || '—'}{item.payoutBankAccountNo ? ` · ${item.payoutBankAccountNo}` : ''}
                        </div>
                        {item.payoutBankAccountName && <div className="text-xs text-gray-400 mt-0.5">{item.payoutBankAccountName}</div>}
                        {item.payoutAccountType && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <AccountTypeBadge type={item.payoutAccountType} />
                            {item.payoutAccountType?.toLowerCase() === 'promptpay' && item.payoutPromptPayId && (
                              <span className="text-[10px] text-gray-500">{item.payoutPromptPayId}</span>
                            )}
                          </div>
                        )}
                      </>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <StatusBadge status={item.status} />
                    {item.rejectReason && (
                      <p className="text-[11px] text-red-500 mt-1 truncate max-w-[140px]" title={item.rejectReason}>{item.rejectReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-600 max-w-[100px] truncate">{item.refId1 || '—'}</td>
                  <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-600 max-w-[100px] truncate">{item.refId2 || '—'}</td>
                  <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                    {item.status?.toLowerCase() === 'pending' && (
                      <button
                        onClick={e => handleDelete(e, item)}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-40"
                      >
                        {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 flex-none">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{total}</span> {tr.foundCount}
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t.admin.rowsPerPage}</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
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

      {/* Delete Confirm Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal({ open: false })}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{tr.deleteModalTitle}</h3>
              <p className="text-sm text-gray-500">{tr.deleteModalDesc}</p>
              {deleteModal.item?.refId && (
                <p className="mt-2 text-sm font-semibold text-gray-700">&ldquo;{deleteModal.item.refId}&rdquo;</p>
              )}
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => setDeleteModal({ open: false })}
                className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t.admin.cancel}
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deletingId ? <><Loader2 className="w-4 h-4 animate-spin" />{tr.btnDeleting}</> : tr.btnDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
