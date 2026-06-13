import { useEffect, useState } from 'react'

export function useRefreshKey() {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const handler = () => setKey(k => k + 1)
    window.addEventListener('orgchange', handler)
    return () => window.removeEventListener('orgchange', handler)
  }, [])

  return [key, () => setKey(k => k + 1)] as const
}
