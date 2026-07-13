let isRefreshing = false
let queue: Array<() => void> = []

async function refreshToken(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => { queue.push(() => resolve(true)) })
  }
  isRefreshing = true
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' })
    if (!res.ok) return false
    const data = await res.json()
    const newToken: string = data.accessToken
    if (!newToken) return false
    localStorage.setItem('accessToken', newToken)
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
    document.cookie = `accessToken=${newToken}; path=/; max-age=86400; SameSite=Lax`
    if (data.refreshToken) document.cookie = `refreshToken=${data.refreshToken}; path=/; max-age=604800; SameSite=Lax`
    queue.forEach((fn) => fn())
    return true
  } catch {
    return false
  } finally {
    isRefreshing = false
    queue = []
  }
}

function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // Proactive refresh: if token expires within 10 seconds, refresh before sending
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const exp = getTokenExpiry(token)
      if (exp !== null && exp - Math.floor(Date.now() / 1000) < 10) {
        await refreshToken()
      }
    }
  }

  const res = await fetch(url, options)
  if (res.status !== 401) return res

  const ok = await refreshToken()
  if (!ok) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired')
  }

  return fetch(url, options)
}
