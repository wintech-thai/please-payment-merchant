'use client'

import { useState } from 'react'

const FIAT_COUNTRY: Record<string, string> = {
  THB: 'th',
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  JPY: 'jp',
  SGD: 'sg',
  CNY: 'cn',
}

function iconUrl(code: string, category?: string | null): string | null {
  const upper = code.toUpperCase()
  if (category?.toUpperCase() === 'CRYPTO') {
    return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${upper.toLowerCase()}.png`
  }
  const country = FIAT_COUNTRY[upper]
  return country ? `https://flagcdn.com/32x24/${country}.png` : null
}

export default function CurrencyLogo({ code, category, size = 24 }: { code?: string | null; category?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const c = code ?? '?'
  const url = !failed ? iconUrl(c, category) : null

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={c}
        className="rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0 bg-white"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className="rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center flex-shrink-0 ring-1 ring-primary-200"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {c.slice(0, 2).toUpperCase()}
    </span>
  )
}
