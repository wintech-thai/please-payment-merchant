import { useEffect, useRef } from 'react'

export function useOrgChange(callback: () => void) {
  const ref = useRef(callback)
  ref.current = callback

  useEffect(() => {
    const handler = () => ref.current()
    window.addEventListener('orgchange', handler)
    return () => window.removeEventListener('orgchange', handler)
  }, [])
}
