'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

const menuItems = [
  {
    href: '/administration/custom-roles',
    labelKey: 'customRoles' as const,
    icon: (
      <svg className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    href: '/administration/api-keys',
    labelKey: 'apiKeys' as const,
    icon: (
      <svg className="flex-shrink-0" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    href: '/administration/users',
    labelKey: 'users' as const,
    icon: (
      <svg className="flex-shrink-0" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/administration/audit-log',
    labelKey: 'auditLog' as const,
    icon: (
      <svg className="flex-shrink-0" style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]
// comment for push
export default function AdministrationSidebar() {
  const { t } = useLang()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={clsx(
        'relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'bg-gradient-to-b from-primary-800 to-primary-900 border-r border-primary-900',
        collapsed ? 'w-[60px]' : 'w-52'
      )}
    >
      {/* Collapse toggle */}
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

      {/* Section label */}
      <div className={clsx('transition-all duration-300 overflow-hidden', collapsed ? 'h-10' : 'h-auto')}>
        {!collapsed && (
          <div className="px-4 pt-5 pb-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Administration</p>
          </div>
        )}
        {collapsed && <div className="pt-5 pb-2" />}
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-2 pb-4">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? t.nav[item.labelKey] : undefined}
              className={clsx(
                'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              {/* Icon wrapper */}
              <span className={clsx(
                'flex items-center justify-center flex-shrink-0 rounded-lg transition-all',
                isActive
                  ? 'text-white'
                  : 'text-white/60'
              )}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="truncate">{t.nav[item.labelKey]}</span>
              )}

              {/* Active indicator dot */}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom gradient fade */}
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
