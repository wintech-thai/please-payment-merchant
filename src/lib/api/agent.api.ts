import { client } from '@/lib/axios'
import type { AgentItem, GetAgentsPayload, AgentEventItem, GetAgentEventsPayload } from './types'

export interface AgentEventTimeSeriesPayload {
  FromDate?: string
  ToDate?: string
  Channel?: string
  EventType?: string
  FullTextSearch?: string
}

export interface AgentEventTimeSeriesItem {
  time: string
  eventType: string
  count: number
}

function getBase() {
  if (typeof window === 'undefined') return '/api/Agent/org/temp/action'
  const orgId = localStorage.getItem('orgId') || 'temp'
  return `/api/Agent/org/${orgId}/action`
}

export const agentApi = {
  getAgents: (payload: GetAgentsPayload = {}) =>
    client.post<{ agents: AgentItem[] }>(`${getBase()}/GetAgents`, payload),

  getAgentCount: (payload: GetAgentsPayload = {}) =>
    client.post<{ count: number }>(`${getBase()}/GetAgentCount`, payload),

  getAgentById: (agentId: string) =>
    client.get<{ agent: AgentItem }>(`${getBase()}/GetAgentById/${agentId}`),

  enableLineApiAgentById: (agentId: string) =>
    client.post(`${getBase()}/EnableLineApiAgentById/${agentId}`, {}),

  disableLineApiAgentById: (agentId: string) =>
    client.post(`${getBase()}/DisableLineApiAgentById/${agentId}`, {}),

  getLineApiAgentStatus: (agentId: string) =>
    client.get<{ ok?: boolean; podStatus?: string; login?: string; raw?: string }>(`${getBase()}/GetLineApiAgentStatus/${agentId}`),

  getLineApiAgentLoginQr: (agentId: string) =>
    client.get<{ ok?: boolean; state?: string; qrUrl?: string; error?: string }>(`${getBase()}/GetLineApiAgentLoginQR/${agentId}`),

  getLineApiAgentLoginStatus: (agentId: string) =>
    client.get<{ ok?: boolean; state?: string; pincode?: string; error?: string }>(`${getBase()}/GetLineApiAgentLoginStatus/${agentId}`),

  getAgentEvents: (agentId: string, payload: GetAgentEventsPayload = {}) =>
    client.post<{ events: AgentEventItem[] }>(`${getBase()}/GetAgentEvents/${agentId}`, payload),

  getAgentEventCount: (agentId: string, payload: GetAgentEventsPayload = {}) =>
    client.post<number>(`${getBase()}/GetAgentEventCount/${agentId}`, payload),

  getAgentEventById: (eventId: string) =>
    client.get(`${getBase()}/GetAgentEventById/${eventId}`),

  getAgentEventTimeSeries: (agentId: string, payload: AgentEventTimeSeriesPayload = {}) =>
    client.post<AgentEventTimeSeriesItem[]>(`${getBase()}/GetAgentEventTimeSeries/${agentId}`, payload),
}
