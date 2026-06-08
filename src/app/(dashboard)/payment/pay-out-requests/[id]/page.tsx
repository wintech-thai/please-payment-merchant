'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayOutRequestDetail } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import QRCode from 'react-qr-code'

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
  if (s === 'paid' || s === 'approved') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" />{status}
    </span>
  )
  if (s === 'rejected') return (
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



export default function PayOutRequestDetailPage() {
  const { t } = useLang()
  const tr = t.payOutRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayOutRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const isRejected = detail?.status?.toLowerCase() === 'rejected'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPayOutRequestById(id)
        const data = res.data as any
        setDetail(data?.paymentRequest ?? data?.data ?? data)
      } catch {
        toast.error(tr.toastFailedToLoad)
        router.push('/payment/pay-out-requests')
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr.detailTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{id}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Section 1: Request Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{tr.sectionDestination}</SectionHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 max-w-4xl">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">

              <InfoRow label={tr.fieldCreated}>{formatDateTime(detail?.createdDate)}</InfoRow>

              <InfoRow label={tr.fieldStatus}>
                <StatusBadge status={detail?.status} />
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
              </InfoRow>

              <InfoRow label={tr.fieldNetAmount}>
                {detail?.payOutTotalAmountDecimal != null ? (
                  <span className="font-bold tabular-nums text-emerald-700 text-xl">
                    {formatAmount(detail.payOutTotalAmountDecimal)}
                  </span>
                ) : '—'}
              </InfoRow>

              <InfoRow label={tr.fieldRefId ?? 'Ref ID'}>{detail?.refId ?? '—'}</InfoRow>

              {(detail?.refId1 || detail?.refId2) && (
                <>
                  <InfoRow label={tr.colRefId1}>{detail?.refId1 ?? '—'}</InfoRow>
                  <InfoRow label={tr.colRefId2}>{detail?.refId2 ?? '—'}</InfoRow>
                </>
              )}

              <InfoRow label={tr.fieldDescription}>
                <span className="text-gray-600">{detail?.description ?? '—'}</span>
              </InfoRow>


              {isRejected && detail?.rejectReason && (
                <div className="sm:col-span-2">
                  <InfoRow label={tr.labelRejectReason}>
                    <span className="text-red-600 font-medium">{detail.rejectReason}</span>
                  </InfoRow>
                </div>
              )}

            </div>

            {/* QR Code */}
            {(detail?.qrCodeImage || detail?.qrCode) && (
              <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide self-start">QR Code</p>
                {detail.qrCodeImage ? (
                  <img
                    src={detail.qrCodeImage.startsWith('data:') ? detail.qrCodeImage : `data:image/png;base64,${detail.qrCodeImage}`}
                    alt="QR Code"
                    className="w-56 h-56 rounded-lg border border-gray-200 p-1 bg-white"
                  />
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-gray-200 inline-block">
                    <QRCode value={detail.qrCode!} size={200} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Source Bank Account (Pay-In) */}
        {(detail?.payinBankCode || detail?.payinBankAccountNo) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
              <span className="w-1 h-5 bg-emerald-500 rounded-full flex-shrink-0" />
              {tr.sectionSource}
            </h2>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                {tr.fieldSourceAccount}
              </p>
              <p className="text-sm font-bold text-gray-800">
                {[detail.payinBankCode, detail.payinBankAccountNo].filter(Boolean).join(' · ')}
              </p>
              {detail.payinBankAccountName && (
                <p className="text-sm text-gray-500">{detail.payinBankAccountName}</p>
              )}
              {detail.payinPromptPayId && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full ring-1 ring-blue-200">PromptPay</span>
                  <span className="text-sm text-gray-600">{detail.payinPromptPayId}</span>
                </div>
              )}
            </div>
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
