'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentEventTimeSeriesItem } from '@/lib/api/agent.api'

import type { AgentItem, AgentEventItem, GetAgentEventsPayload } from '@/lib/api/types'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, Eye, Search, RefreshCw,
  FileJson, Table as TableIcon, Copy, Check, Hash, ToggleLeft, Type, X,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { AgentEventHistogram } from '@/components/AgentEventHistogram'
import { useFormatDate } from '@/hooks/useFormatDate'
import { formatDateTime } from '@/lib/datetime'

const CHANNELS = ['APP', 'LINE', 'SMS']
const EVENT_TYPES = ['Heartbeat', 'PaymentTx']

function highlightKey(agentId: string) {
  return `agent_messages_highlight_${agentId}`
}

function getTimeFilter(tr: TimeRangeValue): { fromDate: string; toDate: string } {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return {
      fromDate: new Date(tr.start * 1000).toISOString(),
      toDate: new Date(tr.end * 1000).toISOString(),
    }
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

function formatDate(d: string | null | undefined, timezone: string) {
  if (!d) return '—'
  try {
    return formatDateTime(d, timezone)
  } catch { return d }
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

// ─── Flyout helpers (same as AuditLogFlyout) ──────────────────────────────────

const flattenObject = (obj: unknown, prefix = ''): Record<string, unknown> => {
  const items: Record<string, unknown> = {}
  if (!obj || typeof obj !== 'object') return items
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    const val = (obj as Record<string, unknown>)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(items, flattenObject(val, newKey))
    } else {
      items[newKey] = val
    }
  }
  return items
}

const getTypeIcon = (val: unknown) => {
  if (typeof val === 'number') return <Hash size={12} />
  if (typeof val === 'boolean') return <ToggleLeft size={12} />
  return <Type size={12} />
}

const getValueColor = (val: unknown) => {
  if (typeof val === 'number') return 'text-emerald-600'
  if (typeof val === 'boolean') return 'text-primary-600 font-bold'
  if (val === null || val === undefined) return 'text-gray-400 italic'
  return 'text-amber-600'
}

const highlightJson = (json: unknown) =>
  JSON.stringify(json, null, 2).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-600'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-primary-700 font-semibold'
      } else if (/true|false/.test(match)) cls = 'text-primary-600 font-bold'
      else if (/null/.test(match)) cls = 'text-gray-400 italic'
      else if (!isNaN(Number(match))) cls = 'text-emerald-600'
      return `<span class="${cls}">${match}</span>`
    }
  )

// ─── Event Detail Flyout ───────────────────────────────────────────────────────

