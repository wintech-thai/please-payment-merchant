'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { supportCaseApi } from '@/lib/api/support-case.api'
import type { SupportCaseItem, SupportCaseCommentItem } from '@/lib/api/support-case.api'
import { toast } from 'sonner'
import clsx from 'clsx'
import RichTextEditor, { type ReplyTarget } from '@/components/RichTextEditor'
import RichContent from '@/components/RichContent'

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
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
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

  async function handleSendComment(jsonContent: string) {
    if (!jsonContent || sending || isClosed) return
    setSending(true)
    try {
      await supportCaseApi.addComment(caseId, jsonContent)
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

  async function refreshComments() {
    if (refreshing) return
    setRefreshing(true)
    try {
      const res = await supportCaseApi.getComments(caseId)
      const raw = res.data as any
      const list: any[] = raw?.comments ?? raw?.Comments ?? (Array.isArray(raw) ? raw : [])
      setComments(list.map(normalizeComment))
    } catch {
      toast.error(isth ? 'โหลด comment ไม่สำเร็จ' : 'Failed to refresh comments')
    } finally {
      setRefreshing(false)
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
          <p className="text-sm text-gray-400 mt-0.5">{caseData.ref}</p>
        </div>
      </div>

      {/* Body — 2-column grid */}
      <div className={clsx('flex-1 min-h-0 grid grid-cols-1 gap-4 overflow-hidden', leftCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-2')}>

        {/* Left — Case Info + Description */}
        <div className={clsx('min-h-0 overflow-y-auto flex flex-col gap-4 pb-1', leftCollapsed && 'lg:hidden')}>

          {/* Details card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <span className="w-1 h-4 bg-primary-500 rounded-full" />
                {isth ? 'ข้อมูล Case' : 'Case Info'}
              </h2>
              <button
                onClick={() => setLeftCollapsed(true)}
                className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title={isth ? 'ซ่อนแผงซ้าย' : 'Collapse panel'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'เลขอ้างอิง' : 'REF'}</p>
                <p className="text-sm text-gray-800 break-all">{caseData.ref || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'องค์กร' : 'ORG'}</p>
                <p className="text-sm text-gray-800">{caseData.orgId || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'ความสำคัญ' : 'Priority'}</p>
                {caseData.priority ? (
                  <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[caseData.priority] ?? 'bg-gray-100 text-gray-600')}>
                    {caseData.priority}
                  </span>
                ) : <p className="text-sm text-gray-800">—</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'ผู้สร้าง' : 'Created By'}</p>
                <p className="text-sm text-gray-800">{caseData.createdBy || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'วันที่สร้าง' : 'Created'}</p>
                <p className="text-sm text-gray-800">{formatDate(caseData.createdDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'อัปเดตล่าสุด' : 'Last Updated'}</p>
                <p className="text-sm text-gray-800">{formatDate(caseData.updatedDate)}</p>
              </div>
              {isClosed && caseData.closedDate && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{isth ? 'วันที่ปิด' : 'Closed'}</p>
                  <p className="text-sm text-gray-800">{formatDate(caseData.closedDate)}</p>
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
              <RichContent content={caseData.description} />
            </div>
          )}

        </div>

        {/* Right — Comments Thread */}
        <div className="min-h-[300px] lg:min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

          {/* Thread header */}
          <div className="flex-none flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="w-1 h-4 bg-primary-500 rounded-full" />
              {isth ? 'การสนทนา' : 'Thread'}
              {comments.length > 0 && (
                <span className="text-gray-400 font-normal text-xs ml-1">({comments.length})</span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshComments}
                disabled={refreshing}
                title={isth ? 'รีเฟรช' : 'Refresh'}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                <svg className={clsx('w-4 h-4', refreshing && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {leftCollapsed && (
                <button
                  onClick={() => setLeftCollapsed(false)}
                  className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                  title={isth ? 'แสดง Case Info' : 'Show case info'}
                >
                  <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Case Info</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 relative overflow-hidden">
            {refreshing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isth ? 'กำลังโหลด...' : 'Loading...'}
                </div>
              </div>
            )}
          <div className="h-full overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{isth ? 'ยังไม่มีข้อความ' : 'No messages yet'}</p>
            ) : (
              comments.map(c => {
                const isMerchant = (c.authorType ?? '').toLowerCase() === 'merchant'
                const authorLabel = c.createdBy ?? (isMerchant ? 'Merchant' : 'Admin')
                return (
                  <div key={c.id} className={clsx('group flex gap-3', isMerchant ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1', isMerchant ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>
                      {isMerchant ? 'M' : 'A'}
                    </div>
                    <div className={clsx('max-w-[75%] flex flex-col gap-1', isMerchant ? 'items-end' : 'items-start')}>
                      <div className={clsx('flex items-center gap-2 text-xs text-gray-400', isMerchant && 'flex-row-reverse')}>
                        <span className="font-semibold text-gray-600">{authorLabel}</span>
                        <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase', isMerchant ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-500')}>
                          {c.authorType}
                        </span>
                        <span>{formatDate(c.createdDate)}</span>
                        {!isClosed && (
                          <button
                            onClick={() => setReplyTo({ id: c.id ?? '', author: authorLabel, content: c.content ?? '' })}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-primary-500 transition-all"
                            title={isth ? 'ตอบกลับ' : 'Reply'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className={clsx('px-4 py-2.5 rounded-2xl', isMerchant ? 'bg-primary-50 text-gray-800 rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm')}>
                        <RichContent content={c.content} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={commentsEndRef} />
          </div>
          </div>

          {/* Input */}
          {isClosed ? (
            <div className="flex-none px-5 py-3 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
              {isth ? `Case นี้ถูก ${caseData.status} แล้ว ไม่สามารถส่งข้อความเพิ่มได้` : `This case is ${caseData.status}. No further messages allowed.`}
            </div>
          ) : (
            <div className="flex-none px-5 py-4 border-t border-gray-100">
              <RichTextEditor
                onSubmit={handleSendComment}
                sending={sending}
                replyTo={replyTo}
                onClearReply={() => setReplyTo(null)}
              />
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
