import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

async function handler(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const accessToken = request.cookies.get('accessToken')?.value

  const url = new URL(request.url)
  const targetUrl = `${BACKEND_URL}/${path}${url.search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Onix-Application-Type': 'PLEASE-PAYMENT-MERCHANT',
  }

  // Forward the real visitor IP/host info through to the backend, verbatim under the
  // same header names — this proxy relay is a new "client" from the backend's point of
  // view, so without this the backend only ever sees this Next.js pod's own internal
  // cluster IP (breaks IP blacklist/audit logging). Do NOT forward X-Original-Forwarded-For
  // here — that gets derived from X-Forwarded-For further along automatically, and
  // forwarding it ourselves too results in a blank value instead.
  const FORWARD_HEADERS = ['cf-connecting-ip', 'x-forwarded-for', 'x-forwarded-host']
  for (const h of FORWARD_HEADERS) {
    const v = request.headers.get(h)
    if (v) headers[h] = v
  }

  const ANONYMOUS_PATHS = ['VerifyPayInToken', 'UploadPayInSlipById']
  const isAnonymous = ANONYMOUS_PATHS.some(p => path.includes(p))

  const incomingAuth = request.headers.get('Authorization')
  if (!isAnonymous) {
    if (incomingAuth) {
      headers['Authorization'] = incomingAuth
    } else if (accessToken) {
      headers['Authorization'] = `Bearer ${Buffer.from(accessToken).toString('base64')}`
    }
  }

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = JSON.stringify(await request.json())
    } catch {
      body = undefined
    }
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  })

  if (response.status === 204 || response.status === 205) {
    return new NextResponse(null, { status: response.status })
  }

  const data = await response.json().catch(() => null)

  return NextResponse.json(data, { status: response.status })
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE }
