import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''
const ORG_TYPE = 'PLEASE-PAYMENT'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
  } catch {
    return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(
      `${BACKEND_URL}/api/Auth/org/temp/action/Login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: body.username, password: body.password }),
      }
    )

    const rawText = await response.text()
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(rawText) } catch { /* non-JSON */ }

    if (!response.ok) {
      const msg = (data as any)?.description || (data as any)?.message || (data as any)?.error || 'Login failed'
      return NextResponse.json({ message: msg }, { status: response.status })
    }

    const accessToken: string = (data as any).token?.access_token || ''
    const refreshToken: string = (data as any).token?.refresh_token || ''
    const username: string = (data as any).userName || body.username || ''

    // Fetch allowed orgs for this user
    let merchants: { orgId: string; orgName: string }[] = []
    let firstOrgId = 'temp'

    if (accessToken) {
      try {
        const encodedToken = Buffer.from(accessToken).toString('base64')
        const orgsRes = await fetch(
          `${BACKEND_URL}/api/OnlyUser/org/temp/action/GetUserAllowedOrganization/${ORG_TYPE}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${encodedToken}`,
            },
          }
        )

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json().catch(() => null)

          // Handle multiple possible response shapes from backend
          const orgList: unknown[] = Array.isArray(orgsData)
            ? orgsData
            : Array.isArray((orgsData as any)?.data)
            ? (orgsData as any).data
            : Array.isArray((orgsData as any)?.orgList)
            ? (orgsData as any).orgList
            : Array.isArray((orgsData as any)?.organizations)
            ? (orgsData as any).organizations
            : []

          merchants = orgList.map((o: any) => ({
            orgId: typeof o === 'string' ? o : (o.orgCustomId || o.orgId || o.id || String(o)),
            orgName: typeof o === 'string' ? o : (o.orgName || o.name || o.orgCustomId || String(o)),
          }))

          if (merchants.length > 0) firstOrgId = merchants[0].orgId
        }
      } catch {
        /* network error — fall through to JWT fallback below */
      }

      // Fallback: extract orgId from JWT payload if org fetch failed or returned empty
      if (firstOrgId === 'temp') {
        const payload = decodeJwtPayload(accessToken)
        const orgIds: string[] = Array.isArray(payload.orgIds)
          ? (payload.orgIds as string[])
          : typeof payload.orgId === 'string' && payload.orgId
          ? [payload.orgId]
          : []
        if (orgIds.length > 0) {
          merchants = orgIds.map((id) => ({ orgId: id, orgName: id }))
          firstOrgId = merchants[0].orgId
        }
      }
    }

    const res = NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      username,
      orgId: firstOrgId,
      merchants,
    })

    const cookieOpts = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    res.cookies.set('accessToken', accessToken, { ...cookieOpts, maxAge: 60 * 60 * 24 })
    res.cookies.set('refreshToken', refreshToken, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })
    res.cookies.set('user_name', username, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })
    res.cookies.set('orgId', firstOrgId, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })

    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
