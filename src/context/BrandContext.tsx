'use client'

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { applyTheme, DEFAULT_THEME } from '@/lib/brand-themes'
import { resolveStorageUrl } from '@/lib/storage'
import type { ThemeName } from '@/lib/brand-themes'

const BRAND_DISPLAY_CACHE_KEY = 'brandDisplayCache'

interface BrandConfig {
  brandName?: string
  logoPath?: string
  logoImageUrl?: string
  themeName?: string
}

interface Config {
  configId?: string
  status?: string
  brandConfig?: BrandConfig
}

interface BrandContextValue {
  config: Config | null
  loading: boolean
  logoUrl: string
  brandName: string
  refresh: () => void
}

const BrandContext = createContext<BrandContextValue>({
  config: null, loading: true, logoUrl: '', brandName: '', refresh: () => {},
})

export function useBrand() {
  return useContext(BrandContext)
}

async function fetchBrandConfig(): Promise<Config | null> {
  try {
    const res = await fetch('/api/proxy/admin-api/AdminConfiguration/org/global/action/GetBrandConfig', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const raw = await res.json()
    return (raw?.configuration ?? raw?.data ?? raw) as Config
  } catch {
    return null
  }
}

function isConfigActive(config: Config | null): boolean {
  const s = config?.status?.toLowerCase() ?? ''
  return s === 'active' || s.startsWith('enable')
}

function resetFavicon() {
  cachedFaviconDataUrl = null
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) {
    links.forEach(l => {
      l.type = 'image/svg+xml'
      l.href = `/img/please-payment.svg?_t=${Date.now()}`
    })
  }
}

function applyBrandToDOM(config: Config | null) {
  if (!config || !isConfigActive(config) || !config.brandConfig) {
    applyTheme(DEFAULT_THEME)
    document.title = 'PLEASE-PAYMENT Merchant'
    resetFavicon()
    return
  }

  const { brandName, logoImageUrl, themeName } = config.brandConfig

  if (themeName) applyTheme(themeName as ThemeName)
  if (brandName) document.title = brandName
}

let cachedFaviconDataUrl: string | null = null

function setFaviconHref(dataUrl: string) {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
  if (links.length > 0) {
    links.forEach(l => { l.href = dataUrl })
  } else {
    const link = document.createElement('link')
    link.id = 'brand-favicon'
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = dataUrl
    document.head.appendChild(link)
  }
}

function applyFaviconDataUrl() {
  if (cachedFaviconDataUrl) {
    setFaviconHref(cachedFaviconDataUrl)
    return
  }
  fetch(`/api/brand-logo?_t=${Date.now()}`)
    .then(r => r.ok ? r.blob() : null)
    .then(blob => {
      if (!blob) return
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        if (!dataUrl) return
        cachedFaviconDataUrl = dataUrl
        setFaviconHref(dataUrl)
      }
      reader.readAsDataURL(blob)
    })
    .catch(() => {})
}

function BrandApplier({ config, loading }: { config: Config | null; loading: boolean }) {
  const pathname = usePathname()

  useLayoutEffect(() => {
    // Skip during initial load to preserve localStorage theme (prevents flash)
    if (loading && config === null) return

    applyBrandToDOM(config)

    const s = config?.status?.toLowerCase() ?? ''
    const isActive = s === 'active' || s.startsWith('enable')
    if (isActive && config?.brandConfig?.logoImageUrl) {
      applyFaviconDataUrl()
    }
  }, [pathname, config, loading])

  return null
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [cachedName, setCachedName] = useState('')
  const [cachedLogo, setCachedLogo] = useState('')

  // Read display cache before first paint to prevent navbar flash
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(BRAND_DISPLAY_CACHE_KEY)
      if (raw) {
        const { n = '', l = '' } = JSON.parse(raw)
        if (n) setCachedName(n)
        if (l) setCachedLogo(l)
      }
    } catch {}
  }, [])

  async function load() {
    cachedFaviconDataUrl = null
    setLoading(true)
    const data = await fetchBrandConfig()
    setConfig(data)
    applyBrandToDOM(data)

    const active = isConfigActive(data) && !!data?.brandConfig
    if (active) {
      const n = data!.brandConfig!.brandName || ''
      const l = data!.brandConfig!.logoImageUrl ? resolveStorageUrl(data!.brandConfig!.logoImageUrl) : ''
      setCachedName(n)
      setCachedLogo(l)
      try { localStorage.setItem(BRAND_DISPLAY_CACHE_KEY, JSON.stringify({ n, l })) } catch {}
    } else {
      setCachedName('')
      setCachedLogo('')
      try { localStorage.removeItem(BRAND_DISPLAY_CACHE_KEY) } catch {}
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const active = isConfigActive(config)
  const resolvedLogoUrl = active && config?.brandConfig?.logoImageUrl
    ? resolveStorageUrl(config.brandConfig.logoImageUrl)
    : ''
  const resolvedBrandName = active && config?.brandConfig?.brandName
    ? config.brandConfig.brandName
    : ''

  // Show cached values during initial load to prevent flash
  const logoUrl = loading ? cachedLogo : resolvedLogoUrl
  const brandName = loading ? cachedName : resolvedBrandName

  return (
    <BrandContext.Provider value={{ config, loading, logoUrl, brandName, refresh: load }}>
      <BrandApplier config={config} loading={loading} />
      {children}
    </BrandContext.Provider>
  )
}
