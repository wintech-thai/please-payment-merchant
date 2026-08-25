'use client'

import { useState, useEffect } from 'react'
import { X, TriangleAlert } from 'lucide-react'
import { auditNoticeApi, type AuditNotice } from '@/lib/api/audit-notice.api'

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

interface Props {
  rowId: string
  onClose: () => void
}

export default function AuditNoticeDrawer({ rowId, onClose }: Props) {
  const [notices, setNotices] = useState<AuditNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    auditNoticeApi.getByRowId(rowId)
      .then(r => {
        const data = r.data as any
        setNotices(Array.isArray(data) ? data : [])
      })
      .catch(() => setError('Failed to load notices'))
      .finally(() => setLoading(false))
  }, [rowId])

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-black/20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-[640px] bg-white border-l border-gray-200 shadow-2xl z-[100] flex flex-col">

        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 bg-amber-600 text-white">
          <div className="flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-white/80" />
            <span className="text-sm font-bold uppercase tracking-widest">Notices / Warnings</span>
            <span className="text-xs text-white/50 ml-1 font-mono">{rowId}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <svg className="w-5 h-5 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
          ) : notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
              <TriangleAlert className="w-8 h-8 opacity-30" />
              <span className="text-sm">No notices found</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-36">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide w-32">Model</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {notices.map((n, i) => (
                  <tr key={n.id ?? i} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(n.createdDate)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        {n.trackModel ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 leading-relaxed">{n.message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
