'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OrgIdGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    setOrgId(localStorage.getItem('orgId') || '')
  }, [])

  if (orgId === null) return null // still hydrating

  if (!orgId || orgId === 'temp') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-24">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-1">No merchant organization found</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your account is not linked to any merchant organization.<br />
            Please log out and log back in, or contact your administrator.
          </p>
          <button
            onClick={() => { localStorage.clear(); router.push('/login') }}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Log out &amp; sign in again
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
