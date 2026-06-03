'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LanguageProvider, useLang } from '@/context/LanguageContext'
import { useBrand } from '@/context/BrandContext'

function LoginForm() {
  const { t } = useLang()
  const { logoUrl, brandName } = useBrand()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        toast.error(t.login.invalidCredentials)
        return
      }

      const data = await res.json()
      localStorage.setItem('accessToken', data.accessToken || '')
      localStorage.setItem('refreshToken', data.refreshToken || '')
      localStorage.setItem('username', data.username || username)
      localStorage.setItem('orgId', data.orgId || '')
      localStorage.setItem('merchants', JSON.stringify(data.merchants || []))

      // Decode JWT payload to extract userId (sub claim)
      try {
        const payload = JSON.parse(atob((data.accessToken || '').split('.')[1]))
        const userId = payload.sub || payload.userId || payload.user_id || payload.id || payload.Id || ''
        localStorage.setItem('userId', String(userId))
      } catch {
        localStorage.setItem('userId', '')
      }

      toast.success(t.login.success, { duration: 1500 })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push('/overview')
    } catch {
      toast.error(t.login.serverError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)',
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow circles */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-orange-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-orange-400 rounded-full opacity-10 blur-3xl" />

        {/* Top: Logo + name */}
        <div className="relative z-10 flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="h-11 w-auto object-contain flex-shrink-0" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-11 h-11 flex-shrink-0">
              <defs>
                <linearGradient id="lp1MbGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="60%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <filter id="lp1MbGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#d97706" floodOpacity="0.5" />
                </filter>
              </defs>
              <g filter="url(#lp1MbGlow)">
                <ellipse cx="60" cy="20" rx="11" ry="7" fill="url(#lp1MbGrad)" />
                <rect x="49" y="24" width="22" height="16" rx="5" fill="url(#lp1MbGrad)" />
                <ellipse cx="60" cy="76" rx="40" ry="36" fill="url(#lp1MbGrad)" />
                <ellipse cx="45" cy="60" rx="9" ry="6" fill="white" fillOpacity="0.2" transform="rotate(-35 45 60)" />
                <text x="60" y="89" textAnchor="middle" fill="white" fontSize="42" fontWeight="bold" fontFamily="Arial, sans-serif">฿</text>
              </g>
            </svg>
          )}
          <div>
            <p className="text-white font-bold text-sm tracking-wide">{brandName || 'PLEASE-PAYMENT'}</p>
            <p className="text-orange-200 text-xs">Merchant</p>
          </div>
        </div>

        {/* Center: headline */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            {brandName || 'Payment Merchant'}<br />Dashboard
          </h1>
          <p className="text-orange-200 text-base mb-10">{t.appSubtitle}</p>

          <ul className="space-y-4">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                label: t.login.features.f1,
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                label: t.login.features.f2,
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                label: t.login.features.f3,
              },
            ].map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center text-orange-100">
                  {icon}
                </span>
                <span className="text-orange-100 text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom footer */}
        <p className="relative z-10 text-orange-300 text-xs">
          Secure &bull; Reliable &bull; Fast
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-gray-50 p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-8 h-8 flex-shrink-0">
              <defs>
                <linearGradient id="lp2MbGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#fb923c" />
                  <stop offset="60%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <filter id="lp2MbGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="#d97706" floodOpacity="0.5" />
                </filter>
              </defs>
              <g filter="url(#lp2MbGlow)">
                <ellipse cx="60" cy="20" rx="11" ry="7" fill="url(#lp2MbGrad)" />
                <rect x="49" y="24" width="22" height="16" rx="5" fill="url(#lp2MbGrad)" />
                <ellipse cx="60" cy="76" rx="40" ry="36" fill="url(#lp2MbGrad)" />
                <ellipse cx="45" cy="60" rx="9" ry="6" fill="white" fillOpacity="0.2" transform="rotate(-35 45 60)" />
                <text x="60" y="89" textAnchor="middle" fill="white" fontSize="42" fontWeight="bold" fontFamily="Arial, sans-serif">฿</text>
              </g>
            </svg>
            <span className="font-bold text-gray-900 text-sm">PLEASE-PAYMENT Merchant</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t.login.welcome}</h2>
          <p className="text-gray-500 text-sm mb-8">{t.login.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.login.username}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.login.usernamePlaceholder}
                  required
                  autoComplete="username"
                  className="input-field pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t.login.password}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  required
                  autoComplete="current-password"
                  className="input-field pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 accent-primary-700" />
                <span className="text-sm text-gray-600">{t.login.rememberMe}</span>
              </label>
              <button type="button" className="text-sm text-primary-700 hover:text-primary-900 font-medium">
                {t.login.forgotPassword}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t.login.loggingIn}
                </>
              ) : (
                <>
                  {t.login.submit}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">{t.login.footer}</p>
          <p className="text-center text-xs text-gray-400">Secure &bull; Reliable &bull; Fast</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <LoginForm />
    </LanguageProvider>
  )
}
