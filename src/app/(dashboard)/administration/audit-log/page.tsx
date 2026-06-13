'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrgChange } from '@/hooks/useOrgChange'
import { Search, RefreshCcw, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import type { AuditLogDocument } from '@/lib/api/audit-log.api'
import { useLang } from '@/context/LanguageContext'
import AuditLogFlyout from '@/components/AuditLogFlyout'
import { AuditLogHistogram } from '@/components/AuditLogHistogram'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'

const PALETTE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#f26ed5', '#a4de6c', '#d0ed57', '#ffc658']

function getApiColor(name: string): string {
  if (!name) return '#94a3b8'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'numeric', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date(iso))
  } catch { return iso }
}

function getTimeFilter(tr: TimeRangeValue): { gte: string; lte?: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { gte: new Date(tr.start * 1000).toISOString(), lte: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  let startMs = now
  if (unit === 'm') startMs = now - num * 60_000
  else if (unit === 'h') startMs = now - num * 3_600_000
  else startMs = now - num * 86_400_000
  return { gte: new Date(startMs).toISOString() }
}

function calculateInterval(tr: TimeRangeValue): string {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    const diffH = (tr.end - tr.start) / 3600
    if (diffH <= 1) return '30s'
    if (diffH <= 24) return '30m'
    return '1d'
  }
  const v = tr.value
  if (v.endsWith('m') || v === '1h') return '30s'
  if (v === '24h' || v === '1d') return '30m'
  if (v.endsWith('d')) return '1d'
  return '1h'
}

function mapItem(source: Record<string, unknown>): AuditLogDocument {
  const data = (source.data as Record<string, unknown>) || {}
  const userInfo = (data.userInfo as Record<string, unknown>) || (data.user as Record<string, unknown>) || {}
  const api = (data.api as Record<string, unknown>) || {}
  return {
    id: String(source._id ?? source.auditLogId ?? source.id ?? ''),
    '@timestamp': String(source['@timestamp'] ?? ''),
    user_name: String(userInfo.UserName ?? userInfo.userName ?? ''),
    id_type: String(userInfo.IdentityType ?? userInfo.identityType ?? '-'),
    role: String(userInfo.Role ?? userInfo.role ?? '-'),
    action: String(api.ApiName ?? api.apiName ?? data.Path ?? data.path ?? '-'),
    path: String(data.Path ?? data.path ?? ''),
    resource: String(api.Controller ?? api.controller ?? ''),
    status_code: Number(data.StatusCode ?? data.statusCode ?? api.statusCode ?? 200),
    client_ip: String(data.ClientIp || data.CfClientIp || data.clientIp || data.cfClientIp || '-'),
    ...source,
  }
}

const SS_KEY = 'auditLog:timeRange'
function saveTimeRange(tr: TimeRangeValue) { try { sessionStorage.setItem(SS_KEY, JSON.stringify(tr)) } catch { } }
function loadTimeRange(): TimeRangeValue | null { try { const raw = sessionStorage.getItem(SS_KEY); return raw ? JSON.parse(raw) : null } catch { return null } }
function getOrgId() { return typeof window !== 'undefined' ? localStorage.getItem('orgId') || '' : '' }

