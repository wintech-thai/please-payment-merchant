function getStorageBase(): string {
  if (process.env.NEXT_PUBLIC_STORAGE_API_BASE) {
    return process.env.NEXT_PUBLIC_STORAGE_API_BASE
  }
  if (typeof window === 'undefined') {
    return 'https://storage-api.please-payment.com'
  }
  const origin = window.location.origin
  const replaced = origin.replace(/^(https?:\/\/)[^.]+\./, '$1storage-api.')
  return replaced !== origin ? replaced : 'https://storage-api.please-payment.com'
}

export function resolveStorageUrl(url: string): string {
  if (!url) return ''
  return url.replace('<STORAGE-API-BASE>', getStorageBase())
}
