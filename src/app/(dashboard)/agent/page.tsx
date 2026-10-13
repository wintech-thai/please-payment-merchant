'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { agentApi } from '@/lib/api/agent.api'
import type { AgentItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, QrCode, X, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import QRCode from 'react-qr-code'
import { useFormatDate } from '@/hooks/useFormatDate'

type LineApiStatus = { ok?: boolean; podStatus?: string; login?: string; agentId?: string; raw?: string }

function StatusBadge({ status }: { status?: string | null }) {
  const { t } = useLang()
  const lower = status?.toLowerCase()
  const isActive = lower === 'active' || !lower
  const cfg = isActive
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : { bg: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {isActive ? t.agent.statusActive : t.agent.statusInactive}
    </span>
  )
}

function syntaxHighlight(json: string): string {
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span style="color:#7dd3fc">${match}</span>` // key → sky
        return `<span style="color:#86efac">${match}</span>` // string → green
      }
      if (/true|false/.test(match)) return `<span style="color:#c084fc">${match}</span>` // boolean → purple
      if (/null/.test(match)) return `<span style="color:#f87171">${match}</span>` // null → red
      return `<span style="color:#fbbf24">${match}</span>` // number → amber
    }
  )
}

function LineApiStatusBadge({ status, labels }: { status?: LineApiStatus | null; labels: { running: string; offline: string; unknown: string } }) {
  const { t } = useLang()
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const translateLoginState = (state: string) => {
    switch (state.toLowerCase()) {
      case 'ready': return t.agent.loginStateReady
      case 'pin_pending': return t.agent.loginStatePinPending
      default: return state
    }
  }
  if (!status) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400 ring-1 ring-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse flex-shrink-0" />
      —
    </span>
  )
  const isRunning = status.ok === true
  const isOffline = status.podStatus === 'Offline'
  const cfg = isRunning
    ? { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
    : isOffline
      ? { bg: 'bg-red-50 text-red-600 ring-red-200', dot: 'bg-red-400' }
      : { bg: 'bg-gray-100 text-gray-400 ring-gray-200', dot: 'bg-gray-300' }
  const label = isRunning ? labels.running : isOffline ? labels.offline : labels.unknown
  const handleCopy = () => {
    const combined = { ok: status.ok, podStatus: status.podStatus, login: status.login, ...(status.raw ? JSON.parse(status.raw) : {}) }
    navigator.clipboard.writeText(JSON.stringify(combined, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', cfg.bg)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
        {label}
      </span>
      {status.login != null && (
        <button
          onClick={e => { e.stopPropagation(); setShowRaw(v => !v) }}
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 transition-opacity hover:opacity-70',
            status.login.toLowerCase() === 'ready'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-red-50 text-red-700 ring-red-200'
          )}
        >
          <span className={clsx(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            status.login.toLowerCase() === 'ready' ? 'bg-emerald-500' : 'bg-red-500'
          )} />
          {translateLoginState(status.login)}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      )}
      {showRaw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowRaw(false)}>
          <div className="w-full max-w-3xl flex flex-col max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-primary-950 border border-primary-800" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-primary-900 border-b border-primary-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-sm font-semibold text-primary-100">Agent Status</span>
                <span className="text-xs text-primary-400 font-mono">{status.agentId}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    copied ? 'bg-emerald-900/30 text-emerald-400' : 'bg-primary-800 text-primary-300 hover:bg-primary-700 hover:text-primary-100'
                  )}
                >
                  {copied ? (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Copied</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy</>
                  )}
                </button>
                <button
                  onClick={() => setShowRaw(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-primary-400 hover:text-primary-100 hover:bg-primary-800"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="overflow-auto p-5 custom-scrollbar">
              <pre className="text-xs font-mono leading-relaxed text-primary-200" dangerouslySetInnerHTML={{ __html: syntaxHighlight(JSON.stringify({
                ok: status.ok,
                podStatus: status.podStatus,
                login: status.login,
                ...(status.raw ? JSON.parse(status.raw) : {}),
              }, null, 2)) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmActionModal({ title, desc, onConfirm, onCancel, loading, t }: {
  title: string; desc: string; onConfirm: () => void; onCancel: () => void; loading: boolean
  t: { cancel: string; confirm: string }
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl bg-white text-center px-8 py-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-7">{desc}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors uppercase">
            {t.cancel}
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors uppercase">
            {loading ? '...' : t.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentListContent() {
  const { t } = useLang()
  const m = t.agent
  const { fmtDateTime } = useFormatDate()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const highlightIdParam = searchParams.get('highlight')

  const [agents, setAgents] = useState<AgentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(highlightIdParam)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type?: 'enable' | 'disable'; agentId?: string; agentCode?: string }>({ open: false })
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [lineApiStatuses, setLineApiStatuses] = useState<Record<string, LineApiStatus>>({})
  const [qrModal, setQrModal] = useState<{ open: boolean; agent?: AgentItem }>({ open: false })
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrFetchError, setQrFetchError] = useState<string | null>(null)
  const [qrLoginState, setQrLoginState] = useState<'waiting' | 'pin_pending' | 'success' | 'timeout'>('waiting')
  const [qrPinCode, setQrPinCode] = useState<string | null>(null)
  const qrPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrElapsedRef = useRef(0)
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAgents = async (p = page, search = searchTerm) => {
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.allSettled([
        agentApi.getAgents({ FullTextSearch: search, Page: p, Limit: itemsPerPage }),
        agentApi.getAgentCount({ FullTextSearch: search }),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value.data as any
        const list: any[] = Array.isArray(data) ? data : (data?.agents ?? data?.Agents ?? [])
        const normalized = list.map(item => ({
          ...item,
          agentId: item.agentId ?? item.AgentId ?? item.id ?? item.Id ?? '',
          agentType: item.agentType ?? item.AgentType ?? null,
          agentConfigObj: item.agentConfigObj ?? item.AgentConfigObj ?? null,
          lastSeenDate: item.lastSeenDate ?? item.LastSeenDate ?? null,
          lastSeenErrorDate: item.lastSeenErrorDate ?? item.LastSeenErrorDate ?? null,
        }))
        normalized.sort((a, b) => {
          const ta = a.createdDate ? new Date(a.createdDate).getTime() : 0
          const tb = b.createdDate ? new Date(b.createdDate).getTime() : 0
          return tb - ta
        })
        setAgents(normalized)
      }
      if (countRes.status === 'fulfilled') {
        const cData = countRes.value.data as any
        setTotal(typeof cData === 'number' ? cData : (cData?.count ?? 0))
      }
    } catch {
      toast.error(m.loadAgentsFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [page])

  // Background polling for Line Api agents every 10 seconds
  useEffect(() => {
    const lineAgents = agents.filter(a => (a.agentType ?? '').toLowerCase() === 'line api')
    if (lineAgents.length === 0) return

    const poll = () => {
      lineAgents.forEach(agent =>
        agentApi.getLineApiAgentStatus(agent.agentId)
          .then(res => setLineApiStatuses(prev => ({ ...prev, [agent.agentId]: res.data as any })))
          .catch(() => {})
      )
    }

    poll()
    pollingRef.current = setInterval(poll, 10_000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [agents]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => { setPage(1); fetchAgents(1, searchTerm) }

  const stopQrPolling = () => {
    if (qrPollingRef.current) { clearInterval(qrPollingRef.current); qrPollingRef.current = null }
    qrElapsedRef.current = 0
  }

  const handleOpenQrModal = async (agent: AgentItem) => {
    setQrModal({ open: true, agent })
    setQrUrl(null)
    setQrFetchError(null)
    setQrLoginState('waiting')
    setQrPinCode(null)
    stopQrPolling()

    setQrLoading(true)
    try {
      const res = await agentApi.getLineApiAgentLoginQr(agent.agentId)
      const data = res.data as any
      if (data?.qrUrl) {
        setQrUrl(data.qrUrl)
        qrElapsedRef.current = 0
        qrPollingRef.current = setInterval(async () => {
          qrElapsedRef.current += 2
          if (qrElapsedRef.current >= 60) {
            stopQrPolling()
            setQrLoginState('timeout')
            return
          }
          try {
            const sRes = await agentApi.getLineApiAgentLoginStatus(agent.agentId)
            const sData = sRes.data as any
            if (sData?.state === 'ready') {
              stopQrPolling()
              setQrPinCode(null)
              setQrLoginState('success')
            } else if (sData?.state === 'pin_pending' && sData?.pincode) {
              setQrPinCode(sData.pincode)
              setQrLoginState('pin_pending')
            }
          } catch {}
        }, 2000)
      } else {
        setQrFetchError(data?.error ?? m.qrFetchFailed)
      }
    } catch (err: any) {
      setQrFetchError(err?.message ?? m.qrFetchFailed)
    } finally {
      setQrLoading(false)
    }
  }

  const handleCloseQrModal = () => {
    stopQrPolling()
    setQrModal({ open: false })
  }

  useEffect(() => {
    if (!highlightIdParam) return
    setSelectedRowId(highlightIdParam)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
    const timer = setTimeout(() => {
      document.getElementById(`agent-row-${highlightIdParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightIdParam])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openActionId) {
        const ref = menuRefs.current[openActionId]
        if (ref && !ref.contains(e.target as Node)) setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openActionId])

  const handleConfirmAction = async () => {
    if (!confirmModal.agentId || !confirmModal.type) return
    setActionLoading(true)
    try {
      if (confirmModal.type === 'enable') {
        await agentApi.enableLineApiAgentById(confirmModal.agentId)
        toast.success(m.enableSuccess)
      } else {
        await agentApi.disableLineApiAgentById(confirmModal.agentId)
        toast.success(m.disableSuccess)
      }
      fetchAgents()
    } catch {
      toast.error(m.actionFailed)
    } finally {
      setActionLoading(false)
      setConfirmModal({ open: false })
      setTogglingAgentId(null)
    }
  }

  const formatAge = (d?: string | null) => {
    if (!d) return ''
    const diffMs = Date.now() - new Date(d).getTime()
    if (diffMs < 0) return ''
    const totalMin = Math.floor(diffMs / 60_000)
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    if (hours === 0) return `${mins}min`
    return `${hours}h ${mins}min`
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const startRow = total === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, total)
  const cols = [m.colCode, m.colAgentType, m.colDescription, m.colTags, m.colCreatedDate, m.colLastSeen, m.colLastErrorSeen, m.colStatus, m.colEnabled, m.colAction]

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {confirmModal.open && (
        <ConfirmActionModal
          title={confirmModal.type === 'enable' ? m.confirmEnableTitle : m.confirmDisableTitle}
          desc={confirmModal.type === 'enable' ? m.confirmEnableDesc : m.confirmDisableDesc}
          onConfirm={handleConfirmAction}
          onCancel={() => { setConfirmModal({ open: false }); setTogglingAgentId(null) }}
          loading={actionLoading}
          t={{ cancel: t.admin.cancel, confirm: m.btnConfirm }}
        />
      )}

      {qrModal.open && qrModal.agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">{m.qrModalTitle}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{m.qrModalDesc}</p>
              </div>
              <button onClick={handleCloseQrModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row">
              <div className="flex-1 p-6 flex flex-col gap-4 sm:border-r border-gray-100">
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-400 shrink-0 whitespace-nowrap">{m.qrLabelCode}</span>
                    <span className="font-semibold text-gray-900">{qrModal.agent.code}</span>
                  </div>
                  {qrModal.agent.description && (
                    <div className="flex gap-2">
                      <span className="text-gray-400 shrink-0 whitespace-nowrap">{m.qrLabelDesc}</span>
                      <span className="text-gray-700">{qrModal.agent.description}</span>
                    </div>
                  )}
                </div>

                {qrLoginState === 'pin_pending' && qrPinCode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-amber-600 font-medium mb-1">{m.qrPinLabel}</p>
                    <p className="text-3xl font-bold tracking-[0.3em] text-amber-700">{qrPinCode}</p>
                    <p className="text-xs text-amber-600 mt-1">{m.qrPinPending}</p>
                  </div>
                )}

                {!qrLoading && (qrUrl || qrFetchError) && (
                  <div className={clsx('flex items-center gap-2 text-sm font-medium',
                    qrLoginState === 'success' ? 'text-emerald-600' :
                    qrLoginState === 'timeout' ? 'text-red-500' :
                    qrLoginState === 'pin_pending' ? 'text-amber-600' : 'text-gray-500')}>
                    {(qrLoginState === 'waiting' || qrLoginState === 'pin_pending') && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {qrLoginState === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {qrLoginState === 'timeout' && <AlertCircle className="w-4 h-4" />}
                    {qrFetchError ? qrFetchError :
                     qrLoginState === 'waiting' ? m.qrWaiting :
                     qrLoginState === 'pin_pending' ? m.qrPinPending :
                     qrLoginState === 'success' ? m.qrSuccess : m.qrTimeout}
                  </div>
                )}

                <div className="mt-auto flex justify-end">
                  <button onClick={handleCloseQrModal}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    {m.btnCloseQr}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center p-6 w-full sm:w-56">
                {qrLoading && (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-gray-500">{m.qrLoadingQr}</p>
                  </div>
                )}
                {qrFetchError && !qrLoading && <AlertCircle className="w-10 h-10 text-red-300" />}
                {qrUrl && !qrLoading && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <QRCode value={qrUrl} size={168} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.merchantListTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{m.merchantListSubtitle}</p>
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
        ) : agents.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">{m.noAgentsFound}</div>
        ) : (
          <table className="w-auto min-w-full text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                {cols.map((col, i) => (
                  <th key={i} className="px-4 py-3 border-b border-gray-200 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => {
                const isActive = (agent.agentStatus ?? '').toLowerCase() === 'active' || !agent.agentStatus
                const isLineApi = (agent.agentType ?? '').toLowerCase() === 'line api'
                const highlighted = !!agent.agentId && selectedRowId === agent.agentId
                return (
                  <tr
                    id={`agent-row-${agent.agentId}`}
                    key={agent.agentId}
                    onClick={() => {
                      const next = selectedRowId === agent.agentId ? null : agent.agentId
                      setSelectedRowId(next)
                      if (next) sessionStorage.setItem('agent_highlight', next)
                      else sessionStorage.removeItem('agent_highlight')
                    }}
                    className={clsx('cursor-pointer transition-colors', highlighted ? 'bg-primary-50' : 'hover:bg-gray-50')}
                  >
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          sessionStorage.setItem('agent_highlight', agent.agentId)
                          router.push(`/agent/${agent.agentId}`)
                        }}
                        className={clsx('text-sm font-semibold hover:underline', highlighted ? 'text-primary-700' : 'text-primary-600')}
                      >
                        {agent.code ?? '—'}
                      </button>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{agent.agentId}</p>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">
                      <span className={clsx(
                        'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1',
                        isLineApi ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-blue-50 text-blue-700 ring-blue-200'
                      )}>
                        {agent.agentType ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-600 max-w-[200px] truncate">
                      {agent.description ?? '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      {agent.tags
                        ? agent.tags.split(',').map(tag => (
                          <span key={tag} className="inline-flex mr-1 mb-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 rounded-full text-[10px] font-semibold">{tag.trim()}</span>
                        ))
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                      {agent.createdDate ? fmtDateTime(agent.createdDate) : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                      {agent.lastSeenDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{fmtDateTime(agent.lastSeenDate)}</span>
                          {formatAge(agent.lastSeenDate) && <span className="text-xs text-gray-400">{formatAge(agent.lastSeenDate)}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap text-sm text-gray-500">
                      {agent.lastSeenErrorDate ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{fmtDateTime(agent.lastSeenErrorDate)}</span>
                          {formatAge(agent.lastSeenErrorDate) && <span className="text-xs text-gray-400">{formatAge(agent.lastSeenErrorDate)}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={agent.agentStatus} />
                        {isLineApi && (
                          <LineApiStatusBadge status={lineApiStatuses[agent.agentId] ?? null} labels={{ running: m.podRunning, offline: m.podOffline, unknown: m.podUnknown }} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {isLineApi ? (
                        <button
                          onClick={() => {
                            setTogglingAgentId(agent.agentId)
                            setConfirmModal({ open: true, type: isActive ? 'disable' : 'enable', agentId: agent.agentId, agentCode: agent.code ?? undefined })
                          }}
                          disabled={togglingAgentId === agent.agentId}
                          className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', isActive ? 'bg-primary-600' : 'bg-gray-300')}
                        >
                          <span className={clsx('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', isActive ? 'translate-x-5' : 'translate-x-1')} />
                        </button>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="relative" ref={el => { menuRefs.current[agent.agentId] = el }}>
                        <button
                          onClick={() => setOpenActionId(prev => prev === agent.agentId ? null : agent.agentId)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openActionId === agent.agentId && (
                          <div className="absolute right-0 top-9 z-50 w-44 rounded-xl shadow-xl bg-white border border-gray-100 overflow-hidden">
                            <button
                              onClick={() => { setOpenActionId(null); router.push(`/agent/${agent.agentId}/messages`) }}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                              {m.menuEvents}
                            </button>
                            {isLineApi && (
                              <button
                                onClick={() => { setOpenActionId(null); handleOpenQrModal(agent) }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <QrCode className="w-4 h-4 flex-shrink-0" />
                                {m.menuLoginQr}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && agents.length > 0 && (
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

export default function AgentListPage() {
  return (
    <Suspense fallback={null}>
      <AgentListContent />
    </Suspense>
  )
}
