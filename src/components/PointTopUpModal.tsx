'use client'

import { useState } from 'react'
import { X, QrCode, ExternalLink } from 'lucide-react'
import QRCode from 'react-qr-code'
import clsx from 'clsx'
import { toast } from 'sonner'
import { pointTopUpApi } from '@/lib/api/point-topup.api'
import type { PointTopUpQrParams } from '@/lib/api/types'

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

export default function PointTopUpModal({ onClose, onSuccess, m }: { onClose: () => void; onSuccess: () => void; m: any }) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [qr, setQr] = useState<PointTopUpQrParams | null>(null)
  const [docStatus, setDocStatus] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string | null>(null)

  const amount = selectedPreset ?? (customAmount ? parseFloat(customAmount) : 0)

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-bold text-gray-900">{m.topUpModalTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
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
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-lg border border-gray-100">
                  <QRCode value={qr.qrCode} size={200} />
                </div>
                <p className="text-xs text-gray-500 text-center">{m.topUpScanInstruction}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">{m.topUpNoQr}</p>
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
            <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">
              {m.topUpClose}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
