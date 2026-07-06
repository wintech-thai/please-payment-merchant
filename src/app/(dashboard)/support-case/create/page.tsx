'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'
import { supportCaseApi } from '@/lib/api/support-case.api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import RichTextEditor, { type RichTextEditorRef } from '@/components/RichTextEditor'
import { toast } from 'sonner'
import clsx from 'clsx'

type Priority = 'Low' | 'Medium' | 'High' | 'Critical'

const PRIORITIES: { value: Priority; labelEn: string; labelTh: string; descEn: string; descTh: string; color: string; selected: string }[] = [
  { value: 'Low',      labelEn: 'Low',      labelTh: 'ต่ำ',       descEn: 'Question / suggestion',   descTh: 'คำถาม / ข้อเสนอแนะ',  color: 'text-gray-600',   selected: 'border-gray-400 bg-gray-50 ring-gray-300' },
  { value: 'Medium',   labelEn: 'Medium',   labelTh: 'ปานกลาง',   descEn: 'General issue',           descTh: 'ปัญหาทั่วไป',          color: 'text-yellow-700', selected: 'border-yellow-400 bg-yellow-50 ring-yellow-300' },
  { value: 'High',     labelEn: 'High',     labelTh: 'สูง',       descEn: 'Transaction impact',      descTh: 'กระทบธุรกรรม',         color: 'text-orange-700', selected: 'border-orange-400 bg-orange-50 ring-orange-300' },
  { value: 'Critical', labelEn: 'Critical', labelTh: 'วิกฤต',     descEn: 'System down / outage',    descTh: 'ระบบล่ม / หยุดทำงาน', color: 'text-red-700',    selected: 'border-red-400 bg-red-50 ring-red-300' },
]

export default function CreateSupportCasePage() {
  const { lang } = useLang()
  const router = useRouter()
  const isth = lang === 'th'

  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({})
  const [isDirty, setIsDirty] = useState(false)
  const descRef = useRef<RichTextEditorRef>(null)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  const goBack = () => guardNavigation(() => router.push('/support-case'))

  function validate() {
    const e: typeof errors = {}
    if (!subject.trim()) e.subject = isth ? 'กรุณากรอกหัวข้อ' : 'Subject is required'
    if (descRef.current?.isEmpty()) e.description = isth ? 'กรุณากรอกรายละเอียด' : 'Description is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const description = descRef.current?.getContent() ?? ''
      await supportCaseApi.addCase({ Subject: subject.trim(), Priority: priority, Description: description })
      toast.success(isth ? 'สร้าง Case สำเร็จ' : 'Case created successfully')
      router.push('/support-case')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (isth ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong'))
      setSaving(false)
    }
  }

  const selectedPriority = PRIORITIES.find(p => p.value === priority)!

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-4">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      {/* Header */}
      <div className="flex-none flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isth ? 'สร้าง Support Case' : 'Create Support Case'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isth ? 'แจ้งปัญหาหรือสอบถามทีมงาน' : 'Report an issue or ask our support team'}</p>
        </div>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} noValidate className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left — Subject + Priority */}
          <div className="flex flex-col gap-4">

            {/* Subject */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <span className="w-1 h-4 bg-primary-500 rounded-full" />
                {isth ? 'หัวข้อ' : 'Subject'}
                <span className="text-red-500">*</span>
              </h2>
              <input
                type="text"
                value={subject}
                onChange={e => { setSubject(e.target.value); setIsDirty(true); setErrors(p => ({ ...p, subject: undefined })) }}
                placeholder={isth ? 'ระบุหัวข้อปัญหาหรือคำถาม' : 'Brief summary of your issue'}
                maxLength={200}
                className={clsx(
                  'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
                  errors.subject ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
                )}
              />
              <div className="flex items-center justify-between">
                {errors.subject
                  ? <p className="text-red-500 text-xs">{errors.subject}</p>
                  : <span />}
                <p className="text-[11px] text-gray-400">{subject.length}/200</p>
              </div>
            </div>

            {/* Priority */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <span className="w-1 h-4 bg-primary-500 rounded-full" />
                {isth ? 'ความสำคัญ' : 'Priority'}
                <span className="text-red-500">*</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => { setPriority(p.value); setIsDirty(true) }}
                    className={clsx(
                      'flex flex-col items-start px-4 py-3 rounded-xl border-2 text-left transition-all',
                      priority === p.value
                        ? `${p.selected} ring-1`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <span className={clsx('text-sm font-bold', priority === p.value ? p.color : 'text-gray-700')}>
                      {isth ? p.labelTh : p.labelEn}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-0.5">{isth ? p.descTh : p.descEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary chip */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
                'bg-gray-400': priority === 'Low',
                'bg-yellow-400': priority === 'Medium',
                'bg-orange-400': priority === 'High',
                'bg-red-500': priority === 'Critical',
              })} />
              <p className="text-xs text-gray-500">
                {isth ? 'ระดับที่เลือก:' : 'Selected:'}{' '}
                <span className={clsx('font-semibold', selectedPriority.color)}>
                  {isth ? selectedPriority.labelTh : selectedPriority.labelEn}
                </span>
                {' — '}{isth ? selectedPriority.descTh : selectedPriority.descEn}
              </p>
            </div>

          </div>

          {/* Right — Description */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800">
              <span className="w-1 h-4 bg-primary-500 rounded-full" />
              {isth ? 'รายละเอียดปัญหา' : 'Description'}
              <span className="text-red-500">*</span>
            </h2>
            <div className="flex-1 flex flex-col min-h-0">
              <RichTextEditor
                ref={descRef}
                expandable
                disabled={saving}
              />
            </div>
            {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
            <p className="text-[11px] text-gray-400">
              {isth ? 'ยิ่งละเอียดยิ่งช่วยให้ทีมงานแก้ปัญหาได้เร็วขึ้น สามารถแนบรูปภาพได้' : 'The more detail you provide, the faster we can resolve your issue. You can paste or attach images.'}
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex-none flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isth ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isth ? 'กำลังสร้าง...' : 'Creating...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {isth ? 'สร้าง Case' : 'Create Case'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  )
}
