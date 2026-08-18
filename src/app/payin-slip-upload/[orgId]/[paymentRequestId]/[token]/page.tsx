'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Upload, CheckCircle2, AlertCircle, ImageIcon, X, RefreshCw, TriangleAlert } from 'lucide-react'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider, useLang } from '@/context/LanguageContext'

async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w)
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl.split(',')[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface DupRecord {
  documentId?: string | null
  orgId?: string | null
  dupType?: string | null
  first4?: string | null
  last4?: string | null
  createdAt?: string | null
}

type PageState = 'verifying' | 'invalid' | 'ready' | 'checking_dup' | 'dup_warning' | 'uploading' | 'success' | 'error'

function SlipUploadContent() {
  const params = useParams()
  const orgId = params?.orgId as string
  const paymentRequestId = params?.paymentRequestId as string
  const token = params?.token as string
  const { t } = useLang()
  const m = t.slipUpload

  const [pageState, setPageState] = useState<PageState>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [first4, setFirst4] = useState('')
  const [last4, setLast4] = useState('')
  const [note, setNote] = useState('')
  const [dupRecords, setDupRecords] = useState<DupRecord[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!orgId || !paymentRequestId || !token) {
      setPageState('invalid')
      return
    }
    fetch(`/api/proxy/api/PaymentRequest/org/${orgId}/action/VerifyPayInToken/${paymentRequestId}/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data?.status === 'OK' || data?.Status === 'OK') {
          setPageState('ready')
        } else {
          setPageState('invalid')
        }
      })
      .catch(() => setPageState('invalid'))
  }, [orgId, paymentRequestId, token])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const doUpload = async () => {
    if (!selectedFile) return
    setPageState('uploading')
    try {
      const base64 = await compressImage(selectedFile)
      const res = await fetch(
        `/api/proxy/api/PaymentRequest/org/${orgId}/action/UploadPayInSlipById/${paymentRequestId}/${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ImageBase64: base64,
            First4: first4.trim().toUpperCase() || null,
            Last4: last4.trim().toUpperCase() || null,
            Note: note.trim() || null,
          }),
        }
      )
      const data = await res.json()
      if (data?.status === 'OK' || data?.Status === 'OK') {
        setPageState('success')
      } else {
        setErrorMsg(data?.description || data?.Description || 'Upload failed')
        setPageState('error')
      }
    } catch {
      setErrorMsg(m.errorDefault)
      setPageState('error')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    const f4 = first4.trim().toUpperCase()
    const l4 = last4.trim().toUpperCase()

    if (f4.length === 4 && l4.length === 4) {
      setPageState('checking_dup')
      try {
        const res = await fetch(
          `/api/proxy/api/PaymentRequest/org/${orgId}/action/CheckPayInSlipDup/${paymentRequestId}/${f4}/${l4}`
        )
        const data = await res.json()
        const dups: DupRecord[] = data?.Duplicates ?? data?.duplicates ?? []
        if (dups.length > 0) {
          setDupRecords(dups)
          setPageState('dup_warning')
          return
        }
      } catch {
        // dup check failed silently — proceed with upload
      }
    }

    await doUpload()
  }

  const gradientStyle = {
    background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-800)) 40%, rgb(var(--color-primary-500)) 100%)',
  }

  const btnGradientStyle = {
    background: 'linear-gradient(135deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-500)) 100%)',
  }

  const isReady = pageState === 'ready' || pageState === 'checking_dup'

  return (
    <>
      <NavbarClean />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 overflow-x-hidden">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-5 text-white" style={gradientStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold leading-tight">{m.title}</h1>
                  <p className="text-orange-200 text-xs mt-0.5">{m.subtitle}</p>
                </div>
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

              {(isReady || pageState === 'uploading') && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600 text-center">{m.selectPrompt}</p>

                  {!selectedFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-200 hover:border-primary-400 rounded-xl py-10 flex flex-col items-center gap-3 transition-colors cursor-pointer bg-gray-50 hover:bg-orange-50"
                    >
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">{m.tapToSelect}</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP</p>
                      </div>
                    </button>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={previewUrl!}
                        alt="slip preview"
                        className="w-full object-contain max-h-80"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Slip reference 4+4 boxes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">{m.slipIdLabel}</p>
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        maxLength={4}
                        value={first4}
                        onChange={e => setFirst4(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                        placeholder={m.first4Placeholder}
                        className="min-w-0 flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest uppercase bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                      <span className="text-gray-400 font-bold text-lg select-none flex-shrink-0">—</span>
                      <input
                        type="text"
                        maxLength={4}
                        value={last4}
                        onChange={e => setLast4(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                        placeholder={m.last4Placeholder}
                        className="min-w-0 flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-center tracking-widest uppercase bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-[10px] text-gray-400">{m.first4Label}</p>
                      <p className="text-[10px] text-gray-400">{m.last4Label}</p>
                    </div>
                  </div>

                  {/* Note field */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">{m.noteLabel}</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={m.notePlaceholder}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || pageState === 'uploading' || pageState === 'checking_dup'}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={selectedFile && isReady ? btnGradientStyle : { background: 'rgb(156 163 175)' }}
                  >
                    {pageState === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {m.uploading}
                      </>
                    ) : pageState === 'checking_dup' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {m.checkingDup}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {m.uploadBtn}
                      </>
                    )}
                  </button>
                </div>
              )}

              {pageState === 'dup_warning' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <TriangleAlert className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-red-700 mb-0.5">{m.dupWarningTitle}</p>
                        <p className="text-xs text-red-600 mb-3">{m.dupWarningDesc}</p>
                        <div className="space-y-1.5">
                          {dupRecords.map((d, i) => (
                            <div key={i} className="text-xs text-red-600">
                              <span className="font-medium">{m.dupViewRequest}</span>{' '}
                              <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-700">{d.documentId}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPageState('ready')}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {m.cancelBtn}
                    </button>
                    <button
                      type="button"
                      onClick={doUpload}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
                      style={btnGradientStyle}
                    >
                      <Upload className="w-4 h-4" />
                      {m.uploadAnywayBtn}
                    </button>
                  </div>
                </div>
              )}

              {pageState === 'success' && (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">{m.successTitle}</p>
                  <p className="text-xs text-gray-400 mt-3">{m.successDesc}</p>
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
                    onClick={() => setPageState('ready')}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {m.retry}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function PayInSlipUploadPage() {
  return (
    <LanguageProvider>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <SlipUploadContent />
      </Suspense>
    </LanguageProvider>
  )
}
