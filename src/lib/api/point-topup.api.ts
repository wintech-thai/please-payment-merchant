import { client } from '@/lib/axios'
import type { PurchaseCashItem, PurchaseCashResult } from './types'

function getOrgId() {
  if (typeof window === 'undefined') return 'temp'
  return localStorage.getItem('orgId') || 'temp'
}

export interface GetPurchaseCashesPayload {
  FullTextSearch?: string
  DocumentStatus?: string
  Offset?: number
  Limit?: number
  FromDate?: string
  ToDate?: string
}

export const pointTopUpApi = {
  createPointTopUp: (amount: number) => {
    const orgId = getOrgId()
    return client.post<PurchaseCashResult>(`/api/PointTopUp/org/${orgId}/action/CreatePointTopUp`, { Amount: amount })
  },

  getPurchaseCashes: (payload: GetPurchaseCashesPayload = {}) => {
    const orgId = getOrgId()
    return client.post<PurchaseCashItem[]>(`/api/AccountDoc/org/${orgId}/action/GetAccountDocPurchaseCashes`, payload)
  },

  getPurchaseCashCount: (payload: GetPurchaseCashesPayload = {}) => {
    const orgId = getOrgId()
    return client.post<number>(`/api/AccountDoc/org/${orgId}/action/GetAccountDocPurchaseCashCount`, payload)
  },

  getPurchaseCashById: (id: string) => {
    const orgId = getOrgId()
    return client.get<PurchaseCashResult>(`/api/AccountDoc/org/${orgId}/action/GetAccountDocById/${id}`)
  },
}
