'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestDetail } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock, ExternalLink, X, Copy, Check } from 'lucide-react'

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

export default function PayInRequestDetailPage() {
  const { t } = useLang()
  const tr = t.payInRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<PayInRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRawJson, setShowRawJson] = useState(false)

  useEffect(() => {
    paymentRequestApi.getPaymentRequestById(id)
      .then(res => {
        const d = res.data as any
        setData(d?.paymentRequest ?? d?.data ?? d)
      })
      .catch(() => toast.error(tr.detailTitle))
      .finally(() => setLoading(false))
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
        {data && (
          <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
            {'{ }'}
          </button>
        )}
      </div>
      {showRawJson && <RawJsonModal data={data} onClose={() => setShowRawJson(false)} />}

      {/* General Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
        <SectionHeader>{tr.sectionGeneral}</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label={tr.fieldCreated}>{formatDateTime(data?.createdDate)}</InfoRow>
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
          {data?.status?.toLowerCase() === 'rejected' && data?.statusReason && (
            <InfoRow label={tr.fieldStatusReason ?? 'Reason'}>
              <span className="text-red-600">{data.statusReason}</span>
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
    </div>
  )
}
