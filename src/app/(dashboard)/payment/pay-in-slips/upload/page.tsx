'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/axios'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import { ChevronLeft, Upload, ImageIcon, CheckCircle, AlertCircle, Info } from 'lucide-react'
import clsx from 'clsx'

// ── Tesseract worker singleton ─────────────────────────────────────────────────
let _tesseractWorker: any = null
let _tesseractWorkerLoading: Promise<any> | null = null

async function getTesseractWorker() {
  if (_tesseractWorker) return _tesseractWorker
  if (_tesseractWorkerLoading) return _tesseractWorkerLoading
  _tesseractWorkerLoading = (async () => {
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(['tha', 'eng'])
      _tesseractWorker = worker
      return worker
    } catch {
      _tesseractWorkerLoading = null
      return null
    }
  })()
  return _tesseractWorkerLoading
}

function buildStorageUrl(presignedUrl: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const isLocalhost = /localhost|127\.0\.0\.1/.test(origin)
  const base = isLocalhost ? (process.env.NEXT_PUBLIC_API_URL ?? '') : origin
  const storageBase = base.replace(/^(https?:\/\/)[^.]+\./, '$1storage-api.')
  return presignedUrl.replace('<STORAGE-API-BASE>', storageBase)
}

async function decodeQrFromImage(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })

    const toCanvas = (scale: number, binarize = false): HTMLCanvasElement => {
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      if (binarize) {
        const id = ctx.getImageData(0, 0, w, h)
        const d = id.data
        for (let i = 0; i < d.length; i += 4) {
          const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
          const v = lum < 128 ? 0 : 255
          d[i] = d[i + 1] = d[i + 2] = v
        }
        ctx.putImageData(id, 0, 0)
      }
      return c
    }

    const zxingDecode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      try {
        const { QRCodeReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource } =
          await import('@zxing/library')
        const ctx = canvas.getContext('2d')!
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const rgb = new Uint8ClampedArray(width * height * 3)
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
          rgb[j] = data[i]; rgb[j + 1] = data[i + 1]; rgb[j + 2] = data[i + 2]
        }
        const source = new RGBLuminanceSource(rgb, width, height)
        const bitmap = new BinaryBitmap(new HybridBinarizer(source))
        return new QRCodeReader().decode(bitmap).getText()
      } catch { return null }
    }

    const jsqrDecode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
      try {
        const ctx = canvas.getContext('2d')!
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { default: jsQR } = await import('jsqr')
        return jsQR(data, width, height)?.data ?? null
      } catch { return null }
    }

    const strategies: Array<() => Promise<string | null>> = [
      () => zxingDecode(toCanvas(1)),
      () => zxingDecode(toCanvas(2)),
      () => zxingDecode(toCanvas(1, true)),
      () => zxingDecode(toCanvas(2, true)),
      () => jsqrDecode(toCanvas(1)),
      () => jsqrDecode(toCanvas(2)),
    ]

    for (const strategy of strategies) {
      const result = await strategy()
      if (result) return result
    }
    return null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function analyzeSlipImage(file: File): Promise<{ amount: string | null; isSlip: boolean }> {
  try {
    const worker = await getTesseractWorker()
    if (!worker) return { amount: null, isSlip: false }
    const url = URL.createObjectURL(file)
    try {
      const { data: { text } } = await worker.recognize(url)

      const slipKeywords = [
        /โอนเงิน/, /จำนวนเงิน/, /สำเร็จ/, /รหัสอ้างอิง/,
        /ไทยพาณิชย์|กสิกร|กรุงไทย|กรุงเทพ|ทหารไทย|ออมสิน|ธนชาต/,
        /\bSCB\b|\bKBANK\b|\bBBL\b|\bKTB\b|\bTMB\b|\bTTB\b|\bBAY\b|\bGSB\b/i,
        /transfer.*success|payment.*success/i,
        /บาท/,
      ]
      const isSlip = slipKeywords.some(p => p.test(text))

      const amountPatterns = [
        /(?:จำนวนเงิน|จำนวน):?\s*[\r\n]*\s*([\d,]+[.,]\d{1,2})/,
        /([\d,]+[.,]\d{2})\s*[\r\n]?\s*(?:บาท|THB|฿)/i,
        /(?:amount|amt)\s*:?\s*([\d,]+[.,]?\d*)/i,
        /\b([\d]{1,3}(?:,\d{3})+[.,]\d{2})\b/,
        /([\d]+[.,]\d{1,2})\s*(?:บาท)/,
      ]
      const normalizeAmount = (raw: string): number => {
        const fixed = /,\d{1,2}$/.test(raw)
          ? raw.replace(/\./g, '').replace(',', '.')
          : raw.replace(/,/g, '')
        return parseFloat(fixed)
      }
      let amount: string | null = null
      for (const pattern of amountPatterns) {
        const match = text.match(pattern)
        if (match) {
          const num = normalizeAmount(match[1])
          if (!isNaN(num) && num > 0 && num < 10_000_000) { amount = num.toFixed(2); break }
        }
      }

      return { amount, isSlip }
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return { amount: null, isSlip: false }
  }
}

function parseSlipQr(rawData: string): { amount?: string; refId?: string; strategy?: string } {
  // Strategy 1: EMVCo TLV
  try {
    const parseTlv = (data: string): Record<string, string> => {
      const tags: Record<string, string> = {}
      let i = 0
      while (i + 4 <= data.length) {
        const id = data.substring(i, i + 2)
        const len = parseInt(data.substring(i + 2, i + 4), 10)
        if (isNaN(len) || i + 4 + len > data.length) break
        tags[id] = data.substring(i + 4, i + 4 + len)
        i += 4 + len
      }
      return tags
    }
    const tags = parseTlv(rawData)
    const result: { amount?: string; refId?: string } = {}
    if (tags['54']) result.amount = tags['54']
    if (tags['62']) {
      const sub62 = parseTlv(tags['62'])
      if (sub62['05']) result.refId = sub62['05']
    }
    if (!result.refId && tags['00']) {
      const sub00 = parseTlv(tags['00'])
      if (sub00['02']) result.refId = sub00['02']
    }
    if (result.amount || result.refId) return { ...result, strategy: 'EMVCo TLV' }
  } catch {}

  // Strategy 2: URL
  try {
    const url = new URL(rawData)
    const p = url.searchParams
    const result: { amount?: string; refId?: string } = {}
    const amountKeys = ['amount', 'amt', 'txAmount', 'transactionAmount', 'value', 'txAmountDecimal']
    const refKeys = ['ref', 'refId', 'transactionRef', 'tranRef', 'txnRef', 'txRef',
                     'referenceNo', 'slipId', 'txId', 'paymentRef', 'billPaymentRef']
    for (const k of amountKeys) { const v = p.get(k); if (v) { result.amount = v.replace(/,/g, ''); break } }
    for (const k of refKeys) { const v = p.get(k); if (v) { result.refId = v; break } }
    if (!result.refId) {
      const segs = url.pathname.split('/').filter(Boolean)
      for (const seg of segs) {
        if (/^[A-Z0-9]{10,}$/i.test(seg) && !/^https?$/i.test(seg)) { result.refId = seg; break }
      }
    }
    if (result.amount || result.refId) return { ...result, strategy: 'URL params' }
  } catch {}

  // Strategy 3: JSON
  try {
    const json = JSON.parse(rawData)
    const pick = (obj: Record<string, unknown>, keys: string[]) => {
      for (const k of keys) {
        const v = obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()]
        if (v !== undefined && v !== null) return String(v)
      }
      return undefined
    }
    const amt = pick(json, ['amount', 'txAmount', 'transactionAmount', 'amountDecimal', 'value'])
    const ref = pick(json, ['refId', 'ref', 'transactionRef', 'tranRef', 'txnRef', 'referenceNo', 'slipId'])
    if (amt || ref) return { amount: amt ? String(parseFloat(amt.replace(/,/g, ''))) : undefined, refId: ref, strategy: 'JSON' }
  } catch {}

  // Strategy 4: Pipe / semicolon delimited
  if (rawData.includes('|') || (rawData.includes(';') && !rawData.startsWith('http'))) {
    const sep = rawData.includes('|') ? '|' : ';'
    const parts = rawData.split(sep).map(s => s.trim()).filter(Boolean)
    const result: { amount?: string; refId?: string } = {}
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i].toLowerCase()
      const val = parts[i + 1]
      if (/amount|amt|value|ยอด/.test(key)) result.amount = val.replace(/,/g, '')
      if (/ref|txn|slip|transaction/.test(key)) result.refId = val
    }
    if (!result.refId && parts.length >= 1 && /^[A-Z0-9]{8,}$/i.test(parts[0])) result.refId = parts[0]
    if (!result.amount && parts.length >= 2) {
      const maybe = parts[1].replace(/,/g, '')
      if (/^\d+(\.\d{1,2})?$/.test(maybe)) result.amount = maybe
    }
    if (result.amount || result.refId) return { ...result, strategy: 'Delimited' }
  }

  // Strategy 5: Regex heuristics
  {
    const result: { amount?: string; refId?: string } = {}
    const amountPatterns = [
      /(?:amount|amt|จำนวน|ยอด)[=:\s]*(\d[\d,]*\.?\d*)/i,
      /(\d{1,3}(?:,\d{3})*\.\d{2})\s*(?:THB|บาท|baht)/i,
      /(\d+\.\d{2})\s*(?:THB|฿)/i,
    ]
    for (const pat of amountPatterns) {
      const m = rawData.match(pat)
      if (m) { result.amount = m[1].replace(/,/g, ''); break }
    }
    const refPatterns = [
      /(?:ref(?:id)?|tranref|txnref|slipid|referenceno|txref)[=:\s]*([A-Z0-9]{6,})/i,
      /\b([A-Z0-9]{15,})\b/,
    ]
    for (const pat of refPatterns) {
      const m = rawData.match(pat)
      if (m && !/^https?|www|com|th|net$/i.test(m[1])) { result.refId = m[1]; break }
    }
    if (result.amount || result.refId) return { ...result, strategy: 'Regex' }
  }

  return {}
}

