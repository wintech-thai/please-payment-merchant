import { client } from '@/lib/axios'
import type {
  PayInSlipItem,
  PayInSlipDetail,
  GetPayInDocumentsPayload,
  GetPresignedUrlPayload,
  AddPayInDocumentPayload,
  UpdatePayInDocumentPayload,
} from './types'

function getBase() {
  if (typeof window === 'undefined') return '/api/PaymentDocument/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/PaymentDocument/org/${orgId}/action`
}

export const paymentSlipApi = {
  getPayInDocuments: (payload: GetPayInDocumentsPayload = {}) =>
    client.post<{ payInDocuments: PayInSlipItem[] }>(`${getBase()}/GetPaymentDocuments`, payload),

  getPayInDocumentCount: (payload: GetPayInDocumentsPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPaymentDocumentCount`, payload),

  getPayInDocumentById: (id: string) =>
    client.get<{ payInDocument: PayInSlipDetail }>(`${getBase()}/GetPaymentDocumentById/${id}`),

  getPresignedUrl: (payload: GetPresignedUrlPayload) =>
    client.post<{ presignedUrl: string; filePath: string }>(`${getBase()}/GetPresignedUrl`, payload),

  addPayInDocument: (payload: AddPayInDocumentPayload) =>
    client.post<{ status: string; description: string }>(`${getBase()}/AddPaymentDocument`, payload),

  updatePayInDocument: (id: string, payload: UpdatePayInDocumentPayload) =>
    client.post<{ status: string; description: string }>(`${getBase()}/UpdatePaymentDocumentById/${id}`, payload),
}
