import { NextResponse } from 'next/server'
import { Client } from '@elastic/elasticsearch'

const getEsClient = () => {
  if (!process.env.ES_URL) throw new Error('ES_URL environment variable is missing.')
  return new Client({
    node: process.env.ES_URL,
    auth: { username: process.env.ES_USER || '', password: process.env.ES_PASSWORD || '' },
    tls: { rejectUnauthorized: false },
  })
}

export async function POST(req: Request) {
  try {
    const orgId = req.headers.get('x-org-id')
    if (!orgId) return NextResponse.json({ status: 'ERROR', message: 'Missing Org ID' }, { status: 400 })

    const { esPayload } = await req.json()
    const index = process.env.ES_INDEX_PATTERN || 'onix-v2*'

    if (esPayload.query?.bool?.must) {
      // Filter by the merchant's actual orgId (not global)
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
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 })
  }
}
