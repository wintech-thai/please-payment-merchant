'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { pointTopUpApi } from '@/lib/api/point-topup.api'
import type { PurchaseCashItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useOrgChange } from '@/hooks/useOrgChange'

function fmtNum(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ปรับแก้ ข้อ 5 : column TYPE ก็ทำเป็น badge สีๆ เหมือน status
function TypeBadge({ type }: { type?: string | null }) {
  const cfg: Record<string, { bg: string; dot: string }> = {
    PointTopUp: { bg: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500' },
  }
  const c = cfg[type ?? ''] ?? { bg: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {type ?? '—'}
    </span>
  )
}

function StatusBadge({ status, m }: { status?: string | null; m: any }) {
  const effective = status || 'Pending'
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Pending: { bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400', label: m.statusPending },
    Approved: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', label: m.statusApproved },
    Rejected: { bg: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: m.statusRejected },
    Cancelled: { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400', label: m.statusCancelled },
  }
  const c = cfg[effective] ?? cfg.Pending
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

function PurchasingOrderPageInner() {
  const { t } = useLang()
  const m = t.purchasingOrder
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [items, setItems] = useState<PurchaseCashItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (highlightIdParam) return highlightIdParam
    if (typeof window !== 'undefined') return sessionStorage.getItem('purchasing_order_highlight')
    return null
  })

  const fetchItems = (p = page, searchVal = search, status = statusFilter) => {
    setLoading(true)
    const offset = (p - 1) * itemsPerPage + 1
    const payload = { FullTextSearch: searchVal || undefined, DocumentStatus: status || undefined, Offset: offset, Limit: itemsPerPage }
    Promise.allSettled([
      pointTopUpApi.getPurchaseCashes(payload),
      pointTopUpApi.getPurchaseCashCount(payload),
    ]).then(([listRes, countRes]) => {
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        setItems(Array.isArray(data) ? data : [])
      }
      if (countRes.status === 'fulfilled') {
        const raw = countRes.value.data as any
        setTotal(typeof raw === 'number' ? raw : 0)
      }
    }).catch(() => toast.error(m.loadFailed))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [page, itemsPerPage])
  useOrgChange(() => { setPage(1); fetchItems(1) })

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`po-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  const handleSearch = () => { setSearch(searchInput); setPage(1); fetchItems(1, searchInput, statusFilter) }

  const handleOpenDetail = (id?: string | null) => {
    if (!id) return
    setSelectedRowId(id)
    sessionStorage.setItem('purchasing_order_highlight', id)
    router.push(`/purchasing-order/${id}`)
  }

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage))
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = [m.colDocNo, m.colCreatedDate, m.colSubType, m.colAmount, m.colStatus]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="flex-none mb-5">
        <h1 className="text-2xl font-bold text-gray-900">{m.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{m.subtitle}</p>
      </div>

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
            <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); fetchItems(1, '', statusFilter) }} className="text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchItems(1, search, e.target.value) }}
          className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
        >
          <option value="">{m.filterAllStatus}</option>
          <option value="Pending">{m.statusPending}</option>
          <option value="Approved">{m.statusApproved}</option>
          <option value="Rejected">{m.statusRejected}</option>
          <option value="Cancelled">{m.statusCancelled}</option>
        </select>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          {t.admin.search}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.admin.loading}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">{m.noDataFound}</div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50">
                  {cols.map((col, i) => (
                    <th key={i} className={clsx('px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap', i === 0 && 'rounded-tl-xl', i === cols.length - 1 && 'rounded-tr-xl')}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const highlighted = !!item.id && selectedRowId === item.id
                  return (
                    <tr
                      id={`po-row-${item.id}`}
                      key={item.id}
                      onClick={() => item.id && setSelectedRowId(item.id)}
                      className={clsx('cursor-pointer transition-colors', highlighted ? 'bg-primary-100' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50')}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap cursor-pointer" onClick={e => { e.stopPropagation(); handleOpenDetail(item.id) }}>
                        <span className={clsx('text-sm font-semibold hover:text-primary-600 hover:underline', highlighted ? 'text-primary-700' : 'text-gray-800')}>{item.documentNo ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">{item.createdDate ? new Date(item.createdDate).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"><TypeBadge type={item.documentSubType} /></td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-700 tabular-nums">{fmtNum(item.grandTotal ?? item.totalPrice)}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap"><StatusBadge status={item.status} m={m} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{m.rowsPerPage}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }} className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
              {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PurchasingOrderPage() {
  return (
    <Suspense>
      <PurchasingOrderPageInner />
    </Suspense>
  )
}
