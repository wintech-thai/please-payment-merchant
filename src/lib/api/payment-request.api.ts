import { client } from '@/lib/axios'
import type {
  PayInRequestItem,
  PayInRequestDetail,
  GetPayInRequestsPayload,
  PayOutRequestItem,
  PayOutRequestDetail,
  GetPayOutRequestsPayload,
  CreatePayOutRequestPayload,
  UpdatePayOutRequestPayload,
} from './types'

function getBase() {
  if (typeof window === 'undefined') return '/api/PaymentRequest/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/PaymentRequest/org/${orgId}/action`
}

export const paymentRequestApi = {
  // ── Pay-In ────────────────────────────────────────────────────────────────
  getPayInRequests: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayInRequestItem[] }>(`${getBase()}/GetPaymentRequests`, payload),

  getPayInRequestCount: (payload: GetPayInRequestsPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPaymentRequestCount`, payload),

  getPaymentRequestById: (id: string) =>
    client.get<{ paymentRequest: PayInRequestDetail }>(`${getBase()}/GetPaymentRequestById/${id}`),

  // ── Pay-Out ───────────────────────────────────────────────────────────────
  getPayOutRequests: (payload: GetPayOutRequestsPayload = {}) =>
    client.post<{ paymentRequests: PayOutRequestItem[] }>(`${getBase()}/GetPaymentRequests`, payload),

  getPayOutRequestCount: (payload: GetPayOutRequestsPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPaymentRequestCount`, payload),

  getPayOutRequestById: (id: string) =>
    client.get<{ paymentRequest: PayOutRequestDetail }>(`${getBase()}/GetPayOutRequestById/${id}`),

  createPayOutRequest: (payload: CreatePayOutRequestPayload) =>
    client.post<{ status: string; description: string }>(`${getBase()}/CreatePayOutRequest`, payload),

  updatePayOutRequestById: (id: string, payload: UpdatePayOutRequestPayload) =>
    client.post<{ status: string; description: string }>(`${getBase()}/UpdatePayOutRequestById/${id}`, payload),

  deletePayOutRequestById: (id: string) =>
    client.post<{ status: string; description: string }>(`${getBase()}/DeletePayOutRequestById/${id}`, {}),
}