function EventDetailFlyout({
  event,
  agentEventData,
  loading: detailLoading,
  events,
  currentIndex,
  onNavigate,
  onClose,
}: {
  event: AgentEventItem
  agentEventData: Record<string, unknown> | null
  loading: boolean
  events: AgentEventItem[]
  currentIndex: number
  onNavigate: (idx: number) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const tAL = t.auditLog
  const { timezone } = useFormatDate()
  const [tab, setTab] = useState<'table' | 'json'>('table')
  const [fieldSearch, setFieldSearch] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const jsonData = agentEventData ?? {}

  // Flatten agentEventData for table view
  const flatData = useMemo(() => flattenObject(jsonData), [agentEventData])
  const sortedKeys = useMemo(() => Object.keys(flatData).sort(), [flatData])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < events.length - 1) onNavigate(currentIndex + 1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentIndex, events.length, onNavigate, onClose])

  const handleCopyValue = (val: unknown, id: string) => {
    const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)
    navigator.clipboard.writeText(str)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const filteredKeys = sortedKeys.filter(k => {
    if (!fieldSearch) return true
    const lo = fieldSearch.toLowerCase()
    return k.toLowerCase().includes(lo) || String(flatData[k]).toLowerCase().includes(lo)
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[99] bg-primary-950/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-[640px] bg-white border-l border-primary-100 shadow-[-20px_0_60px_rgba(37,99,235,0.12)] z-[100] flex flex-col">

        {/* Header */}
        <div className="flex-none px-5 py-4 bg-primary-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">
                {t.agent.eventDetailTitle}
              </h3>
              {(event.eventType || event.channel) && (
                <p className="text-[11px] text-primary-200 mt-0.5">
                  {[event.eventType, event.channel, formatDate(event.createdDate, timezone)].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            {events.length > 0 && (
              <div className="flex items-center text-primary-100 text-[10px] font-medium gap-0.5 bg-primary-700 rounded-md border border-primary-500 p-0.5 select-none">
                <button
                  disabled={currentIndex <= 0}
                  onClick={() => onNavigate(currentIndex - 1)}
                  className="p-1 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 min-w-[64px] text-center tabular-nums">
                  {currentIndex >= 0
                    ? `${currentIndex + 1} ${tAL.flyoutOf} ${events.length}`
                    : `0 ${tAL.flyoutOf} 0`}
                </span>
                <button
                  disabled={currentIndex >= events.length - 1}
                  onClick={() => onNavigate(currentIndex + 1)}
                  className="p-1 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-primary-200 hover:text-white p-1.5 rounded-full hover:bg-primary-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-none flex px-5 border-b border-gray-100 bg-white">
          <button
            onClick={() => setTab('table')}
            className={clsx(
              'flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 mr-6 transition-all',
              tab === 'table'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            )}
          >
            <TableIcon size={14} /> {tAL.flyoutTable}
          </button>
          <button
            onClick={() => setTab('json')}
            className={clsx(
              'flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
              tab === 'json'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            )}
          >
            <FileJson size={14} /> {tAL.flyoutJson}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* First open with no data yet — show spinner without clearing old content on navigation */}
          {detailLoading && !agentEventData ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{t.admin.loading}</span>
            </div>
          ) : tab === 'table' ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Field search */}
              <div className="flex-none p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={tAL.flyoutSearchPlaceholder}
                    value={fieldSearch}
                    onChange={e => setFieldSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Column headers */}
              <div className="flex-none flex border-b border-primary-100 bg-primary-50 text-[10px] font-bold text-primary-600 uppercase tracking-widest select-none">
                <div className="w-[38%] px-4 py-2 border-r border-primary-100">{tAL.flyoutField}</div>
                <div className="w-[62%] px-4 py-2">{tAL.flyoutValue}</div>
              </div>

              {/* Rows */}
              <div className="flex-1 overflow-auto pb-8 custom-scrollbar">
                {filteredKeys.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">—</p>
                ) : (
                  filteredKeys.map(k => {
                    const v = flatData[k]
                    const valStr = v === null || v === undefined ? 'null' : String(v)
                    return (
                      <div key={k} className="flex border-b border-gray-50 hover:bg-primary-50/60 transition-colors">
                        <div className="w-[38%] px-4 py-2.5 border-r border-gray-100 flex items-center gap-2 min-w-0">
                          <span className="text-gray-400 hidden sm:inline-block flex-shrink-0">
                            {getTypeIcon(v)}
                          </span>
                          <span className="font-semibold text-primary-700 truncate text-xs select-text cursor-text" title={k}>
                            {k}
                          </span>
                        </div>
                        <div className="w-[62%] px-4 py-2.5 min-w-0">
                          <div className="relative group/val pr-8 flex items-start min-h-[20px]">
                            <span className={clsx('font-mono text-xs select-text cursor-text break-all', getValueColor(v))}>
                              {valStr}
                            </span>
                            <button
                              onClick={() => handleCopyValue(v, k)}
                              className={clsx(
                                'absolute right-0 top-0 p-1.5 rounded-md bg-white border border-gray-200 text-gray-400 opacity-0 group-hover/val:opacity-100 transition-all flex-shrink-0 hover:border-primary-300 hover:text-primary-600',
                                copiedId === k && 'opacity-100 text-green-600 border-green-300'
                              )}
                            >
                              {copiedId === k ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-none p-4 border-b border-gray-100">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 hover:text-primary-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 transition-all hover:border-primary-300 hover:bg-primary-50"
                >
                  {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {isCopied ? tAL.flyoutCopied : tAL.flyoutCopyJson}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-gray-50 custom-scrollbar">
                <pre
                  className="text-xs font-mono leading-relaxed whitespace-pre-wrap select-text text-gray-800"
                  dangerouslySetInnerHTML={{ __html: highlightJson(jsonData) }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AgentMessagesPage() {
  const { t } = useLang()
  const m = t.agent
  const { timezone } = useFormatDate()
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<AgentItem | null>(null)
  const [events, setEvents] = useState<AgentEventItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState('')
  const [eventType, setEventType] = useState('')
  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '24h' })
  const [flyoutIdx, setFlyoutIdx] = useState<number | null>(null)
  const [flyoutDetailData, setFlyoutDetailData] = useState<Record<string, unknown> | null>(null)
  const [flyoutLoading, setFlyoutLoading] = useState(false)
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([])
  const [timeSeriesEventTypes, setTimeSeriesEventTypes] = useState<string[]>([])
  const [timeSeriesInterval, setTimeSeriesInterval] = useState<'minute' | 'hour' | 'day'>('hour')

  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(highlightKey(agentId)) ?? null
    }
    return null
  })

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  useEffect(() => {
    const loadAgent = async () => {
      try {
        const res = await agentApi.getAgentById(agentId)
        const data = res.data as any
        setAgent(data?.agent ?? data)
      } catch { /* silently ignore */ }
    }
    loadAgent()
  }, [agentId])

  const loadTimeSeries = useCallback(async (tr: TimeRangeValue, q: string, ch: string, et: string) => {
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const rangeHours = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 3_600_000
      const interval: 'minute' | 'hour' | 'day' = rangeHours <= 2 ? 'minute' : rangeHours <= 48 ? 'hour' : 'day'
      setTimeSeriesInterval(interval)

      const res = await agentApi.getAgentEventTimeSeries(agentId, {
        FromDate: fromDate,
        ToDate: toDate,
        ...(q.trim() ? { FullTextSearch: q.trim() } : {}),
        ...(ch ? { Channel: ch } : {}),
        ...(et ? { EventType: et } : {}),
      })
      const raw: AgentEventTimeSeriesItem[] = (res.data as any) ?? []
      if (!Array.isArray(raw) || raw.length === 0) { setTimeSeriesData([]); return }

      const types = Array.from(new Set(raw.map(r => r.eventType))).filter(Boolean)
      setTimeSeriesEventTypes(types)

      const grouped: Record<string, Record<string, number>> = {}
      raw.forEach(r => {
        if (!grouped[r.time]) grouped[r.time] = {}
        grouped[r.time][r.eventType] = (grouped[r.time][r.eventType] ?? 0) + r.count
      })
      const chartData = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, counts]) => ({ time, ...counts }))
      setTimeSeriesData(chartData)
    } catch { /* silently ignore — chart is optional */ }
  }, [agentId])

  const loadEvents = useCallback(async (pg: number, limit: number, tr: TimeRangeValue, q: string, ch: string, et: string) => {
    setLoading(true)
    try {
      const { fromDate, toDate } = getTimeFilter(tr)
      const payload: GetAgentEventsPayload = {
        Page: pg,
        Limit: limit,
        FromDate: fromDate,
        ToDate: toDate,
        ...(q.trim() ? { FullTextSearch: q.trim() } : {}),
        ...(ch ? { Channel: ch } : {}),
        ...(et ? { EventType: et } : {}),
      }

      const [eventsRes, countRes] = await Promise.all([
        agentApi.getAgentEvents(agentId, payload),
        agentApi.getAgentEventCount(agentId, payload),
      ])

      const eventsData = eventsRes.data as any
      const countData = countRes.data as any

      setEvents(eventsData?.events ?? eventsData ?? [])
      setTotal(typeof countData === 'number' ? countData : (countData?.count ?? 0))
      setPage(pg)

      if (pg === 1) loadTimeSeries(tr, q, ch, et)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadEventsFailed)
    } finally {
      setLoading(false)
    }
  }, [agentId, m.loadEventsFailed, loadTimeSeries])

  useEffect(() => {
    loadEvents(1, itemsPerPage, timeRange, search, channel, eventType)
  }, [])

  const handleRefresh = () => loadEvents(1, itemsPerPage, timeRange, search, channel, eventType)

  const handleTimeRangeChange = (tr: TimeRangeValue) => {
    setTimeRange(tr)
    loadEvents(1, itemsPerPage, tr, search, channel, eventType)
  }

  const handleChannelChange = (ch: string) => {
    setChannel(ch)
    loadEvents(1, itemsPerPage, timeRange, search, ch, eventType)
  }

  const handleEventTypeChange = (et: string) => {
    setEventType(et)
    loadEvents(1, itemsPerPage, timeRange, search, channel, et)
  }

  const handleRowClick = (eventId: string) => {
    const next = highlightedEventId === eventId ? null : eventId
    setHighlightedEventId(next)
    if (next) sessionStorage.setItem(highlightKey(agentId), next)
    else sessionStorage.removeItem(highlightKey(agentId))
  }

  const openFlyout = useCallback(async (idx: number) => {
    const ev = events[idx]
    if (!ev) return
    const eventId = ev.eventId ?? ev.id ?? String(idx)

    // Sync row highlight + sessionStorage
    setHighlightedEventId(eventId)
    if (eventId) sessionStorage.setItem(highlightKey(agentId), eventId)

    // Scroll row into view
    setTimeout(() => {
      document.getElementById(`event-row-${eventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)

    setFlyoutIdx(idx)
    // keep old data visible while fetching — prevents flicker
    setFlyoutLoading(true)
    try {
      if (eventId) {
        const res = await agentApi.getAgentEventById(eventId)
        const data = res.data as any
        const agentEventField = data?.AgentEvent ?? data?.agentEvent ?? data?.agent_event ?? null
        setFlyoutDetailData(agentEventField)
      }
    } catch { /* keep null */ } finally {
      setFlyoutLoading(false)
    }
  }, [events, agentId])

  const cols = [m.colEventDate, m.colEventType, m.colChannel, m.colTags, m.colErrorCount, m.colStatus, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {flyoutIdx !== null && events[flyoutIdx] && (
        <EventDetailFlyout
          event={events[flyoutIdx]}
          agentEventData={flyoutDetailData}
          loading={flyoutLoading}
          events={events}
          currentIndex={flyoutIdx}
          onNavigate={openFlyout}
          onClose={() => { setFlyoutIdx(null); setFlyoutDetailData(null) }}
        />
      )}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-5">
        <button
          onClick={() => router.push(`/agent?highlight=${agentId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{m.messagesTitle}</h1>
            {agent?.code && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{agent.code}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{m.messagesSubtitle}</p>
        </div>
      </div>

      {/* Time Series Histogram */}
      {timeSeriesData.length > 0 && (
        <div className="flex-none mb-4">
          <AgentEventHistogram
            data={timeSeriesData}
            eventTypes={timeSeriesEventTypes}
            total={total}
            interval={timeSeriesInterval}
          />
        </div>
      )}

      {/* Filters bar */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap gap-2 items-center mb-4">
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
          <option>Full Text Search</option>
        </select>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRefresh()}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
        </button>

        <select
          value={channel}
          onChange={e => handleChannelChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.filterChannel}: {m.filterAll}</option>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={eventType}
          onChange={e => handleEventTypeChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{m.filterEventType}: {m.filterAll}</option>
          {EVENT_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
        </select>

        <AdvancedTimeRangeSelector
          value={timeRange}
          onChange={handleTimeRangeChange}
          disabled={loading}
        />

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Table card */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th
                    key={i}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap',
                      i === 0 && 'rounded-tl-xl',
                      i === cols.length - 1 && 'rounded-tr-xl w-12',
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-400">{t.admin.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-4 py-16 text-center">
                    <p className="text-sm font-semibold text-gray-500">{m.noEventsFound}</p>
                  </td>
                </tr>
              ) : (
                events.map((event, idx) => {
                  const eventId = event.eventId ?? event.id ?? String(idx)
                  const tags = event.tags ? event.tags.split(',').map(s => s.trim()).filter(Boolean) : []
                  const highlighted = !!highlightedEventId && highlightedEventId === eventId
                  return (
                    <tr
                      key={eventId}
                      id={`event-row-${eventId}`}
                      onClick={() => handleRowClick(eventId)}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        highlighted
                          ? 'bg-primary-100'
                          : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/40 hover:bg-gray-100/50'
                      )}
                    >
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={clsx('text-sm font-semibold', highlighted ? 'text-primary-700' : 'text-gray-800')}>
                            {formatDate(event.createdDate, timezone)}
                          </span>
                          {formatAge(event.createdDate) && (
                            <span className="text-xs text-gray-400">{formatAge(event.createdDate)}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          event.eventType === 'Heartbeat'
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                            : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
                        )}>
                          {event.eventType ?? '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                        {event.channel ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            {event.channel}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        {tags.length > 0 ? (
                          tags.map(tag => (
                            <span key={tag} className="inline-flex mr-1 mb-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">
                              {tag}
                            </span>
                          ))
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-center">
                        {event.errorCount ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 ring-1 ring-red-200">
                            {event.errorCount}
                          </span>
                        ) : <span className="text-gray-400">0</span>}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100">
                        {event.status ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {event.status.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                                <span key={s} className={clsx(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ring-1',
                                  /^OK$|SUCCESS/.test(s)
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : /WARN|PENDING/.test(s)
                                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                    : /NOT_FOUND|ERROR|FAIL|INVALID|REJECT|MISMATCH|UNKNOWN/.test(s)
                                    ? 'bg-red-50 text-red-700 ring-red-200'
                                    : 'bg-gray-100 text-gray-600 ring-gray-200'
                                )}>
                                  {s}
                                </span>
                              ))}
                            </div>
                            {event.statusDesc && (
                              <span className="text-xs text-gray-400 max-w-[180px] truncate" title={event.statusDesc}>{event.statusDesc}</span>
                            )}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>

                      <td className="px-4 py-3 border-b border-gray-100 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openFlyout(idx)}
                          title={m.viewDetail}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex-none flex items-center justify-end px-6 py-3 border-t border-gray-100 gap-4 sm:gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{m.rowsPerPage}</span>
            <select
              value={itemsPerPage}
              onChange={e => { const n = Number(e.target.value); setItemsPerPage(n); loadEvents(1, n, timeRange, search, channel, eventType) }}
              className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">{total === 0 ? '0-0' : `${startRow}-${endRow}`} {m.of} {total}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadEvents(page - 1, itemsPerPage, timeRange, search, channel, eventType)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => loadEvents(page + 1, itemsPerPage, timeRange, search, channel, eventType)}
                disabled={page >= totalPages || total === 0 || loading}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
