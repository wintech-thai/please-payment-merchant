'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'
import { useHighlightRow } from '@/hooks/useHighlightRow'
import { useOrgChange } from '@/hooks/useOrgChange'
import { supportCaseApi } from '@/lib/api/support-case.api'
import type { SupportCaseItem } from '@/lib/api/support-case.api'
import { toast } from 'sonner'
import { Search, ChevronLeft, ChevronRight, Plus, MoreHorizontal, MessageSquare, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

type CaseStatus = 'New' | 'Open' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed' | 'Cancelled'

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700',
  'Open': 'bg-indigo-50 text-indigo-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  'Waiting for Customer': 'bg-purple-50 text-purple-700',
  'Resolved': 'bg-emerald-50 text-emerald-700',
  'Closed': 'bg-gray-100 text-gray-500',
  'Cancelled': 'bg-red-50 text-red-500',
}

const PRIORITY_COLORS: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-yellow-50 text-yellow-700',
  'High': 'bg-orange-50 text-orange-700',
  'Critical': 'bg-red-50 text-red-700',
}

const ALL_STATUSES: (CaseStatus | 'All')[] = ['All', 'New', 'Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed', 'Cancelled']
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

function normalize(raw: any): SupportCaseItem {
  return {
    id: raw.id ?? raw.Id ?? '',
    ref: raw.ref ?? raw.Ref ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    priority: raw.priority ?? raw.Priority ?? '',
    status: raw.status ?? raw.Status ?? '',
    createdBy: raw.createdBy ?? raw.CreatedBy ?? '',
    createdDate: raw.createdDate ?? raw.CreatedDate ?? '',
    updatedDate: raw.updatedDate ?? raw.UpdatedDate ?? '',
  }
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { fromDate: new Date(tr.start * 1000).toISOString(), toDate: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  let startMs = now
  if (unit === 'm') startMs = now - num * 60_000
  else if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { fromDate: new Date(startMs).toISOString(), toDate: new Date(now).toISOString() }
}

function formatAge(d?: string | null): string {
  if (!d) return ''
  const ms = Date.now() - new Date(d).getTime()
  if (ms < 0) return ''
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days >= 7) return ''
  const remMins = mins % 60
  const remHrs = hrs % 24
  if (days > 0) return remHrs > 0 ? `${days}d ${remHrs}hr` : `${days}d`
  if (hrs > 0) return remMins > 0 ? `${hrs}hr ${remMins}min` : `${hrs}hr`
  return `${mins}min`
}

function ThreeDotMenu({ onView }: { onView: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { lang } = useLang()
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div ref={ref} className="relative flex justify-center">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
          <button onClick={() => { setOpen(false); onView() }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            {lang === 'th' ? 'ดูรายละเอียด' : 'View detail'}
          </button>
        </div>
      )}
    </div>
  )
}

