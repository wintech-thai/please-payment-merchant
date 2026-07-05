'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { supportCaseApi } from '@/lib/api/support-case.api'
import type { SupportCaseItem, SupportCaseCommentItem } from '@/lib/api/support-case.api'
import { toast } from 'sonner'
import clsx from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Open': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'In Progress': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Waiting for Customer': 'bg-purple-50 text-purple-700 ring-purple-200',
  'Resolved': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Closed': 'bg-gray-100 text-gray-500 ring-gray-200',
  'Cancelled': 'bg-red-50 text-red-500 ring-red-200',
}

const PRIORITY_COLORS: Record<string, string> = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-yellow-50 text-yellow-700',
  'High': 'bg-orange-50 text-orange-700',
  'Critical': 'bg-red-50 text-red-700',
}

function normalize(raw: any): SupportCaseItem {
  return {
    id: raw.id ?? raw.Id ?? '',
    orgId: raw.orgId ?? raw.OrgId ?? '',
    ref: raw.ref ?? raw.Ref ?? '',
    subject: raw.subject ?? raw.Subject ?? '',
    priority: raw.priority ?? raw.Priority ?? '',
    status: raw.status ?? raw.Status ?? '',
    description: raw.description ?? raw.Description ?? '',
    createdBy: raw.createdBy ?? raw.CreatedBy ?? '',
    createdDate: raw.createdDate ?? raw.CreatedDate ?? '',
    updatedDate: raw.updatedDate ?? raw.UpdatedDate ?? '',
    closedDate: raw.closedDate ?? raw.ClosedDate ?? '',
  }
}

function normalizeComment(raw: any): SupportCaseCommentItem {
  return {
    id: raw.id ?? raw.Id ?? '',
    content: raw.content ?? raw.Content ?? '',
    authorType: raw.authorType ?? raw.AuthorType ?? '',
    createdBy: raw.createdBy ?? raw.CreatedBy ?? '',
    createdDate: raw.createdDate ?? raw.CreatedDate ?? '',
  }
}

function parseContent(raw?: string): string {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.content) {
      return parsed.content
        .flatMap((block: any) => block?.content?.map((n: any) => n?.text ?? '') ?? ['\n'])
        .join('')
    }
  } catch { /* plain text */ }
  return raw
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

