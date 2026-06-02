import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { toast } from 'sonner'

const API_URL = '/api/proxy'

export const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
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

// Request interceptor — base64 encode token from localStorage
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      const url = config.url?.toLowerCase() || ''
      const isPublicPath = url.includes('login')

      if (token && config.headers && !isPublicPath && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${encodeBase64(token)}`
      }
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
      const apiMessage =
        typeof errorData === 'object' && errorData !== null
          ? ((errorData as Record<string, unknown>).description as string | undefined) ||
            ((errorData as Record<string, unknown>).message as string | undefined)
          : typeof errorData === 'string' ? errorData : undefined
      if (apiMessage) {
        return Promise.reject(new AxiosError(apiMessage, String(status ?? ''), originalRequest, error.request, errorResponse))
      }
      return Promise.reject(error)
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing) {
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
    isRefreshing = true

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

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${encodeBase64(newAccessToken)}`
      }

      return client(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAuthData()
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
