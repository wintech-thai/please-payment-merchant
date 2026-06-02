import { client } from '@/lib/axios'
import type { PayInTxItem, PayInTxDetail, PaymentTxJob, GetPayInTxPayload } from './types'

function getBase() {
  if (typeof window === 'undefined') return '/api/PaymentTx/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/PaymentTx/org/${orgId}/action`
}

export const paymentTxApi = {
  getPayInTransactions: (payload: GetPayInTxPayload = {}) =>
    client.post<{ payInTransactions: PayInTxItem[] }>(`${getBase()}/GetPayInTransactions`, payload),

  getPayInTransactionCount: (payload: GetPayInTxPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPayInTransactionCount`, payload),

  getPaymentTransactionById: (id: string) =>
    client.get<{ paymentTransaction: PayInTxDetail }>(`${getBase()}/GetPaymentTransactionById/${id}`),

  getPaymentTransactionJobById: (pmtId: string, jobId: string) =>
    client.get<PaymentTxJob>(`${getBase()}/GetPaymentTransactionJobById/${pmtId}/${jobId}`),
}
