'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrgChange } from '@/hooks/useOrgChange'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayOutRequestItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, RefreshCw, X, Paperclip, TriangleAlert, Download } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import AuditNoticeDrawer from '@/components/AuditNoticeDrawer'
import ExportCsvModal from '@/components/ExportCsvModal'
import type { CsvCell } from '@/lib/csv-export'

type SlipItem = { imageBase64: string; uploadedAt: string; note?: string | null; first4?: string | null; last4?: string | null }

function SlipViewerModal({ slips, item, onClose }: { slips: SlipItem[]; item: PayOutRequestItem; onClose: () => void }) {
  const { t } = useLang()
  const m = t.payOutRequest
  const [idx, setIdx] = useState(0)
  const slip = slips[idx]
  const destBankCode = item.isPayInBankAccountOverride ? item.payinBankCodeOverride : item.payinBankCode
  const destAccountNo = item.isPayInBankAccountOverride ? item.payinBankAccountNoOverride : item.payinBankAccountNo
  const destAccountName = item.isPayInBankAccountOverride ? item.payinBankAccountNameOverride : item.payinBankAccountName
  const destPromptPayId = item.isPayInBankAccountOverride ? item.payinPromptPayIdOverride : item.payinPromptPayId
  const hasSidebar = destBankCode || destAccountNo || destAccountName || destPromptPayId || slip?.first4 || slip?.last4 || slip?.note
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 flex-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold">{m.slipViewerTitle} ({idx + 1} / {slips.length})</span>
          {slip?.uploadedAt && (
            <span className="text-white/60 text-xs">{new Date(slip.uploadedAt).toLocaleString('th-TH')}</span>
          )}
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex items-stretch min-h-0" onClick={e => e.stopPropagation()}>
        {hasSidebar && (
          <div className="flex-none w-52 flex flex-col px-4 py-4 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {(destBankCode || destAccountNo || destAccountName || destPromptPayId) && (
                <div className="bg-teal-900/60 border border-teal-500/40 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-teal-300/70 uppercase tracking-widest mb-2">{m.slipDestAccount}</p>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {destBankCode && <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-500 text-white uppercase tracking-wide">{destBankCode}</span>}
                    {item.isPartialyPayout && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/80 text-white uppercase tracking-wide">P2P</span>}
                  </div>
                  {destAccountNo && <p className="text-sm font-mono font-bold text-white leading-tight">{destAccountNo}</p>}
                  {destAccountName && <p className="text-xs text-teal-100 font-medium mt-1">{destAccountName}</p>}
                  {destPromptPayId && (
                    <div className="mt-2 pt-2 border-t border-teal-700/50">
                      <p className="text-[9px] font-bold text-teal-400 uppercase tracking-wide mb-0.5">PromptPay</p>
                      <p className="text-xs font-mono font-bold text-yellow-300">{destPromptPayId}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {item.generatedAmount != null && (
              <div className="mt-3 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-3">
                <p className="text-[9px] text-amber-300/80 uppercase tracking-widest mb-1">{m.slipAmount}</p>
                <p className="text-base font-bold text-amber-300 tabular-nums">{Number(item.generatedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-3">
              {(slip?.first4 || slip?.last4) && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{m.slipRefLabel}</p>
                  <p className="text-sm font-mono font-bold text-yellow-300 tracking-wider">{slip.first4} — {slip.last4}</p>
                </div>
              )}
              {slip?.note && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{m.slipNoteLabel}</p>
                  <p className="text-sm text-white font-medium leading-snug">{slip.note}</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center gap-2 px-2 min-h-0">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors flex-shrink-0">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center justify-center min-h-0">
            {slip && <img src={`data:image/jpeg;base64,${slip.imageBase64}`} alt={`slip ${idx + 1}`} className="max-h-[calc(100vh-120px)] max-w-full rounded-xl shadow-2xl object-contain" />}
          </div>
          <button onClick={() => setIdx(i => Math.min(slips.length - 1, i + 1))} disabled={idx === slips.length - 1}
            className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors flex-shrink-0">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}

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
const FILTER_KEY = 'merchantPayOutRequests_filter'
const SHOW_DELETE_BUTTON = false

function AccountTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null
  return (
    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
      {type}
    </span>
  )
}

function StatusBadge({ status, isPartialyPayout, createdDate }: { status?: string | null; isPartialyPayout?: boolean | null; createdDate?: string | null }) {
  const s = (status || '').toLowerCase()
  const map: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  }
  const chipMap: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 ring-green-200',
    approved: 'bg-green-50 text-green-700 ring-green-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    rejected: 'bg-red-50 text-red-600 ring-red-200',
    failed: 'bg-red-50 text-red-600 ring-red-200',
    cancelled: 'bg-gray-100 text-gray-500 ring-gray-200',
  }
  const dot: Record<string, string> = {
    paid: 'bg-green-500', approved: 'bg-green-500',
    pending: 'bg-amber-500',
    rejected: 'bg-red-500', failed: 'bg-red-500',
    cancelled: 'bg-gray-400',
  }
  const age = s === 'pending' && createdDate ? formatAge(createdDate) : null
  return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="inline-flex items-center gap-1">
        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', map[s] ?? 'bg-gray-100 text-gray-500 border-gray-200')}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', dot[s] ?? 'bg-gray-400')} />
          {status || '—'}
        </span>
        {isPartialyPayout && <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1', chipMap[s] ?? 'bg-gray-100 text-gray-500 ring-gray-200')}>P2P</span>}
      </div>
      {age && <span className="text-[10px] text-gray-400 ml-1">{age}</span>}
    </div>
  )
}

function formatAge(d?: string | null): string {
  if (!d) return ''
  const diffMs = Date.now() - new Date(d).getTime()
  if (diffMs < 0) return ''
  const totalMin = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}min`
  return `${hours}h ${mins}min`
}

export default function PayOutRequestsPage() {
  const { t } = useLang()
  const tr = t.payOutRequest
  const router = useRouter()

  const [items, setItems] = useState<PayOutRequestItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inputSearch, setInputSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [search, setSearch] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.search ?? '') : ''
  )
  const [status, setStatus] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.status ?? '') : ''
  )
  const [p2p, setP2p] = useState<string>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.p2p ?? '') : ''
  )
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() =>
    typeof window !== 'undefined' ? (JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? 'null')?.timeRange ?? { type: 'relative', value: '30d' }) : { type: 'relative', value: '30d' }
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item?: PayOutRequestItem }>({ open: false })
  const [slipViewer, setSlipViewer] = useState<{ slips: SlipItem[]; item: PayOutRequestItem } | null>(null)
  const [noticeTarget, setNoticeTarget] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(HIGHLIGHTED_KEY) ?? '' : ''
  )
  const [refreshKey, setRefreshKey] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)

  const load = useCallback(async () => {
    if (typeof window !== 'undefined') sessionStorage.setItem(FILTER_KEY, JSON.stringify({ search, status, p2p, timeRange }))
    setLoading(true)
    try {
      const payload = {
        fullTextSearch: search || undefined,
        status: status || undefined,
        isPeerToPeer: p2p ? p2p === 'true' : undefined,
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
  }, [search, status, p2p, timeRange, page, pageSize, refreshKey])

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
        <select value={p2p} onChange={e => { setP2p(e.target.value); setPage(1) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300">
          <option value="">{tr.p2pAll}</option>
          <option value="true">{tr.p2pOnly}</option>
          <option value="false">{tr.p2pNone}</option>
        </select>
        <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
        <button onClick={() => { setSearch(inputSearch); setPage(1); setRefreshKey(k => k + 1) }} disabled={loading} title={tr.refresh}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          {t.common.export.button}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">REF</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">{t.common.loading}</span>
                  </div>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">{tr.noData}</td></tr>
              ) : items.map((item, idx) => {
                const canDelete = SHOW_DELETE_BUTTON && item.status?.toLowerCase() === 'pending' && !item.isPartialyPayout
                return (
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
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">{item.refId1 || '—'}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-800">{item.merchantCode || '—'}</div>
                    <div className="text-xs text-gray-400">{item.merchantName || ''}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {item.requestedAmount != null ? Number(item.requestedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'}
                    </div>
                    {item.isPartialyPayout && item.totalPayOutPaidAmountDecimal != null && item.totalPayOutPaidAmountDecimal > 0 && (
                      <div className="text-xs text-emerald-600 font-semibold">+{Number(item.totalPayOutPaidAmountDecimal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                    )}
                    <div className="text-[10px] text-gray-400">{item.currency || 'THB'}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right">
                    <div className="text-sm font-semibold text-gray-800">
                      {item.payoutFeeDecimal != null ? Number(item.payoutFeeDecimal).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '—'}
                    </div>
                    {item.payoutFeePct != null && <div className="text-[10px] text-gray-400">{item.payoutFeePct}%</div>}
                    {item.payoutFeePayer && (
                      <span className={clsx(
                        'text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1',
                        item.payoutFeePayer?.toLowerCase() === 'merchant'
                          ? 'bg-blue-50 text-blue-700 ring-blue-200'
                          : 'bg-orange-50 text-orange-700 ring-orange-200'
                      )}>{item.payoutFeePayer}</span>
                    )}
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
                  <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                    <div className="flex items-start gap-1.5 flex-wrap">
                      <StatusBadge status={item.status} isPartialyPayout={item.isPartialyPayout} createdDate={item.createdDate} />
                      {(item.payOutSlipUploadCount ?? 0) > 0 && (
                        <button
                          onClick={() => {
                            paymentRequestApi.getPayOutSlipUploads(item.id)
                              .then(res => {
                                const d = res.data as any
                                const list: any[] = Array.isArray(d) ? d : (d?.slips ?? d?.Slips ?? [])
                                setSlipViewer({ item, slips: list.map(s => ({ imageBase64: s.imageBase64 ?? s.ImageBase64 ?? '', uploadedAt: s.uploadedAt ?? s.UploadedAt ?? '', note: s.note ?? s.Note ?? null, first4: s.first4 ?? s.First4 ?? null, last4: s.last4 ?? s.Last4 ?? null })) })
                              })
                              .catch(() => {})
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          <Paperclip className="w-3 h-3" />
                          {item.payOutSlipUploadCount}
                        </button>
                      )}
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
                    {item.rejectReason && (
                      <p className="text-[11px] text-red-500 mt-1 truncate max-w-[140px]" title={item.rejectReason}>{item.rejectReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="flex flex-col gap-0.5">
                      {item.refId1 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId1}</span> : null}
                      {item.refId2 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId2}</span> : null}
                      {item.refId3 ? <span className="text-xs text-gray-600 whitespace-nowrap">{item.refId3}</span> : null}
                      {!item.refId1 && !item.refId2 && !item.refId3 && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100" onClick={e => e.stopPropagation()}>
                    {canDelete && (
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
                )
              })}
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
              {deleteModal.item?.refId1 && (
                <p className="mt-2 text-sm font-semibold text-gray-700">&ldquo;{deleteModal.item.refId1}&rdquo;</p>
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
      {slipViewer && <SlipViewerModal slips={slipViewer.slips} item={slipViewer.item} onClose={() => setSlipViewer(null)} />}
      {noticeTarget && <AuditNoticeDrawer rowId={noticeTarget} onClose={() => setNoticeTarget(null)} />}

      {exportOpen && (
        <ExportCsvModal<PayOutRequestItem>
          onClose={() => setExportOpen(false)}
          filenamePrefix="pay-out-requests"
          getTimeFilter={getTimeFilter}
          showP2pFilter
          statusOptions={[
            { value: 'Pending', label: 'Pending' },
            { value: 'Rejected', label: 'Rejected' },
            { value: 'Paid', label: 'Paid' },
          ]}
          headers={[
            'Date/Time', 'Merchant Code', 'Merchant Name', 'Amount', 'Currency', 'Paid Amount (P2P)',
            'Fee Amount', 'Fee %', 'Fee Payer',
            'Dest Bank Code', 'Dest Account No', 'Dest Account Name', 'Dest Account Type', 'Dest PromptPay ID',
            'Source Bank Code', 'Source Account No', 'Source Account Name', 'Source Account Type', 'Source PromptPay ID',
            'Is P2P', 'Status', 'Reject Reason', 'Ref1', 'Ref2', 'Ref3',
          ]}
          mapRow={(item): CsvCell[] => {
            const isOverride = item.isPayInBankAccountOverride
            const bankCode = isOverride ? item.payinBankCodeOverride : item.payinBankCode
            const bankAccountNo = isOverride ? item.payinBankAccountNoOverride : item.payinBankAccountNo
            const bankAccountName = isOverride ? item.payinBankAccountNameOverride : item.payinBankAccountName
            const accountType = isOverride ? item.payinAccountTypeOverride : item.payinAccountType
            const promptPayId = isOverride ? item.payinPromptPayIdOverride : item.payinPromptPayId
            return [
              item.createdDate ? new Date(item.createdDate).toLocaleString('th-TH') : '',
              item.merchantCode ?? '',
              item.merchantName ?? '',
              item.requestedAmount ?? '',
              item.currency ?? '',
              item.isPartialyPayout ? (item.totalPayOutPaidAmountDecimal ?? '') : '',
              item.payoutFeeDecimal ?? '',
              item.payoutFeePct ?? '',
              item.payoutFeePayer ?? '',
              bankCode ?? '',
              bankAccountNo ?? '',
              bankAccountName ?? '',
              accountType ?? '',
              promptPayId ?? '',
              item.payoutBankCode ?? '',
              item.payoutBankAccountNo ?? '',
              item.payoutBankAccountName ?? '',
              item.payoutAccountType ?? '',
              item.payoutPromptPayId ?? '',
              item.isPartialyPayout ? 'Yes' : 'No',
              item.status ?? '',
              item.rejectReason ?? '',
              item.refId1 ?? '',
              item.refId2 ?? '',
              item.refId3 ?? '',
            ]
          }}
          fetchCount={async params => {
            const payload = { direction: 'PayOut', ...params }
            const res = await paymentRequestApi.getPayOutRequestCount(payload)
            const d = res.data as any
            return typeof d === 'number' ? d : (d?.count ?? 0)
          }}
          fetchPage={async (params, offset, limit) => {
            const payload = { direction: 'PayOut', ...params, offset, limit }
            const res = await paymentRequestApi.getPayOutRequests(payload)
            const d = res.data as any
            return Array.isArray(d) ? d : (d?.paymentRequests ?? d?.items ?? [])
          }}
        />
      )}
    </div>
  )
}
