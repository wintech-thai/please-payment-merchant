'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayInRequestDetail } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'

function fmt(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return d }
}

function StatusBadge({ status, createdDate }: { status?: string | null; createdDate?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'match' || s === 'paid') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <AlertCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3.5 h-3.5" />{status ?? 'Pending'}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
        <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />{title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

function JsonView({ json }: { json: string }) {
  const h = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    m => {
      if (/^"/.test(m)) return /:$/.test(m) ? `<span class="json-key">${m}</span>` : `<span class="json-string">${m}</span>`
      if (/true|false/.test(m)) return `<span class="json-bool">${m}</span>`
      if (/null/.test(m)) return `<span class="json-null">${m}</span>`
      return `<span class="json-number">${m}</span>`
    }
  )
  return (
    <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed text-gray-800"
      dangerouslySetInnerHTML={{ __html: h }} />
  )
}

export default function PayInRequestDetailPage() {
  const { t } = useLang()
  const m = t.payInRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayInRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPaymentRequestById(id)
        const data = res.data as any
        setDetail(data?.paymentRequest ?? data)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load payment request')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const responseJson = (() => {
    if (!detail?.responseDataObj) return null
    try {
      const parsed = typeof detail.responseDataObj === 'string' ? JSON.parse(detail.responseDataObj) : detail.responseDataObj
      if (parsed && typeof parsed === 'object') {
        const { qrCodeImage, QrCodeImage, ...rest } = parsed as Record<string, unknown>
        return JSON.stringify(rest, null, 2)
      }
      return JSON.stringify(parsed, null, 2)
    } catch { return String(detail.responseDataObj) }
  })()

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

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        <Section title={m.sectionGeneral}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label={m.fieldCreated}>{fmtDate(detail?.createdDate)}</Field>
            <Field label={m.fieldStatus}><StatusBadge status={detail?.status} createdDate={detail?.createdDate} /></Field>
            <Field label={m.fieldCurrency}>{detail?.currency ?? '—'}</Field>
            <Field label={m.fieldRequested}>{detail?.requestedAmount != null ? <span className="font-semibold tabular-nums">{fmt(detail.requestedAmount)}</span> : '—'}</Field>
            <Field label={m.fieldAmount}>{detail?.generatedAmount != null ? <span className="font-semibold tabular-nums">{fmt(detail.generatedAmount)}</span> : '—'}</Field>
            <Field label={m.fieldBank}>{detail?.payinBankCode ?? '—'}</Field>
            <Field label={m.fieldAccountNo}>{detail?.payinBankAccountNo ?? '—'}</Field>
            <Field label={m.fieldAccountName}>{detail?.payinBankAccountName ?? '—'}</Field>
            <Field label={m.fieldAccountType}>
              {detail?.payinAccountType ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full ring-1 ring-blue-200">{detail.payinAccountType}</span>
                  {detail.payinAccountType.toLowerCase() === 'promptpay' && detail.payinPromptPayId && (
                    <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full ring-1 ring-sky-200">{detail.payinPromptPayId}</span>
                  )}
                </div>
              ) : '—'}
            </Field>
            <Field label={m.fieldRefId}>{detail?.refId ?? '—'}</Field>
            <Field label={m.fieldRefId1}>{detail?.refId1 ?? '—'}</Field>
            <Field label={m.fieldRefId2}>{detail?.refId2 ?? '—'}</Field>
            {detail?.paymentTxId && (
              <Field label="Transaction ID">
                <a href={`/merchant/pay-in-transactions/${detail.paymentTxId}`}
                  className="text-primary-600 hover:underline font-mono text-xs">{detail.paymentTxId}</a>
              </Field>
            )}
          </div>
        </Section>

        {responseJson && (
          <Section title={m.sectionResponse}>
            <JsonView json={responseJson} />
          </Section>
        )}

        {detail?.processingSteps && detail.processingSteps.length > 0 && (
          <Section title={m.sectionProcessing}>
            <ol className="flex flex-col gap-2">
              {detail.processingSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

      </div>
    </div>
  )
}
