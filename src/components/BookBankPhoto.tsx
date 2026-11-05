'use client'

import { useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { bankAccountApi } from '@/lib/api/bank-account.api'

function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
      <img src={src} alt="book bank" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  )
}

// view-only icon for list pages — lazily fetches via GetMyBankAccountById only when clicked, same pattern as admin's BookBankPreviewIcon
export function BookBankPreviewIcon({ bankAccountId, title }: { bankAccountId: string; title?: string }) {
  const [loading, setLoading] = useState(false)
  const [src, setSrc] = useState<string | null>(null)

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await bankAccountApi.getMyBankAccountById(bankAccountId)
      const data = res.data as any
      const account = data?.bankAccount ?? data?.BankAccount ?? data
      const base64 = account?.bookBankImageBase64 ?? account?.BookBankImageBase64
      const mime = account?.bookBankMimeType ?? account?.BookBankMimeType ?? 'image/jpeg'
      if (base64) setSrc(`data:${mime};base64,${base64}`)
      else toast.error('ไม่พบรูปภาพ')
    } catch {
      toast.error('โหลดรูปภาพไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={title ?? 'Book Bank'}
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40"
        disabled={loading}
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      {src && <ImagePreviewModal src={src} onClose={() => setSrc(null)} />}
    </>
  )
}

// View-only thumbnail for the detail page, given the already-fetched account's base64/mimeType
export function BookBankPreview({ imageBase64, mimeType, title }: { imageBase64?: string | null; mimeType?: string | null; title: string }) {
  const [showPreview, setShowPreview] = useState(false)
  if (!imageBase64) return null
  const src = `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}`

  return (
    <div>
      <span className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{title}</span>
      <div className="mt-2">
        <button type="button" onClick={() => setShowPreview(true)} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 hover:opacity-90 transition-opacity">
          <img src={src} alt="book bank" className="w-full h-full object-cover" />
        </button>
      </div>
      {showPreview && <ImagePreviewModal src={src} onClose={() => setShowPreview(false)} />}
    </div>
  )
}