export default function SupportCaseDetailPage() {
  const { lang } = useLang()
  const router = useRouter()
  const params = useParams()
  const caseId = params?.id as string
  const isth = lang === 'th'

  const [caseData, setCaseData] = useState<SupportCaseItem | null>(null)
  const [comments, setComments] = useState<SupportCaseCommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const isClosed = caseData?.status === 'Closed' || caseData?.status === 'Resolved'

  useEffect(() => {
    if (!caseId) return
    loadData()
  }, [caseId])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function loadData() {
    setLoading(true)
    try {
      const [caseRes, commentsRes] = await Promise.allSettled([
        supportCaseApi.getCaseById(caseId),
        supportCaseApi.getComments(caseId),
      ])

      if (caseRes.status === 'fulfilled') {
        const raw = caseRes.value.data as any
        const cm = raw?.caseManagement ?? raw?.CaseManagement ?? raw
        setCaseData(normalize(cm))
      } else {
        toast.error(isth ? 'โหลดข้อมูล Case ไม่สำเร็จ' : 'Failed to load case')
      }

      if (commentsRes.status === 'fulfilled') {
        const raw = commentsRes.value.data as any
        const list: any[] = raw?.comments ?? raw?.Comments ?? (Array.isArray(raw) ? raw : [])
        setComments(list.map(normalizeComment))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSendComment() {
    const text = commentText.trim()
    if (!text || sending || isClosed) return
    setSending(true)
    try {
      await supportCaseApi.addComment(caseId, text)
      setCommentText('')
      const res = await supportCaseApi.getComments(caseId)
      const raw = res.data as any
      const list: any[] = raw?.comments ?? raw?.Comments ?? (Array.isArray(raw) ? raw : [])
      setComments(list.map(normalizeComment))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (isth ? 'ส่ง comment ไม่สำเร็จ' : 'Failed to send comment'))
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 p-6">
        <p className="text-gray-500">{isth ? 'ไม่พบข้อมูล Case' : 'Case not found'}</p>
        <button onClick={() => router.push('/support-case')} className="text-sm text-primary-600 hover:underline">
          {isth ? 'กลับไปรายการ' : 'Back to list'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-4 overflow-hidden">

      {/* Header */}
      <div className="flex-none flex items-center gap-3">
        <button
          onClick={() => router.push('/support-case')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 truncate">{caseData.subject}</h1>
            {caseData.status && (
              <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 flex-shrink-0', STATUS_COLORS[caseData.status] ?? 'bg-gray-100 text-gray-500 ring-gray-200')}>
                {caseData.status}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5 font-mono font-semibold">{caseData.ref}</p>
        </div>
      </div>

      {/* Body — 2-column grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">

        {/* Left — Case Info + Description */}
        <div className="min-h-0 overflow-y-auto flex flex-col gap-4 pb-1">

          {/* Details card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="w-1 h-4 bg-primary-500 rounded-full" />
              {isth ? 'ข้อมูล Case' : 'Case Info'}
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isth ? 'ความสำคัญ' : 'Priority'}</p>
                {caseData.priority ? (
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[caseData.priority] ?? 'bg-gray-100 text-gray-600')}>
                    {caseData.priority}
                  </span>
                ) : <p className="text-sm text-gray-700">—</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isth ? 'ผู้สร้าง' : 'Created By'}</p>
                <p className="text-sm text-gray-700">{caseData.createdBy || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isth ? 'วันที่สร้าง' : 'Created'}</p>
                <p className="text-sm text-gray-700">{formatDate(caseData.createdDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isth ? 'อัปเดตล่าสุด' : 'Last Updated'}</p>
                <p className="text-sm text-gray-700">{formatDate(caseData.updatedDate)}</p>
              </div>
              {caseData.closedDate && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{isth ? 'วันที่ปิด' : 'Closed'}</p>
                  <p className="text-sm text-gray-700">{formatDate(caseData.closedDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description card */}
          {caseData.description && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <span className="w-1 h-4 bg-primary-500 rounded-full" />
                {isth ? 'รายละเอียดปัญหา' : 'Description'}
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{caseData.description}</p>
            </div>
          )}

        </div>

        {/* Right — Comments Thread */}
        <div className="min-h-[300px] lg:min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

          {/* Thread header */}
          <div className="flex-none px-5 pt-5 pb-4 border-b border-gray-100">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="w-1 h-4 bg-primary-500 rounded-full" />
              {isth ? 'การสนทนา' : 'Thread'}
              {comments.length > 0 && (
                <span className="text-gray-400 font-normal text-xs ml-1">({comments.length})</span>
              )}
            </h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{isth ? 'ยังไม่มีข้อความ' : 'No messages yet'}</p>
            ) : (
              comments.map(c => {
                const isMerchant = (c.authorType ?? '').toLowerCase() === 'merchant'
                return (
                  <div key={c.id} className={clsx('flex', isMerchant ? 'justify-end' : 'justify-start')}>
                    <div className={clsx('max-w-[75%] rounded-2xl px-4 py-2.5', isMerchant ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm')}>
                      <p className="text-sm whitespace-pre-wrap break-words">{parseContent(c.content)}</p>
                      <p className={clsx('text-[11px] mt-1', isMerchant ? 'text-primary-200 text-right' : 'text-gray-400')}>
                        {c.createdBy} · {formatDate(c.createdDate)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Input */}
          {isClosed ? (
            <div className="flex-none px-5 py-3 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
              {isth ? `Case นี้ถูก ${caseData.status} แล้ว ไม่สามารถส่งข้อความเพิ่มได้` : `This case is ${caseData.status}. No further messages allowed.`}
            </div>
          ) : (
            <div className="flex-none px-5 py-4 border-t border-gray-100">
              <div className="flex gap-3 items-end">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                  placeholder={isth ? 'พิมพ์ข้อความ... (Ctrl+Enter เพื่อส่ง)' : 'Type a message... (Ctrl+Enter to send)'}
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || sending}
                  className="flex-shrink-0 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
