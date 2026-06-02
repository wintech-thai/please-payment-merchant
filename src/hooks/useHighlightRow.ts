import { useState, useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'

const SK = 'highlight:'

export function useHighlightRow() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const key = SK + pathname

  const highlightParam = searchParams.get('highlight')

  const [selectedRowId, setSelectedRowId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return highlightParam || sessionStorage.getItem(key) || null
  })

  useEffect(() => {
    if (highlightParam) {
      setSelectedRowId(highlightParam)
      sessionStorage.setItem(key, highlightParam)
      const params = new URLSearchParams(window.location.search)
      params.delete('highlight')
      const qs = params.toString()
      window.history.replaceState(null, '', pathname + (qs ? `?${qs}` : ''))
    }
  }, [highlightParam, pathname, key])

  const handleRowSelect = (id: string) => {
    setSelectedRowId(id)
    sessionStorage.setItem(key, id)
  }

  const clearHighlight = () => {
    setSelectedRowId(null)
    sessionStorage.removeItem(key)
  }

  return { selectedRowId, handleRowSelect, clearHighlight }
}
