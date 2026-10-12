'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Copy, Check, X, Eye } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import { useFormatDate } from '@/hooks/useFormatDate'

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

function RawJsonModal({ data, onClose }: { data: unknown; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)
  const copy = () => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-none">
          <span className="text-sm font-semibold text-gray-700 font-mono">Status JSON</span>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <pre
          className="overflow-auto p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all bg-gray-50"
          dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
        />
      </div>
    </div>
  )
}

function ReadonlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{label}</label>
      <div className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-600 min-h-[42px] flex items-center">
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  )
}

export default function AgentDetailPage() {
  const { t } = useLang()
  const m = t.agent
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const params = useParams()
  const agentId = params.id as string

  const [agent, setAgent] = useState<AgentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusData, setStatusData] = useState<unknown>(null)
  const [showStatusJson, setShowStatusJson] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    agentApi.getAgentById(agentId)
      .then(res => {
        const data = res.data as any
        setAgent(data?.agent ?? data)
      })
      .catch(() => {
        toast.error(m.loadAgentFailed)
        router.push('/agent')
      })
      .finally(() => setLoading(false))
  }, [agentId])

  const isLineApi = (agent?.agentType ?? '').toLowerCase() === 'line api'

  const handleViewStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await agentApi.getLineApiAgentStatus(agentId)
      setStatusData(res.data)
      setShowStatusJson(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.loadAgentFailed)
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  const bankAccounts = agent?.bankAccountsSelectedObj ?? []

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showStatusJson && statusData != null && <RawJsonModal data={statusData} onClose={() => setShowStatusJson(false)} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-4">
        <button onClick={() => router.push(`/agent?highlight=${agentId}`)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
            {agent?.code && <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">{agent.code}</span>}
            {isLineApi && <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full ring-1 ring-green-200">Line Api</span>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{m.detailSubtitle}</p>
        </div>
        {isLineApi && (
          <button
            onClick={handleViewStatus}
            disabled={statusLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            {m.viewStatusJson}
          </button>
        )}
      </div>

      <div className="flex-none bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium mb-4">
        {m.readOnlyNotice}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-2">
        {/* Basic Info */}
        <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
            <h2 className="text-sm font-bold text-gray-900">{m.sectionInfo}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
            <ReadonlyField label={m.fieldCode} value={agent?.code} />
            <ReadonlyField label={m.fieldAgentType} value={agent?.agentType} />
            <ReadonlyField label={m.fieldDescription} value={agent?.description} />
            <ReadonlyField
              label={m.fieldTags}
              value={agent?.tags ? (
                <div className="flex flex-wrap gap-1">
                  {agent.tags.split(',').map(tag => (
                    <span key={tag} className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                  ))}
                </div>
              ) : undefined}
            />
            <ReadonlyField label={m.fieldCreatedDate} value={agent?.createdDate ? fmtDateTime(agent.createdDate) : undefined} />
            <ReadonlyField label={m.fieldLastSeen} value={agent?.lastSeenDate ? fmtDateTime(agent.lastSeenDate) : undefined} />
            <ReadonlyField label={m.fieldLastErrorSeen} value={agent?.lastSeenErrorDate ? fmtDateTime(agent.lastSeenErrorDate) : undefined} />
          </div>
        </div>

        {/* Line Api Config */}
        {isLineApi && (
          <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1 h-5 bg-green-500 rounded-full flex-shrink-0" />
              <h2 className="text-sm font-bold text-gray-900">{m.sectionLineConfig}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
              <ReadonlyField label={m.fieldLineUserName} value={agent?.agentConfigObj?.userName} />
              <ReadonlyField label={m.fieldAgentImageTag} value={agent?.agentConfigObj?.agentImageTag} />
            </div>
          </div>
        )}

        {/* Bank Accounts */}
        <div className="flex-none bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-5">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
            <h2 className="text-sm font-bold text-gray-900">{m.sectionBankAccounts}</h2>
          </div>
          {bankAccounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{m.noBankAccounts}</p>
          ) : (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {bankAccounts.map((acc, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3 w-28">
                        <span className="inline-flex px-2.5 py-0.5 bg-gray-800 text-white rounded text-xs font-bold">{acc.bankCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-semibold">{acc.accountName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{acc.accountNumber}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
