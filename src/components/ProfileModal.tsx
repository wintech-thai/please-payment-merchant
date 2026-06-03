'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useLang } from '@/context/LanguageContext'
import { client } from '@/lib/axios'
import { toast } from 'sonner'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'

interface Props {
  onClose: () => void
}

interface Profile {
  username: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  secondaryEmail: string
}

function DarkInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  required,
}: {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={[
        'w-full px-4 py-2.5 rounded-lg text-sm transition-colors',
        'bg-white/5 border border-white/10 text-white placeholder-white/30',
        'focus:outline-none focus:border-primary-400 focus:bg-white/10',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    />
  )
}

export default function ProfileModal({ onClose }: Props) {
  const { t } = useLang()
  const [profile, setProfile] = useState<Profile>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    secondaryEmail: '',
  })
  const [original, setOriginal] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  useEffect(() => {
    const orgId = localStorage.getItem('orgId') || 'temp'
    const username = localStorage.getItem('username') || ''
    client
      .get(`/api/OnlyUser/org/${orgId}/action/GetUserByUserName/${username}`)
      .then((res) => {
        const d = res.data.user ?? res.data
        // Convert +66XXXXXXXXX → 0XXXXXXXXX for display
        const rawPhone: string = d.phoneNumber || ''
        const displayPhone = rawPhone.startsWith('+66')
          ? '0' + rawPhone.slice(3)
          : rawPhone
        const loaded: Profile = {
          username: d.userName || '',
          email: d.userEmail || '',
          firstName: d.name || '',
          lastName: d.lastName || '',
          phoneNumber: displayPhone,
          secondaryEmail: d.secondaryEmail || '',
        }
        setProfile(loaded)
        setOriginal(loaded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (
      original &&
      profile.firstName === original.firstName &&
      profile.lastName === original.lastName &&
      profile.phoneNumber === original.phoneNumber &&
      profile.secondaryEmail === original.secondaryEmail
    ) {
      onClose()
      return
    }

    setSaving(true)
    try {
      // Convert 0XXXXXXXXX → +66XXXXXXXXX for API
      const phone = profile.phoneNumber.startsWith('0')
        ? '+66' + profile.phoneNumber.slice(1)
        : profile.phoneNumber

      const orgId = localStorage.getItem('orgId') || 'temp'
      const username = localStorage.getItem('username') || ''
      await client.post(`/api/OnlyUser/org/${orgId}/action/UpdateUserByUserName/${username}`, {
        userName: username,
        name: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: phone,
        secondaryEmail: profile.secondaryEmail,
      })
      toast.success(t.profile.saveSuccess)
      onClose()
    } catch {
      toast.error(t.profile.saveError)
    } finally {
      setSaving(false)
    }
  }

  const isDirty = original !== null && (
    profile.firstName !== original.firstName ||
    profile.lastName !== original.lastName ||
    profile.phoneNumber !== original.phoneNumber ||
    profile.secondaryEmail !== original.secondaryEmail
  )

  const handleClose = () => {
    if (isDirty) setShowLeaveConfirm(true)
    else onClose()
  }

  const set = (field: keyof Profile) => (v: string) =>
    setProfile((p) => ({ ...p, [field]: v }))

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {showLeaveConfirm && (
        <LeaveConfirmModal onConfirm={onClose} onCancel={() => setShowLeaveConfirm(false)} />
      )}
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-950)) 100%)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">{t.profile.title}</h2>
            <p className="text-white/50 text-sm mt-1">{t.profile.subtitle}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 pb-4 sm:pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <form id="profile-form" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {/* Row 1 */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-wider mb-2">
                    {t.profile.username}
                  </label>
                  <DarkInput value={profile.username} disabled placeholder={t.profile.username} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-wider mb-2">
                    {t.profile.email}
                  </label>
                  <DarkInput value={profile.email} disabled placeholder={t.profile.email} />
                </div>

                {/* Row 2 */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-wider mb-2">
                    {t.profile.firstName} <span className="text-red-400">*</span>
                  </label>
                  <DarkInput
                    value={profile.firstName}
                    onChange={set('firstName')}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-wider mb-2">
                    {t.profile.lastName} <span className="text-red-400">*</span>
                  </label>
                  <DarkInput
                    value={profile.lastName}
                    onChange={set('lastName')}
                    placeholder="Enter last name"
                    required
                  />
                </div>

                {/* Row 3 */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-wider mb-2">
                    {t.profile.phoneNumber} <span className="text-red-400">*</span>
                  </label>
                  <DarkInput
                    value={profile.phoneNumber}
                    onChange={set('phoneNumber')}
                    placeholder="08X-XXX-XXXX"
                    type="tel"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 tracking-wider mb-2">
                    {t.profile.secondaryEmail}
                  </label>
                  <DarkInput
                    value={profile.secondaryEmail}
                    onChange={set('secondaryEmail')}
                    placeholder="example@gmail.com"
                    type="email"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex justify-end gap-3 px-4 sm:px-8 py-4 sm:py-5 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-sm font-semibold rounded-lg border border-red-800 bg-red-950/50 text-red-400 hover:bg-red-900/50 transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              form="profile-form"
              disabled={saving}
              className="px-6 py-2 text-sm font-semibold rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
            >
              {saving ? t.profile.saving : t.profile.save}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
