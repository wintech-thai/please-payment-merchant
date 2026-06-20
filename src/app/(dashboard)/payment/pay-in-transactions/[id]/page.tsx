'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentTxApi } from '@/lib/api/payment-tx.api'
import type { PayInTxDetail, PaymentTxJob, PaymentTxJobParameter } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

function StatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'identified') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'error' || s === 'failed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <AlertCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <Clock className="w-3.5 h-3.5" />{status ?? '—'}
    </span>
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
      <Clock className="w-3.5 h-3.5" />{status ?? '—'}
    </span>
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

function JsonHighlight({ json }: { json: string }) {
  const highlighted = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) return `<span class="json-key">${match}</span>`
        return `<span class="json-string">${match}</span>`
      }
      if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`
      if (/null/.test(match)) return `<span class="json-null">${match}</span>`
      return `<span class="json-number">${match}</span>`
    }
  )
  return (
    <pre
      className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed text-gray-800"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

export default function PayInTxDetailPage() {
  const { t } = useLang()
  const m = t.payInTx
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayInTxDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<PaymentTxJob | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentTxApi.getPaymentTransactionById(id)
        const data = res.data as any
        const raw = data?.paymentTransaction ?? data?.transaction ?? data
        setDetail(raw)

        const jobId = raw?.jobId ?? raw?.JobId
        if (jobId) {
          setLoadingJob(true)
          try {
            const jobRes = await paymentTxApi.getPaymentTransactionJobById(id, jobId)
            const jobData = jobRes.data as any
            setJob(jobData?.job ?? jobData?.Job ?? jobData)
          } catch { /* job section shows no data */ }
          finally { setLoadingJob(false) }
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to load transaction detail')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const inputDataJson = (() => {
    if (!detail?.rawInputObj) return null
    try {
      const parsed = typeof detail.rawInputObj === 'string'
        ? JSON.parse(detail.rawInputObj)
        : detail.rawInputObj
      return JSON.stringify(parsed, null, 2)
    } catch {
      return String(detail.rawInputObj)
    }
  })()

  const hasFeeInfo = detail?.payInFeePct != null
    || (detail?.payInFeeDecimal ?? detail?.payInFee) != null
    || (detail?.payInTotalAmountDecimal ?? detail?.payInTotalAmount) != null
  const hasSenderInfo = detail?.fromBankCode || detail?.fromBankAccountNo || detail?.fromBankAccountName

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

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{m.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
      </div>

      {/* General Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
        <SectionHeader>{m.sectionGeneral}</SectionHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <InfoRow label={m.fieldCreated}>{formatDateTime(detail?.createdDate)}</InfoRow>
          <InfoRow label={m.fieldStatus}>
            <StatusBadge status={detail?.status} />
          </InfoRow>
          <InfoRow label={m.fieldMerchant}>
            {detail?.merchantCode || detail?.merchantName
              ? <><span className="font-semibold">{detail?.merchantCode ?? '—'}</span>{detail?.merchantName && <span className="text-gray-500 ml-2 text-xs">{detail.merchantName}</span>}</>
              : '—'}
          </InfoRow>
          <InfoRow label={m.fieldTxAmount}>
            {(detail?.txAmountDecimal ?? detail?.txAmount) != null
              ? <span className="font-semibold tabular-nums">{formatAmount(detail!.txAmountDecimal ?? detail!.txAmount)} {detail!.currency ?? ''}</span>
              : '—'}
          </InfoRow>
          <InfoRow label={m.fieldCurrency}>{detail?.currency ?? '—'}</InfoRow>
          <InfoRow label={m.fieldBank}>{detail?.payInBankCode ?? '—'}</InfoRow>
          <InfoRow label={m.fieldAccountNo}>{detail?.payInBankAccountNo ?? '—'}</InfoRow>
          <InfoRow label={m.fieldAccountName}>{detail?.payInBankAccountName ?? '—'}</InfoRow>
          <InfoRow label={m.fieldPaymentRequestId}>
            {detail?.paymentRequestId ? (
              <a href={`/payment/pay-in-requests/${detail.paymentRequestId}`}
                className="text-primary-600 hover:underline text-sm">
                {detail.paymentRequestId}
              </a>
            ) : '—'}
          </InfoRow>
          {detail?.description && (
            <InfoRow label={m.fieldDescription}>{detail.description}</InfoRow>
          )}
        </div>
      </div>

      {/* Fee Info */}
      {hasFeeInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionFee}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <InfoRow label={m.fieldTxAmount}>
              <span className="font-semibold tabular-nums">{formatAmount(detail?.txAmountDecimal ?? detail?.txAmount)}</span>
            </InfoRow>
            <InfoRow label={m.fieldPayInFeePct}>
              {detail?.payInFeePct != null ? `${detail.payInFeePct}%` : '—'}
            </InfoRow>
            <InfoRow label={m.fieldPayInFee}>
              <span className="tabular-nums">{formatAmount(detail?.payInFeeDecimal ?? detail?.payInFee)}</span>
            </InfoRow>
            <InfoRow label={m.fieldPayInTotalAmount}>
              <span className="font-bold text-primary-700 tabular-nums text-base">{formatAmount(detail?.payInTotalAmountDecimal ?? detail?.payInTotalAmount)}</span>
            </InfoRow>
          </div>
        </div>
      )}

      {/* Sender Info */}
      {hasSenderInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionSender}</SectionHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow label={m.fieldSenderBank}>{detail?.fromBankCode ?? '—'}</InfoRow>
            <InfoRow label={m.fieldSenderAccountNo}>{detail?.fromBankAccountNo ?? '—'}</InfoRow>
            {detail?.fromBankAccountName && (
              <InfoRow label={m.fieldSenderName}>{detail.fromBankAccountName}</InfoRow>
            )}
          </div>
        </div>
      )}

      {/* Input Data */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
        <SectionHeader>{m.sectionInputData}</SectionHeader>
        {inputDataJson ? (
          <JsonHighlight json={inputDataJson} />
        ) : (
          <p className="text-sm text-gray-400">{m.noInputData}</p>
        )}
      </div>

      {/* Processing Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
        <SectionHeader>{m.sectionProcessing}</SectionHeader>
        {detail?.processingSteps && detail.processingSteps.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {detail.processingSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-400">{m.noProcessingSteps}</p>
        )}
      </div>

      {/* Job */}
      {(detail?.jobId || loadingJob) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.sectionJob}</SectionHeader>
          {loadingJob ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t.admin.loading}
            </div>
          ) : job ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label={m.fieldJobId}>
                  <span className="text-xs text-gray-600 break-all">{job.id ?? detail?.jobId ?? '—'}</span>
                </InfoRow>
                <InfoRow label={m.fieldJobStatus}>
                  <JobStatusBadge status={job.status} />
                </InfoRow>
                {job.type && (
                  <InfoRow label={m.fieldJobType}>
                    <span className="text-sm font-medium text-gray-700">{job.type}</span>
                  </InfoRow>
                )}
                {job.description && (
                  <InfoRow label={m.fieldJobDescription}>
                    <span className="text-sm text-gray-600">{job.description}</span>
                  </InfoRow>
                )}
                {(job.succeedCount != null || job.failedCount != null) && (
                  <InfoRow label={m.fieldJobResult}>
                    <span className="text-sm">
                      <span className="text-emerald-600 font-semibold">{job.succeedCount ?? 0}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-red-500 font-semibold">{job.failedCount ?? 0}</span>
                      <span className="text-gray-400 ml-1 text-xs">(success / failed)</span>
                    </span>
                  </InfoRow>
                )}
              </div>
              {job.jobMessage && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{m.fieldJobMessage}</p>
                  <ol className="flex flex-col gap-2">
                    {job.jobMessage.split('\n').filter(line => line.trim()).map((line, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed break-all">{line.trim()}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {job.parameters && job.parameters.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{m.fieldJobParameters}</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">{m.fieldJobParamName}</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{m.fieldJobParamValue}</th>
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
            <p className="text-sm text-gray-400">{m.noJobData}</p>
          )}
        </div>
      )}
    </div>
  )
}