interface MerchantOption {
  orgId: string
  orgName: string
  merchantCode?: string
}

export default function UploadPayInSlipPage() {
  const router = useRouter()
  const { t } = useLang()
  const tr = t.payInSlip
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [qrStatus, setQrStatus] = useState<'idle' | 'analyzing' | 'full' | 'partial' | 'no-data' | 'not-found'>('idle')
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'scanning' | 'found' | 'not-found'>('idle')
  const [isSlipDetected, setIsSlipDetected] = useState<boolean | null>(null)

  const [currentMerchant, setCurrentMerchant] = useState<MerchantOption | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([])
  const [bankAccountId, setBankAccountId] = useState('')
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [refId, setRefId] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Pre-warm Tesseract worker on mount
  useEffect(() => { getTesseractWorker() }, [])

  useEffect(() => {
    if (!bankDropdownOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.bank-dropdown-root')) setBankDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [bankDropdownOpen])

  // Load current merchant info + bank accounts
  useEffect(() => {
    setLoadingInit(true)
    try {
      const orgId = localStorage.getItem('orgId') || ''
      setSelectedOrgId(orgId)
      const stored = localStorage.getItem('merchants')
      const list: MerchantOption[] = stored ? JSON.parse(stored) : []
      const found = list.find(m => m.orgId === orgId) ?? null
      setCurrentMerchant(found)

      if (!orgId) { setLoadingInit(false); return }

      Promise.allSettled([
        client.get(`/api/Merchant/org/${orgId}/action/GetMyMerchantInfo`),
        bankAccountApi.getBankAccounts({}, orgId),
      ]).then(([merchantRes, bankRes]) => {
        if (merchantRes.status === 'fulfilled') {
          const d = merchantRes.value.data as any
          const m = d?.merchant ?? d?.data ?? d
          setMerchantId(m?.id ?? m?.merchantId ?? '')
        }
        if (bankRes.status === 'fulfilled') {
          setBankAccounts(bankRes.value.data.bankAccounts)
        } else {
          toast.error(bankRes.reason instanceof Error ? bankRes.reason.message : tr.toastFailedToLoadBanks)
        }
      }).finally(() => { setLoadingInit(false); setLoadingBanks(false) })
    } catch {
      setLoadingInit(false)
    }
  }, [tr.toastFailedToLoadBanks])

  const processFile = useCallback(async (f: File) => {
    if (!f.type.startsWith('image/')) { toast.error(tr.validImageRequired); return }
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    setQrStatus('analyzing')
    setOcrStatus('idle')
    setIsSlipDetected(null)
    setAmount('')
    setRefId('')

    // Step 1: QR decode
    const qrData = await decodeQrFromImage(f)
    let amountFilled = false
    let refIdFilled = false

    if (!qrData) {
      setQrStatus('not-found')
    } else {
      setIsSlipDetected(true)
      const parsed = parseSlipQr(qrData)
      if (parsed.amount) { setAmount(parsed.amount); amountFilled = true }
      if (parsed.refId) { setRefId(parsed.refId); refIdFilled = true }

      if (amountFilled && refIdFilled) setQrStatus('full')
      else if (amountFilled || refIdFilled) setQrStatus('partial')
      else setQrStatus('no-data')
    }

    // Step 2: OCR — run if amount missing or need slip detection
    if (!amountFilled || !qrData) {
      setOcrStatus('scanning')
      const { amount: ocrAmount, isSlip: ocrIsSlip } = await analyzeSlipImage(f)
      if (ocrAmount && !amountFilled) {
        setAmount(ocrAmount)
        setOcrStatus('found')
      } else {
        setOcrStatus(ocrAmount ? 'found' : 'not-found')
      }
      if (!qrData) setIsSlipDetected(ocrIsSlip)
    }
  }, [tr.validImageRequired])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrgId) { toast.error(tr.validMerchantRequired); return }
    if (!file) { toast.error(tr.validImageRequired); return }
    if (!bankAccountId) { toast.error(tr.validBankRequired); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { toast.error(tr.validAmountRequired); return }
    if (!refId.trim()) { toast.error(tr.validRefIdRequired); return }

    setSaving(true)
    try {
      const mimeType = file.type || 'image/jpeg'
      const base = `/api/PaymentDocument/org/${selectedOrgId}/action`

      const presignedRes = await client.post<{ presignedUrl: string; filePath: string }>(
        `${base}/GetPresignedUrl`,
        { MimeType: mimeType }
      )
      const presignedData = presignedRes.data as any
      const rawPresignedUrl: string = presignedData?.presignedUrl ?? ''
      const filePath: string = presignedData?.filePath ?? presignedData?.objectName ?? ''

      if (!rawPresignedUrl || !filePath) throw new Error('Invalid presigned URL response')

      const uploadUrl = buildStorageUrl(rawPresignedUrl)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      await client.post(`${base}/AddPaymentDocument`, {
        UploadedFilePath: filePath,
        MimeType: mimeType,
        TxAmountDecimal: parseFloat(amount),
        PayInBankAccountId: bankAccountId,
        MerchantId: merchantId,
        RefId: refId.trim(),
        Direction: 'PayIn',
        DocumentType: 'PayInSlip',
        Currency: 'THB',
      })

      toast.success(tr.toastUploadSuccess)
      router.push('/payment/pay-in-slips')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? tr.toastUploadFailed
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex-none flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/payment/pay-in-slips')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tr.uploadTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tr.uploadSubtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">

          {/* Left — Image Upload & Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 space-y-4">

              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDragOver
                    ? 'border-primary-400 bg-primary-50'
                    : file
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {!file ? (
                  <div className="space-y-2 py-4">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
                    <p className="text-sm text-gray-500">
                      {tr.dropzoneText}{' '}
                      <span className="text-primary-600 font-semibold">{tr.dropzoneBrowse}</span>
                    </p>
                    <p className="text-xs text-gray-400">{tr.dropzoneHint}</p>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-700 font-medium py-1">{file.name}</p>
                )}
              </div>

              {/* QR Analysis Status */}
              {qrStatus === 'analyzing' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {tr.analyzingQr}
                </div>
              )}
              {qrStatus === 'full' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {tr.qrDetected}
                </div>
              )}
              {qrStatus === 'partial' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {tr.qrPartial}
                  </div>
                  <p className="text-xs text-amber-600">{tr.qrPartialHint}</p>
                </div>
              )}
              {qrStatus === 'no-data' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    {tr.qrFoundNoData}
                  </div>
                  <p className="text-xs text-blue-600">{tr.qrFoundNoDataHint}</p>
                </div>
              )}
              {qrStatus === 'not-found' && (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {tr.qrNotDetected}
                </div>
              )}

              {/* OCR Status */}
              {ocrStatus === 'scanning' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {tr.ocrScanning}
                </div>
              )}
              {ocrStatus === 'found' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {tr.ocrFound}
                </div>
              )}
              {ocrStatus === 'not-found' && isSlipDetected !== false && (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {tr.ocrNotFound}
                </div>
              )}

              {/* Not a slip warning */}
              {isSlipDetected === false && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {tr.notSlipWarning}
                  </div>
                  <p className="text-xs text-orange-600">{tr.notSlipHint}</p>
                </div>
              )}

              {/* Preview */}
              {previewUrl ? (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={tr.previewAlt} className="w-full object-contain max-h-[560px]" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200 gap-2">
                  <ImageIcon className="w-10 h-10 text-gray-200" />
                  <p className="text-sm text-gray-300">{tr.previewAlt}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right — Form fields + Actions */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {loadingInit ? (
                <div className="p-8 flex items-center justify-center">
                  <svg className="w-6 h-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {/* Merchant — read-only */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {tr.labelMerchant}
                    </label>
                    <div className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 flex items-center gap-2 min-h-[42px]">
                      {currentMerchant ? (
                        <>
                          {currentMerchant.merchantCode && (
                            <span className="font-semibold text-gray-900">{currentMerchant.merchantCode}</span>
                          )}
                          {currentMerchant.merchantCode && currentMerchant.orgName && (
                            <span className="text-gray-400">·</span>
                          )}
                          <span className="text-gray-600">{currentMerchant.orgName}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">{selectedOrgId || '—'}</span>
                      )}
                    </div>
                  </div>

                  {/* Bank Account */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {tr.labelBankAccount} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative bank-dropdown-root">
                      <button
                        type="button"
                        disabled={loadingBanks}
                        onClick={() => setBankDropdownOpen(o => !o)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white disabled:bg-gray-50 disabled:text-gray-400 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        {bankAccountId
                          ? (() => {
                              const ba = bankAccounts.find(b => b.accountId === bankAccountId)
                              return ba ? `${ba.bankCode} · ${ba.accountNumber}${ba.accountName ? ` — ${ba.accountName}` : ''}` : tr.placeholderBankAccount
                            })()
                          : <span className="text-gray-400">{loadingBanks ? 'Loading...' : tr.placeholderBankAccount}</span>
                        }
                        <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {bankDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
                          <div
                            className="px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
                            onClick={() => { setBankAccountId(''); setBankDropdownOpen(false) }}
                          >
                            {tr.placeholderBankAccount}
                          </div>
                          {bankAccounts.map(ba => (
                            <div
                              key={ba.accountId}
                              onClick={() => { setBankAccountId(ba.accountId); setBankDropdownOpen(false) }}
                              className={clsx(
                                'px-3 py-2.5 cursor-pointer hover:bg-gray-50 flex items-start justify-between gap-2',
                                ba.accountId === bankAccountId && 'bg-primary-50'
                              )}
                            >
                              <span className="text-sm text-gray-700">
                                <span className="font-semibold">{ba.bankCode}</span>
                                {' · '}{ba.accountNumber}
                                {ba.accountName && <span className="text-gray-500"> — {ba.accountName}</span>}
                              </span>
                              <span className="flex items-center gap-1 flex-none">
                                {ba.accountType === 'PromptPay' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700">PromptPay</span>
                                )}
                                {ba.accountLevel === 'Global' && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700">Global</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {tr.labelAmount} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder={tr.placeholderAmount}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  {/* RefId */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {tr.labelRefId} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={refId}
                      onChange={e => setRefId(e.target.value)}
                      placeholder={tr.placeholderRefId}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/payment/pay-in-slips')}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
              >
                {tr.btnBack}
              </button>
              <button
                type="submit"
                disabled={saving || loadingInit}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {tr.btnSaving}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {tr.btnSave}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
