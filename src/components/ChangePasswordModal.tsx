'use client'

import { useState, FormEvent } from 'react'
import { useLang } from '@/context/LanguageContext'
import { client } from '@/lib/axios'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function DarkPasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  placeholder,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  autoComplete: string
  placeholder?: string
  error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete={autoComplete}
          className={[
            'w-full px-4 py-2.5 pr-10 rounded-lg text-sm text-white placeholder-white/30',
            'bg-white/5 border transition-colors focus:outline-none focus:bg-white/10',
            error ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-primary-400',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, new: false })
  const [loading, setLoading] = useState(false)

  const mismatch = form.confirmPassword !== '' && form.confirmPassword !== form.newPassword

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) return

    setLoading(true)
    const userName = localStorage.getItem('username') || ''
    const orgId = localStorage.getItem('orgId') || 'temp'
    try {
      await client.post(`/api/OnlyUser/org/${orgId}/action/UpdatePassword`, {
        userName,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success(t.changePassword.success)
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t.changePassword.error
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-900)) 0%, rgb(var(--color-primary-950)) 100%)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-8 pt-5 sm:pt-7 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white">{t.changePassword.title}</h2>
            <p className="text-amber-400 text-xs mt-2 leading-relaxed">{t.changePassword.hint}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors mt-0.5 flex-shrink-0 ml-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form id="change-password-form" onSubmit={handleSubmit} className="px-4 sm:px-8 py-4 sm:py-6 space-y-5">
          <DarkPasswordField
            label={t.changePassword.currentPassword}
            value={form.currentPassword}
            onChange={(v) => setForm((f) => ({ ...f, currentPassword: v }))}
            show={show.current}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            autoComplete="current-password"
            placeholder="Enter current password"
          />
          <DarkPasswordField
            label={t.changePassword.newPassword}
            value={form.newPassword}
            onChange={(v) => setForm((f) => ({ ...f, newPassword: v }))}
            show={show.new}
            onToggle={() => setShow((s) => ({ ...s, new: !s.new }))}
            autoComplete="new-password"
            placeholder="Enter new password"
          />
          <DarkPasswordField
            label={t.changePassword.confirmPassword}
            value={form.confirmPassword}
            onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            show={show.new}
            onToggle={() => setShow((s) => ({ ...s, new: !s.new }))}
            autoComplete="new-password"
            placeholder="Confirm new password"
            error={mismatch ? t.changePassword.mismatch : undefined}
          />
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-4 sm:px-8 py-4 sm:py-5 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold rounded-lg border border-red-800 bg-red-950/50 text-red-400 hover:bg-red-900/50 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="submit"
            form="change-password-form"
            disabled={loading || mismatch}
            className="px-6 py-2 text-sm font-semibold rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
          >
            {loading ? t.changePassword.submitting : t.changePassword.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
