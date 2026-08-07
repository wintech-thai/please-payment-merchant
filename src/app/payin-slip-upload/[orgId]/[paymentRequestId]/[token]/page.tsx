'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Upload, CheckCircle2, AlertCircle, ImageIcon, X, RefreshCw } from 'lucide-react'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider } from '@/context/LanguageContext'

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

type PageState = 'verifying' | 'invalid' | 'ready' | 'uploading' | 'success' | 'error'

function SlipUploadContent() {
  const params = useParams()
  const orgId = params?.orgId as string
  const paymentRequestId = params?.paymentRequestId as string
  const token = params?.token as string

  const [pageState, setPageState] = useState<PageState>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
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

  const handleUpload = async () => {
    if (!selectedFile) return
    setPageState('uploading')
    try {
      const base64 = await compressImage(selectedFile)
      const res = await fetch(
        `/api/proxy/api/PaymentRequest/org/${orgId}/action/UploadPayInSlipById/${paymentRequestId}/${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ImageBase64: base64 }),
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
      setErrorMsg('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setPageState('error')
    }
  }

  const gradientStyle = {
    background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-800)) 40%, rgb(var(--color-primary-500)) 100%)',
  }

  const btnGradientStyle = {
    background: 'linear-gradient(135deg, rgb(var(--color-primary-700)) 0%, rgb(var(--color-primary-500)) 100%)',
  }

  return (
    <>
      <NavbarClean />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-6 pb-5 text-white" style={gradientStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold leading-tight">อัปโหลดสลิปการโอนเงิน</h1>
                  <p className="text-orange-200 text-xs mt-0.5">Upload Payment Slip</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-7">

              {pageState === 'verifying' && (
                <div className="flex flex-col items-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm">กำลังตรวจสอบลิงก์...</p>
                </div>
              )}

              {pageState === 'invalid' && (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">ลิงก์ไม่ถูกต้องหรือหมดอายุ</p>
                  <p className="text-gray-500 text-sm">Link is invalid or expired</p>
                  <p className="text-xs text-gray-400 mt-3">กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ</p>
                </div>
              )}

              {(pageState === 'ready' || pageState === 'uploading') && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600 text-center">
                    เลือกรูปสลิปการโอนเงินเพื่ออัปโหลด
                  </p>

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
                        <p className="text-sm font-medium text-gray-700">แตะเพื่อเลือกรูปภาพ</p>
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

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || pageState === 'uploading'}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={selectedFile && pageState !== 'uploading' ? btnGradientStyle : { background: 'rgb(156 163 175)' }}
                  >
                    {pageState === 'uploading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังอัปโหลด...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        อัปโหลดสลิป
                      </>
                    )}
                  </button>
                </div>
              )}

              {pageState === 'success' && (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">อัปโหลดสำเร็จ</p>
                  <p className="text-gray-500 text-sm">Upload successful</p>
                  <p className="text-xs text-gray-400 mt-3">ระบบได้รับสลิปของคุณเรียบร้อยแล้ว</p>
                </div>
              )}

              {pageState === 'error' && (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-1">อัปโหลดล้มเหลว</p>
                  <p className="text-red-500 text-sm font-medium mb-4">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => setPageState('ready')}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    ลองอีกครั้ง
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
