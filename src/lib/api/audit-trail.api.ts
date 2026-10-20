import { client } from '@/lib/axios'

export type AuditTrack = {
  id?: string | null
  orgId?: string | null
  trackModel?: string | null
  rowId?: string | null
  actionName?: string | null
  actionRequested?: string | null
  actionBy?: string | null
  ipAddress?: string | null
  ipAddress2?: string | null
  oldValue?: string | null
  newValue?: string | null
  apiName?: string | null
  createdDate?: string | null
}

function getBase() {
  if (typeof window === 'undefined') return '/api/AuditTrail/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/AuditTrail/org/${orgId}/action`
}

export const auditTrailApi = {
  // x088: merchant ดู audit trail ได้เฉพาะของ org ตัวเองเท่านั้น (API ฝั่ง OrgUser กรอง OrgId ให้อีกชั้นด้วย)
  getByRowId: (rowId: string) =>
    client.get<AuditTrack[]>(`${getBase()}/GetAuditTrailByRowId/${rowId}`),
}
