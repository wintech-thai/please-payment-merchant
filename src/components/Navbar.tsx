'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useLang } from '@/context/LanguageContext'
import { clearAuthData } from '@/lib/axios'
import { Lang } from '@/lib/translations'
import clsx from 'clsx'
import { toast } from 'sonner'
import ProfileModal from '@/components/ProfileModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import { AppVersionDisplay } from '@/components/AppVersionDisplay'
import { useBrand } from '@/context/BrandContext'

interface MerchantOption {
  orgId: string
  orgName: string
  merchantCode?: string
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const { logoUrl, brandName } = useBrand()
  const [loggingOut, setLoggingOut] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [merchantMenuOpen, setMerchantMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessNavOpen, setBusinessNavOpen] = useState(false)
  const [modal, setModal] = useState<'profile' | 'changePassword' | null>(null)
  const [username, setUsername] = useState('')
  const [currentOrgId, setCurrentOrgId] = useState('')
  const [merchants, setMerchants] = useState<MerchantOption[]>([])
  const [adminDocUrl, setAdminDocUrl] = useState('')

  const merchantSwitcherRef = useRef<HTMLDivElement>(null)
  const businessNavRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUsername(localStorage.getItem('username') || '')
    setCurrentOrgId(localStorage.getItem('orgId') || '')
    const adminOrigin = process.env.NEXT_PUBLIC_ADMIN_URL ||
      window.location.origin.replace('merchant', 'admin')
    setAdminDocUrl(`${adminOrigin}/documents`)
    try {
      const stored = localStorage.getItem('merchants')
      if (stored) setMerchants(JSON.parse(stored))
    } catch { }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (merchantSwitcherRef.current && !merchantSwitcherRef.current.contains(e.target as Node)) setMerchantMenuOpen(false)
      if (businessNavRef.current && !businessNavRef.current.contains(e.target as Node)) setBusinessNavOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    clearAuthData()
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success(t.nav.logoutSuccess, { duration: 1500 })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push('/login')
  }

  function handleSwitchMerchant(orgId: string) {
    localStorage.setItem('orgId', orgId)
    setCurrentOrgId(orgId)
    setMerchantMenuOpen(false)
    window.dispatchEvent(new CustomEvent('orgchange', { detail: { orgId } }))
    router.refresh()
  }

  const currentMerchant = merchants.find(m => m.orgId === currentOrgId)
  const isBusinessActive = pathname.startsWith('/merchant') || pathname.startsWith('/payment')
  const isAdminActive = pathname.startsWith('/administration')

  const paymentChildren = [
    { href: '/payment/pay-in-requests', label: 'Pay-In Requests' },
    { href: '/payment/pay-in-transactions', label: 'Pay-In Transactions' },
    { href: '/payment/pay-out-requests', label: 'Pay-Out Requests' },
  ]

  const adminChildren = [
    { href: '/administration/custom-roles', label: t.nav.customRoles },
    { href: '/administration/api-keys', label: t.nav.apiKeys },
    { href: '/administration/users', label: t.nav.users },
    { href: '/administration/audit-log', label: t.nav.auditLog },
  ]

  const navItemClass = (active: boolean) => clsx(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
    active ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15'
  )

  return (
    <>
      <header className="bg-gradient-to-r from-primary-700 to-primary-600 shadow-lg z-30 relative">
        <div className="flex items-center h-14 px-4 gap-3">

          {/* Brand */}
          <Link href="/overview" className="flex items-center gap-2.5 flex-shrink-0">
            <img src={logoUrl || '/img/please-payment.svg'} alt="logo" className="w-9 h-9 object-contain" />
            <div className="hidden sm:block">
              <p className="text-white font-bold text-sm leading-tight">{brandName || 'PLEASE-PAYMENT'}</p>
              <p className="text-amber-300 text-xs leading-tight font-semibold tracking-wide">Merchant</p>
            </div>
          </Link>

          {/* Merchant switcher */}
          {merchants.length > 0 && (
            <div ref={merchantSwitcherRef} className="relative flex-shrink-0">
              <button
                onClick={() => setMerchantMenuOpen(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm border border-white/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="font-semibold max-w-[120px] truncate">
                  {currentMerchant?.merchantCode || currentMerchant?.orgName || currentOrgId || 'Select Merchant'}
                </span>
                <svg className={clsx('w-3 h-3 flex-shrink-0 transition-transform', merchantMenuOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {merchantMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Switch Merchant</p>
                  {merchants.map(m => (
                    <button key={m.orgId} onClick={() => handleSwitchMerchant(m.orgId)}
                      className={clsx('w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between',
                        m.orgId === currentOrgId ? 'text-primary-700 font-semibold bg-primary-50' : 'text-gray-700 hover:bg-gray-50')}>
                      <span>{m.merchantCode || m.orgName}</span>
                      {m.orgId === currentOrgId && (
                        <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="hidden md:block w-px h-5 bg-white/20 flex-shrink-0" />

          {/* Nav items — desktop */}
          <nav className="hidden md:flex items-center gap-0.5 flex-nowrap">
            <Link href="/overview" className={navItemClass(pathname === '/overview' || pathname.startsWith('/overview/'))}>
              {t.nav.overview}
            </Link>

            {/* Business dropdown */}
            <div className="relative" ref={businessNavRef}>
              <button onClick={() => setBusinessNavOpen(v => !v)} className={navItemClass(isBusinessActive)}>
                <span>{t.nav.business}</span>
                <svg className={clsx('w-3 h-3 flex-shrink-0 transition-transform', businessNavOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {businessNavOpen && (
                <div className="absolute left-0 top-full w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <Link href="/merchant" onClick={() => setBusinessNavOpen(false)}
                    className={clsx('flex items-center px-4 py-2.5 text-sm transition-colors',
                      pathname.startsWith('/merchant') ? 'text-primary-700 font-semibold bg-primary-50' : 'text-gray-700 hover:bg-gray-50')}>
                    {t.nav.merchantInfo}
                  </Link>
                  <Link href="/payment/pay-in-requests" onClick={() => setBusinessNavOpen(false)}
                    className={clsx('flex items-center px-4 py-2.5 text-sm transition-colors',
                      pathname.startsWith('/payment') ? 'text-primary-700 font-semibold bg-primary-50' : 'text-gray-700 hover:bg-gray-50')}>
                    {t.nav.payment}
                  </Link>
                </div>
              )}
            </div>

            <Link href="/report-analytic" className={navItemClass(pathname.startsWith('/report-analytic'))}>
              {t.nav.reportAndAnalytic}
            </Link>

            <Link href="/administration/custom-roles" className={navItemClass(isAdminActive)}>
              {t.nav.administrator}
            </Link>

            {/* <Link href="/setting" className={navItemClass(pathname.startsWith('/setting'))}>
              {t.nav.setting}
            </Link> */}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* API Document link */}
            <a
              href={adminDocUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-white hover:bg-white/15"
            >
              {t.nav.document}
            </a>

            {/* Divider */}
            <div className="hidden md:block w-px h-6 bg-white/20 flex-shrink-0" />

            {/* Version */}
            <AppVersionDisplay className="hidden lg:flex" />

            {/* Language switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
              {(['th', 'en'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={clsx('px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    lang === l ? 'bg-white/30 text-white' : 'text-white hover:text-white')}>
                  {l === 'th' ? 'TH' : 'EN'}
                </button>
              ))}
            </div>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 transition-colors">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {username.charAt(0)}
                </div>
                <span className="hidden sm:block text-sm font-medium">{username}</span>
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                    <button onClick={() => { setUserMenuOpen(false); setModal('profile') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t.nav.profile}
                    </button>
                    <button onClick={() => { setUserMenuOpen(false); setModal('changePassword') }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      {t.nav.changePassword}
                    </button>
                    <div className="sm:hidden border-t border-gray-100 mt-1 pt-1">
                      <div className="flex items-center gap-1 px-4 py-2">
                        {(['th', 'en'] as Lang[]).map((l) => (
                          <button key={l} onClick={() => { setLang(l); setUserMenuOpen(false) }}
                            className={clsx('flex-1 py-1 rounded-md text-xs font-medium transition-colors',
                              lang === l ? 'bg-primary-100 text-primary-800' : 'text-gray-500 hover:text-gray-700')}>
                            {l === 'th' ? 'TH' : 'EN'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={handleLogout} disabled={loggingOut}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t.nav.logout}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-1.5 text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/10 px-3 pb-3 pt-2 flex flex-col gap-1">
            <Link href="/overview" onClick={() => setMobileMenuOpen(false)}
              className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/overview') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
              {t.nav.overview}
            </Link>

            <div className="px-3 py-1.5">
              <p className="text-xs font-semibold text-amber-300/60 uppercase tracking-wider mb-1">{t.nav.business}</p>
              <Link href="/merchant" onClick={() => setMobileMenuOpen(false)}
                className={clsx('flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                  pathname === '/merchant' ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
                {t.nav.merchantInfo}
              </Link>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider ml-2 mt-2 mb-1">{t.nav.payment}</p>
              {paymentChildren.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className={clsx('flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-4',
                    pathname.startsWith(item.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
                  {item.label}
                </Link>
              ))}
            </div>

            <Link href="/report-analytic" onClick={() => setMobileMenuOpen(false)}
              className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/report-analytic') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
              {t.nav.reportAndAnalytic}
            </Link>

            <div className="px-3 py-1.5">
              <p className="text-xs font-semibold text-amber-300/60 uppercase tracking-wider mb-1">{t.nav.administrator}</p>
              {adminChildren.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className={clsx('flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-2',
                    pathname.startsWith(item.href) ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* <Link href="/setting" onClick={() => setMobileMenuOpen(false)}
              className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/setting') ? 'bg-white/20 text-white' : 'text-white hover:bg-white/15')}>
              {t.nav.setting}
            </Link> */}

            <a
              href={adminDocUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-white hover:bg-white/15"
            >
              {t.nav.document}
            </a>
          </nav>
        )}
      </header>

      {/* Modals */}
      {modal === 'profile' && <ProfileModal onClose={() => setModal(null)} />}
      {modal === 'changePassword' && <ChangePasswordModal onClose={() => setModal(null)} />}
    </>
  )
}
