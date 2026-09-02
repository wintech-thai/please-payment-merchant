'use client'
// trigger rebuild

import { useState } from 'react'
import { ShieldAlert, ChevronDown, ArrowRightLeft } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function DetailRow({ label, value, fallback }: { label: string; value?: string; fallback: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
      <span className="text-xs font-medium text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs font-mono text-gray-700 text-right break-all">{value || fallback}</span>
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
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-red-100/60 border border-gray-100 overflow-hidden">
        <div className="px-8 pt-9 pb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1.5">{b.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{b.description}</p>
        </div>

        <div className="border-t border-gray-100">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between px-8 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {b.viewDetails}
            <ChevronDown className={clsx('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
          </button>

          {expanded && (
            <div className="px-8 pb-5 space-y-2">
              <DetailRow label={b.clientIpLabel} value={clientIp} fallback={b.noneLabel} />
              <DetailRow label={b.whitelistLabel} value={whitelistIps} fallback={b.noneLabel} />
              <DetailRow label={b.blacklistLabel} value={blacklistIps} fallback={b.noneLabel} />
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
          <ArrowRightLeft className="w-3.5 h-3.5 flex-shrink-0" />
          {b.switchMerchantHint}
        </div>
      </div>
    </div>
  )
}
