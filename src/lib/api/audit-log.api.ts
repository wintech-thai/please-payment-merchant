export interface AuditLogDocument {
  id: string
  '@timestamp': string
  user_name: string
  id_type: string
  role: string
  action: string
  path: string
  resource: string
  status_code: number
  client_ip: string
  [key: string]: unknown
}
