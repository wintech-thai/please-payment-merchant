'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PayOutRequestDetail } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, CheckCircle, AlertCircle, Clock, Search, X } from 'lucide-react'
import QRCode from 'react-qr-code'
import clsx from 'clsx'

interface AccountOption {
  id: string
  bankCode?: string | null
  accountNumber?: string | null
  accountName?: string | null
  accountType?: string | null
  promptPayId?: string | null
  currentBalance?: number | null
}

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

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function PayOutRequestDetailPage() {
  const { t } = useLang()
  const tr = t.payOutRequest
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [detail, setDetail] = useState<PayOutRequestDetail | null>(null)
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [bankError, setBankError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isPending = detail?.status?.toLowerCase() === 'pending'
  const isRejected = detail?.status?.toLowerCase() === 'rejected'

  const accountLabel = (a: AccountOption) =>
    [a.bankCode, a.accountNumber, a.accountName ? `— ${a.accountName}` : ''].filter(Boolean).join(' ')

  const filteredAccounts = accountSearch.trim()
    ? allAccounts.filter(a => {
        const q = accountSearch.toLowerCase()
        return (
          a.bankCode?.toLowerCase().includes(q) ||
          a.accountNumber?.toLowerCase().includes(q) ||
          a.accountName?.toLowerCase().includes(q)
        )
      })
    : allAccounts

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [detailRes, bankRes] = await Promise.allSettled([
          paymentRequestApi.getPayOutRequestById(id),
          bankAccountApi.getBankAccounts(),
        ])

        let req: PayOutRequestDetail | null = null
        if (detailRes.status === 'fulfilled') {
          const data = detailRes.value.data as any
          req = data?.paymentRequest ?? data?.data ?? data
          setDetail(req)
        } else {
          toast.error(tr.toastFailedToLoad)
          router.push('/payment/pay-out-requests')
          return
        }

        if (bankRes.status === 'fulfilled') {
          const mapped: AccountOption[] = bankRes.value.data.bankAccounts.map(b => ({
            id: b.accountId ?? b.bankAccountId ?? '',
            bankCode: b.bankCode,
            accountNumber: b.accountNumber,
            accountName: b.accountName,
            accountType: b.accountType,
            promptPayId: b.promptPayId,
            currentBalance: b.currentBalance ?? b.currentWalletBalance ?? null,
          }))
          setAllAccounts(mapped)

          const savedId = req?.payinBankAccountId ?? null
          if (savedId) {
            const saved = mapped.find(a => a.id === savedId)
            if (saved) {
              setSelectedAccountId(savedId)
              setAccountSearch(accountLabel(saved))
            }
          }
        } else {
          toast.error(tr.toastFailedToLoadBanks)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await paymentRequestApi.updatePayOutRequestById(id, {
        PayinBankAccountId: selectedAccountId || undefined,
      })
      toast.success(tr.toastSaveSuccess)
      router.push('/payment/pay-out-requests')
    } catch (err: any) {
      toast.error(err?.message ?? tr.toastSaveFailed)
    } finally {
      setSaving(false)
    }
  }

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

              <InfoRow label={tr.fieldDestBank}>
                {detail?.payinBankCode || detail?.payinBankAccountNo ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {[detail.payinBankCode, detail.payinBankAccountNo].filter(Boolean).join(' · ')}
                    </span>
                    {detail.payinBankAccountName && (
                      <span className="text-gray-500 text-xs">{detail.payinBankAccountName}</span>
                    )}
                    <AccountTypeBadge accountType={detail.payinAccountType} promptPayId={detail.payinPromptPayId} />
                  </div>
                ) : '—'}
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

        {/* Section 2: Source Bank (editable when Pending, read-only otherwise) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{tr.sectionPayoutBank}</SectionHeader>

          {isPending ? (
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                {tr.fieldPayoutBankAccount} <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <div className={clsx(
                  'flex items-center border rounded-lg bg-white overflow-hidden',
                  bankError ? 'border-red-400' : 'border-gray-200',
                )}>
                  <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={e => {
                      setAccountSearch(e.target.value)
                      setSelectedAccountId('')
                      setBankError('')
                      setShowDropdown(true)
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder={tr.placeholderPayoutBankAccount}
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                  {(accountSearch || selectedAccountId) && (
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setAccountSearch(''); setSelectedAccountId(''); setBankError('') }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredAccounts.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">{tr.noPayoutBankAccounts}</p>
                    ) : (
                      filteredAccounts.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            setSelectedAccountId(a.id)
                            setAccountSearch(accountLabel(a))
                            setBankError('')
                            setShowDropdown(false)
                          }}
                          className={clsx(
                            'w-full px-4 py-2.5 text-left text-sm transition-colors',
                            selectedAccountId === a.id
                              ? 'bg-primary-50 text-primary-700 font-semibold'
                              : 'hover:bg-gray-50 text-gray-700'
                          )}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium">{a.bankCode}</span>
                            {a.accountNumber && <span>{a.accountNumber}</span>}
                            {a.accountName && <span className="text-gray-400 text-xs">— {a.accountName}</span>}
                            {a.accountType && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200">
                                {a.accountType}
                              </span>
                            )}
                          </div>
                          {a.promptPayId && a.accountType?.toLowerCase() === 'promptpay' && (
                            <div className="mt-0.5 text-[10px] text-gray-400">{a.promptPayId}</div>
                          )}
                          {a.currentBalance != null && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[10px] text-gray-400">Balance:</span>
                              <span className={clsx(
                                'text-xs font-semibold tabular-nums',
                                a.currentBalance > 0 ? 'text-emerald-600' : 'text-red-500'
                              )}>
                                {a.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {bankError && <p className="text-red-500 text-xs mt-1">{bankError}</p>}
              {selectedAccountId && (
                <p className="text-xs text-emerald-600 mt-1">✓ Selected</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoRow label={tr.fieldPayoutBankAccount}>
                {detail?.payinBankCode || detail?.payinBankAccountNo ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {[detail.payinBankCode, detail.payinBankAccountNo].filter(Boolean).join(' · ')}
                    </span>
                    {detail.payinBankAccountName && (
                      <span className="text-gray-500 text-xs">{detail.payinBankAccountName}</span>
                    )}
                    <AccountTypeBadge accountType={detail.payinAccountType} promptPayId={detail.payinPromptPayId} />
                  </div>
                ) : '—'}
              </InfoRow>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={() => router.push('/payment/pay-out-requests')}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t.admin.cancel}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          {saving && <Spinner />}
          {saving ? tr.btnSaving : tr.btnSave}
        </button>
      </div>
    </div>
  )
}
