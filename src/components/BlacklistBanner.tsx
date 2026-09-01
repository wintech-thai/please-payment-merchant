'use client'

import { ShieldAlert } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'

function Row({ label, value, fallback }: { label: string; value?: string; fallback: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-mono text-xs text-right break-all">{value || fallback}</span>
    </div>
  )
}

export function BlacklistBanner({
  clientIp,
  whitelistIps,
  blacklistIps,
}: {
  clientIp?: string
  whitelistIps?: string
  blacklistIps?: string
}) {
  const { t } = useLang()
  const b = t.blacklist

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-lg w-full border-2 border-red-300 bg-red-50 rounded-2xl p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-red-700 mb-1">{b.title}</h2>
        <p className="text-sm text-red-600 mb-4">{b.description}</p>
        <div className="bg-white rounded-lg border border-red-200 divide-y divide-red-100 text-left text-sm">
          <Row label={b.clientIpLabel} value={clientIp} fallback={b.noneLabel} />
          <Row label={b.whitelistLabel} value={whitelistIps} fallback={b.noneLabel} />
          <Row label={b.blacklistLabel} value={blacklistIps} fallback={b.noneLabel} />
        </div>
        <p className="text-xs text-gray-500 mt-4">{b.switchMerchantHint}</p>
      </div>
    </div>
  )
}
