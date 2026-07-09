import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@elastic/elasticsearch'

// ── ElasticSearch backend (existing) ─────────────────────────────────────────

const getEsClient = () => {
  if (!process.env.ES_URL) throw new Error('ES_URL environment variable is missing.')
  return new Client({
    node: process.env.ES_URL,
    auth: { username: process.env.ES_USER || '', password: process.env.ES_PASSWORD || '' },
    tls: { rejectUnauthorized: false },
  })
}

async function handleElasticsearch(req: NextRequest): Promise<Response> {
  const orgId = req.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ status: 'ERROR', message: 'Missing Org ID' }, { status: 400 })

  const { esPayload } = await req.json()
  const index = process.env.ES_INDEX_PATTERN || 'onix-v2*'

  if (esPayload.query?.bool?.must) {
    esPayload.query.bool.must.push({ term: { 'data.api.OrgId.keyword': orgId } })
    const envRun = process.env.ENV_RUN || process.env.NEXT_PUBLIC_ENV_RUN
    if (envRun) {
      esPayload.query.bool.must.push({ match_phrase: { 'data.Environment': envRun } })
    }
  }

  const esClient = getEsClient()
  const result: any = await esClient.search({ index, ...esPayload })

  const responseBody = result.body || result
  const hits = responseBody.hits?.hits || []
  const rawTotal = responseBody.hits?.total
  const total = typeof rawTotal === 'number' ? rawTotal : (rawTotal?.value || 0)
  const aggregations = responseBody.aggregations || null
  const logs = hits.map((hit: any) => ({ _id: hit._id, ...hit._source }))

  return NextResponse.json({ status: 'OK', data: logs, total, aggregations })
}

// ── PostgreSQL backend (via C# API) ──────────────────────────────────────────

function extractInterval(esPayload: any): string | undefined {
  return esPayload?.aggs?.timeline?.date_histogram?.fixed_interval
}

function extractTimeRange(esPayload: any): { fromDate?: string; toDate?: string } {
  const must: any[] = esPayload?.query?.bool?.must || []
  const rangeClause = must.find((m: any) => m.range?.['@timestamp'])
  if (!rangeClause) return {}
  const ts = rangeClause.range['@timestamp']
  return { fromDate: ts.gte, toDate: ts.lte }
}

function extractSearch(esPayload: any): string | undefined {
  const must: any[] = esPayload?.query?.bool?.must || []
  const mm = must.find((m: any) => m.multi_match || m.match)
  return mm?.multi_match?.query ?? mm?.match?.['data.userInfo.UserName'] ?? mm?.match?.['data.api.ApiName'] ?? mm?.match?.['data.CfClientIp']
}

async function handlePostgres(req: NextRequest): Promise<Response> {
  const orgId = req.headers.get('x-org-id')
  if (!orgId) return NextResponse.json({ status: 'ERROR', message: 'Missing Org ID' }, { status: 400 })

  const body = await req.json()
  const { esPayload } = body

  const { fromDate, toDate } = extractTimeRange(esPayload)
  const interval = extractInterval(esPayload)
  const search = extractSearch(esPayload)
  const from: number = esPayload?.from ?? 0
  const size: number = esPayload?.size ?? 25
  const returnDocs = size > 0

  const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
  const accessToken = req.cookies.get('accessToken')?.value
  const incomingAuth = req.headers.get('Authorization')
  const authHeader = incomingAuth
    ? incomingAuth
    : accessToken
      ? `Bearer ${Buffer.from(accessToken).toString('base64')}`
      : ''

  const payload: Record<string, unknown> = {
    FromDate: fromDate,
    ToDate: toDate,
    FullTextSearch: search ?? '',
    Limit: returnDocs ? size : 0,
    Offset: returnDocs ? Math.floor(from / (size || 1)) + 1 : 1,
    ReturnDocs: returnDocs,
    Interval: interval,
    GroupBy: 'api',
  }

  const apiRes = await fetch(`${apiBase}/api/AuditLog/org/${orgId}/action/QueryAuditLogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Onix-Application-Type': 'PLEASE-PAYMENT',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!apiRes.ok) {
    const text = await apiRes.text()
    console.error('[audit-log] C# API error:', apiRes.status, text)
    return NextResponse.json({ status: 'ERROR', message: text, httpStatus: apiRes.status }, { status: apiRes.status })
  }

  const result = await apiRes.json()
  return NextResponse.json(result)
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const source = process.env.AUDIT_LOG_SOURCE ?? 'postgres'
    if (source === 'postgres') {
      return await handlePostgres(req)
    }
    return await handleElasticsearch(req)
  } catch (error: any) {
    console.error('Audit log query error:', error)
    return NextResponse.json({ status: 'ERROR', message: error.message }, { status: 500 })
  }
}
