'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { userApi } from '@/lib/api/user.api'
import { clearAuthData } from '@/lib/axios'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import NavbarClean from '@/components/NavbarClean'
import { LanguageProvider, useLang } from '@/context/LanguageContext'

interface UserInfo {
  userName: string
  email: string
  orgUserId?: string
}

function ReqBullet({ isValid, text }: { isValid: boolean; text: string }) {
  return (
    <li className={clsx('flex items-start gap-2 text-xs transition-colors', isValid ? 'text-primary-600 font-medium' : 'text-gray-400')}>
      <span className="mt-0.5 text-[10px]">•</span>
      <span>{text}</span>
    </li>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function ForgotPasswordContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useLang()
  const fp = t.forgotPasswordConfirm

  const slug = params?.slug as string[]
  const orgId = slug?.[0] || 'temp'
  const token = slug?.[1] || ''

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const dataParam = searchParams.get('data')
    if (!dataParam) return
    try {
      const decoded = decodeURIComponent(escape(atob(dataParam)))
      const parsed = JSON.parse(decoded)
      setUserInfo({
        userName: parsed.UserName || parsed.username || '',
        email: parsed.Email || parsed.email || '',
        orgUserId: parsed.OrgUserId || parsed.orgUserId,
      })
    } catch {
      try {
        const parsed = JSON.parse(atob(dataParam))
        setUserInfo({
          userName: parsed.UserName || parsed.username || '',
          email: parsed.Email || parsed.email || '',
          orgUserId: parsed.OrgUserId || parsed.orgUserId,
        })
      } catch {
        toast.error(fp.invalidLink)
      }
    }
  }, [searchParams])

  const reqs = {
    length: password.length >= 7 && password.length <= 15,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!password) errs.password = fp.errPassword
    else if (!reqs.length || !reqs.upper || !reqs.lower || !reqs.special)
      errs.password = fp.errPasswordReq
    if (!confirmPassword) errs.confirmPassword = fp.errConfirmRequired
    else if (password !== confirmPassword) errs.confirmPassword = fp.errConfirmMismatch
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !userInfo) return
    setSubmitting(true)
    try {
      await userApi.confirmForgotPassword(orgId, token, {
        username: userInfo.userName,
        email: userInfo.email,
        password,
        orgUserId: userInfo.orgUserId,
      })
      toast.success(fp.successMsg)
      clearAuthData()
      window.location.href = '/login'
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : fp.errorMsg)
    } finally {
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
              style={{ background: 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #d97706 100%)' }}
            >
              <h1 className="text-xl font-bold text-white mb-1">{fp.title}</h1>
              <p className="text-sm text-orange-200">{fp.subtitle}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              {/* Read-only user info */}
              <div className="space-y-4">
                <Field label={fp.username}>
                  <input
                    type="text"
                    value={userInfo?.userName ?? ''}
                    readOnly
                    className={clsx(inputCls, 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                  />
                </Field>
                <Field label={fp.email}>
                  <input
                    type="text"
                    value={userInfo?.email ?? ''}
                    readOnly
                    className={clsx(inputCls, 'bg-gray-50 text-gray-500 cursor-not-allowed')}
                  />
                </Field>
              </div>

              <div className="border-t border-gray-100" />

              {/* New password */}
              <Field label={fp.newPassword} required>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                    placeholder="••••••••"
                    disabled={submitting}
                    maxLength={15}
                    className={clsx(inputCls, 'pr-10', errors.password && 'border-red-400 focus:ring-red-400')}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </Field>

              {/* Confirm password */}
              <Field label={fp.confirmPassword} required>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })) }}
                    placeholder="••••••••"
                    disabled={submitting}
                    maxLength={15}
                    className={clsx(inputCls, 'pr-10', errors.confirmPassword && 'border-red-400 focus:ring-red-400')}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
              </Field>

              {/* Password requirements */}
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-primary-700 mb-2">{fp.reqTitle}</p>
                <ul className="space-y-1">
                  <ReqBullet isValid={reqs.length} text={fp.req1} />
                  <ReqBullet isValid={reqs.upper} text={fp.req2} />
                  <ReqBullet isValid={reqs.lower} text={fp.req3} />
                  <ReqBullet isValid={reqs.special} text={fp.req4} />
                </ul>
              </div>

              <button
                type="submit"
                disabled={submitting || !userInfo}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {fp.processing}
                  </>
                ) : fp.submit}
              </button>

              <p className="text-xs text-gray-400 text-center pt-1">{fp.footer}</p>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Secure &bull; Reliable &bull; Fast
          </p>
        </div>
      </div>
    </>
  )
}

export default function ForgotPasswordPage() {
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
        <ForgotPasswordContent />
      </Suspense>
    </LanguageProvider>
  )
}

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-colors'
