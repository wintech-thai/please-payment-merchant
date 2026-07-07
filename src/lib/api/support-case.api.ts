import { client } from '@/lib/axios'

export interface SupportCaseItem {
  id?: string
  orgId?: string
  ref?: string
  subject?: string
  priority?: string
  status?: string
  description?: string
  createdBy?: string
  createdDate?: string
  updatedBy?: string
  updatedDate?: string
  closedBy?: string
  closedDate?: string
}

export interface SupportCaseCommentItem {
  id?: string
  caseId?: string
  orgId?: string
  content?: string
  authorType?: string
  createdBy?: string
  createdDate?: string
}

export interface GetCasesPayload {
  FullTextSearch?: string
  Status?: string
  Priority?: string
  Limit?: number
  Offset?: number
  FromDate?: string
  ToDate?: string
}

function getBase() {
  if (typeof window === 'undefined') return '/api/CaseManagement/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/CaseManagement/org/${orgId}/action`
}

export const supportCaseApi = {
  getCases: (payload: GetCasesPayload = {}) =>
    client.post<SupportCaseItem[]>(`${getBase()}/GetCases`, payload),

  getCaseCount: (payload: GetCasesPayload = {}) =>
    client.post<number>(`${getBase()}/GetCaseCount`, payload),

  getCaseById: (caseId: string) =>
    client.get<{ status: string; description: string; caseManagement: SupportCaseItem }>(`${getBase()}/GetCaseById/${caseId}`),

  addCase: (payload: { Subject: string; Priority: string; Description: string }) =>
    client.post<{ status: string; description: string; caseManagement: SupportCaseItem }>(`${getBase()}/AddCase`, payload),

  addComment: (caseId: string, content: string) =>
    client.post(`${getBase()}/AddComment/${caseId}`, { Content: content }),

  getComments: (caseId: string) =>
    client.get<{ status: string; comments: SupportCaseCommentItem[] }>(`${getBase()}/GetComments/${caseId}`),
}
