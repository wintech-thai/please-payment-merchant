'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { userApi } from '@/lib/api/user.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

function genRefId() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function FormField({ label, required, error, children, hint }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function AccountTypeBadge({ type }: { type?: string | null }) {
  if (!type) return null
  return (
    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full ring-1 ring-blue-200 flex-shrink-0">
      {type}
    </span>
  )
}

const inputCls = (hasError: boolean) =>
  clsx(
    'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  )

export default function AddPayOutRequestPage() {
  const { t } = useLang()
  const tr = t.payOutRequest
  const router = useRouter()

  const [merchantCode, setMerchantCode] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [payoutMinAmount, setPayoutMinAmount] = useState<number | null>(null)
  const [payoutMaxAmount, setPayoutMaxAmount] = useState<number | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [loadingInit, setLoadingInit] = useState(true)

  const [payinBankAccountId, setPayinBankAccountId] = useState('')
  const [bankOpen, setBankOpen] = useState(false)
  const bankRef = useRef<HTMLDivElement>(null)

  const [requestedAmount, setRequestedAmount] = useState('')
  const [refId, setRefId] = useState(() => genRefId())
  const [refId1, setRefId1] = useState('')
  const [refId2, setRefId2] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const init = async () => {
      const [merchantRes, bankRes] = await Promise.allSettled([
        userApi.getMyMerchantInfo(),
        bankAccountApi.getPayOutBankAccounts(),
      ])
      if (merchantRes.status === 'fulfilled') {
        const d = merchantRes.value.data as any
        const m = d?.merchant ?? d?.data ?? d
        setMerchantId(m?.id ?? m?.merchantId ?? '')
        setMerchantCode(m?.code ?? '')
        setMerchantName(m?.name ?? '')
        setPayoutMinAmount(m?.payoutMinAmount ?? null)
        setPayoutMaxAmount(m?.payoutMaxAmount ?? null)
      }
      if (bankRes.status === 'fulfilled') {
        const d = bankRes.value.data as any
        setBankAccounts(d?.bankAccounts ?? d?.items ?? [])
      }
      setLoadingInit(false)
    }
    init()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setBankOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedBank = bankAccounts.find(b => (b.accountId ?? b.bankAccountId) === payinBankAccountId)
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!payinBankAccountId) errs.bank = tr.payoutBankAccountRequired
    if (!refId.trim()) errs.refId = tr.refIdRequired
    if (!requestedAmount.trim()) {
      errs.amount = tr.amountRequired
    } else {
      const n = parseFloat(requestedAmount)
      if (isNaN(n) || n <= 0) errs.amount = tr.amountInvalid
      else {
        if (payoutMinAmount != null && n < payoutMinAmount)
          errs.amount = `${tr.amountBelowMin} (min: ${payoutMinAmount.toLocaleString('th-TH')})`
        if (payoutMaxAmount != null && n > payoutMaxAmount)
          errs.amount = `${tr.amountAboveMax} (max: ${payoutMaxAmount.toLocaleString('th-TH')})`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await paymentRequestApi.createPayOutRequest({
        MerchantId: merchantId,
        RefId: refId.trim(),
        RefId1: refId1.trim() || undefined,
        RefId2: refId2.trim() || undefined,
        Description: description.trim() || undefined,
        Currency: 'THB',
        RequestedAmount: parseFloat(requestedAmount),
        QrProvider: 'PP',
        PayinBankAccountId: payinBankAccountId,
      })
      toast.success(tr.toastCreateSuccess)
      router.push('/payment/pay-out-requests')
    } catch {
      toast.error(tr.toastCreateFailed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr.createTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tr.createSubtitle}</p>
        </div>
      </div>

      {loadingInit ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t.common.loading}</span>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

            {/* Section 1: Merchant Info (read-only) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
              <SectionHeader>{tr.sectionMerchant}</SectionHeader>
              <div className="flex flex-wrap items-end gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t.merchant.fieldCode}</p>
                    <p className="text-sm text-gray-800 font-medium">{merchantCode || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t.merchant.fieldName}</p>
                    <p className="text-sm text-gray-800">{merchantName || '—'}</p>
                  </div>
                </div>
                {(payoutMinAmount != null || payoutMaxAmount != null) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{tr.payoutRange}</p>
                    <div className="flex items-center gap-2 text-sm">
                      {payoutMinAmount != null && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                          MIN {payoutMinAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {payoutMaxAmount != null && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                          MAX {payoutMaxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Destination Bank Account */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
              <SectionHeader>{tr.sectionPayoutBank}</SectionHeader>
              <div className="max-w-md">
                <FormField label={tr.fieldPayoutBankAccount} required error={errors.bank}>
                  <div ref={bankRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setBankOpen(p => !p)}
                      className={clsx(
                        'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border rounded-lg text-left transition-colors focus:outline-none focus:ring-2 focus:border-transparent bg-white',
                        errors.bank ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        {selectedBank ? (
                          <span className="flex items-center flex-wrap gap-1.5 min-w-0 flex-1">
                            <span className="font-semibold text-gray-900 text-sm">
                              {[selectedBank.bankCode, selectedBank.accountNumber].filter(Boolean).join(' · ')}
                            </span>
                            {selectedBank.accountName && (
                              <span className="text-gray-400 text-sm font-normal">— {selectedBank.accountName}</span>
                            )}
                            <AccountTypeBadge type={selectedBank.accountType} />
                          </span>
                        ) : (
                          <span className="text-gray-400">{tr.placeholderPayoutBankAccount}</span>
                        )}
                      </span>
                      <span className="text-gray-400 text-xs flex-shrink-0">▾</span>
                    </button>

                    {bankOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto custom-scrollbar">
                        <button
                          type="button"
                          onClick={() => { setPayinBankAccountId(''); setBankOpen(false); clearErr('bank') }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
                        >
                          {tr.placeholderPayoutBankAccount}
                        </button>
                        {bankAccounts.length === 0 ? (
                          <div className="px-3 py-2.5 text-sm text-gray-400">{tr.noPayoutBankAccounts}</div>
                        ) : bankAccounts.map(ba => {
                          const id = ba.accountId ?? ba.bankAccountId ?? ''
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => { setPayinBankAccountId(id); setBankOpen(false); clearErr('bank') }}
                              className={clsx(
                                'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0',
                                payinBankAccountId === id ? 'bg-primary-50' : 'hover:bg-gray-50'
                              )}
                            >
                              <span className="flex-1 min-w-0 flex items-center flex-wrap gap-1.5">
                                <span className={clsx('text-sm font-semibold', payinBankAccountId === id ? 'text-primary-700' : 'text-gray-900')}>
                                  {[ba.bankCode, ba.accountNumber].filter(Boolean).join(' · ')}
                                </span>
                                {ba.accountName && (
                                  <span className="text-sm text-gray-400 font-normal">— {ba.accountName}</span>
                                )}
                                <AccountTypeBadge type={ba.accountType} />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </FormField>

                {selectedBank && (selectedBank.payoutMinAmount != null || selectedBank.payoutMaxAmount != null) && (
                  <div className="mt-3 flex gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{tr.minAmount}</span>
                      <span className="text-sm font-semibold text-gray-700 tabular-nums">
                        {selectedBank.payoutMinAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{tr.maxAmount}</span>
                      <span className="text-sm font-semibold text-gray-700 tabular-nums">
                        {selectedBank.payoutMaxAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2 }) ?? '—'}
                      </span>
                    </div>
                  </div>
                )}


              </div>
            </div>

            {/* Section 3: Request Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
              <SectionHeader>{tr.sectionRequestInfo}</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <FormField label="Ref ID" required error={errors.refId} hint="Auto-generated · YYMMDDHHMMSS">
                  <div className="flex gap-2">
                    <input
                      value={refId}
                      onChange={e => { setRefId(e.target.value); clearErr('refId') }}
                      placeholder={tr.placeholderRefId}
                      className={clsx(inputCls(!!errors.refId), 'flex-1 min-w-0')}
                    />
                    <button
                      type="button"
                      onClick={() => { setRefId(genRefId()); clearErr('refId') }}
                      title="Re-generate"
                      className="flex-shrink-0 px-2.5 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </FormField>

                <FormField label={tr.fieldRequestedAmount} required error={errors.amount}>
                  <input
                    value={requestedAmount}
                    onChange={e => {
                      const v = e.target.value
                      if (/^\d*\.?\d{0,2}$/.test(v) || v === '') {
                        setRequestedAmount(v); clearErr('amount')
                      }
                    }}
                    placeholder={tr.placeholderAmount}
                    inputMode="decimal"
                    className={inputCls(!!errors.amount)}
                  />
                </FormField>

                <FormField label={tr.fieldRefId1}>
                  <input
                    value={refId1}
                    onChange={e => setRefId1(e.target.value)}
                    placeholder={tr.placeholderRefId1}
                    className={inputCls(false)}
                  />
                </FormField>

                <FormField label={tr.fieldRefId2}>
                  <input
                    value={refId2}
                    onChange={e => setRefId2(e.target.value)}
                    placeholder={tr.placeholderRefId2}
                    className={inputCls(false)}
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label={tr.fieldDescription}>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={tr.placeholderDescription}
                      rows={2}
                      className={clsx(inputCls(false), 'resize-none')}
                    />
                  </FormField>
                </div>

              </div>
            </div>

          </div>

          {/* Sticky Footer */}
          <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.admin.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? tr.btnSaving : tr.btnSave}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