function SupportCaseContent() {
  const { lang } = useLang()
  const router = useRouter()
  const isth = lang === 'th'
  const { selectedRowId, handleRowSelect } = useHighlightRow()

  const [cases, setCases] = useState<SupportCaseItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'All'>('All')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [loading, setLoading] = useState(true)

  const fetchCases = useCallback(async (
    currentPage: number,
    keyword = '',
    status: CaseStatus | 'All' = statusFilter,
    tr: TimeRangeValue = timeRange,
  ) => {
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload = {
        FullTextSearch: keyword || undefined,
        Status: status === 'All' ? undefined : status,
        FromDate: fromDate,
        ToDate: toDate,
        Limit: itemsPerPage,
        Offset: currentPage,
      }
      const [listRes, countRes] = await Promise.allSettled([
        supportCaseApi.getCases(payload),
        supportCaseApi.getCaseCount(payload),
      ])
      if (listRes.status === 'rejected') throw listRes.reason
      const d = listRes.value.data as any
      setCases((Array.isArray(d) ? d : []).map(normalize))
      if (countRes.status === 'fulfilled') {
        const d = countRes.value.data as any
        setTotal(typeof d === 'number' ? d : 0)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (isth ? 'โหลดข้อมูลไม่สำเร็จ' : 'Failed to load cases'))
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage, statusFilter, timeRange])

  useEffect(() => { fetchCases(page, appliedSearch, statusFilter, timeRange) }, [page, itemsPerPage])
  useOrgChange(() => { setAppliedSearch(''); fetchCases(1, '', 'All', timeRange) })

  const handleSearchTrigger = () => {
    setAppliedSearch(searchTerm)
    setPage(1)
    fetchCases(1, searchTerm, statusFilter, timeRange)
  }

  const handleRefresh = () => {
    setPage(1)
    fetchCases(1, appliedSearch, statusFilter, timeRange)
  }

  const handleStatusChange = (s: CaseStatus | 'All') => {
    setStatusFilter(s)
    setPage(1)
    fetchCases(1, appliedSearch, s, timeRange)
  }

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    setPage(1)
    fetchCases(1, appliedSearch, statusFilter, tr)
  }

  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const totalPages = Math.ceil(total / itemsPerPage)

  const inputCls = 'text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)] px-4 sm:px-6 pt-4 sm:pt-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-none">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Case</h1>
          <p className="text-base text-gray-500 mt-1">
            {isth ? 'รายการ Support Case ของคุณ' : 'Your support cases'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-3 flex-none">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => handleStatusChange(e.target.value as CaseStatus | 'All')}
            className={clsx(inputCls, 'sm:min-w-[160px]')}
          >
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s === 'All' ? (isth ? 'ทุกสถานะ' : 'All Status') : s}</option>
            ))}
          </select>
          {/* Search text */}
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
            placeholder={isth ? 'ค้นหา Ref, หัวข้อ...' : 'Search ref, subject...'}
            className={clsx(inputCls, 'placeholder-gray-400 sm:min-w-[220px]')}
          />
          {/* Time range */}
          <AdvancedTimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} disabled={loading} />
          {/* Search btn */}
          <button onClick={handleSearchTrigger}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
            <Search className="w-4 h-4" />
          </button>
          {/* Refresh btn */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 bg-white transition-colors disabled:opacity-40"
            title={isth ? 'รีเฟรช' : 'Refresh'}
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <Link href="/support-case/create"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-sm transition-all hover:shadow-md">
            <Plus className="w-4 h-4" />{isth ? 'สร้าง Case ใหม่' : 'Create Case'}
          </Link>
        </div>
      </div>

      {/* Table + Pagination */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="min-w-full border-separate" style={{ borderSpacing: '0 5px' }}>
            <thead>
              <tr>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ref</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{isth ? 'หัวข้อ' : 'Subject'}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{isth ? 'สถานะ' : 'Status'}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{isth ? 'ความสำคัญ' : 'Priority'}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{isth ? 'ผู้สร้าง' : 'Created By'}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{isth ? 'วันที่สร้าง' : 'Created'}</th>
                <th className="px-4 pb-1 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{isth ? 'อัปเดตล่าสุด' : 'Updated'}</th>
                <th className="w-14 px-4 pb-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{isth ? 'จัดการ' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-20 text-center"><LoadingSpinner /></td></tr>
              ) : cases.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-500">{isth ? 'ยังไม่มี Support Case' : 'No support cases yet'}</p>
                  <p className="text-sm text-gray-400 mt-1">{isth ? 'กดสร้าง Case ใหม่เพื่อติดต่อทีมงาน' : 'Create a case to contact our support team'}</p>
                </td></tr>
              ) : cases.map(c => {
                const isSelected = selectedRowId === c.id
                const createdAge = formatAge(c.createdDate)
                const updatedAge = formatAge(c.updatedDate)
                return (
                  <tr key={c.id}
                    onClick={() => handleRowSelect(c.id ?? '')}
                    className={clsx('cursor-pointer transition-all',
                      isSelected ? '!bg-primary-100 shadow-sm' : 'bg-white shadow-sm hover:shadow-md hover:bg-amber-50/20'
                    )}
                  >
                    {/* Ref */}
                    <td className={clsx('pl-4 pr-2 py-3.5 rounded-l-xl border-l-[3px] whitespace-nowrap', isSelected ? 'border-primary-500' : 'border-transparent')}>
                      <button
                        onClick={e => { e.stopPropagation(); handleRowSelect(c.id ?? ''); router.push(`/support-case/${c.id}`) }}
                        className={clsx('text-sm font-bold hover:underline', isSelected ? 'text-primary-700' : 'text-primary-600 hover:text-primary-800')}
                      >
                        {c.ref || '—'}
                      </button>
                    </td>
                    {/* Subject */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <span className="text-sm text-gray-700 line-clamp-1">{c.subject || '—'}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {c.status ? (
                        <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500')}>
                          {c.status}
                        </span>
                      ) : '—'}
                    </td>
                    {/* Priority */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {c.priority ? (
                        <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[c.priority] ?? 'bg-gray-100 text-gray-600')}>
                          {c.priority}
                        </span>
                      ) : '—'}
                    </td>
                    {/* Created By */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-500">{c.createdBy || '—'}</span>
                    </td>
                    {/* Created */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-gray-500">{formatDate(c.createdDate)}</span>
                        {createdAge && <span className="text-[11px] text-gray-400">{createdAge}</span>}
                      </div>
                    </td>
                    {/* Updated */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-gray-500">{formatDate(c.updatedDate)}</span>
                        {updatedAge && <span className="text-[11px] text-gray-400">{updatedAge}</span>}
                      </div>
                    </td>
                    {/* Action */}
                    <td className="px-2 pr-4 py-3.5 text-center rounded-r-xl" onClick={e => e.stopPropagation()}>
                      <ThreeDotMenu onView={() => router.push(`/support-case/${c.id}`)} />
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
            <span>{isth ? 'แถวต่อหน้า' : 'Rows per page'}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm">
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || total === 0 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Loading...</span>
    </div>
  )
}

export default function SupportCasePage() {
  return <Suspense><SupportCaseContent /></Suspense>
}
