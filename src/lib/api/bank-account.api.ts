import { client } from '@/lib/axios'
import type { BankAccountItem, GetBankAccountsPayload } from './types'

function getBase(orgId?: string) {
  const id = orgId ?? (typeof window !== 'undefined' ? localStorage.getItem('orgId') || 'temp' : 'temp')
  return `/api/BankAccount/org/${id}/action`
}

function normalize(raw: any): { bankAccounts: BankAccountItem[] } {
  const items: any[] = Array.isArray(raw) ? raw : (raw?.bankAccounts ?? raw?.items ?? [])
  return {
    bankAccounts: items.map(item => ({
      ...item,
      accountId: item.accountId ?? item.bankAccountId ?? item.id ?? '',
      status: item.status ?? item.bankAccountStatus ?? null,
    })),
  }
}

export const bankAccountApi = {
  getBankAccounts: async (payload: GetBankAccountsPayload = {}, orgId?: string) => {
    const res = await client.get<any>(`${getBase(orgId)}/GetPayInBankAccountsForMerchant`)
    return { ...res, data: normalize(res.data) }
  },

  getPayOutBankAccounts: async (orgId?: string) => {
    const res = await client.get<any>(`${getBase(orgId)}/GetPayOutBankAccountsForMerchant`)
    return { ...res, data: normalize(res.data) }
  },
}
