'use client'

import { useState, useEffect } from 'react'
import { X, History, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { auditTrailApi, type AuditTrack } from '@/lib/api/audit-trail.api'
import { useFormatDate } from '@/hooks/useFormatDate'
import { formatDateTime as formatDateTimeTz } from '@/lib/datetime'

function formatDateTime(d: string | null | undefined, timezone: string) {
  if (!d) return '—'
  return formatDateTimeTz(d, timezone)
}

function ActionBadge({ action }: { action?: string | null }) {
  const a = action?.toLowerCase()
  if (a === 'added') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{action}</span>
  )
  if (a === 'modified') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">{action}</span>
  )
  if (a === 'deleted') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 ring-1 ring-red-200">{action}</span>
  )
  return <span className="text-xs text-gray-500">{action ?? '—'}</span>
}

function highlightJson(json: string): string {
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span style="color:#6366f1;font-weight:600">${match}</span>`
        return `<span style="color:#059669">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span style="color:#d97706">${match}</span>`
      if (/null/.test(match)) return `<span style="color:#9ca3af">${match}</span>`
      return `<span style="color:#0284c7">${match}</span>`
    }
  )
}

function computeDiff(oldJson: string | null | undefined, newJson: string | null | undefined) {
  try {
    const oldObj: Record<string, unknown> = oldJson ? JSON.parse(oldJson) : {}
    const newObj: Record<string, unknown> = newJson ? JSON.parse(newJson) : {}
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
    const diffOld: Record<string, unknown> = {}
    const diffNew: Record<string, unknown> = {}
    for (const k of allKeys) {
      if (JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])) {
        if (k in oldObj) diffOld[k] = oldObj[k]
        if (k in newObj) diffNew[k] = newObj[k]
      }
    }
    return { diffOld, diffNew }
  } catch {
    return { diffOld: {}, diffNew: {} }
  }
}

function DiffCell({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const keys = Object.keys(data)
  if (keys.length === 0) return <span className="text-gray-300 text-xs">—</span>

  const formatted = JSON.stringify(data, null, 2)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(formatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="text-[10px] text-gray-400">{keys.length} field{keys.length > 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-80 shadow-xl border border-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] text-gray-400 font-medium">{keys.length} field{keys.length > 1 ? 's' : ''}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-600 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            className="text-[10px] font-mono p-3 overflow-auto whitespace-pre-wrap break-all leading-relaxed max-h-72"
            dangerouslySetInnerHTML={{ __html: highlightJson(formatted) }}
          />
        </div>
      )}
    </div>
  )
}

interface Props {
  rowId: string
  onClose: () => void
}

export default function AuditTrailDrawer({ rowId, onClose }: Props) {
  const { timezone } = useFormatDate()
  const [tracks, setTracks] = useState<AuditTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    auditTrailApi.getByRowId(rowId)
      .then(r => {
        const data = r.data as any
        const list: AuditTrack[] = Array.isArray(data) ? data : []
        setTracks(list)
      })
      .catch(() => setError('Failed to load audit trail'))
      .finally(() => setLoading(false))
  }, [rowId])

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-[860px] bg-white border-l border-gray-200 shadow-2xl z-[100] flex flex-col">

        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-white/70" />
            <span className="text-sm font-bold uppercase tracking-widest">Audit Trail</span>
            <span className="text-xs text-white/50 ml-1">{rowId}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <svg className="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <History className="w-8 h-8 opacity-30" />
              <span className="text-sm">No audit records found</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-36">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">ApiName</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-24">Action</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-36">By</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-24">Old</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-24">New</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tracks.map((t, i) => {
                  const { diffOld, diffNew } = computeDiff(t.oldValue, t.newValue)
                  return (
                    <tr key={t.id ?? i} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        <div>{formatDateTime(t.createdDate, timezone)}</div>
                        {t.ipAddress2 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{t.ipAddress2}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="block font-semibold text-gray-700 cursor-help"
                          title={t.actionRequested ?? undefined}
                        >
                          {t.apiName ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={t.actionName} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.actionBy ?? '—'}</td>
                      <td className="px-4 py-3"><DiffCell data={diffOld} /></td>
                      <td className="px-4 py-3"><DiffCell data={diffNew} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
