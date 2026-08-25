import { client } from '@/lib/axios'

export type AuditNotice = {
  id?: string | null
  orgId?: string | null
  trackModel?: string | null
  rowId?: string | null
  message?: string | null
  createdDate?: string | null
}

function getBase() {
  if (typeof window === 'undefined') return '/api/AuditNotice/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/AuditNotice/org/${orgId}/action`
}

export const auditNoticeApi = {
  getByRowId: (rowId: string) =>
    client.get<AuditNotice[]>(`${getBase()}/GetAuditNoticesByRowId/${rowId}`),
}
