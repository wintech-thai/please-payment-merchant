'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { PayOutRequestDetail } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import clsx from 'clsx'

function fmt(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return d }
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = status?.toLowerCase()
  if (s === 'paid' || s === 'approved' || s === 'success') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{status}
    </span>
  )
  if (s === 'rejected' || s === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{status}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{status ?? 'Pending'}
    </span>
  )
}

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
        <span className={clsx('w-1 h-5 rounded-full flex-shrink-0', accent ?? 'bg-primary-500')} />{title}
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

export default function PayOutRequestDetailPage() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayOutRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentRequestApi.getPayOutRequestById(id)
        const data = res.data as any
        const raw = data?.paymentRequest ?? data
        if (raw) raw.isPayInBankAccountOverride = raw.isPayInBankAccountOverride ?? raw.isPayinBankAccountOverride ?? false
        setDetail(raw)
      } catch {
        toast.error('Failed to load pay-out request')
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
        {t.admin.loading}
      </div>
    )
  }

  const isRejected = detail?.status?.toLowerCase() === 'rejected'

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">

      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pay-Out Request Detail</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{id}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        <Section title="Request Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Date">{fmtDate(detail?.createdDate)}</Field>
            <Field label="Status"><StatusBadge status={detail?.status} /></Field>
            <Field label="Requested Amount">
              <span className="font-semibold tabular-nums text-base">{fmt(detail?.requestedAmount)}</span>
            </Field>
            <Field label="Currency">{detail?.currency ?? '—'}</Field>
            <Field label="Payout Fee">
              <span className="font-semibold tabular-nums">{fmt(detail?.payoutFeeDecimal)}</span>
              {detail?.payoutFeePct != null && <span className="ml-2 text-xs text-gray-400">({detail.payoutFeePct}%)</span>}
            </Field>
            <Field label="Total Payout Amount">
              <span className="font-semibold tabular-nums">{fmt(detail?.payOutTotalAmountDecimal)}</span>
            </Field>
            <Field label="Ref ID">{detail?.refId ?? '—'}</Field>
            <Field label="Ref 1">{detail?.refId1 ?? '—'}</Field>
            <Field label="Ref 2">{detail?.refId2 ?? '—'}</Field>
            <Field label="Description">{detail?.description ?? '—'}</Field>
            {isRejected && detail?.rejectReason && (
              <Field label="Reject Reason">
                <span className="text-red-600 font-medium">{detail.rejectReason}</span>
              </Field>
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
                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Destination Bank</p>
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
        </Section>

        {/* Payout Range */}
        {(detail?.merchantMinPayout != null || detail?.merchantMaxPayout != null) && (
          <Section title="Payout Range">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs font-semibold text-gray-500">MIN</span>
                <span className="text-sm font-bold text-gray-800 tabular-nums">{fmt(detail?.merchantMinPayout)}</span>
              </div>
              <span className="text-gray-400">—</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs font-semibold text-gray-500">MAX</span>
                <span className="text-sm font-bold text-gray-800 tabular-nums">{fmt(detail?.merchantMaxPayout)}</span>
              </div>
            </div>
          </Section>
        )}

        {/* Source Bank Account (FROM) — hidden when Pending */}
        {detail?.status?.toLowerCase() !== 'pending' && (
          <Section title="Source Bank Account" accent="bg-rose-500">
            {detail?.payoutBankCode || detail?.payoutBankAccountNo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Bank Code">{detail?.payoutBankCode ?? '—'}</Field>
                <Field label="Account No">{detail?.payoutBankAccountNo ?? '—'}</Field>
                {detail?.payoutBankAccountName && <Field label="Account Name">{detail.payoutBankAccountName}</Field>}
                {detail?.payoutAccountType && (
                  <Field label="Account Type">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs font-bold rounded-full ring-1 ring-violet-200">{detail.payoutAccountType}</span>
                  </Field>
                )}
                {detail?.payoutPromptPayId && <Field label="PromptPay ID">{detail.payoutPromptPayId}</Field>}
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </Section>
        )}

        {detail?.processingSteps && detail.processingSteps.length > 0 && (
          <Section title="Processing Steps">
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
