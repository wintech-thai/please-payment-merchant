import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value || ''
  const orgId = request.cookies.get('orgId')?.value || 'temp'

  try {
    const encodedToken = Buffer.from(accessToken).toString('base64')
    await fetch(`${BACKEND_URL}/api/OnlyUser/org/${orgId}/action/Logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${encodedToken}` } : {}),
      },
    })
  } catch {
    // proceed with local logout even if backend call fails
  }

  const res = NextResponse.json({ success: true })
  res.cookies.delete('accessToken')
  res.cookies.delete('refreshToken')
  res.cookies.delete('user_name')
  res.cookies.delete('orgId')
  return res
}
