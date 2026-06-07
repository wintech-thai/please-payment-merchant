import { client } from '@/lib/axios'
import type { PayInTxItem, PayInTxDetail, PaymentTxJob, GetPayInTxPayload } from './types'

function getBase() {
  if (typeof window === 'undefined') return '/api/PaymentTransaction/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/PaymentTransaction/org/${orgId}/action`
}

export const paymentTxApi = {
  getPayInTransactions: (payload: GetPayInTxPayload = {}) =>
    client.post<{ payInTransactions: PayInTxItem[] }>(`${getBase()}/GetPaymentTransactions`, payload),

  getPayInTransactionCount: (payload: GetPayInTxPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPaymentTransactionCount`, payload),

  getPaymentTransactionById: (id: string) =>
    client.get<{ paymentTransaction: PayInTxDetail }>(`${getBase()}/GetPaymentTransactionById/${id}`),

  getPaymentTransactionJobById: (pmtId: string, jobId: string) =>
    client.get<PaymentTxJob>(`${getBase()}/GetPaymentTransactionJobById/${pmtId}/${jobId}`),
}
