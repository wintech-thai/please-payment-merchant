'use client'

import { LanguageProvider } from '@/context/LanguageContext'
import { BlacklistProvider, useBlacklist } from '@/context/BlacklistContext'
import { BlacklistBanner } from '@/components/BlacklistBanner'
import Navbar from '@/components/Navbar'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isBlacklisted, clientIp, whitelistIps, blacklistIps } = useBlacklist()

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {isBlacklisted
          ? <BlacklistBanner clientIp={clientIp} whitelistIps={whitelistIps} blacklistIps={blacklistIps} />
          : children}
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <BlacklistProvider>
        <DashboardShell>{children}</DashboardShell>
      </BlacklistProvider>
    </LanguageProvider>
  )
}
