import { useState, useCallback } from 'react'

export function useUnsavedChanges(isDirty: boolean) {
  const [pendingFn, setPendingFn] = useState<(() => void) | null>(null)

  const guardNavigation = useCallback((fn: () => void) => {
    if (isDirty) setPendingFn(() => fn)
    else fn()
  }, [isDirty])

  const confirmLeave = useCallback(() => {
    pendingFn?.()
    setPendingFn(null)
  }, [pendingFn])

  const cancelLeave = useCallback(() => setPendingFn(null), [])

  return { showConfirm: !!pendingFn, guardNavigation, confirmLeave, cancelLeave }
}
