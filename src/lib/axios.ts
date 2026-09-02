import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'sonner'

const API_URL = '/api/proxy'

// Blacklist-block responses (422) carry extra fields beyond description/message —
// surface them in the error text so support/dev can immediately see what IP the API
// resolved and what the whitelist/blacklist config contains, without needing backend
// log access when a merchant reports being blocked.
function buildApiErrorMessage(errorData: unknown): string | undefined {
  if (typeof errorData === 'string') return errorData
  if (typeof errorData !== 'object' || errorData === null) return undefined

  const d = errorData as Record<string, unknown>
  const base = (d.description as string | undefined) || (d.message as string | undefined)

  const clientIp = d.clientIp as string | undefined
  const whitelistIps = d.whitelistIps as string | undefined
  const blacklistIps = d.blacklistIps as string | undefined
  if (clientIp !== undefined || whitelistIps !== undefined || blacklistIps !== undefined) {
    const details = `Client IP: ${clientIp || '-'} | Whitelist: ${whitelistIps || '-'} | Blacklist: ${blacklistIps || '-'}`
    return base ? `${base} (${details})` : details
  }

  return base
}

export const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let activeRefreshPromise: Promise<string | null> | null = null
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token!)
  })
  failedQueue = []
}

// Shared refresh — concurrent callers reuse the same promise
async function refreshTokenOnce(): Promise<string | null> {
  if (activeRefreshPromise) return activeRefreshPromise
  isRefreshing = true
  activeRefreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (!res.ok) throw new Error('Refresh failed')
      const data = await res.json()
      const newAccessToken: string = data.accessToken
      const newRefreshToken: string | undefined = data.refreshToken
      if (!newAccessToken) throw new Error('No access token in refresh response')
      localStorage.setItem('accessToken', newAccessToken)
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken)
      setAuthCookies(newAccessToken, newRefreshToken)
      processQueue(null, newAccessToken)
      return newAccessToken
    } catch (err) {
      processQueue(err, null)
      return null
    } finally {
      isRefreshing = false
      activeRefreshPromise = null
    }
  })()
  return activeRefreshPromise
}

// Decode the JWT exp claim (token is stored as a raw JWT in localStorage)
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

const encodeBase64 = (str: string): string => {
  try {
    if (typeof window !== 'undefined' && window.btoa) return window.btoa(str)
    return Buffer.from(str).toString('base64')
  } catch {
    return str
  }
}

export const setAuthCookies = (accessToken: string, refreshToken?: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`
  if (refreshToken) {
    document.cookie = `refreshToken=${refreshToken}; path=/; max-age=604800; SameSite=Lax`
  }
}

export const clearAuthData = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('username')
  localStorage.removeItem('userId')
  localStorage.removeItem('orgId')
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'user_name=; path=/; max-age=0; SameSite=Lax'
  document.cookie = 'orgId=; path=/; max-age=0; SameSite=Lax'
}

// Request interceptor — proactively refresh if token expires within 10s, then attach header
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window === 'undefined') return config
    const url = config.url?.toLowerCase() || ''
    if (url.includes('login')) return config

    // If a refresh is already running, wait for it before attaching header
    if (isRefreshing && activeRefreshPromise) {
      const freshToken = await activeRefreshPromise.catch(() => null)
      const tokenToUse = freshToken ?? localStorage.getItem('accessToken')
      if (tokenToUse && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${encodeBase64(tokenToUse)}`
      }
      return config
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return config

    // Proactive refresh: token expires within 10 seconds → refresh first
    const exp = getTokenExpiry(token)
    if (exp !== null && exp - Math.floor(Date.now() / 1000) < 10) {
      const freshToken = await refreshTokenOnce().catch(() => null)
      if (config.headers) {
        config.headers.Authorization = `Bearer ${encodeBase64(freshToken ?? token)}`
      }
      return config
    }

    if (config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${encodeBase64(token)}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — validate status field
client.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data
    if (!data) return response

    const { status, description, message } = data
    if (status === undefined || status === null) return response

    // Only treat as an API envelope when status is a known short code.
    // Job / task responses carry their own status field ("Done", "Processing", etc.)
    // and must NOT be intercepted here.
    const API_ENVELOPE_STATUSES = new Set([
      'OK', 'SUCCESS', 'ERROR', 'FAILED', 'UNAUTHORIZED',
      'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'BAD_REQUEST',
      'INTERNAL_SERVER_ERROR',
    ])
    const statusUpper = typeof status === 'string' ? status.toUpperCase().replace(/\s+/g, '_') : ''

    // Screaming-snake-case strings (e.g. ACCOUNT_NUMBER_DUPLICATE, ERROR_TOKEN_EXPIRED)
    // are always API envelope statuses. Mixed-case job statuses (Done, Processing, Pending)
    // are NOT envelopes and must pass through untouched.
    const isScreamingCase = typeof status === 'string' && /^[A-Z][A-Z0-9_]*$/.test(status)

    const isEnvelopeStatus =
      isScreamingCase ||
      API_ENVELOPE_STATUSES.has(statusUpper) ||
      statusUpper.startsWith('ERROR_') ||
      statusUpper.startsWith('FAILED_')

    if (!isEnvelopeStatus) return response // not an API envelope — pass through

    const isSuccess = statusUpper === 'OK' || statusUpper === 'SUCCESS'

    if (!isSuccess) {
      const errorMsg = description || message || `Operation failed: ${statusUpper}`
      return Promise.reject(new AxiosError(errorMsg, statusUpper, response.config, response.request, response))
    }

    return response
  },

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
      _retryCount?: number
    }
    const errorResponse = error.response
    const errorData = errorResponse?.data as Record<string, unknown> | string | undefined
    const status = errorResponse?.status
    const url = originalRequest?.url?.toLowerCase() || ''
    const isPublicPath = url.includes('login')

    // Rate limit retry with backoff
    if (status === 429) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
      if (originalRequest._retryCount <= 3) {
        const waitTime = originalRequest._retryCount * 1000
        return new Promise((resolve) => setTimeout(() => resolve(client(originalRequest)), waitTime))
      }
      toast.error('Too many requests. Please wait.')
      return Promise.reject(error)
    }

    if (isPublicPath) return Promise.reject(error)

    if (status === 403) {
      const apiPath = originalRequest?.url || 'unknown endpoint'
      return Promise.reject(new AxiosError(
        `Access denied (403 Forbidden) — ${apiPath}`,
        'FORBIDDEN',
        originalRequest,
        error.request,
        errorResponse
      ))
    }

    const rawStr = typeof errorData === 'string' ? errorData
      : typeof (errorData as Record<string, unknown>)?.raw === 'string' ? (errorData as Record<string, unknown>).raw as string
      : ''

    const isTokenExpired =
      status === 401 ||
      error.code === 'ERROR_TOKEN_EXPIRED' ||
      rawStr.includes('IDX10223') ||
      rawStr.includes('expired')

    if (!isTokenExpired || !originalRequest || originalRequest._retry) {
      const apiMessage = buildApiErrorMessage(errorData)
      if (apiMessage) {
        return Promise.reject(new AxiosError(apiMessage, String(status ?? ''), originalRequest, error.request, errorResponse))
      }
      return Promise.reject(error)
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing && activeRefreshPromise) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${encodeBase64(token)}`
        }
        return client(originalRequest)
      })
    }

    originalRequest._retry = true

    const newAccessToken = await refreshTokenOnce()
    if (!newAccessToken) {
      clearAuthData()
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(new Error('Session expired'))
    }

    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${encodeBase64(newAccessToken)}`
    }
    return client(originalRequest)
  }
)
