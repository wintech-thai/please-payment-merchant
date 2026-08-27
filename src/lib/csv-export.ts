export type CsvCell = string | number | null | undefined

const BOM = '﻿'

function escapeCell(v: CsvCell): string {
  const s = v == null ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const lines = [headers.map(escapeCell).join(','), ...rows.map(r => r.map(escapeCell).join(','))]
  const csv = BOM + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