export default function AuditLogPage() {
  const { t } = useLang()
  const tAL = t.auditLog

  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() => loadTimeRange() ?? { type: 'relative', value: '24h' })
  useEffect(() => { return () => { sessionStorage.removeItem(SS_KEY) } }, [])

  const [logs, setLogs] = useState<AuditLogDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [inputValue, setInputValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState('all')
  const [chartData, setChartData] = useState<any[]>([])
  const [chartMax, setChartMax] = useState(1)
  const [chartInterval, setChartInterval] = useState('30m')
  const [selectedLog, setSelectedLog] = useState<AuditLogDocument | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [highlightedId, setHighlightedId] = useState<string>(
    () => typeof window !== 'undefined' ? sessionStorage.getItem('auditLog:highlight') || '' : ''
  )

  const fetchData = useCallback(async () => {
    const orgId = getOrgId()
    if (!orgId) { setIsLoading(false); return }
    setIsLoading(true)
    try {
      const currentInterval = calculateInterval(timeRange)
      setChartInterval(currentInterval)
      const { gte, lte } = getTimeFilter(timeRange)
      const tsFilter: any = { gte }
      if (lte) tsFilter.lte = lte
      const queryMust: any[] = [{ range: { '@timestamp': tsFilter } }]

      if (searchTerm) {
        if (searchField === 'all') {
          queryMust.push({ multi_match: { query: searchTerm, fields: ['data.userInfo.UserName', 'data.api.ApiName', 'data.api.Controller', 'data.userInfo.Role', 'data.userInfo.IdentityType', 'data.CfClientIp', 'data.ClientIp', 'data.Path'], type: 'phrase_prefix' } })
        } else if (searchField === 'username') {
          queryMust.push({ match: { 'data.userInfo.UserName': searchTerm } })
        } else if (searchField === 'api') {
          queryMust.push({ match: { 'data.api.ApiName': searchTerm } })
        } else if (searchField === 'ip') {
          queryMust.push({ match: { 'data.CfClientIp': searchTerm } })
        }
      }

      const esPayload = {
        from: (page - 1) * itemsPerPage,
        size: itemsPerPage,
        sort: [{ '@timestamp': { order: 'desc' } }],
        track_total_hits: true,
        query: { bool: { must: queryMust } },
        aggs: {
          timeline: {
            date_histogram: { field: '@timestamp', fixed_interval: currentInterval, min_doc_count: 0 },
            aggs: { group_by_api: { terms: { field: 'data.api.ApiName.keyword', size: 10 } } },
          },
        },
      }

      const res = await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgId },
        body: JSON.stringify({ esPayload }),
      })
      const result = await res.json()

      if (result.status === 'OK') {
        setLogs(result.data.map(mapItem))
        setTotalCount(result.total)
        if (result.aggregations?.timeline?.buckets) {
          const buckets = result.aggregations.timeline.buckets
          setChartData(buckets)
          setChartMax(Math.max(1, ...buckets.map((b: any) => b.doc_count as number)))
        } else {
          setChartData([])
        }
      } else {
        throw new Error(result.message)
      }
    } catch {
      setLogs([]); setTotalCount(0); setChartData([])
    } finally {
      setIsLoading(false)
    }
  }, [page, itemsPerPage, searchTerm, searchField, timeRange])

  useEffect(() => { fetchData() }, [fetchData])
  useOrgChange(fetchData)

  const setAndSaveTimeRange = (val: TimeRangeValue) => { setTimeRange(val); setPage(1); saveTimeRange(val) }
  const handleSearch = () => { setPage(1); setSearchTerm(inputValue) }
  const handleReset = () => { setInputValue(''); setSearchTerm(''); setSearchField('all'); setAndSaveTimeRange({ type: 'relative', value: '24h' }) }
  const setHighlight = (id: string) => {
    setHighlightedId(id)
    sessionStorage.setItem('auditLog:highlight', id)
  }

  const handleRowClick = (log: AuditLogDocument) => { setHighlight(log.id) }
  const handleOpenFlyout = (log: AuditLogDocument, idx: number) => { setHighlight(log.id); setSelectedLog(log); setSelectedIndex(idx) }
  const handleCloseFlyout = () => { setSelectedLog(null); setSelectedIndex(-1) }
  const handleNavigate = (idx: number) => {
    if (idx >= 0 && idx < logs.length) { setHighlight(logs[idx].id); setSelectedLog(logs[idx]); setSelectedIndex(idx) }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startRow = totalCount === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, totalCount)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{tAL.title}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{tAL.subtitle}</p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">
        <select value={searchField} onChange={e => setSearchField(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
          <option value="all">{tAL.searchFieldAll}</option>
          <option value="username">{tAL.searchFieldUsername}</option>
          <option value="api">{tAL.searchFieldApi}</option>
          <option value="ip">{tAL.searchFieldIp}</option>
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder={tAL.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>

        <button onClick={handleSearch}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
          <Search className="w-4 h-4" />
        </button>

        <AdvancedTimeRangeSelector value={timeRange} onChange={setAndSaveTimeRange} disabled={isLoading} />

        <button onClick={() => fetchData()} title={tAL.reset}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Histogram */}
      <div className="mb-4">
        <AuditLogHistogram data={chartData} totalHits={totalCount} interval={chartInterval} maxDocCount={chartMax} dict={{ totalLogs: tAL.totalLogs ?? 'Total Logs' }} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">{tAL.colTime}</th>
                <th className="px-4 py-3">{tAL.colUsername}</th>
                <th className="px-4 py-3">{tAL.colIdType}</th>
                <th className="px-4 py-3">{tAL.colApi}</th>
                <th className="px-4 py-3">{tAL.colStatus}</th>
                <th className="px-4 py-3">{tAL.colRole}</th>
                <th className="px-4 py-3">{tAL.colIp}</th>
                <th className="px-4 py-3 text-center">{tAL.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-400">{tAL.loading}</span>
                  </div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">{tAL.noData}</td></tr>
              ) : (
                logs.map((log, idx) => {
                  const isError = log.status_code && log.status_code !== 200
                  const isHighlighted = highlightedId === log.id
                  const isFlyoutOpen = selectedLog?.id === log.id
                  return (
                    <tr key={log.id || idx} onClick={() => handleRowClick(log)}
                      className={clsx('cursor-pointer transition-colors text-sm',
                        isError
                          ? clsx('bg-red-50 hover:bg-red-100', isHighlighted && '!bg-red-200 border-l-[3px] border-l-red-500')
                          : clsx('hover:bg-gray-50', isHighlighted && '!bg-primary-100 border-l-[3px] border-l-primary-500'))}>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">{formatDate(log['@timestamp'])}</td>
                      <td className={clsx('px-4 py-3 font-medium', isError ? 'text-red-600' : 'text-primary-700')}>{log.user_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.id_type}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!isError && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getApiColor(log.action) }} />}
                          <span className={clsx('truncate max-w-[200px] text-xs', isError ? 'text-red-600' : 'text-gray-700')}>{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                          isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                          {log.status_code || 200}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.role}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.client_ip}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={e => { e.stopPropagation(); handleOpenFlyout(log, idx) }}
                          className={clsx('p-1.5 rounded-lg transition-colors',
                            isFlyoutOpen ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100')}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex-none flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{tAL.rowsPerPage}</span>
            <select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
              className="border-none bg-transparent text-gray-700 font-medium focus:ring-0 outline-none cursor-pointer text-sm">
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="tabular-nums">{startRow}–{endRow} {tAL.of} {totalCount}</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AuditLogFlyout event={selectedLog} events={logs} currentIndex={selectedIndex} onNavigate={handleNavigate} onClose={handleCloseFlyout} />
    </div>
  )
}
