'use client'

import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/context/LanguageContext'
import { Lang } from '@/lib/translations'
import { useBrand } from '@/context/BrandContext'
import clsx from 'clsx'

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: 'th', flag: 'th', label: 'ไทย' },
  { code: 'en', flag: 'gb', label: 'English' },
  { code: 'zh', flag: 'cn', label: '中文' },
  { code: 'my', flag: 'mm', label: 'မြန်မာ' },
]

function FlagIcon({ countryCode, className }: { countryCode: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${countryCode}.png`}
      srcSet={`https://flagcdn.com/w80/${countryCode}.png 2x`}
      alt=""
      loading="lazy"
      onError={e => { e.currentTarget.style.visibility = 'hidden' }}
      className={clsx('rounded-[2px] object-cover flex-shrink-0', className)}
    />
  )
}

export default function NavbarClean() {
  const { lang, setLang } = useLang()
  const { logoUrl, brandName } = useBrand()
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)
  const currentLangOption = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) setLangMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-16 shadow-lg"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-800)) 0%, rgb(var(--color-primary-700)) 40%, rgb(var(--color-primary-500)) 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-8 w-auto object-contain flex-shrink-0" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-8 h-8 flex-shrink-0">
                <defs>
                  <linearGradient id="ncMbGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                    <stop offset="0%" stopColor="#fed7aa" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
                <ellipse cx="60" cy="20" rx="11" ry="7" fill="url(#ncMbGrad)" />
                <rect x="49" y="24" width="22" height="16" rx="5" fill="url(#ncMbGrad)" />
                <ellipse cx="60" cy="76" rx="40" ry="36" fill="url(#ncMbGrad)" />
                <ellipse cx="45" cy="60" rx="9" ry="6" fill="white" fillOpacity="0.2" transform="rotate(-35 45 60)" />
                <text x="60" y="89" textAnchor="middle" fill="#7c2d00" fontSize="42" fontWeight="bold" fontFamily="Arial, sans-serif">฿</text>
              </svg>
            )}
            <div>
              <p className="font-bold text-white text-sm tracking-wide leading-none">{brandName || 'PLEASE-PAYMENT'}</p>
              <p className="text-orange-200 text-xs leading-none mt-0.5">Merchant</p>
            </div>
          </div>

          {/* Language switcher */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <FlagIcon countryCode={currentLangOption.flag} className="w-4 h-3" />
              <span className="text-xs">{currentLangOption.code.toUpperCase()}</span>
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setLangMenuOpen(false) }}
                    className={clsx(
                      'flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors',
                      lang === l.code ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <FlagIcon countryCode={l.flag} className="w-5 h-3.5" />
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>
      <div className="h-16 w-full shrink-0" />
    </>
  )
}
