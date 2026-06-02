'use client'

import clsx from 'clsx'

interface AuditLogHistogramProps {
  data: any[]
  totalHits: number
  interval: string
  maxDocCount: number
  dict?: { totalLogs: string }
}

const PALETTE = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1']

function getApiColor(name: string): string {
  if (!name) return '#cbd5e1'
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function fmtHHmm(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtFull(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function addInterval(ts: number, val: number, unit: string): number {
  const ms = unit === 's' ? val * 1000 : unit === 'm' ? val * 60_000 : unit === 'h' ? val * 3_600_000 : val * 86_400_000
  return ts + ms
}

export function AuditLogHistogram({ data, totalHits, interval, maxDocCount, dict }: AuditLogHistogramProps) {
  const axisLabelStep = Math.max(Math.floor(data.length / 10), 1)
  const match = interval.match(/(\d+)([smhd])/)
  const intervalVal = match ? parseInt(match[1]) : 1
  const intervalUnit = match ? match[2] : 'm'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 pt-4 pb-8 flex flex-col relative select-none overflow-visible" style={{ height: '220px' }}>
      <div className="flex items-center justify-between mb-3 flex-none">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900">{totalHits.toLocaleString()}</span>
          <span className="text-gray-400 text-xs">hits</span>
        </div>
        {data.length > 0 && (
          <div className="text-[10px] font-mono text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
            Interval: {interval}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {data.length > 0 && (
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-gray-100" />)}
          </div>
        )}

        <div className={clsx('absolute inset-0 flex items-end', data.length > 80 ? 'gap-0' : data.length > 40 ? 'gap-[1px]' : 'gap-[2px]')}>
          {data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-300">No data</div>
          ) : data.map((bucket, i) => {
            const startTs: number = bucket.key
            const endTs = addInterval(startTs, intervalVal, intervalUnit)
            const allBuckets: any[] = bucket.group_by_api?.buckets || []
            const sortedBuckets = [...allBuckets].sort((a, b) => b.doc_count - a.doc_count)
            const showLabel = i % axisLabelStep === 0
            const isRightHalf = i > data.length / 2
            const heightPct = (bucket.doc_count / (maxDocCount || 1)) * 100
            const hasData = bucket.doc_count > 0

            return (
              <div key={i} className="flex-1 min-w-0 h-full flex flex-col justify-end group relative cursor-pointer">
                <div className="absolute inset-y-0 inset-x-0 bg-primary-50/70 hidden group-hover:block z-0 pointer-events-none" />
                <div className="w-full flex flex-col justify-end z-10 relative transition-opacity opacity-75 group-hover:opacity-100"
                  style={{ height: hasData ? `max(4px, ${heightPct}%)` : '0%' }}>
                  {allBuckets.length === 0 && hasData ? (
                    <div style={{ backgroundColor: '#f59e0b' }} className="w-full h-full rounded-t-sm" />
                  ) : (
                    allBuckets.map((sub: any, si: number) => (
                      <div key={sub.key}
                        style={{ height: `${(sub.doc_count / (bucket.doc_count || 1)) * 100}%`, backgroundColor: getApiColor(sub.key), minHeight: si === 0 ? '2px' : undefined }}
                        className={clsx('w-full', si === 0 && 'rounded-t-sm', data.length <= 100 && 'border-b border-white/30 last:border-0')} />
                    ))
                  )}
                </div>

                {showLabel && (
                  <div className="absolute top-full mt-1.5 left-0 flex flex-col items-start whitespace-nowrap z-20 pointer-events-none">
                    <div className="w-[1px] h-1.5 bg-gray-300" />
                    <span className="text-[10px] font-mono text-gray-400 mt-0.5">{fmtHHmm(startTs)}</span>
                  </div>
                )}

                <div className={clsx('absolute top-0 hidden group-hover:block z-[100] pointer-events-none w-max',
                  !isRightHalf ? 'left-full ml-3' : 'right-full mr-3')}>
                  <div className={clsx('bg-white border border-primary-100 rounded-xl shadow-[0_8px_30px_rgba(37,99,235,0.15)] p-3',
                    sortedBuckets.length > 6 ? 'min-w-[300px]' : 'min-w-[200px]')}>
                    <div className="text-[10px] text-primary-600 font-mono text-center border-b border-primary-100 pb-2 mb-2 bg-primary-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl">
                      {fmtFull(startTs)} – {fmtHHmm(endTs)}
                    </div>
                    <div className={clsx('max-h-[200px] overflow-y-auto pr-1', sortedBuckets.length > 6 ? 'grid grid-cols-2 gap-x-4 gap-y-1.5' : 'space-y-1.5')}>
                      {sortedBuckets.map((sub: any) => (
                        <div key={sub.key} className="flex justify-between items-center gap-3 text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: getApiColor(sub.key) }} />
                            <span className="text-gray-600 truncate max-w-[100px]">{sub.key}</span>
                          </div>
                          <span className="font-mono text-gray-900 font-bold">{sub.doc_count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-primary-100 flex justify-between items-center text-[10px]">
                      <span className="text-primary-400 uppercase tracking-wider font-semibold">{dict?.totalLogs || 'Total'}</span>
                      <span className="text-primary-600 font-bold font-mono">{bucket.doc_count?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200" />
      </div>
    </div>
  )
}
