import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const STORAGE_BASE = process.env.NEXT_PUBLIC_STORAGE_API_BASE || 'https://storage-api.please-payment.com'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cfgRes = await fetch(
      `${BACKEND_URL}/admin-api/AdminConfiguration/org/global/action/GetBrandConfig`,
      { cache: 'no-store' }
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
