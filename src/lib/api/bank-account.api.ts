import { client } from '@/lib/axios'
import type { BankAccountItem, BankItem, GetBankAccountsPayload, AddBankAccountPayload, UpdateBankAccountPayload } from './types'

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
  getAvailableSupportQrBanks: (orgId?: string) =>
    client.get<{ banks: BankItem[] }>(`${getBase(orgId)}/GetAvailableSupportQrBanks`),

  getBankAccounts: async (payload: GetBankAccountsPayload = {}, orgId?: string) => {
    const res = await client.get<any>(`${getBase(orgId)}/GetPayInBankAccountsForMerchant`)
    return { ...res, data: normalize(res.data) }
  },

  getPayOutBankAccounts: async (orgId?: string) => {
    const res = await client.get<any>(`${getBase(orgId)}/GetPayOutBankAccountsForMerchant`)
    return { ...res, data: normalize(res.data) }
  },

  // Bank accounts actually linked to the current merchant (richer shape incl. balance), for the Bank Accounts menu
  getMyBankAccounts: async (orgId?: string) => {
    const res = await client.get<any>(`${getBase(orgId)}/GetMyBankAccounts`)
    return { ...res, data: normalize(res.data) }
  },

  getMyBankAccountById: (bankAccountId: string, orgId?: string) =>
    client.get(`${getBase(orgId)}/GetMyBankAccountById/${bankAccountId}`),

  getMyBankAccountWallet: (bankAccountId: string, orgId?: string) =>
    client.get(`${getBase(orgId)}/GetMyBankAccountWallet/${bankAccountId}`),

  getMyBankAccountWalletTxs: (bankAccountId: string, payload: { FromDate?: string; ToDate?: string; Offset?: number; Limit?: number } = {}, orgId?: string) =>
    client.post(`${getBase(orgId)}/GetMyBankAccountWalletTxs/${bankAccountId}`, payload),

  getMyBankAccountWalletTxsCount: (bankAccountId: string, payload: { FromDate?: string; ToDate?: string } = {}, orgId?: string) =>
    client.post(`${getBase(orgId)}/GetMyBankAccountWalletTxsCount/${bankAccountId}`, payload),

  // ── Pay-Out bank accounts — เฉพาะ merchant แบบ MerchantOwn เท่านั้นที่จัดการได้เอง ──
  getAvailableBanks: (orgId?: string) =>
    client.get<{ banks: BankItem[] }>(`${getBase(orgId)}/GetAvailableBanks`),

  getMyPayOutBankAccounts: async (orgId?: string) => {
    const res = await client.post<any>(`${getBase(orgId)}/GetMyPayOutBankAccounts`, { Limit: 200 })
    return { ...res, data: normalize(res.data) }
  },

  getMyPayOutBankAccountById: (bankAccountId: string, orgId?: string) =>
    client.get<{ bankAccount: BankAccountItem }>(`${getBase(orgId)}/GetMyPayOutBankAccountById/${bankAccountId}`),

  addPayOutBankAccount: (payload: AddBankAccountPayload, orgId?: string) =>
    client.post(`${getBase(orgId)}/AddPayOutBankAccount`, payload),

  updatePayOutBankAccountById: (bankAccountId: string, payload: UpdateBankAccountPayload, orgId?: string) =>
    client.post(`${getBase(orgId)}/UpdatePayOutBankAccountById/${bankAccountId}`, payload),

  enablePayOutBankAccountById: (bankAccountId: string, orgId?: string) =>
    client.post(`${getBase(orgId)}/EnableMyPayOutBankAccountById/${bankAccountId}`, {}),

  disablePayOutBankAccountById: (bankAccountId: string, orgId?: string) =>
    client.post(`${getBase(orgId)}/DisableMyPayOutBankAccountById/${bankAccountId}`, {}),

  deletePayOutBankAccountById: (bankAccountId: string, orgId?: string) =>
    client.post(`${getBase(orgId)}/DeleteMyPayOutBankAccountById/${bankAccountId}`, {}),
}
