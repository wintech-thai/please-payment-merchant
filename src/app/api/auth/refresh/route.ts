import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value
    const username = request.cookies.get('user_name')?.value || ''
    const orgId = request.cookies.get('orgId')?.value || 'temp'

    if (!refreshToken) {
      return NextResponse.json({ message: 'No refresh token' }, { status: 401 })
    }

    const response = await fetch(
      `${BACKEND_URL}/api/Auth/org/temp/action/Refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: username, refreshToken, orgId }),
      }
    )

    const rawText = await response.text()
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(rawText) } catch { /* non-JSON */ }

    if (!response.ok) {
      const res = NextResponse.json({ message: 'Refresh failed' }, { status: 401 })
      res.cookies.delete('accessToken')
      res.cookies.delete('refreshToken')
      return res
    }

    const newAccessToken: string = (data as any).token?.access_token || ''
    const newRefreshToken: string = (data as any).token?.refresh_token || refreshToken

    const res = NextResponse.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken })

    const cookieOpts = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    res.cookies.set('accessToken', newAccessToken, { ...cookieOpts, maxAge: 60 * 60 * 24 })
    res.cookies.set('refreshToken', newRefreshToken, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })

    return res
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ message: msg }, { status: 500 })
  }
}
