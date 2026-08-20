'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestDetail, PaymentTxJob, PaymentTxJobParameter } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock, ExternalLink, X, Copy, Check, Paperclip, ChevronRight, Link2, TriangleAlert } from 'lucide-react'

type SlipItem = {
  imageBase64: string
  uploadedAt: string
  first4?: string | null
  last4?: string | null
  note?: string | null
}
import QRCode from 'react-qr-code'

function mimeFromBase64(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg'
  if (b64.startsWith('iVBOR')) return 'image/png'
  if (b64.startsWith('R0lG')) return 'image/gif'
  if (b64.startsWith('UklG')) return 'image/webp'
  return 'image/jpeg'
}

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAge(createdDate?: string | null): string {
  if (!createdDate) return ''
  const diffMs = Date.now() - new Date(createdDate).getTime()
  if (diffMs < 0) return ''
  const totalMin = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours === 0) return `${mins}min`
  return `${hours}h ${mins}min`
}

function formatDateTime(d?: string | null) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return d }
}

function StatusBadge({ status, createdDate, payinIsPeerToPeer }: { status?: string | null; createdDate?: string | null; payinIsPeerToPeer?: boolean | null }) {
  const s = status?.toLowerCase()
  if (s === 'match' || s === 'paid' || s === 'approved') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />{status}
      </span>
      {payinIsPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
    </div>
  )
  if (s === 'rejected' || s === 'error') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <AlertCircle className="w-3.5 h-3.5" />{status}
      </span>
      {payinIsPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
    </div>
  )
  const age = formatAge(createdDate)
  return (
    <div className="flex flex-col gap-0.5 w-fit items-start">
      <div className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
          <Clock className="w-3.5 h-3.5" />{status ?? 'Pending'}
        </span>
        {payinIsPeerToPeer && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">P2P</span>}
      </div>
      {age && <span className="text-xs text-gray-400">{age}</span>}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

function JobStatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'success' || s === 'completed' || s === 'done') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'failed' || s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <AlertCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3.5 h-3.5" />{status ?? 'Unknown'}
    </span>
  )
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

function JsonHighlight({ json }: { json: string }) {
  return (
    <pre
      className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed"
      dangerouslySetInnerHTML={{ __html: highlightJson(json) }}
    />
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
          <span className="text-sm font-semibold text-gray-700 font-mono">Raw JSON</span>
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

function SlipViewerModal({
  slips,
  initialIndex,
  orgId,
  paymentRequestId,
  destBankCode,
  destAccountName,
  destAccountNo,
  destAccountType,
  destPromptPayId,
  isPeerToPeer,
  onClose,
}: {
  slips: SlipItem[]
  initialIndex: number
  orgId?: string | null
  paymentRequestId: string
  destBankCode?: string | null
  destAccountName?: string | null
  destAccountNo?: string | null
  destAccountType?: string | null
  destPromptPayId?: string | null
  isPeerToPeer?: boolean | null
  onClose: () => void
}) {
  const { t } = useLang()
  const tr = t.payInRequest
  const [idx, setIdx] = useState(initialIndex)
  const [dupIds, setDupIds] = useState<string[]>([])
  const slip = slips[idx]

  useEffect(() => {
    setDupIds([])
    const f4 = slip?.first4?.trim().toUpperCase()
    const l4 = slip?.last4?.trim().toUpperCase()
    if (!f4 || !l4 || f4.length !== 4 || l4.length !== 4 || !orgId) return
    fetch(`/api/proxy/api/PaymentRequest/org/${orgId}/action/CheckPayInSlipDup/${paymentRequestId}/${f4}/${l4}`)
      .then(r => r.json())
      .then(data => {
        const dups = data?.Duplicates ?? data?.duplicates ?? []
        setDupIds(dups.map((d: { documentId?: string }) => d.documentId).filter(Boolean))
      })
      .catch(() => {})
  }, [idx, slip?.first4, slip?.last4, orgId, paymentRequestId])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex-none flex items-center justify-between px-5 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold">
            {tr.slipViewerTitle} ({idx + 1} / {slips.length})
          </span>
          {slip?.uploadedAt && (
            <span className="text-white/60 text-xs">
              {new Date(slip.uploadedAt).toLocaleString('th-TH')}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Dup warning banner */}
      {dupIds.length > 0 && (
        <div className="flex-none mx-5 mb-1 rounded-lg bg-red-600/90 px-4 py-2.5 flex items-start gap-2" onClick={e => e.stopPropagation()}>
          <TriangleAlert className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white">
            <span className="font-semibold">{tr.slipDupFound} ({dupIds.length})</span>
            {dupIds.map(docId => (
              <span key={docId} className="block mt-0.5 opacity-90">
                {tr.slipDupViewRequest}{' '}
                <a
                  href={`/payment/pay-in-requests/${docId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono bg-white/20 hover:bg-white/30 px-1.5 py-0.5 rounded underline underline-offset-2"
                  onClick={e => e.stopPropagation()}
                >
                  {docId}
                </a>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Image + left metadata panel */}
      <div className="flex-1 flex items-stretch gap-0 min-h-0" onClick={e => e.stopPropagation()}>

        {/* Left metadata panel */}
        {(slip?.first4 || slip?.last4 || slip?.note || destBankCode || destAccountName || destAccountNo || destPromptPayId) && (
          <div className="flex-none w-52 flex flex-col px-4 py-4 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {(destBankCode || destAccountName || destAccountNo || destPromptPayId) && (
                <div className="bg-teal-900/60 border border-teal-500/40 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-teal-300/70 uppercase tracking-widest mb-2">{tr.slipDestAccount}</p>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {destBankCode && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-500 text-white uppercase tracking-wide">{destBankCode}</span>
                    )}
                    {isPeerToPeer && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/80 text-white uppercase tracking-wide">P2P</span>
                    )}
                  </div>
                  {destAccountNo && <p className="text-sm font-mono font-bold text-white leading-tight">{destAccountNo}</p>}
                  {destAccountName && <p className="text-xs text-teal-100 font-medium mt-1">{destAccountName}</p>}
                  {destPromptPayId && (
                    <div className="mt-2 pt-2 border-t border-teal-700/50">
                      <p className="text-[9px] font-bold text-teal-400 uppercase tracking-wide mb-0.5">PromptPay</p>
                      <p className="text-xs font-mono font-bold text-yellow-300">{destPromptPayId}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-3">
              {(slip?.first4 || slip?.last4) && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{tr.slipRefLabel}</p>
                  <p className="text-sm font-mono font-bold text-yellow-300 tracking-wider">{slip.first4} — {slip.last4}</p>
                </div>
              )}
              {slip?.note && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{tr.slipNoteLabel}</p>
                  <p className="text-sm text-white font-medium leading-snug">{slip.note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav + image */}
        <div className="flex-1 flex items-center gap-4 px-4 min-h-0">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx <= 0}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center justify-center min-h-0">
            {slip?.imageBase64 && (
              <img
                src={`data:${mimeFromBase64(slip.imageBase64)};base64,${slip.imageBase64}`}
                alt={`สลิป ${idx + 1}`}
                className="max-h-[calc(100vh-160px)] max-w-full rounded-xl shadow-2xl object-contain"
              />
            )}
          </div>
          <button
            onClick={() => setIdx(i => Math.min(slips.length - 1, i + 1))}
            disabled={idx >= slips.length - 1}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  )
}

function SlipLinkModal({
  paymentRequestId,
  onClose,
}: {
  paymentRequestId: string
  onClose: () => void
}) {
  const { t } = useLang()
  const tr = t.payInRequest
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    paymentRequestApi.generatePayInSlipUploadToken(paymentRequestId)
      .then(res => {
        const d = res.data as any
        const relUrl = d?.slipUploadUrl ?? d?.SlipUploadUrl
        if (!relUrl) throw new Error('no url')
        setUrl(`${window.location.origin}${relUrl}`)
      })
      .catch(() => setErrorMsg(tr.slipLinkError))
      .finally(() => setLoading(false))
  }, [paymentRequestId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{tr.slipLinkTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
              <svg className="w-5 h-5 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">{tr.slipLinkLoading}</span>
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-red-500 text-center py-4">{errorMsg}</p>
          ) : url ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">{tr.slipLinkDesc}</p>
              <div className="flex justify-center p-3 bg-white border border-gray-200 rounded-xl">
                <QRCode value={url} size={160} />
              </div>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-xs text-gray-700 font-mono break-all">{url}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {tr.slipLinkOpen}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function PayInRequestDetailPage() {
  const { t } = useLang()
  const tr = t.payInRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<PayInRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<PaymentTxJob | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)
  const [slips, setSlips] = useState<SlipItem[]>([])
  const [loadingSlips, setLoadingSlips] = useState(false)
  const [showSlipViewer, setShowSlipViewer] = useState(false)
  const [slipViewerIndex, setSlipViewerIndex] = useState(0)
  const [showSlipLink, setShowSlipLink] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPaymentRequestById(id)
        const d = res.data as any
        const raw = d?.paymentRequest ?? d?.data ?? d
        setData(raw)

        const jobId = raw?.jobId ?? raw?.JobId
        if (jobId) {
          setLoadingJob(true)
          paymentRequestApi.getPaymentRequestJobById(id, jobId)
            .then(jobRes => {
              const jobData = jobRes.data as any
              setJob(jobData?.job ?? jobData?.Job ?? jobData)
            })
            .catch(() => {})
            .finally(() => setLoadingJob(false))
        }

        setLoadingSlips(true)
        paymentRequestApi.getPayInSlipUploads(id)
          .then(res => {
            const rawSlips = res.data as any
            const rawList: any[] = Array.isArray(rawSlips)
              ? rawSlips
              : (rawSlips?.slips ?? rawSlips?.Slips ?? rawSlips?.data ?? [])
            const list: SlipItem[] = rawList.map(s => ({
              imageBase64: s.imageBase64 ?? s.ImageBase64 ?? '',
              uploadedAt: s.uploadedAt ?? s.UploadedAt ?? '',
              first4: s.first4 ?? s.First4 ?? null,
              last4: s.last4 ?? s.Last4 ?? null,
              note: s.note ?? s.Note ?? null,
            }))
            setSlips([...list].sort((a, b) =>
              new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
            ))
          })
          .catch(() => {})
          .finally(() => setLoadingSlips(false))
      } catch {
        toast.error(tr.detailTitle)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.common.loading}
      </div>
    )
  }

  const s = data?.status?.toLowerCase()
  const isPending = s !== 'match' && s !== 'paid' && s !== 'approved' && s !== 'rejected' && s !== 'error'

  const responseJson = (() => {
    if (!data?.responseDataObj) return null
    try {
      const parsed = typeof data.responseDataObj === 'string'
        ? JSON.parse(data.responseDataObj)
        : data.responseDataObj
      if (parsed && typeof parsed === 'object') {
        const { qrCodeImage, QrCodeImage, ...rest } = parsed as any
        return JSON.stringify(rest, null, 2)
      }
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(data.responseDataObj)
    }
  })()

  const msg1Lines = (job?.jobMessage ?? '').split('\n').filter(l => l.trim())
  const msg2Lines = (job?.jobMessage2 ?? '').split('\n').filter(l => l.trim())

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{tr.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
        {(loadingSlips || slips.length > 0) && (
          <button
            onClick={() => { setSlipViewerIndex(0); setShowSlipViewer(true) }}
            disabled={loadingSlips || slips.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {loadingSlips ? '...' : `${tr.slipViewBtn} (${slips.length})`}
          </button>
        )}
        {data && (
          <button
            onClick={() => setShowSlipLink(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            {tr.slipLinkBtn}
          </button>
        )}
        {data && (
          <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
            {'{ }'}
          </button>
        )}
      </div>
      {showRawJson && <RawJsonModal data={data} onClose={() => setShowRawJson(false)} />}
      {showSlipViewer && slips.length > 0 && (
        <SlipViewerModal
          slips={slips}
          initialIndex={slipViewerIndex}
          orgId={data?.orgId}
          paymentRequestId={id}
          destBankCode={data?.payinBankCode}
          destAccountName={data?.payinBankAccountName}
          destAccountNo={data?.payinBankAccountNo}
          destAccountType={data?.payinAccountType}
          destPromptPayId={data?.payinPromptPayId}
          isPeerToPeer={data?.payinIsPeerToPeer}
          onClose={() => setShowSlipViewer(false)}
        />
      )}
      {showSlipLink && (
        <SlipLinkModal paymentRequestId={id} onClose={() => setShowSlipLink(false)} />
      )}

      {/* General Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
        <SectionHeader>{tr.sectionGeneral}</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label={tr.fieldCreated}>
            <div className="flex items-center gap-3 flex-wrap">
              <span>{formatDateTime(data?.createdDate)}</span>
              {data?.expireDate && (
                <span className="text-xs text-gray-400">{tr.fieldExpireDate}: {formatDateTime(data?.expireDate)}</span>
              )}
            </div>
          </InfoRow>
          <InfoRow label={tr.fieldStatus}>
            <StatusBadge status={data?.status} createdDate={data?.createdDate} payinIsPeerToPeer={data?.payinIsPeerToPeer} />
            {(data?.status?.toLowerCase() === 'paid' || data?.status?.toLowerCase() === 'approved') && data?.paymentTxId && (
              <a
                href={`/payment/pay-in-transactions/${data.paymentTxId}`}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 hover:underline mt-1"
              >
                <span className="truncate max-w-[200px]">{data.paymentTxId}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            )}
          </InfoRow>
          <InfoRow label={tr.fieldMerchant}>
            <span className="font-semibold">{data?.merchantCode ?? '—'}</span>
            {data?.merchantName && <span className="text-gray-500 ml-2 text-xs">{data.merchantName}</span>}
          </InfoRow>
          <InfoRow label={tr.fieldCurrency}>{data?.currency ?? '—'}</InfoRow>
          <InfoRow label={tr.fieldRequested}>
            {data?.requestedAmount != null
              ? <span className="font-semibold tabular-nums">{formatAmount(data.requestedAmount)}</span>
              : '—'}
          </InfoRow>
          <InfoRow label={tr.fieldAmount}>
            {data?.generatedAmount != null
              ? <span className="font-semibold tabular-nums">{formatAmount(data.generatedAmount)}</span>
              : '—'}
          </InfoRow>
          <InfoRow label={tr.fieldBank}>{data?.payinBankCode ?? '—'}</InfoRow>
          <InfoRow label={tr.fieldAccountNo}>{data?.payinBankAccountNo ?? '—'}</InfoRow>
          <InfoRow label={tr.fieldAccountName}>{data?.payinBankAccountName ?? '—'}</InfoRow>
          <InfoRow label={tr.fieldAccountType}>
            {data?.payinAccountType ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full ring-1 ring-blue-200">{data.payinAccountType}</span>
                {data.payinAccountType.toLowerCase() === 'promptpay' && data.payinPromptPayId && (
                  <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full ring-1 ring-sky-200">{data.payinPromptPayId}</span>
                )}
              </div>
            ) : '—'}
          </InfoRow>
          <InfoRow label={tr.fieldRefId}>{data?.refId1 ?? '—'}</InfoRow>
          <InfoRow label={tr.fieldRefId1}>{data?.refId2 ?? '—'}</InfoRow>
          <InfoRow label={tr.fieldRefId2}>{data?.refId3 ?? '—'}</InfoRow>
          {data?.status?.toLowerCase() === 'rejected' && data?.statusCode && (
            <InfoRow label={tr.fieldStatusCode ?? 'Status Code'}>
              <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
                {data.statusCode}
              </span>
            </InfoRow>
          )}
          {(data?.status?.toLowerCase() === 'rejected' || data?.status?.toLowerCase() === 'approved') && data?.statusReason && (
            <InfoRow label={tr.fieldStatusReason ?? 'Reason'}>
              <span className={data?.status?.toLowerCase() === 'approved' ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{data.statusReason}</span>
            </InfoRow>
          )}
        </div>
      </div>

      {/* Response Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
        <SectionHeader>{tr.sectionResponse}</SectionHeader>
        {responseJson ? (
          <JsonHighlight json={responseJson} />
        ) : (
          <p className="text-sm text-gray-400">{tr.noResponseData}</p>
        )}
      </div>

      {/* Processing Steps */}
      {data?.processingSteps && data.processingSteps.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{tr.sectionProcessing}</SectionHeader>
          <ol className="flex flex-col gap-2">
            {data.processingSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Job */}
      {(data?.jobId || loadingJob) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{tr.sectionJob}</SectionHeader>
          {loadingJob ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t.common.loading}
            </div>
          ) : job ? (
            <div className="flex flex-col gap-6">

              {/* Job ID + Status + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label={tr.fieldJobId}>
                  <span className="text-xs text-gray-600 break-all">{job.id ?? data?.jobId ?? '—'}</span>
                </InfoRow>
                <InfoRow label={tr.fieldJobStatus}>
                  <JobStatusBadge status={job.status} />
                </InfoRow>
                {job.type && (
                  <InfoRow label={tr.fieldJobType}>
                    <span className="text-sm font-medium text-gray-700">{job.type}</span>
                  </InfoRow>
                )}
                {job.description && (
                  <InfoRow label={tr.fieldJobDescription}>
                    <span className="text-sm text-gray-600">{job.description}</span>
                  </InfoRow>
                )}
                {(job.succeedCount != null || job.failedCount != null) && (
                  <InfoRow label={tr.fieldJobResult}>
                    <span className="text-sm">
                      <span className="text-emerald-600 font-semibold">{job.succeedCount ?? 0}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-red-500 font-semibold">{job.failedCount ?? 0}</span>
                      <span className="text-gray-400 ml-1 text-xs">(success / failed)</span>
                    </span>
                  </InfoRow>
                )}
              </div>

              {/* Job Messages */}
              {(msg1Lines.length > 0 || msg2Lines.length > 0) && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{tr.fieldJobMessage}</p>
                  {msg1Lines.length > 0 && (
                    <div>
                      {msg2Lines.length > 0 && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">Message 1</span>}
                      <ol className="flex flex-col gap-2">
                        {msg1Lines.map((line, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="text-sm text-gray-700 leading-relaxed break-all">{line}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {msg2Lines.length > 0 && (
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 mb-2">Message 2</span>
                      <ol className="flex flex-col gap-2">
                        {msg2Lines.map((line, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="text-sm text-gray-700 leading-relaxed break-all">{line}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Parameters */}
              {job.parameters && job.parameters.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{tr.fieldJobParameters}</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">{tr.fieldJobParamName}</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{tr.fieldJobParamValue}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.parameters.map((p: PaymentTxJobParameter, i: number) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-4 py-2 text-xs text-gray-600 font-medium">{p.name ?? '—'}</td>
                            <td className="px-4 py-2 text-xs text-gray-700">{p.value ?? <span className="text-gray-300">null</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <p className="text-sm text-gray-400">{tr.noJobData}</p>
          )}
        </div>
      )}
    </div>
  )
}
