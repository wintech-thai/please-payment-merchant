'use client'

import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import QRCode from 'react-qr-code'
import { X, QrCode, Loader2, RefreshCw, Link2, Copy, Check, ExternalLink } from 'lucide-react'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import type { BankAccountItem, PaymentRequestResponse } from '@/lib/api/types'
import { toast } from 'sonner'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

interface Props {
  merchantId: string
  onClose: () => void
  onSuccess: () => void
}

function generateRefId(): string {
  const now = new Date()
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  )
}

export default function QrPaymentModal({ merchantId, onClose, onSuccess }: Props) {
  const { t } = useLang()
  const m = t.merchant
  const a = t.admin

  const [accounts, setAccounts] = useState<BankAccountItem[]>([])
  const [loadingInit, setLoadingInit] = useState(true)

  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [ref, setRef] = useState(() => generateRefId())
  const [ref1, setRef1] = useState('')
  const [ref2, setRef2] = useState('')
  const [payerName, setPayerName] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('username') ?? '' : ''))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PaymentRequestResponse | null>(null)

  const [slipUrl, setSlipUrl] = useState<string | null>(null)
  const [slipUrlCopied, setSlipUrlCopied] = useState(false)

  // SignalR
  const hubRef = useRef<signalR.HubConnection | null>(null)
  const [wsStatus, setWsStatus] = useState<'idle' | 'connecting' | 'waiting' | 'success' | 'error'>('idle')

  function stopHub() {
    if (hubRef.current) {
      hubRef.current.stop().catch(() => {})
      hubRef.current = null
    }
  }

  // Connect SignalR after QR is generated
  useEffect(() => {
    if (!result?.websocketPath || !result?.sessionId) return

    const configuredUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
    // If NEXT_PUBLIC_API_URL is a relative proxy path (e.g. /api/proxy), derive the real API domain
    // from the current hostname: merchant[-env].domain → api[-env].domain
    const wsBase = configuredUrl.startsWith('http')
      ? configuredUrl
      : `https://${window.location.hostname.replace('merchant', 'api')}`
    const wsPath = result.websocketPath.startsWith('/') ? result.websocketPath : `/${result.websocketPath}`
    const hubUrl = `${wsBase}${wsPath}`

    setWsStatus('connecting')

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: () => {
          const token = localStorage.getItem('accessToken') || ''
          return btoa(token)
        },
      })
      .build()

    const onPaymentDone = () => {
      setWsStatus('success')
      stopHub()
    }

    connection.on('payment.completed', onPaymentDone)
    connection.on('PaymentCompleted', onPaymentDone)
    connection.on('paymentCompleted', onPaymentDone)
    connection.on('payment_completed', onPaymentDone)

    hubRef.current = connection

    connection.start()
      .then(() => {
        setWsStatus('waiting')
        connection.invoke('JoinPayment', result.sessionId)
          .catch(() => {})
      })
      .catch(() => {
        setWsStatus('error')
      })

    return () => stopHub()
  }, [result?.websocketPath, result?.sessionId])

  useEffect(() => {
    bankAccountApi.getMyBankAccounts()
      .then(res => {
        const list = res.data.bankAccounts ?? []
        setAccounts(list)
        if (list.length === 1) setSelectedAccountId(list[0].accountId ?? '')
      })
      .catch(() => {})
      .finally(() => setLoadingInit(false))
  }, [])

  useEffect(() => {
    if (!result) return
    const rel = result.slipUploadUrl ?? null
    setSlipUrl(rel ? `${window.location.origin}${rel}` : null)
  }, [result])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = m.qrErrAmount
    if (!ref.trim()) e.ref = m.qrErrRef
    if (!payerName.trim()) e.payerName = m.qrErrPayerName
    if (!selectedAccountId) e.account = m.qrErrAccount
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setResult(null)
    try {
      const account = accounts.find(a => a.accountId === selectedAccountId)
      const payload: any = {
        RefId: ref.trim(),
        RefId1: ref1.trim() || undefined,
        RefId2: ref2.trim() || undefined,
        Currency: 'THB',
        RequestedAmount: Number(amount),
        QrProvider: account?.accountType?.toLowerCase() === 'promptpay' ? 'PP' : (account?.bankCode || 'PP'),
        PayerName: payerName.trim(),
        SelectedPayInBankAccountId: selectedAccountId,
      }
      const res = await paymentRequestApi.submitPayInRequest(merchantId, payload)
      const raw = res.data as any
      const pr: PaymentRequestResponse = raw?.paymentResponse ?? raw?.PaymentResponse ?? raw
      setResult(pr)
      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.qrErrFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    stopHub()
    setWsStatus('idle')
    setResult(null)
    setAmount('')
    setRef(generateRefId())
    setRef1('')
    setRef2('')
    setPayerName(typeof window !== 'undefined' ? localStorage.getItem('username') ?? '' : '')
    setErrors({})
    setSlipUrl(null)
    setSlipUrlCopied(false)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={clsx('w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] transition-all duration-300', result && result.qrCode ? 'max-w-3xl' : 'max-w-lg')}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">QR Payment</h3>
          </div>
          <button onClick={() => { stopHub(); onClose() }} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {loadingInit ? (
            <div className="flex flex-1 items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {a.loading}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {m.qrFieldBankAccount} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={e => { setSelectedAccountId(e.target.value); setErrors(p => ({ ...p, account: '' })) }}
                    className={clsx(
                      'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white',
                      errors.account ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                    )}
                  >
                    <option value="">{m.qrSelectAccountPlaceholder}</option>
                    {accounts.map(acc => (
                      <option key={acc.accountId} value={acc.accountId}>
                        {[acc.bankCode, acc.accountNumber, acc.accountName ? `— ${acc.accountName}` : ''].filter(Boolean).join(' ')}
                      </option>
                    ))}
                  </select>
                  {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {m.qrFieldAmount} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setErrors(p => ({ ...p, amount: '' })) }}
                      placeholder="0.00"
                      className={clsx(
                        'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2',
                        errors.amount ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                      )}
                    />
                    {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {m.qrFieldRef} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ref}
                      onChange={e => { setRef(e.target.value); setErrors(p => ({ ...p, ref: '' })) }}
                      placeholder="Reference"
                      className={clsx(
                        'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2',
                        errors.ref ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                      )}
                    />
                    {errors.ref && <p className="text-red-500 text-xs mt-1">{errors.ref}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      {m.qrFieldPayerName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={e => { setPayerName(e.target.value); setErrors(p => ({ ...p, payerName: '' })) }}
                      placeholder={m.qrFieldPayerName}
                      className={clsx(
                        'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2',
                        errors.payerName ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-300'
                      )}
                    />
                    {errors.payerName && <p className="text-red-500 text-xs mt-1">{errors.payerName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{m.qrFieldRef1}</label>
                    <input type="text" value={ref1} onChange={e => setRef1(e.target.value)} placeholder={m.qrFieldRef1} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{m.qrFieldRef2}</label>
                    <input type="text" value={ref2} onChange={e => setRef2(e.target.value)} placeholder={m.qrFieldRef2} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                </div>

                {result && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Link2 className="w-3.5 h-3.5" />
                      {t.payInRequest.slipLinkTitle}
                    </p>
                    {slipUrl ? (
                      <div className="flex gap-3 items-start">
                        <div className="bg-white p-2 rounded-xl border border-amber-200 flex-shrink-0">
                          <QRCode value={slipUrl} size={96} fgColor="#92400e" />
                        </div>
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 break-all leading-relaxed">{slipUrl}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { navigator.clipboard.writeText(slipUrl); setSlipUrlCopied(true); setTimeout(() => setSlipUrlCopied(false), 2000) }}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                            >
                              {slipUrlCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {slipUrlCopied ? 'Copied!' : 'Copy'}
                            </button>
                            <a href={slipUrl} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {result && result.qrCode && (
                <div className="w-72 flex-shrink-0 border-l border-gray-100 flex flex-col items-center justify-center gap-4 px-6 py-5 bg-primary-50/30">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                    <QRCode value={result.qrCode} size={180} />
                  </div>
                  {result.payInBankAccountName && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{m.qrPayTo}</p>
                      <p className="text-sm font-bold text-gray-800">{result.payInBankAccountName}</p>
                      {result.payInBankAccountNo && <p className="text-xs text-gray-500">{result.payInBankCode} · {result.payInBankAccountNo}</p>}
                    </div>
                  )}
                  {result.generatedAmount != null && (
                    <p className="text-lg font-bold text-primary-700">
                      ฿{result.generatedAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {/* SignalR payment status */}
          {result && (
            <div className="flex items-center gap-2">
              {(wsStatus === 'connecting' || wsStatus === 'waiting') && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span className="text-sm text-amber-600">Waiting....</span>
                </>
              )}
              {wsStatus === 'success' && (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">Payment Successful</span>
                </>
              )}
              {wsStatus === 'error' && (
                <span className="text-xs text-red-400">ไม่สามารถเชื่อมต่อ real-time ได้</span>
              )}
            </div>
          )}
          {!result && <div />}

          <div className="flex items-center gap-3">
            {result ? (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {m.qrReset}
                </button>
                <button onClick={() => { stopHub(); onClose() }} className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                  {m.qrClose}
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {a.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || loadingInit}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {m.qrGenerate}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
