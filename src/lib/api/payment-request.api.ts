import { client } from '@/lib/axios'
import type {
  PayInRequestItem,
  PayInRequestDetail,
  GetPayInRequestsPayload,
  PayOutRequestItem,
  PayOutRequestDetail,
  GetPayOutRequestsPayload,
} from './types'

function getBase() {
  if (typeof window === 'undefined') return '/api/PaymentRequest/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/PaymentRequest/org/${orgId}/action`
}

export const paymentRequestApi = {
  // ── Pay-In ────────────────────────────────────────────────────────────────
  getPayInRequests: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayInRequestItem[] }>(`${getBase()}/GetPayInRequests`, payload),

  getPayInRequestCount: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPayInRequestCount`, payload),

  getPaymentRequestById: (id: string) =>
    client.get<{ paymentRequest: PayInRequestDetail }>(`${getBase()}/GetPaymentRequestById/${id}`),

  // ── Pay-Out ───────────────────────────────────────────────────────────────
  getPayOutRequests: (payload: GetPayOutRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayOutRequestItem[] }>(`${getBase()}/GetPayOutRequests`, payload),

  getPayOutRequestCount: (payload: GetPayOutRequestsPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPayOutRequestCount`, payload),

  getPayOutRequestById: (id: string) =>
    client.get<{ paymentRequest: PayOutRequestDetail }>(`${getBase()}/GetPayOutRequestById/${id}`),
}
