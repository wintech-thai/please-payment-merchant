'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentSlipApi } from '@/lib/api/payment-slip.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PayInSlipDetail, BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { client } from '@/lib/axios'
import { ChevronLeft, CheckCircle, XCircle, Clock, ImageIcon, Save, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'

function buildStorageUrl(url: string): string {
  if (!url.includes('<STORAGE-API-BASE>')) return url
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin)
  const base = isLocalhost ? (process.env.NEXT_PUBLIC_API_URL ?? '') : origin
  const storageBase = base.replace(/^(https?:\/\/)[^.]+\./, '$1storage-api.')
  return url.replace('<STORAGE-API-BASE>', storageBase)
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

function StatusBadge({ status, size = 'md' }: { status?: string | null; size?: 'sm' | 'md' }) {
  const s = status?.toLowerCase()
  const cls = size === 'sm'
    ? 'px-2.5 py-1 text-xs'
    : 'px-3 py-1.5 text-sm'
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  if (s === 'approved') return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ${cls}`}>
      <CheckCircle className={iconCls} />{status}
    </span>
  )
  if (s === 'rejected') return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-red-50 text-red-700 ring-1 ring-red-200 ${cls}`}>
      <XCircle className={iconCls} />{status}
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200 ${cls}`}>
      <Clock className={iconCls} />{status ?? 'Pending'}
    </span>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-4">
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

export default function PayInSlipDetailPage() {
  const { t } = useLang()
  const tr = t.payInSlip
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayInSlipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)

  const [bankAccountId, setBankAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [refId, setRefId] = useState('')
  const [origBankAccountId, setOrigBankAccountId] = useState('')
  const [origAmount, setOrigAmount] = useState('')
  const [origRefId, setOrigRefId] = useState('')
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ found: boolean; item: any | null } | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await paymentSlipApi.getPayInDocumentById(id)
        const d = res.data as any
        const doc: PayInSlipDetail = d?.paymentDocument ?? d?.data ?? d
        setDetail(doc)

        const initBankId = doc.payInBankAccountId ?? ''
        const initAmount = doc.txAmountDecimal != null ? String(doc.txAmountDecimal) : ''
        const initRefId = doc.refId ?? ''
        setBankAccountId(initBankId)
        setAmount(initAmount)
        setRefId(initRefId)
        setOrigBankAccountId(initBankId)
        setOrigAmount(initAmount)
        setOrigRefId(initRefId)

        const isPendingDoc = doc.status?.toLowerCase() === 'pending'
        if (isPendingDoc) {
          setLoadingBanks(true)
          try {
            const baRes = await bankAccountApi.getBankAccounts()
            setBankAccounts(baRes.data.bankAccounts)
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : tr.toastFailedToLoadDetail)
          } finally {
            setLoadingBanks(false)
          }
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : tr.toastFailedToLoadDetail)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, tr.toastFailedToLoadDetail])

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isRejected = detail?.status?.toLowerCase() === 'rejected'
  const isReadOnly = !isPending

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') ?? '' : ''
    try {
      const res = await client.post<any>(
        `/api/PaymentTransaction/org/${orgId}/action/GetPendingPayInRequestsForPaymentTx`,
        {
          GeneratedAmountStr: detail?.txAmountDecimal ? String(parseFloat(String(detail.txAmountDecimal))) : undefined,
          BankAccountId: detail?.payInBankAccountId || undefined,
          MerchantId: detail?.merchantId || undefined,
        }
      )
      const data = res.data as any
      const list: any[] = Array.isArray(data)
        ? data
        : (data?.payInRequests ?? data?.PayInRequests ?? data?.requests ?? data?.items ?? [])
      setVerifyResult({ found: list.length > 0, item: list[0] ?? null })
    } catch (err: any) {
      toast.error(err?.message ?? tr.toastVerifyFailed)
    } finally {
      setVerifying(false)
    }
  }

  const handleUpdate = async () => {
    if (!bankAccountId) { toast.error(tr.validBankRequired); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error(tr.validAmountRequired); return }
    if (!refId.trim()) { toast.error(tr.validRefIdRequired); return }

    const isDirty =
      bankAccountId !== origBankAccountId ||
      amount !== origAmount ||
      refId.trim() !== origRefId.trim()
    if (!isDirty) { router.push('/payment/pay-in-slips'); return }

    setSaving(true)
    try {
      await paymentSlipApi.updatePayInDocument(id, {
        TxAmountDecimal: parseFloat(amount),
        PayInBankAccountId: bankAccountId,
        RefId: refId.trim(),
      })
      toast.success(tr.toastUpdateSuccess)
      router.push('/payment/pay-in-slips')
    } catch (err: any) {
      toast.error(err?.message ?? tr.toastUpdateFailed)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/payment/pay-in-slips')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tr.detailTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tr.detailSubtitle}</p>
          </div>
        </div>
        <StatusBadge status={detail?.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
        {/* Left: Slip Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5">
            <SectionHeader>{tr.sectionSlip}</SectionHeader>
            {detail?.previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={buildStorageUrl(detail.previewUrl)} alt={tr.previewAlt} className="w-full object-contain max-h-[600px]" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-200 gap-2">
                <ImageIcon className="w-8 h-8 text-gray-300" />
                <p className="text-sm text-gray-400">No image</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info + Editable fields */}
        <div className="space-y-5">
          {/* Read-only info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5">
              <SectionHeader>{tr.sectionInfo}</SectionHeader>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label={tr.colStatus}>
                  <StatusBadge status={detail?.status} size="sm" />
                </InfoRow>
                <InfoRow label={tr.colMerchant}>
                  <span className="font-medium">{detail?.merchantCode ?? '—'}</span>
                  {detail?.merchantName && <p className="text-xs text-gray-400 mt-0.5">{detail.merchantName}</p>}
                </InfoRow>
                <InfoRow label={tr.colCreatedDate}>
                  {formatDateTime(detail?.createdDate)}
                </InfoRow>
                {detail?.rejectReason && (
                  <InfoRow label={tr.labelRejectReason}>
                    <span className="text-red-600 text-xs">{detail.rejectReason}</span>
                  </InfoRow>
                )}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 space-y-4">
              {/* Bank Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {tr.labelBankAccount} {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                {isReadOnly ? (
                  <div className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700">
                    {detail?.payInBankCode && detail?.payInBankAccountNo
                      ? `${detail.payInBankCode} — ${detail.payInBankAccountNo}${detail.payInBankAccountName ? ` (${detail.payInBankAccountName})` : ''}`
                      : '—'}
                    {detail?.payInAccountType && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
                        {detail.payInAccountType}
                      </span>
                    )}
                  </div>
                ) : (
                  <select
                    value={bankAccountId}
                    onChange={e => setBankAccountId(e.target.value)}
                    disabled={loadingBanks}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  >
                    <option value="">{loadingBanks ? 'Loading...' : tr.placeholderBankAccount}</option>
                    {bankAccounts.map(ba => (
                      <option key={ba.accountId} value={ba.accountId}>
                        {ba.bankCode} — {ba.accountNumber} {ba.accountName ? `(${ba.accountName})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {tr.labelAmount} {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                {isReadOnly ? (
                  <div className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-semibold tabular-nums">
                    {detail?.txAmountDecimal != null
                      ? Number(detail.txAmountDecimal).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : '—'}
                  </div>
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={tr.placeholderAmount}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                )}
              </div>

              {/* RefId */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {tr.labelRefId} {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                {isReadOnly ? (
                  <div className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 break-all">
                    {detail?.refId ?? '—'}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={refId}
                    onChange={e => setRefId(e.target.value)}
                    placeholder={tr.placeholderRefId}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Verify result card — shown after verify clicked (rejected only) */}
          {verifyResult !== null && (
            <div className={clsx(
              'rounded-xl border px-4 py-3',
              verifyResult.found ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            )}>
              <p className="text-xs font-bold uppercase tracking-wide mb-1 text-gray-500">{tr.verifyResultTitle}</p>
              {verifyResult.found ? (
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-emerald-700">{tr.verifyFound}</p>
                  {verifyResult.item?.refId && (
                    <p className="text-xs text-gray-600">Ref ID: <span className="font-medium">{verifyResult.item.refId}</span></p>
                  )}
                  {verifyResult.item?.status && (
                    <p className="text-xs text-gray-600">Status: <span className="font-medium">{verifyResult.item.status}</span></p>
                  )}
                  {(verifyResult.item?.requestedAmount ?? verifyResult.item?.generatedAmount) != null && (
                    <p className="text-xs text-gray-600">
                      Amount: <span className="font-medium tabular-nums">
                        {(verifyResult.item.requestedAmount ?? verifyResult.item.generatedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-semibold text-amber-700">{tr.verifyNotFound}</p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 justify-end">
            {/* Verify — rejected only */}
            {isRejected && (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 disabled:opacity-50"
              >
                {verifying ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <ShieldCheck className="w-4 h-4" />}
                {verifying ? tr.btnVerifying : tr.btnVerify}
              </button>
            )}

            {/* Save — active when Pending, disabled (grayed) when Approved */}
            {!isRejected && (
              <button
                onClick={isPending ? handleUpdate : undefined}
                disabled={!isPending || saving}
                className={clsx(
                  'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors',
                  isPending
                    ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-200 disabled:opacity-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <Save className="w-4 h-4" />}
                {saving ? tr.btnUpdating : tr.btnUpdate}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
