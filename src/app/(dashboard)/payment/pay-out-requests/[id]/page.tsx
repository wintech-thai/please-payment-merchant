'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayOutRequestDetail, PartialPayoutItem, PaymentTxJob, PaymentTxJobParameter } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Clock, X, Copy, Check, Paperclip, Loader2, TriangleAlert } from 'lucide-react'
import QRCode from 'react-qr-code'
import AuditNoticeDrawer from '@/components/AuditNoticeDrawer'
import clsx from 'clsx'

type SlipItem = { imageBase64: string; uploadedAt: string; note?: string | null; first4?: string | null; last4?: string | null }

function SlipViewerModal({ slips, destBankCode, destAccountNo, destAccountName, destPromptPayId, isPeerToPeer, generatedAmount, onClose }: {
  slips: SlipItem[]
  destBankCode?: string | null
  destAccountNo?: string | null
  destAccountName?: string | null
  destPromptPayId?: string | null
  isPeerToPeer?: boolean | null
  generatedAmount?: number | null
  onClose: () => void
}) {
  const { t } = useLang()
  const m = t.payOutRequest
  const [idx, setIdx] = useState(0)
  const slip = slips[idx]
  const hasSidebar = destBankCode || destAccountNo || destAccountName || destPromptPayId || slip?.first4 || slip?.last4 || slip?.note
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-5 py-3 flex-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-semibold">{m.slipViewerTitle} ({idx + 1} / {slips.length})</span>
          {slip?.uploadedAt && (
            <span className="text-white/60 text-xs">{new Date(slip.uploadedAt).toLocaleString('th-TH')}</span>
          )}
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex items-stretch min-h-0" onClick={e => e.stopPropagation()}>
        {hasSidebar && (
          <div className="flex-none w-52 flex flex-col px-4 py-4 overflow-y-auto">
            <div className="flex flex-col gap-3">
              {(destBankCode || destAccountNo || destAccountName || destPromptPayId) && (
                <div className="bg-teal-900/60 border border-teal-500/40 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-teal-300/70 uppercase tracking-widest mb-2">{m.slipDestAccount}</p>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {destBankCode && <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-teal-500 text-white uppercase tracking-wide">{destBankCode}</span>}
                    {isPeerToPeer && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/80 text-white uppercase tracking-wide">P2P</span>}
                  </div>
                  {destAccountNo && <p className="text-sm font-mono font-bold text-white leading-tight">{destAccountNo}</p>}
                  {destAccountName && <p className="text-xs text-teal-100 font-medium mt-1">{destAccountName}</p>}
                  {destPromptPayId && (
                    <div className="mt-2 pt-2 border-t border-teal-700/50">
                      <p className="text-[9px] font-bold text-teal-400 uppercase tracking-wide mb-0.5">PromptPay</p>
                      <p className="text-xs font-mono text-white">{destPromptPayId}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {generatedAmount != null && (
              <div className="mt-3 bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-3">
                <p className="text-[9px] text-amber-300/80 uppercase tracking-widest mb-1">{m.slipAmount}</p>
                <p className="text-base font-bold text-amber-300 tabular-nums">{Number(generatedAmount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            )}
            <div className="mt-auto flex flex-col gap-3 pt-3">
              {(slip?.first4 || slip?.last4) && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{m.slipRefLabel}</p>
                  <p className="text-sm font-mono font-bold text-yellow-300 tracking-wider">{slip.first4} — {slip.last4}</p>
                </div>
              )}
              {slip?.note && (
                <div className="bg-white/10 rounded-xl px-3 py-3">
                  <p className="text-[9px] text-white/50 uppercase tracking-widest mb-1.5">{m.slipNoteLabel}</p>
                  <p className="text-sm text-white font-medium leading-snug">{slip.note}</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center min-h-0">
          {slips.length > 1 && (
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
              className="p-2 m-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors flex-shrink-0">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex-1 flex items-center justify-center min-h-0 px-2">
            {slip && <img src={`data:image/jpeg;base64,${slip.imageBase64}`} alt={`Slip ${idx + 1}`} className="max-h-[calc(100vh-120px)] max-w-full rounded-xl shadow-2xl object-contain" />}
          </div>
          {slips.length > 1 && (
            <button onClick={() => setIdx(i => Math.min(slips.length - 1, i + 1))} disabled={idx === slips.length - 1}
              className="p-2 m-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors flex-shrink-0">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function formatAmount(n?: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatAge(d?: string | null): string {
  if (!d) return ''
  const diffMs = Date.now() - new Date(d).getTime()
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

function StatusBadge({ status, isPartialyPayout }: { status?: string | null; isPartialyPayout?: boolean | null }) {
  const s = status?.toLowerCase()
  if (s === 'paid' || s === 'approved') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />{status}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">P2P</span>}
    </div>
  )
  if (s === 'rejected') return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
        <AlertCircle className="w-3.5 h-3.5" />{status}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-red-50 text-red-700 ring-red-200">P2P</span>}
    </div>
  )
  return (
    <div className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        <Clock className="w-3.5 h-3.5" />{status ?? 'Pending'}
      </span>
      {isPartialyPayout && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 bg-amber-50 text-amber-700 ring-amber-200">P2P</span>}
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

function AccountTypeBadge({ accountType, promptPayId }: { accountType?: string | null; promptPayId?: string | null }) {
  return (
    <div className="flex gap-1.5 flex-wrap mt-1">
      {accountType && (
        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
          {accountType}
        </span>
      )}
      {accountType?.toLowerCase() === 'promptpay' && promptPayId && (
        <span className="text-[10px] text-gray-500">{promptPayId}</span>
      )}
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

export default function PayOutRequestDetailPage() {
  const { t } = useLang()
  const tr = t.payOutRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayOutRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<PaymentTxJob | null>(null)
  const [loadingJob, setLoadingJob] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)
  const [slips, setSlips] = useState<SlipItem[]>([])
  const [loadingSlips, setLoadingSlips] = useState(true)
  const [showSlipViewer, setShowSlipViewer] = useState(false)
  const [showNoticeDrawer, setShowNoticeDrawer] = useState(false)

  const isRejected = detail?.status?.toLowerCase() === 'rejected'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPayOutRequestById(id)
        const data = res.data as any
        const raw = data?.paymentRequest ?? data?.data ?? data
        if (raw) raw.isPayInBankAccountOverride = raw.isPayInBankAccountOverride ?? raw.isPayinBankAccountOverride ?? false
        setDetail(raw)

        const jobId = raw?.jobId ?? raw?.JobId
        if (jobId) {
          setLoadingJob(true)
          try {
            const jobRes = await paymentRequestApi.getPaymentRequestJobById(id, jobId)
            const jobData = jobRes.data as any
            setJob(jobData?.job ?? jobData?.Job ?? jobData)
          } catch { /* job section shows no data */ }
          finally { setLoadingJob(false) }
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : tr.toastFailedToLoad)
        router.push('/payment/pay-out-requests')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    setLoadingSlips(true)
    paymentRequestApi.getPayOutSlipUploads(id)
      .then(res => {
        const d = res.data as any
        const list: any[] = Array.isArray(d) ? d : (d?.slips ?? d?.Slips ?? [])
        setSlips(list.map(s => ({
          imageBase64: s.imageBase64 ?? s.ImageBase64 ?? '',
          uploadedAt: s.uploadedAt ?? s.UploadedAt ?? '',
          note: s.note ?? s.Note ?? null,
          first4: s.first4 ?? s.First4 ?? null,
          last4: s.last4 ?? s.Last4 ?? null,
        })))
      })
      .catch((err) => { console.error('[payout-detail] getPayOutSlipUploads failed:', err) })
      .finally(() => setLoadingSlips(false))
  }, [id])

  const msg1Lines = (job?.jobMessage ?? '').split('\n').filter(l => l.trim())
  const msg2Lines = (job?.jobMessage2 ?? '').split('\n').filter(l => l.trim())

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
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/payment/pay-out-requests')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{tr.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
        {detail && (
          <button onClick={() => setShowRawJson(true)} className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors">
            {'{ }'}
          </button>
        )}
      </div>

      {showRawJson && <RawJsonModal data={detail} onClose={() => setShowRawJson(false)} />}
      {showNoticeDrawer && <AuditNoticeDrawer rowId={id} onClose={() => setShowNoticeDrawer(false)} />}
      {showSlipViewer && slips.length > 0 && (
        <SlipViewerModal
          slips={slips}
          destBankCode={detail?.isPayInBankAccountOverride ? detail.payinBankCodeOverride : detail?.payinBankCode}
          destAccountNo={detail?.isPayInBankAccountOverride ? detail.payinBankAccountNoOverride : detail?.payinBankAccountNo}
          destAccountName={detail?.isPayInBankAccountOverride ? detail.payinBankAccountNameOverride : detail?.payinBankAccountName}
          destPromptPayId={detail?.isPayInBankAccountOverride ? detail.payinPromptPayIdOverride : detail?.payinPromptPayId}
          isPeerToPeer={detail?.isPartialyPayout}
          generatedAmount={detail?.generatedAmount}
          onClose={() => setShowSlipViewer(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Section 1: Request Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{tr.sectionDestination}</SectionHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 max-w-4xl">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">

              <InfoRow label={tr.fieldCreated}>{formatDateTime(detail?.createdDate)}</InfoRow>

              <InfoRow label={tr.fieldStatus}>
                <div className="flex items-start gap-1.5 flex-wrap">
                  <StatusBadge status={detail?.status} isPartialyPayout={detail?.isPartialyPayout} />
                  {(loadingSlips || slips.length > 0) && (
                    <button
                      onClick={() => setShowSlipViewer(true)}
                      disabled={loadingSlips || slips.length === 0}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingSlips ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      {loadingSlips ? '…' : slips.length}
                    </button>
                  )}
                  {(detail?.noticeCount ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNoticeDrawer(true)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      <TriangleAlert className="w-3 h-3" />
                      {detail?.noticeCount}
                    </button>
                  )}
                </div>
              </InfoRow>

              <InfoRow label={tr.fieldMerchant}>
                <span className="font-semibold">{detail?.merchantCode ?? '—'}</span>
                {detail?.merchantName && (
                  <span className="text-gray-500 ml-2 text-xs">{detail.merchantName}</span>
                )}
              </InfoRow>

              <InfoRow label={tr.fieldCurrency}>{detail?.currency ?? '—'}</InfoRow>

              <InfoRow label={tr.fieldAmount}>
                {detail?.requestedAmount != null
                  ? <span className="font-semibold tabular-nums">{formatAmount(detail.requestedAmount)}</span>
                  : '—'}
              </InfoRow>

              <InfoRow label={tr.fieldFee}>
                {detail?.payoutFeeDecimal != null && detail.payoutFeeDecimal > 0 ? (
                  <span className="font-semibold tabular-nums text-red-600">
                    -{formatAmount(detail.payoutFeeDecimal)}
                    {detail.payoutFeePct ? <span className="text-xs font-normal text-gray-400 ml-1">({detail.payoutFeePct}%)</span> : null}
                  </span>
                ) : (
                  <span className="font-semibold text-gray-400">0.00</span>
                )}
                {detail?.payoutFeePayer && (
                  <span className={clsx(
                    'ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1',
                    detail.payoutFeePayer?.toLowerCase() === 'merchant'
                      ? 'bg-blue-50 text-blue-700 ring-blue-200'
                      : 'bg-orange-50 text-orange-700 ring-orange-200'
                  )}>{detail.payoutFeePayer}</span>
                )}
              </InfoRow>

              <InfoRow label={tr.fieldNetAmount}>
                {detail?.payOutTotalAmountDecimal != null ? (
                  <span className="font-bold tabular-nums text-emerald-700 text-xl">
                    {formatAmount(detail.payOutTotalAmountDecimal)}
                  </span>
                ) : '—'}
                {detail?.isPartialyPayout && detail?.totalPayOutPaidAmountDecimal != null && detail.totalPayOutPaidAmountDecimal > 0 && (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400">
                      {tr.fieldTotalPaid}: <span className="font-semibold text-emerald-600 tabular-nums">{formatAmount(detail.totalPayOutPaidAmountDecimal)}</span>
                    </span>
                    {detail.payOutTotalAmountDecimalP2P != null && (
                      <span className="text-xs text-gray-400">
                        {tr.fieldP2PRemaining}: <span className="font-semibold text-primary-600 tabular-nums">{formatAmount(detail.payOutTotalAmountDecimalP2P)}</span>
                      </span>
                    )}
                  </div>
                )}
              </InfoRow>

              {detail?.refId1 && <InfoRow label="REF 1">{detail.refId1}</InfoRow>}
              {detail?.refId2 && <InfoRow label="REF 2">{detail.refId2}</InfoRow>}
              {detail?.refId3 && <InfoRow label="REF 3">{detail.refId3}</InfoRow>}

              <InfoRow label={tr.fieldDescription}>
                <span className="text-gray-600">{detail?.description ?? '—'}</span>
              </InfoRow>

              {isRejected && detail?.statusCode && (
                <InfoRow label={tr.fieldStatusCode}>
                  <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 ring-1 ring-red-200">
                    {detail.statusCode}
                  </span>
                </InfoRow>
              )}
              {isRejected && detail?.rejectReason && (
                <InfoRow label={tr.fieldRejectReason}>
                  <span className="text-red-600 font-medium">{detail.rejectReason}</span>
                </InfoRow>
              )}

              {/* Destination Bank — inline in main section */}
              {(() => {
                const isOverride = detail?.isPayInBankAccountOverride
                const bankCode = isOverride ? detail?.payinBankCodeOverride : detail?.payinBankCode
                const bankAccountNo = isOverride ? detail?.payinBankAccountNoOverride : detail?.payinBankAccountNo
                const bankAccountName = isOverride ? detail?.payinBankAccountNameOverride : detail?.payinBankAccountName
                const promptPayId = isOverride ? detail?.payinPromptPayIdOverride : detail?.payinPromptPayId
                const accountType = isOverride ? detail?.payinAccountTypeOverride : detail?.payinAccountType
                if (!bankCode && !bankAccountNo) return null
                return (
                  <div className="sm:col-span-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{tr.fieldDestBank}</p>
                    <p className="text-sm font-bold text-gray-800">{[bankCode, bankAccountNo].filter(Boolean).join(' · ')}</p>
                    {bankAccountName && <p className="text-sm text-gray-500 mt-0.5">{bankAccountName}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {accountType && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full ring-1 ring-blue-200">{accountType}</span>
                      )}
                      {promptPayId && <span className="text-sm text-gray-600">{promptPayId}</span>}
                    </div>
                  </div>
                )
              })()}

            </div>

            {/* QR Code */}
            {(() => {
              const paidAmt = detail?.totalPayOutPaidAmountDecimal ?? 0
              const useP2P = detail?.isPartialyPayout && detail?.qrCodeP2P
              const rawQr = useP2P ? detail!.qrCodeP2P! : (detail?.qrCodeImage ?? detail?.qrCode ?? null)
              const qrAvailable = detail?.isQrAvailable !== false
              if (!rawQr && qrAvailable) return null
              const isImage = rawQr ? (rawQr.startsWith('data:') || rawQr.startsWith('iVBOR') || rawQr.startsWith('/9j/')) : false
              const isOverride = detail?.isPayInBankAccountOverride
              const noQrBankCode = isOverride ? detail?.payinBankCodeOverride : detail?.payinBankCode
              const noQrAccountNo = isOverride ? detail?.payinBankAccountNoOverride : detail?.payinBankAccountNo
              const noQrAccountName = isOverride ? detail?.payinBankAccountNameOverride : detail?.payinBankAccountName
              const noQrPromptPayId = isOverride ? detail?.payinPromptPayIdOverride : detail?.payinPromptPayId
              return (
                <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide self-start">
                    {useP2P ? 'QR P2P' : 'QR Code'}
                  </p>
                  {rawQr && qrAvailable ? (
                    isImage ? (
                      <img
                        src={rawQr.startsWith('data:') ? rawQr : `data:image/png;base64,${rawQr}`}
                        alt="QR Code"
                        className="w-56 h-56 rounded-lg border border-gray-200 p-1 bg-white"
                      />
                    ) : (
                      <div className="p-3 bg-white rounded-lg border border-gray-200 inline-block">
                        <QRCode value={rawQr} size={200} />
                      </div>
                    )
                  ) : (
                    <div className="w-56 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center gap-3 text-center p-4">
                      <svg className="w-8 h-8 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM3 14a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 font-semibold">QR ยังไม่พร้อม</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">บัญชีนี้ไม่รองรับ QR — โอนด้วยข้อมูลบัญชีด้านล่าง</p>
                      </div>
                      {(noQrBankCode || noQrAccountNo || noQrAccountName || noQrPromptPayId) && (
                        <div className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex flex-col gap-1">
                          {(noQrBankCode || noQrAccountNo) && (
                            <p className="text-xs font-bold text-gray-800">{[noQrBankCode, noQrAccountNo].filter(Boolean).join(' · ')}</p>
                          )}
                          {noQrAccountName && (
                            <p className="text-[11px] text-gray-500">{noQrAccountName}</p>
                          )}
                          {noQrPromptPayId && (
                            <p className="text-[11px] text-gray-500">{noQrPromptPayId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {useP2P && paidAmt > 0 && detail?.payOutTotalAmountDecimalP2P != null && (
                    <div className="text-center max-w-[220px]">
                      <p className="text-xs font-semibold text-primary-600 tabular-nums">{formatAmount(detail.payOutTotalAmountDecimalP2P)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{tr.qrP2PDescription ?? 'ยอดคงเหลือหลัง partial payment'}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* Source Bank Account (FROM) — hidden when Pending */}
        {detail?.status?.toLowerCase() !== 'pending' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
              <span className="w-1 h-5 bg-rose-500 rounded-full flex-shrink-0" />
              {tr.sectionSource}
            </h2>
            {detail?.payoutBankCode || detail?.payoutBankAccountNo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InfoRow label="Bank Code">{detail.payoutBankCode ?? '—'}</InfoRow>
                <InfoRow label="Account No">{detail.payoutBankAccountNo ?? '—'}</InfoRow>
                {detail.payoutBankAccountName && <InfoRow label="Account Name">{detail.payoutBankAccountName}</InfoRow>}
                {detail.payoutAccountType && (
                  <InfoRow label="Account Type">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-full ring-1 ring-violet-200">{detail.payoutAccountType}</span>
                  </InfoRow>
                )}
                {detail.payoutPromptPayId && <InfoRow label="PromptPay ID">{detail.payoutPromptPayId}</InfoRow>}
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        )}

        {/* Partial Payouts */}
        {detail?.isPartialyPayout && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{tr.sectionPartialPayouts}</SectionHeader>

            {detail.totalPayOutPaidAmountDecimal != null && detail.totalPayOutPaidAmountDecimal > 0 && (
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide mb-0.5">{tr.fieldTotalPaid}</p>
                  <p className="text-base font-bold text-emerald-700 tabular-nums">{formatAmount(detail.totalPayOutPaidAmountDecimal)}</p>
                </div>
                {detail.totalPayOutPendingPaidAmountDecimal != null && detail.totalPayOutPendingPaidAmountDecimal > 0 && (
                  <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mb-0.5">{tr.fieldTotalPending}</p>
                    <p className="text-base font-bold text-amber-700 tabular-nums">{formatAmount(detail.totalPayOutPendingPaidAmountDecimal)}</p>
                  </div>
                )}
              </div>
            )}

            {detail.partialPayouts && detail.partialPayouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.colPartialDate}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.colPartialExpire}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.colPartialId}</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.colPartialAmount}</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{tr.colPartialStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.partialPayouts.map((p: PartialPayoutItem, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateTime(p.txDate)}</td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{p.expireDate ? formatDateTime(p.expireDate) : '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{p.payinRequestId ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-800">{formatAmount(p.partialAmount)}</td>
                        <td className="px-3 py-2.5">
                          {p.status ? (
                            <div className="flex flex-col gap-0.5 w-fit">
                              <span className={clsx(
                                'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ring-1',
                                p.status.toLowerCase() === 'paid' || p.status.toLowerCase() === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                  : p.status.toLowerCase() === 'rejected'
                                    ? 'bg-red-50 text-red-700 ring-red-200'
                                    : 'bg-amber-50 text-amber-700 ring-amber-200'
                              )}>
                                {(p.status.toLowerCase() === 'paid' || p.status.toLowerCase() === 'approved')
                                  ? <CheckCircle className="w-3 h-3" />
                                  : p.status.toLowerCase() === 'pending'
                                    ? <Clock className="w-3 h-3" />
                                    : <AlertCircle className="w-3 h-3" />}
                                {p.status}
                              </span>
                              {p.status.toLowerCase() === 'pending' && p.txDate && (
                                <span className="text-[10px] text-amber-500 font-medium pl-0.5">{formatAge(p.txDate)}</span>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400">—</p>
            )}
          </div>
        )}

        {/* Job */}
        {(detail?.jobId || loadingJob) && (
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
                    <span className="text-xs text-gray-600 break-all">{job.id ?? detail?.jobId ?? '—'}</span>
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

      {/* Footer */}
      <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => router.push('/payment/pay-out-requests')}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.admin.back}
        </button>
      </div>
    </div>
  )
}
