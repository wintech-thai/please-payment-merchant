'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const menuItems = [
  {
    href: '/report-analytic',
    labelKey: 'revenueSummary' as const,
    icon: (
      <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default function ReportSidebar() {
  const pathname = usePathname()
  const { t } = useLang()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={clsx(
        'relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'bg-gradient-to-b from-primary-800 to-primary-900 border-r border-primary-900',
        collapsed ? 'w-[60px]' : 'w-52'
      )}
    >
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-primary-700 hover:bg-primary-600 flex items-center justify-center text-white shadow-lg transition-all"
      >
        <svg
          className={clsx('transition-transform duration-300', collapsed ? 'rotate-180' : '')}
          style={{ width: '12px', height: '12px' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className={clsx('transition-all duration-300 overflow-hidden', collapsed ? 'h-10' : 'h-auto')}>
        {!collapsed && (
          <div className="px-4 pt-5 pb-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">{t.nav.reportAndAnalytic}</p>
          </div>
        )}
        {collapsed && <div className="pt-5 pb-2" />}
      </div>

      <nav className="flex flex-col gap-0.5 px-2 pb-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const label = t.revenueSummary?.title ?? 'Revenue Summary'
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className={clsx('flex items-center justify-center flex-shrink-0 rounded-lg', isActive ? 'text-white' : 'text-white/60')}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />
      {!collapsed && (
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <p className="text-[10px] text-white/20 text-center">
            {new Date().getFullYear()} &copy; Merchant
          </p>
        </div>
      )}
    </aside>
  )
}
