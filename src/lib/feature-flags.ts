export function isCurrencyFeatureEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_CURRENCY_FEATURE === 'true') return true
  if (typeof window === 'undefined') return false
  return window.location.hostname.endsWith('.please-payment.com')
}
