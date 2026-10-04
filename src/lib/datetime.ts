// Central timezone-aware date/time formatting.
//
// The backend always stores and returns timestamps in UTC. Historically every
// page formatted dates with the browser's own locale/timezone via
// `.toLocaleDateString()`/`.toLocaleString()`, so two viewers in different
// timezones (or a user who explicitly wants to see Thailand time while
// traveling — see x073) would read the same instant as different wall-clock
// times inconsistently. These helpers take an explicit resolved timezone
// (see TimezoneContext) instead of trusting the browser implicitly.

export const DEFAULT_TIMEZONE = 'Asia/Bangkok'

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/** Resolve a user's saved timezone setting ("" / null means "follow browser") to a real IANA zone. */
export function resolveTimezone(saved: string | null | undefined): string {
  if (saved && saved.trim()) return saved
  return getBrowserTimezone()
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? null : d
}

/** "DD/MM/YYYY" in the given timezone. */
export function formatDate(value: string | number | Date | null | undefined, timezone: string): string {
  const d = toDate(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** "HH:mm:ss" in the given timezone. */
export function formatTime(value: string | number | Date | null | undefined, timezone: string, withSeconds = true): string {
  const d = toDate(value)
  if (!d) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(d)
}

/** "DD/MM/YYYY HH:mm:ss" in the given timezone. */
export function formatDateTime(value: string | number | Date | null | undefined, timezone: string, withSeconds = true): string {
  const d = toDate(value)
  if (!d) return '-'
  return `${formatDate(d, timezone)} ${formatTime(d, timezone, withSeconds)}`
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "DD Mon" (e.g. "02 Oct") in the given timezone — compact form for chart axis ticks. */
export function formatShortDate(value: string | number | Date | null | undefined, timezone: string): string {
  const d = toDate(value)
  if (!d) return '-'
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, day: '2-digit', month: 'numeric' }).formatToParts(d)
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1') - 1
  return `${day} ${SHORT_MONTHS[month] ?? ''}`
}

/** "HH:mm" (no seconds) in the given timezone — compact form for chart axis ticks/tooltips. */
export function formatShortTime(value: string | number | Date | null | undefined, timezone: string): string {
  return formatTime(value, timezone, false)
}

/** A reasonably complete list of IANA zone names for the manual timezone picker. */
export function listTimezones(): string[] {
  try {
    // Supported in modern Chromium/Edge/Firefox/Safari — this is a browser-only module.
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
    if (fn) return fn('timeZone')
  } catch {
    // fall through to the curated fallback below
  }
  return [
    'Pacific/Midway', 'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles',
    'America/Denver', 'America/Chicago', 'America/New_York', 'America/Sao_Paulo',
    'Atlantic/Azores', 'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Europe/Moscow', 'Africa/Cairo', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata',
    'Asia/Dhaka', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Shanghai', 'Asia/Singapore',
    'Asia/Hong_Kong', 'Asia/Tokyo', 'Asia/Seoul', 'Australia/Perth', 'Australia/Sydney',
    'Pacific/Auckland',
  ]
}
