'use client'

import { useLang } from '@/context/LanguageContext'
import { Lang } from '@/lib/translations'
import { useBrand } from '@/context/BrandContext'

export default function NavbarClean() {
  const { lang, setLang } = useLang()
  const { logoUrl, brandName } = useBrand()

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
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            {(['th', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${lang === l ? 'bg-white/30 text-white' : 'text-orange-300 hover:text-white'}`}
              >
                {l === 'th' ? 'TH' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <div className="h-16 w-full shrink-0" />
    </>
  )
}
