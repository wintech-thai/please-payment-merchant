'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { Loader2, AlertCircle, RefreshCw, Ban, Upload, Building2, Banknote, Hash, User } from 'lucide-react'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider, useLang } from '@/context/LanguageContext'

type PageState = 'verifying' | 'invalid' | 'ready' | 'refreshing' | 'error'

interface PaymentStatusData {
  paymentRequestId?: string
  paymentStatus?: string
  refId1?: string | null
  refId2?: string | null
  refId3?: string | null
  payerName?: string | null
  amount?: number | null
  currency?: string | null
  qrCode?: string | null
  isQrAvailable?: boolean | null
  payInBankAccountName?: string | null
  payInBankAccountNo?: string | null
  payInBankCode?: string | null
  payInPromptPayId?: string | null
  merchantName?: string | null
  slipUploadUrl?: string | null
}

function pick<T>(d: any, camel: string, pascal: string): T | undefined {
  return d?.[camel] ?? d?.[pascal]
}

function PaymentStatusContent() {
  const params = useParams()
  const orgId = params?.orgId as string
  const paymentRequestId = params?.paymentRequestId as string
  const token = params?.token as string
  const { t } = useLang()
  const m = t.paymentStatus

  const [pageState, setPageState] = useState<PageState>('verifying')
  const [data, setData] = useState<PaymentStatusData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const load = useCallback((isRefresh: boolean) => {
    if (!orgId || !paymentRequestId || !token) {
      setPageState('invalid')
      return
    }
    setPageState(isRefresh ? 'refreshing' : 'verifying')
    fetch(`/api/proxy/api/PaymentRequest/org/${orgId}/action/GetPayInStatusByToken/${paymentRequestId}/${token}`)
      .then(r => r.json())
      .then(d => {
        const status = pick<string>(d, 'status', 'Status')
        if (status !== 'OK') {
          setPageState('invalid')
          return
        }
        setData({
          paymentRequestId: pick(d, 'paymentRequestId', 'PaymentRequestId'),
          paymentStatus: pick(d, 'paymentStatus', 'PaymentStatus'),
          refId1: pick(d, 'refId1', 'RefId1'),
          refId2: pick(d, 'refId2', 'RefId2'),
          refId3: pick(d, 'refId3', 'RefId3'),
          payerName: pick(d, 'payerName', 'PayerName'),
          amount: pick(d, 'amount', 'Amount'),
          currency: pick(d, 'currency', 'Currency'),
          qrCode: pick(d, 'qrCode', 'QrCode'),
          isQrAvailable: pick(d, 'isQrAvailable', 'IsQrAvailable'),
          payInBankAccountName: pick(d, 'payInBankAccountName', 'PayInBankAccountName'),
          payInBankAccountNo: pick(d, 'payInBankAccountNo', 'PayInBankAccountNo'),
          payInBankCode: pick(d, 'payInBankCode', 'PayInBankCode'),
          payInPromptPayId: pick(d, 'payInPromptPayId', 'PayInPromptPayId'),
          merchantName: pick(d, 'merchantName', 'MerchantName'),
          slipUploadUrl: pick(d, 'slipUploadUrl', 'SlipUploadUrl'),
        })
        setPageState('ready')
      })
      .catch(() => {
        setErrorMsg(m.errorDefault)
        setPageState('error')
      })
  }, [orgId, paymentRequestId, token, m.errorDefault])

  useEffect(() => {
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, paymentRequestId, token])

  const gradientStyle = {
    background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-800)) 40%, rgb(var(--color-primary-500)) 100%)',
  }

  const statusLabel = (s?: string) => {
    switch (s?.toLowerCase()) {
      case 'pending': return m.statusPending
      case 'approved': return m.statusApproved
      case 'paid': return m.statusPaid
      case 'rejected': return m.statusRejected
      default: return s || '-'
    }
  }

  const statusBadgeClass = (s?: string) => {
    switch (s?.toLowerCase()) {
      case 'pending': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      case 'approved': case 'paid': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      case 'rejected': return 'bg-red-50 text-red-600 ring-1 ring-red-200'
      default: return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
    }
  }

  const isPending = data?.paymentStatus?.toLowerCase() === 'pending'
  const isLoading = pageState === 'verifying' || pageState === 'refreshing'

  return (
    <>
      <NavbarClean />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 overflow-x-hidden">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-5 text-white" style={gradientStyle}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-base font-bold leading-tight">{m.title}</h1>
                  <p className="text-orange-200 text-xs mt-0.5">{m.subtitle}</p>
                </div>
                {(pageState === 'ready' || pageState === 'refreshing') && data && (
                  <button
                    type="button"
                    onClick={() => load(true)}
                    disabled={pageState === 'refreshing'}
                    className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors disabled:opacity-50"
                    aria-label="refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${pageState === 'refreshing' ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-7">

              {pageState === 'verifying' && (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">{m.verifying}</p>
                </div>
              )}

              {pageState === 'invalid' && (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">{m.invalidTitle}</p>
                  <p className="text-xs text-gray-400 mt-3">{m.invalidDesc}</p>
                </div>
              )}

              {pageState === 'error' && (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">{m.errorTitle}</p>
                  <p className="text-red-500 text-sm font-medium mb-4">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => load(false)}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {m.retry}
                  </button>
                </div>
              )}

              {(pageState === 'ready' || pageState === 'refreshing') && data && (
                <div className={`space-y-5 ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* Status badge */}
                  <div className="flex justify-center">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusBadgeClass(data.paymentStatus)}`}>
                      {statusLabel(data.paymentStatus)}
                    </span>
                  </div>

                  {/* Amount */}
                  {data.amount != null && (
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-900 tabular-nums">
                        {data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{data.currency || 'THB'}</p>
                    </div>
                  )}

                  {/* QR code */}
                  {data.isQrAvailable && data.qrCode && (
                    <div className="relative flex justify-center p-4 bg-white border border-gray-200 rounded-xl">
                      <QRCode value={data.qrCode} size={180} />
                      {!isPending && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 rounded-xl">
                          <Ban className="w-16 h-16 text-red-500/80" strokeWidth={1.5} />
                          <p className="text-red-600 font-bold text-sm px-4 text-center">{m.doNotScan}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bank account info */}
                  {(data.payInBankAccountName || data.payInPromptPayId) && (
                    <div className="bg-gray-50 rounded-lg p-3.5 space-y-2 text-sm">
                      {data.payInBankAccountName && (
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-gray-800 font-medium truncate">{data.payInBankAccountName}</p>
                            <p className="text-gray-500 text-xs">
                              {[data.payInBankCode, data.payInBankAccountNo].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </div>
                      )}
                      {data.payInPromptPayId && (
                        <div className="flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 text-xs">PromptPay: {data.payInPromptPayId}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ref / Payer / Merchant */}
                  <div className="space-y-1.5 text-xs">
                    {data.payerName && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-400">{m.payerLabel}:</span>
                        <span className="font-medium text-gray-700 truncate">{data.payerName}</span>
                      </div>
                    )}
                    {[data.refId1, data.refId2, data.refId3].map((ref, i) => ref && (
                      <div key={i} className="flex items-center gap-2 text-gray-600">
                        <Hash className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-400">{m.refLabel} {i + 1}:</span>
                        <span className="text-gray-700 break-all">{ref}</span>
                      </div>
                    ))}
                    {data.merchantName && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-400">{m.merchantLabel}:</span>
                        <span className="font-medium text-gray-700 truncate">{data.merchantName}</span>
                      </div>
                    )}
                  </div>

                  {/* Upload slip button */}
                  {data.slipUploadUrl && (
                    <a
                      href={data.slipUploadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-500)) 100%)' }}
                    >
                      <Upload className="w-4 h-4" />
                      {m.uploadSlipBtn}
                    </a>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function PayInStatusPage() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <PaymentStatusContent />
      </Suspense>
    </LanguageProvider>
  )
}
