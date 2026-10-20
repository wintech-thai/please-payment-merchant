'use client'

import clsx from 'clsx'

export default function CustodyTypeBadge({
  custodyType,
  platformLabel,
  merchantLabel,
}: {
  custodyType?: string | null
  platformLabel: string
  merchantLabel: string
}) {
  const isMerchantOwn = custodyType === 'MerchantOwn'
  return (
    <span
      title={isMerchantOwn ? merchantLabel : platformLabel}
      className={clsx(
        'inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ring-1 cursor-help flex-shrink-0',
        isMerchantOwn ? 'bg-orange-50 text-orange-700 ring-orange-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
      )}
    >
      {isMerchantOwn ? 'M' : 'P'}
    </span>
  )
}
