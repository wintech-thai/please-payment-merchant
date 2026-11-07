'use client'

import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { X, QrCode, ExternalLink, Loader2, CheckCircle2, Clock } from 'lucide-react'
import QRCode from 'react-qr-code'
import clsx from 'clsx'
import { toast } from 'sonner'
import { pointTopUpApi } from '@/lib/api/point-topup.api'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { PointTopUpQrParams, BankItem } from '@/lib/api/types'
import { bahtText } from '@/lib/bahtText'
import { useLang } from '@/context/LanguageContext'

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]
const COUNTDOWN_SECONDS = 60

export default function PointTopUpModal({ onClose, onSuccess, m }: { onClose: () => void; onSuccess: () => void; m: any }) {
  const { lang } = useLang()
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [qr, setQr] = useState<PointTopUpQrParams | null>(null)
  const [docStatus, setDocStatus] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string | null>(null)
  const [banks, setBanks] = useState<BankItem[]>([])
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'waiting' | 'success' | 'timeout' | 'error'>('idle')

  const hubRef = useRef<signalR.HubConnection | null>(null)

  const amount = selectedPreset ?? (customAmount ? parseFloat(customAmount) : 0)

  useEffect(() => {
    bankAccountApi.getAvailableSupportQrBanks().then(res => {
      const raw = res.data as any
      setBanks(Array.isArray(raw) ? raw : (raw?.banks ?? raw?.Banks ?? []))
    }).catch(() => {})
  }, [])

  function stopHub() {
    if (hubRef.current) {
      hubRef.current.stop().catch(() => {})
      hubRef.current = null
    }
  }

  // ปรับแก้ ข้อ 1c : นับถอยหลัง 60 วิ รอการโอน
  useEffect(() => {
    if (docStatus !== 'Pending' || !qr?.qrCode) return
    setSecondsLeft(COUNTDOWN_SECONDS)
    const timer = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timer)
          setLiveStatus(prev => (prev === 'success' ? prev : 'timeout'))
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [docStatus, qr?.qrCode])

  // ต่อ SignalR ไปที่ onix instance ของ payment gateway เอง (อาจคนละ domain กับของ merchant) เพื่อรู้ทันทีว่ามีการโอนเงินเข้ามาแล้ว
  useEffect(() => {
    if (docStatus !== 'Pending' || !qr?.websocketPath || !qr?.sessionId || !qr?.gatewayBaseUrl) return

    const wsBase = qr.gatewayBaseUrl.replace(/\/$/, '')
    const wsPath = qr.websocketPath.startsWith('/') ? qr.websocketPath : `/${qr.websocketPath}`
    const hubUrl = `${wsBase}${wsPath}`

    setLiveStatus('connecting')

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

    const onPaymentDone = () => setLiveStatus('success')

    connection.on('payment.completed', onPaymentDone)
    connection.on('PaymentCompleted', onPaymentDone)
    connection.on('paymentCompleted', onPaymentDone)
    connection.on('payment_completed', onPaymentDone)

    hubRef.current = connection

    connection.start()
      .then(() => {
        setLiveStatus(prev => (prev === 'success' ? prev : 'waiting'))
        connection.invoke('JoinPayment', qr.sessionId).catch(() => {})
      })
      .catch(() => setLiveStatus('error'))

    return () => stopHub()
  }, [docStatus, qr?.websocketPath, qr?.sessionId, qr?.gatewayBaseUrl])

  useEffect(() => () => stopHub(), [])

  const handleSubmit = async () => {
    if (!amount || amount <= 0) { setError(m.topUpErrAmount); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await pointTopUpApi.createPointTopUp(amount)
      const data = res.data as any
      if (data?.status === 'OK' && data?.accountDoc) {
        const doc = data.accountDoc
        setDocStatus(doc.status ?? null)
        if (doc.status === 'Rejected') {
          setRejectReason(doc.rejectReason ?? null)
        } else if (doc.documentParams) {
          try { setQr(JSON.parse(doc.documentParams)) } catch { setQr(null) }
        }
        onSuccess()
      } else {
        toast.error(data?.description ?? m.topUpFailed)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : m.topUpFailed)
    } finally {
      setSubmitting(false)
    }
  }

  const bankLabel = (code?: string | null) => {
    if (!code) return null
    const b = banks.find(x => x.bankCode === code)
    if (!b) return code
    return lang === 'th' ? (b.bankNameTh || b.bankNameEng || b.bankShortName || code) : (b.bankNameEng || b.bankNameTh || b.bankShortName || code)
  }

  const displayAmount = qr?.generatedAmount ?? amount
  const slipUrl = qr?.slipUploadUrl && typeof window !== 'undefined' ? `${window.location.origin}${qr.slipUploadUrl}` : null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { stopHub(); onClose() }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{m.topUpModalTitle}</h3>
          </div>
          <button onClick={() => { stopHub(); onClose() }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!docStatus ? (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">{m.topUpAmountLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setSelectedPreset(a); setCustomAmount(''); setError('') }}
                    className={clsx(
                      'py-2.5 rounded-lg text-sm font-semibold border transition-colors',
                      selectedPreset === a ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{m.topUpCustomAmountLabel}</label>
              <input
                type="number"
                min={1}
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(null); setError('') }}
                placeholder={m.topUpCustomAmountPlaceholder}
                className={clsx('w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500', error ? 'border-red-400' : 'border-gray-200')}
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-60"
            >
              {submitting ? m.topUpSubmitting : m.topUpSubmit}
            </button>
          </div>
        ) : docStatus === 'Rejected' ? (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-red-600">{rejectReason || m.topUpFailed}</p>
            <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
              {m.topUpClose}
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {qr?.qrCode ? (
              <>
                {/* PromptPay-style card */}
                <div className="rounded-2xl overflow-hidden border border-indigo-100 shadow-sm">
                  <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-4 py-2.5 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor">
                        <path d="M12 2 2 7l10 5 10-5-10-5zm0 7.5L4.5 7 12 3.5 19.5 7 12 9.5zM2 12l10 5 10-5v5l-10 5-10-5v-5z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">PromptPay</span>
                  </div>
                  <div className="bg-white px-5 py-4 flex flex-col items-center gap-3">
                    {(qr.payinBankAccountName || qr.payinPromptPayId) && (
                      <div className="w-full text-center">
                        <p className="text-[11px] text-gray-400">{m.topUpPayToLabel}</p>
                        <p className="text-sm font-bold text-gray-800">{qr.payinBankAccountName}</p>
                        <p className="text-xs text-gray-500">
                          {[bankLabel(qr.payinBankCode), qr.payinBankAccountNo ?? (qr.payinPromptPayId ? `${m.topUpPromptPayIdLabel} ${qr.payinPromptPayId}` : null)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-white rounded-xl border-2 border-indigo-50">
                      <QRCode value={qr.qrCode} size={190} />
                    </div>
                    {!!displayAmount && (
                      <div className="w-full text-center border-t border-dashed border-gray-200 pt-3">
                        <p className="text-[11px] text-gray-400">{m.topUpAmountLabelLarge}</p>
                        <p className="text-2xl font-extrabold text-indigo-700">฿{displayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">({bahtText(displayAmount)})</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live status */}
                <div className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold',
                  liveStatus === 'success' ? 'bg-emerald-50 text-emerald-700' :
                  secondsLeft === 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                )}>
                  {liveStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {m.topUpPaymentSuccess}
                    </>
                  ) : secondsLeft === 0 ? (
                    <>
                      <Clock className="w-4 h-4" />
                      {m.topUpPaymentTimeout}
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {m.topUpWaitingTransfer} ({secondsLeft}s)
                    </>
                  )}
                </div>
                {secondsLeft === 0 && liveStatus !== 'success' && (
                  <p className="text-xs text-gray-400 text-center -mt-2">{m.topUpTimeoutHint}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center">{m.topUpNoQr}</p>
            )}

            <div className="flex flex-col gap-2">
              {slipUrl && (
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {m.topUpUploadSlip}
                </a>
              )}
              {qr?.paymentUrl && (
                <a
                  href={qr.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {m.topUpOpenLink}
                </a>
              )}
              <button onClick={() => { stopHub(); onClose() }} className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
                {m.topUpClose}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
