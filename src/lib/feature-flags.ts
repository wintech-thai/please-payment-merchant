export function isCurrencyFeatureEnabled(): boolean {
  // x089 ปรับแก้ 10: crypto hidden everywhere for now — revert to the lines below to bring it back
  return false
  // if (process.env.NEXT_PUBLIC_ENABLE_CURRENCY_FEATURE === 'true') return true
  // if (typeof window === 'undefined') return false
  // return window.location.hostname.endsWith('.please-payment.com')
}
