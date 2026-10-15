'use client'

import clsx from 'clsx'
import { useFormatDate } from '@/hooks/useFormatDate'
import { formatShortDate, formatTime, formatDateTime } from '@/lib/datetime'

interface AgentEventHistogramProps {
  data: any[]           // [{ time: string, Heartbeat: 10, PaymentTx: 5 }, ...]
  eventTypes: string[]
  total: number
  interval: 'minute' | 'hour' | 'day'
  height?: number
}

const EVENT_COLORS: Record<string, string> = {
  Heartbeat: '#3b82f6',
  PaymentTx: '#8b5cf6',
  Error:     '#ef4444',
  Info:      '#10b981',
}

const PALETTE = ['#f06b1e', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#3b82f6', '#6366f1']

function getEventColor(name: string): string {
  if (EVENT_COLORS[name]) return EVENT_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function fmtLabel(iso: string, interval: 'minute' | 'hour' | 'day', timezone: string): string {
  if (interval === 'day') return formatShortDate(iso, timezone)
  return formatTime(iso, timezone, false)
}

function fmtTooltipTime(iso: string, timezone: string): string {
  return formatDateTime(iso, timezone, false)
}

export function AgentEventHistogram({ data, eventTypes, total, interval, height = 160 }: AgentEventHistogramProps) {
  const { timezone } = useFormatDate()
  const axisLabelStep = Math.max(Math.floor(data.length / 10), 1)

  const maxCount = Math.max(...data.map(d => {
    return eventTypes.reduce((sum, et) => sum + (d[et] ?? 0), 0)
  }), 1)

  const intervalLabel = interval === 'minute' ? '1m' : interval === 'hour' ? '1h' : '1d'

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 pt-3 pb-7 flex flex-col relative select-none overflow-visible"
      style={{ height: `${height}px`, minHeight: `${height}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-none">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900">{total.toLocaleString()}</span>
          <span className="text-gray-400 text-xs">hits</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          {eventTypes.length > 0 && (
            <div className="flex items-center gap-3">
              {eventTypes.map(et => (
                <div key={et} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getEventColor(et) }} />
                  <span className="text-[10px] text-gray-500 font-medium">{et}</span>
                </div>
              ))}
            </div>
          )}
          {data.length > 0 && (
            <div className="text-[10px] font-mono text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
              Interval: {intervalLabel}
            </div>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 relative">

        {/* Grid lines */}
        {data.length > 0 && (
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-full border-t border-gray-100" />
            ))}
          </div>
        )}

        {/* Bars */}
        <div className={clsx(
          'absolute inset-0 flex items-end',
          data.length > 80 ? 'gap-0' : data.length > 40 ? 'gap-[1px]' : 'gap-[2px]'
        )}>
          {data.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-300">No data</div>
          ) : data.map((bucket, i) => {
            const bucketTotal = eventTypes.reduce((sum, et) => sum + (bucket[et] ?? 0), 0)
            const heightPct = (bucketTotal / maxCount) * 100
            const hasData = bucketTotal > 0
            const showLabel = i % axisLabelStep === 0
            const isRightHalf = i > data.length / 2

            return (
              <div key={i} className="flex-1 min-w-0 h-full flex flex-col justify-end group relative cursor-pointer">

                {/* Hover bg */}
                <div className="absolute inset-0 bg-primary-50/70 hidden group-hover:block z-0 pointer-events-none" />

                {/* Bar stack */}
                <div
                  className="w-full flex flex-col justify-end z-10 relative transition-opacity opacity-75 group-hover:opacity-100"
                  style={{ height: hasData ? `max(4px, ${heightPct}%)` : '0%' }}
                >
                  {eventTypes.map((et, si) => {
                    const count = bucket[et] ?? 0
                    if (count === 0) return null
                    return (
                      <div
                        key={et}
                        style={{
                          height: `${(count / (bucketTotal || 1)) * 100}%`,
                          backgroundColor: getEventColor(et),
                          minHeight: si === 0 ? '2px' : undefined,
                        }}
                        className={clsx(
                          'w-full',
                          si === 0 && 'rounded-t-sm',
                          data.length <= 100 && 'border-b border-white/30 last:border-0'
                        )}
                      />
                    )
                  })}
                </div>

                {/* X-axis label */}
                {showLabel && (
                  <div className="absolute top-full mt-1.5 left-0 flex flex-col items-start whitespace-nowrap z-20 pointer-events-none">
                    <div className="w-[1px] h-1.5 bg-gray-300" />
                    <span className="text-[10px] font-mono text-gray-400 mt-0.5">{fmtLabel(bucket.time, interval, timezone)}</span>
                  </div>
                )}

                {/* Tooltip */}
                {hasData && (
                  <div className={clsx(
                    'absolute top-0 hidden group-hover:block z-[100] pointer-events-none w-max',
                    !isRightHalf ? 'left-full ml-3' : 'right-full mr-3'
                  )}>
                    <div className="bg-white border border-primary-100 rounded-xl shadow-[0_8px_30px_rgba(37,99,235,0.15)] p-3 min-w-[180px]">
                      <div className="text-[10px] text-primary-600 font-mono text-center border-b border-primary-100 pb-2 mb-2 bg-primary-50 -mx-3 -mt-3 px-3 pt-2 rounded-t-xl">
                        {fmtTooltipTime(bucket.time, timezone)}
                      </div>
                      <div className="space-y-1.5">
                        {eventTypes.filter(et => (bucket[et] ?? 0) > 0).map(et => (
                          <div key={et} className="flex justify-between items-center gap-3 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: getEventColor(et) }} />
                              <span className="text-gray-600">{et}</span>
                            </div>
                            <span className="font-mono text-gray-900 font-bold">{(bucket[et] ?? 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-primary-100 flex justify-between items-center text-[10px]">
                        <span className="text-primary-400 uppercase tracking-wider font-semibold">Total</span>
                        <span className="text-primary-600 font-bold font-mono">{bucketTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>

        {/* Baseline */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200" />
      </div>
    </div>
  )
}
