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
  PaymentTxJob,
  SubmitPaymentRequestPayload,
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

  // ── Pay-In create / approve / reject — เฉพาะ merchant ที่เป็น MerchantOwn เท่านั้น ────
  submitPayInRequest: (merchantId: string, payload: SubmitPaymentRequestPayload & { PayerName?: string }) =>
    client.post(`${getBase()}/SubmitPayInRequest/${merchantId}`, payload),

  submitPayInRequestP2P: (merchantId: string, payload: { RefId1?: string; RefId2?: string; RefId3?: string; Currency?: string; RequestedAmount: number; QrProvider?: string; PayerName?: string }) =>
    client.post(`${getBase()}/SubmitPayInRequestP2P/${merchantId}`, payload),

  createPaymentTxByPayInRequestId: (id: string, payload?: { StatusReason?: string; StatusCode?: string }) =>
    client.post(`/api/PaymentTransaction/org/${typeof window !== 'undefined' ? (localStorage.getItem('orgId') || 'temp') : 'temp'}/action/CreatePaymentTxByPayInRequestId/${id}`, payload ?? {}),

  rejectPendingPayInRequestById: (id: string, reason: string, rejectStatusCode?: string) =>
    client.post(`${getBase()}/RejectPendingPayInRequestById/${id}`, { StatusReason: reason, StatusCode: rejectStatusCode }),

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

  getPaymentRequestJobById: (pmtId: string, jobId: string) =>
    client.get<PaymentTxJob>(`${getBase()}/GetPaymentRequestJobById/${pmtId}/${jobId}`),

  getPaymentRequestJobByRefId: (pmtId: string) =>
    client.get<PaymentTxJob>(`${getBase()}/GetPaymentRequestJobByRefId/${pmtId}`),

  getPayInSlipUploads: (paymentRequestId: string) =>
    client.get(`${getBase()}/GetPayInSlipUpload/${paymentRequestId}`),

  generatePayInSlipUploadToken: (paymentRequestId: string) =>
    client.get(`${getBase()}/GeneratePayInSlipUploadToken/${paymentRequestId}`),

  generatePayInStatusToken: (paymentRequestId: string) =>
    client.get(`${getBase()}/GeneratePayInStatusToken/${paymentRequestId}`),

  getPayInInfoBySlipToken: (orgId: string, paymentRequestId: string, token: string) =>
    client.get(`/api/PaymentRequest/org/${orgId}/action/GetPayInInfoBySlipToken/${paymentRequestId}/${token}`),

  getPayOutSlipUploads: (paymentRequestId: string) =>
    client.get(`${getBase()}/GetPayOutSlipUpload/${paymentRequestId}`),

  generatePayOutSlipUploadToken: (paymentRequestId: string) =>
    client.get(`${getBase()}/GeneratePayOutSlipUploadToken/${paymentRequestId}`),
}
