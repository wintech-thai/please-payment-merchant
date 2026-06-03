const STORAGE_BASE =
  process.env.NEXT_PUBLIC_STORAGE_API_BASE || 'https://storage-api.please-payment.com'

export function resolveStorageUrl(url: string): string {
  if (!url) return ''
  return url.replace('<STORAGE-API-BASE>', STORAGE_BASE)
}
