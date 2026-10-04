'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { client } from '@/lib/axios'
import { resolveTimezone, getBrowserTimezone } from '@/lib/datetime'

interface TimezoneContextValue {
  /** The actual IANA zone to format dates with — resolved from the user's saved
   *  setting, or the browser's own zone when the user has none saved. */
  timezone: string
  /** The raw saved setting, "" when the user follows the browser. */
  savedTimezone: string
  /** Re-fetch after the profile modal saves a change. */
  refresh: () => void
}

const LOCAL_CACHE_KEY = 'pp_merchant_timezone_cache'

const defaultValue: TimezoneContextValue = {
  timezone: getBrowserTimezone(),
  savedTimezone: '',
  refresh: () => {},
}

const TimezoneContext = createContext<TimezoneContextValue>(defaultValue)

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [savedTimezone, setSavedTimezone] = useState('')
  const [timezone, setTimezone] = useState(() => {
    if (typeof window === 'undefined') return getBrowserTimezone()
    try {
      const cached = window.localStorage.getItem(LOCAL_CACHE_KEY)
      return resolveTimezone(cached)
    } catch {
      return getBrowserTimezone()
    }
  })

  const load = useCallback(async () => {
    try {
      const orgId = window.localStorage.getItem('orgId') || 'temp'
      const username = window.localStorage.getItem('username') || ''
      if (!username) return
      const res = await client.get(`/api/OnlyUser/org/${orgId}/action/GetUserByUserName/${username}`)
      const d = res.data?.user ?? res.data
      const tz: string = d?.timezone || ''
      setSavedTimezone(tz)
      const resolved = resolveTimezone(tz)
      setTimezone(resolved)
      try {
        window.localStorage.setItem(LOCAL_CACHE_KEY, tz)
      } catch {
        // localStorage can be unavailable (private mode) — not critical, just skip caching
      }
    } catch {
      // Fail open — keep whatever was cached/browser-detected already.
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <TimezoneContext.Provider value={{ timezone, savedTimezone, refresh: load }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  return useContext(TimezoneContext)
}
