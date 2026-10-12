'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentEventItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'

function StatusBadge({ status }: { status?: string | null }) {
  const isOk = (status ?? '').toUpperCase() === 'OK'
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1',
      isOk ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', isOk ? 'bg-emerald-500' : 'bg-amber-400')} />
      {status ?? '—'}
    </span>
  )
}

export default function AgentEventsPage() {
  const { t } = useLang()
  const m = t.agent
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [events, setEvents] = useState<AgentEventItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchEvents = async (p = page, search = searchTerm) => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.allSettled([
        agentApi.getAgentEvents(agentId, { FullTextSearch: search, Page: p, Limit: itemsPerPage }),
        agentApi.getAgentEventCount(agentId, { FullTextSearch: search }),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.events ?? data?.Events ?? [])
        setEvents(list)
      }
      if (countRes.status === 'fulfilled') {
        const cData = countRes.value.data as any
        setTotal(typeof cData === 'number' ? cData : (cData?.count ?? 0))
      }
    } catch {
      toast.error(m.loadEventsFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [page])

  const handleSearch = () => { setPage(1); fetchEvents(1, searchTerm) }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-5">
        <button onClick={() => router.push(`/agent/${agentId}`)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.eventsTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.eventsSubtitle}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex-none flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            placeholder={m.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
        >
          {t.admin.search}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t.admin.loading}
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">{m.noEventsFound}</div>
        ) : (
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {[m.colEventType, m.colChannel, m.colEventStatus, m.colEventDate].map((col, i) => (
                  <th key={i} className="px-4 py-3 border-b border-gray-200 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((evt, i) => (
                <tr key={evt.id ?? i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                      {evt.eventType ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-gray-600">
                    {evt.channel ?? '—'}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                    <StatusBadge status={evt.status} />
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-gray-500">
                    {evt.createdDate ? fmtDateTime(evt.createdDate) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && events.length > 0 && (
        <div className="flex-none flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>{m.showing} {startRow}-{endRow} {m.ofTotal} {total}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">{page} / {Math.max(1, totalPages)}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
