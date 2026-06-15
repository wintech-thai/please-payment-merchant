import { client } from '@/lib/axios'

function getOrgId() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('orgId') || ''
}

export interface GetSummaryPayload {
  FromDate?: string
  ToDate?: string
}

export interface MerchantDailySummaryItem {
  date?: string | null
  merchantCode?: string | null
  payInAmount?: number | null
  payOutAmount?: number | null
  payInFee?: number | null
  payOutFee?: number | null
  // will be available after backend adds count to query
  payInCount?: number | null
  payOutCount?: number | null
}

export interface MerchantOverviewSummary {
  // totals — from RevenueSummary (C# camelCase serialized)
  totalPayInAmount?: number | null
  totalPayOutAmount?: number | null
  totalPayInFee?: number | null
  totalPayOutFee?: number | null
  // daily breakdown embedded in response
  dailyMerchantRevenue?: MerchantDailySummaryItem[]
  totalPayInCount?: number | null
  totalPayOutCount?: number | null
}

export const summaryApi = {
  getMerchantSummary: (payload: GetSummaryPayload = {}) => {
    const orgId = getOrgId()
    return client.post<MerchantOverviewSummary>(
      `/api/Summary/org/${orgId}/action/GetMerchantSummary`,
      payload
    )
  },
}
