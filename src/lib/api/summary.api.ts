import { client } from '@/lib/axios'

function getOrgId() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('orgId') || ''
}

export interface GetSummaryPayload {
  FromDate?: string
  ToDate?: string
}

export interface MerchantOverviewSummary {
  payInCount?: number | null
  payInAmount?: number | null
  payInFee?: number | null
  payOutCount?: number | null
  payOutAmount?: number | null
  payOutFee?: number | null
  walletBalance?: number | null
  walletBalanceDecimal?: number | null
  // alternative field names
  totalPayInAmount?: number | null
  totalPayOutAmount?: number | null
  totalPayInFee?: number | null
  totalPayOutFee?: number | null
  totalPayInCount?: number | null
  totalPayOutCount?: number | null
}

export const summaryApi = {
  getSummary: (payload: GetSummaryPayload = {}) => {
    const orgId = getOrgId()
    return client.post<MerchantOverviewSummary>(
      `/api/MerchantSummary/org/${orgId}/action/GetSummary`,
      payload
    )
  },
}
