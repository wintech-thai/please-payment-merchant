import { client } from '@/lib/axios'
import type { PayInTxItem, PayInTxDetail, PayOutTxItem, PaymentTxJob, GetPayInTxPayload, GetPayOutTxPayload } from './types'

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

  getPayOutTransactions: (payload: GetPayOutTxPayload = {}) =>
    client.post<{ payOutTransactions: PayOutTxItem[] }>(`${getBase()}/GetPaymentTransactions`, { ...payload, Direction: 'PayOut' }),

  getPayOutTransactionCount: (payload: GetPayOutTxPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetPaymentTransactionCount`, { ...payload, Direction: 'PayOut' }),

  getPaymentTransactionById: (id: string) =>
    client.get<{ paymentTransaction: PayInTxDetail }>(`${getBase()}/GetPaymentTransactionById/${id}`),

  getPaymentTransactionJobById: (pmtId: string, jobId: string) =>
    client.get<PaymentTxJob>(`${getBase()}/GetPaymentTransactionJobById/${pmtId}/${jobId}`),

  // x088: merchant แบบ MerchantOwn เท่านั้นที่ API ฝั่งนี้จะยอมให้เรียกได้ (เช็คที่ API อีกชั้นด้วย)
  approveUnidentifiedPaymentTx: (pmtId: string) =>
    client.post(`${getBase()}/ApproveUnidentifiedPaymentTx/${pmtId}`, null),

  rejectUnidentifiedPaymentTx: (pmtId: string, statusReason: string) =>
    client.post(`${getBase()}/RejectUnidentifiedPaymentTx/${pmtId}`, { StatusReason: statusReason }),
}
