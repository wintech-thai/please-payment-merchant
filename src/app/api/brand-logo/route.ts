import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const STORAGE_BASE = process.env.NEXT_PUBLIC_STORAGE_API_BASE || 'https://storage-api.please-payment.com'

// Same header-forwarding contract as src/app/api/proxy/[...path]/route.ts —
// this fetch talks to the backend directly (bypassing that proxy), so it has
// to forward the visitor IP/mutual-key headers itself or the backend only
// sees this pod's own IP (breaks audit logging for GetBrandConfig).
const FORWARD_HEADERS = ['cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host']

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const incomingHeaders = await headers()
    const forwardHeaders: Record<string, string> = {}
    for (const h of FORWARD_HEADERS) {
      const v = incomingHeaders.get(h)
      if (v) forwardHeaders[h] = v
    }
    if (process.env.MUTUAL_KEY) {
      forwardHeaders['X-Forward-Mutual-Key'] = process.env.MUTUAL_KEY
    }

    const cfgRes = await fetch(
      `${BACKEND_URL}/admin-api/AdminConfiguration/org/global/action/GetBrandConfig`,
      { headers: forwardHeaders, cache: 'no-store' }
    )
    if (!cfgRes.ok) return new NextResponse(null, { status: 404 })

    const raw = await cfgRes.json()
    const config = raw?.configuration ?? raw?.data ?? raw

    const s = (config?.status ?? '').toLowerCase()
    const isActive = s === 'active' || s.startsWith('enable')
    if (!isActive || !config?.brandConfig?.logoImageUrl) {
      return new NextResponse(null, { status: 404 })
    }

    const logoUrl = config.brandConfig.logoImageUrl.replace('<STORAGE-API-BASE>', STORAGE_BASE)
    const imgRes = await fetch(logoUrl, { cache: 'no-store' })
    if (!imgRes.ok) return new NextResponse(null, { status: 404 })

    const buffer = await imgRes.arrayBuffer()
    const contentType = imgRes.headers.get('content-type') || 'image/png'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
