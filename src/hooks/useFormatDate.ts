import { useMemo } from 'react'
import { useTimezone } from '@/context/TimezoneContext'
import { formatDate, formatDateTime, formatTime } from '@/lib/datetime'

/**
 * Timezone-aware date formatters bound to the current user's resolved
 * timezone (their own setting, or the browser's zone if they follow it —
 * see TimezoneContext). Use this instead of `.toLocaleDateString()` /
 * `.toLocaleString()` anywhere a timestamp from the API is rendered.
 */
export function useFormatDate() {
  const { timezone } = useTimezone()

  return useMemo(() => ({
    timezone,
    fmtDate: (value: string | number | Date | null | undefined) => formatDate(value, timezone),
    fmtTime: (value: string | number | Date | null | undefined, withSeconds = true) => formatTime(value, timezone, withSeconds),
    fmtDateTime: (value: string | number | Date | null | undefined, withSeconds = true) => formatDateTime(value, timezone, withSeconds),
  }), [timezone])
}
