'use client'

import { useState } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLang } from '@/context/LanguageContext'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { downloadCsv, type CsvCell } from '@/lib/csv-export'

const PAGE_LIMIT = 200

export interface ExportFetchParams {
  fromDate: string
  toDate: string
  status?: string
  isPeerToPeer?: boolean
}

export interface ExportCsvModalProps<T> {
  onClose: () => void
  filenamePrefix: string
  headers: string[]
  mapRow: (item: T) => CsvCell[]
  fetchCount: (params: ExportFetchParams) => Promise<number>
  fetchPage: (params: ExportFetchParams, offset: number, limit: number) => Promise<T[]>
  statusOptions?: { value: string; label: string }[]
  showP2pFilter?: boolean
  getTimeFilter: (tr: TimeRangeValue) => { fromDate: string; toDate: string }
  defaultTimeRange?: TimeRangeValue
}

export default function ExportCsvModal<T>({
  onClose,
  filenamePrefix,
  headers,
  mapRow,
  fetchCount,
  fetchPage,
  statusOptions,
  showP2pFilter,
  getTimeFilter,
  defaultTimeRange,
}: ExportCsvModalProps<T>) {
  const { t } = useLang()
  const m = t.common.export
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(defaultTimeRange ?? { type: 'relative', value: '30d' })
  const [status, setStatus] = useState('')
  const [p2p, setP2p] = useState('')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const handleExport = async () => {
    setExporting(true)
    setProgress({ done: 0, total: 0 })
    try {
      const { fromDate, toDate } = getTimeFilter(timeRange)
      const params: ExportFetchParams = {
        fromDate,
        toDate,
        status: status || undefined,
        isPeerToPeer: showP2pFilter && p2p ? p2p === 'true' : undefined,
      }

      const total = await fetchCount(params)
      if (total <= 0) {
        toast.error(m.noData)
        setExporting(false)
        return
      }
      setProgress({ done: 0, total })

      const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))
      const rows: CsvCell[][] = []
      for (let page = 0; page < totalPages; page++) {
        const items = await fetchPage(params, page * PAGE_LIMIT, PAGE_LIMIT)
        for (const item of items) rows.push(mapRow(item))
        setProgress({ done: Math.min((page + 1) * PAGE_LIMIT, total), total })
        if (items.length === 0) break
      }

      const dateStamp = new Date().toISOString().slice(0, 10)
      downloadCsv(`${filenamePrefix}_${dateStamp}.csv`, headers, rows)
      toast.success(m.success)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.failed)
    } finally {
      setExporting(false)
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !exporting && onClose()}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{m.title}</h3>
          </div>
          {!exporting && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.dateRange}</label>
            <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} disabled={exporting} align="start" />
          </div>

          {statusOptions && statusOptions.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.status}</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={exporting}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
              >
                <option value="">{m.statusAll}</option>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          {showP2pFilter && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.p2p}</label>
              <select
                value={p2p}
                onChange={e => setP2p(e.target.value)}
                disabled={exporting}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
              >
                <option value="">{m.p2pAll}</option>
                <option value="true">{m.p2pOnly}</option>
                <option value="false">{m.p2pNone}</option>
              </select>
            </div>
          )}

          {exporting && (
            <div className="space-y-1.5">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 transition-all duration-200" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {progress.total > 0 ? `${progress.done.toLocaleString()} / ${progress.total.toLocaleString()} (${pct}%)` : m.preparing}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={exporting}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-60"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {exporting ? m.exporting : m.confirmExport}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
