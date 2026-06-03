'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { userApi } from '@/lib/api/user.api'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle, Loader2, User, Mail, UserCheck } from 'lucide-react'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider, useLang } from '@/context/LanguageContext'

interface InviteInfo {
  userName: string
  email: string
  orgUserId?: string
  invitedBy?: string
}

function InviteConfirmContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useLang()
  const ti = t.inviteConfirm

  const slug = params?.slug as string[]
  const orgId = slug?.[0] || ''
  const token = slug?.[1] || ''

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [errorDecode, setErrorDecode] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const dataParam = searchParams.get('data')
    if (!dataParam) { setErrorDecode(true); return }
    try {
      const decoded = decodeURIComponent(escape(atob(dataParam)))
      const parsed = JSON.parse(decoded)
      setInviteInfo({
        userName: parsed.UserName || parsed.username || '',
        email: parsed.Email || parsed.email || '',
        orgUserId: parsed.OrgUserId || parsed.orgUserId,
        invitedBy: parsed.InvitedBy || parsed.invitedBy,
      })
    } catch {
      try {
        const parsed = JSON.parse(atob(dataParam))
        setInviteInfo({
          userName: parsed.UserName || parsed.username || '',
          email: parsed.Email || parsed.email || '',
          orgUserId: parsed.OrgUserId || parsed.orgUserId,
          invitedBy: parsed.InvitedBy || parsed.invitedBy,
        })
      } catch {
        setErrorDecode(true)
      }
    }
  }, [searchParams])

  const handleAccept = async () => {
    if (!inviteInfo) return
    setSubmitting(true)
    try {
      await userApi.confirmExistingUserInvite(orgId, token, {
        username: inviteInfo.userName,
        email: inviteInfo.email,
        orgUserId: inviteInfo.orgUserId,
      })
      toast.success(ti.successMsg, { duration: 1500 })
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/login')
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : ''
      const isTechnical = !raw || raw.startsWith('Request failed') || raw.includes('Network Error')
      setSubmitError(isTechnical ? ti.errorMsg : raw)
      setSubmitting(false)
    }
  }

  if (!isMounted) return null

  return (
    <>
      <NavbarClean />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div
              className="px-8 pt-8 pb-6 text-white"
              style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-800)) 40%, rgb(var(--color-primary-500)) 100%)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight">{ti.title}</h1>
                  <p className="text-orange-200 text-sm mt-0.5">{ti.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-7">
              {errorDecode ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                  <p className="text-red-600 font-medium text-sm">{ti.invalidLink}</p>
                </div>
              ) : submitError ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <p className="text-gray-800 font-semibold text-base mb-2">Invitation Failed</p>
                  <p className="text-red-500 text-sm font-medium mb-3">{submitError}</p>
                  <p className="text-xs text-gray-400">กรุณาติดต่อผู้ดูแลระบบเพื่อขอ link ใหม่</p>
                </div>
              ) : !inviteInfo ? (
                <div className="flex flex-col items-center py-8 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin mb-3" />
                  <p className="text-sm">{ti.loading}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600 text-center">{ti.inviteMessage}</p>

                  <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{ti.username}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{inviteInfo.userName || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{ti.email}</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{inviteInfo.email || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {inviteInfo.invitedBy && (
                    <p className="text-xs text-center text-gray-400">
                      {ti.invitedBy}{' '}
                      <span className="font-medium text-gray-600">{inviteInfo.invitedBy}</span>
                    </p>
                  )}

                  <button
                    onClick={handleAccept}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {ti.confirmingButton}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {ti.acceptButton}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">{ti.footer}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Secure &bull; Reliable &bull; Fast
          </p>
        </div>
      </div>
    </>
  )
}

export default function UserInviteConfirmPage() {
  return (
    <LanguageProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading...</p>
          </div>
        </div>
      }>
        <InviteConfirmContent />
      </Suspense>
    </LanguageProvider>
  )
}
