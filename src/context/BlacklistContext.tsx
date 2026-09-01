'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { userApi } from '@/lib/api/user.api'

interface BlacklistContextValue {
  isBlacklisted: boolean
  clientIp?: string
  whitelistIps?: string
  blacklistIps?: string
  loading: boolean
}

const defaultValue: BlacklistContextValue = { isBlacklisted: false, loading: true }

const BlacklistContext = createContext<BlacklistContextValue>(defaultValue)

export function BlacklistProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BlacklistContextValue>(defaultValue)
  const pathname = usePathname()

  const check = useCallback(async () => {
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') : null
    if (!orgId) {
      setStatus({ isBlacklisted: false, loading: false })
      return
    }

    try {
      const res = await userApi.getIpPolicyStatus(orgId)
      const d = (res.data ?? {}) as Record<string, unknown>
      setStatus({
        isBlacklisted: Boolean(d.isBlacklisted ?? d.IsBlacklisted),
        clientIp: (d.clientIp ?? d.ClientIp) as string | undefined,
        whitelistIps: (d.whitelistIps ?? d.WhitelistIps) as string | undefined,
        blacklistIps: (d.blacklistIps ?? d.BlacklistIps) as string | undefined,
        loading: false,
      })
    } catch {
      // Fail-open: never block the merchant portal just because the check itself failed.
      setStatus(s => ({ ...s, loading: false }))
    }
  }, [])

  // Re-check on first load and whenever the user navigates to a different page.
  useEffect(() => {
    check()
  }, [check, pathname])

  // Re-check immediately when the user switches merchant from the navbar.
  useEffect(() => {
    window.addEventListener('orgchange', check)
    return () => window.removeEventListener('orgchange', check)
  }, [check])

  return (
    <BlacklistContext.Provider value={status}>
      {children}
    </BlacklistContext.Provider>
  )
}

export function useBlacklist() {
  return useContext(BlacklistContext)
}
