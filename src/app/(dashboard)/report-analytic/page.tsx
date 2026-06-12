'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/context/LanguageContext'
import { summaryApi, type MerchantOverviewSummary, type MerchantDailySummaryItem } from '@/lib/api/summary.api'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import clsx from 'clsx'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { RefreshCw } from 'lucide-react'

function getDateRange(tr: TimeRangeValue) {
  if (tr.type === 'absolute' && tr.start && tr.end) {
    return { FromDate: new Date(tr.start * 1000).toISOString(), ToDate: new Date(tr.end * 1000).toISOString() }
  }
  const num = parseInt(tr.value)
  const unit = tr.value.replace(/\d/g, '')
  const now = Date.now()
  const startMs = unit === 'm' ? now - num * 60_000 : unit === 'h' ? now - num * 3_600_000 : now - num * 86_400_000
  return { FromDate: new Date(startMs).toISOString(), ToDate: new Date(now).toISOString() }
}

function fmtMoney(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtAxisNum(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function fmtDate(d?: string | null) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
  } catch { return d }
}

function SummaryCard({ label, value, sub, accent = 'neutral' }: {
  label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'orange' | 'neutral'
}) {
  const s = {
    green:   { card: 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600', dot: 'bg-white/40', label: 'text-emerald-100',  value: 'text-white', sub: 'text-emerald-200' },
    red:     { card: 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-600',           dot: 'bg-white/40', label: 'text-rose-100',     value: 'text-white', sub: 'text-rose-200' },
    orange:  { card: 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600',     dot: 'bg-white/40', label: 'text-orange-100',   value: 'text-white', sub: 'text-orange-200' },
    neutral: { card: 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-700',           dot: 'bg-white/40', label: 'text-gray-300',     value: 'text-white', sub: 'text-gray-300' },
  }[accent]
  return (
    <div className={clsx('rounded-xl border shadow-sm px-5 py-4', s.card)}>
      <div className="flex items-center gap-1.5 mb-3">
        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', s.dot)} />
        <p className={clsx('text-xs font-semibold uppercase tracking-wide truncate', s.label)}>{label}</p>
      </div>
      <p className={clsx('text-2xl font-bold tabular-nums', s.value)}>{value}</p>
      {sub && <p className={clsx('text-xs mt-1.5', s.sub)}>{sub}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill ?? p.stroke }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums text-gray-800">
            {(p.value as number)?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-5">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
        <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function ReportAnalyticPage() {
  const { t } = useLang()
  const ov = t.overview

  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [summary, setSummary] = useState<MerchantOverviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const range = getDateRange(timeRange)
    const [summaryRes] = await Promise.allSettled([
      summaryApi.getMerchantSummary(range),
    ])

    if (summaryRes.status === 'fulfilled') {
      const d = summaryRes.value.data as any
      setSummary(d ?? null)
    }

    setLoading(false)
  }, [timeRange, refreshKey])

  useEffect(() => { load() }, [load])

  const payInAmount  = summary?.totalPayInAmount  ?? null
  const payOutAmount = summary?.totalPayOutAmount ?? null
  const payInFee     = summary?.totalPayInFee     ?? null
  const payOutFee    = summary?.totalPayOutFee    ?? null
  const totalFee     = payInFee != null && payOutFee != null ? payInFee + payOutFee : payInFee ?? payOutFee ?? null
  const payInCount   = summary?.totalPayInCount  ?? null
  const payOutCount  = summary?.totalPayOutCount ?? null
  const netFlow      = payInAmount != null && payOutAmount != null ? payInAmount - payOutAmount : null

  const dailyItems: MerchantDailySummaryItem[] = summary?.dailyMerchantRevenue ?? []

  const chartAmountData = dailyItems.map(item => ({
    date: fmtDate(item.date),
    [ov.labelPayIn]:  item.payInAmount  ?? 0,
    [ov.labelPayOut]: item.payOutAmount ?? 0,
  }))

  const chartFeeData = dailyItems.map(item => ({
    date: fmtDate(item.date),
    [ov.totalFee]: (item.payInFee ?? 0) + (item.payOutFee ?? 0),
  }))

  const noDataEl = (
    <div className="flex items-center justify-center h-[200px]">
      <div className="text-center text-gray-300">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">{loading ? t.common.loading : ov.noData}</p>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)] px-4 sm:px-6 py-4 sm:py-5">

      {/* Header */}
      <div className="flex-none flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.nav.reportAndAnalytic}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <AdvancedTimeRangeSelector value={timeRange} onChange={setTimeRange} disabled={loading} />
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <SummaryCard label={ov.totalPayIn}  value={fmtMoney(payInAmount)}
            sub={payInCount != null ? `${payInCount.toLocaleString()} ${ov.transactions}` : undefined} accent="green" />
          <SummaryCard label={ov.totalPayOut} value={fmtMoney(payOutAmount)}
            sub={payOutCount != null ? `${payOutCount.toLocaleString()} ${ov.transactions}` : undefined} accent="red" />
          <SummaryCard label={ov.totalFee}    value={fmtMoney(totalFee)}    accent="orange" />
          <SummaryCard label={ov.netFlow}     value={fmtMoney(netFlow)}
            accent={netFlow == null ? 'neutral' : netFlow >= 0 ? 'green' : 'red'} />
          <SummaryCard label={ov.payInCount}  value={payInCount != null ? payInCount.toLocaleString() : '—'} />
          <SummaryCard label={ov.payOutCount} value={payOutCount != null ? payOutCount.toLocaleString() : '—'} />
        </div>

        {/* Chart 1: Daily Pay-In vs Pay-Out Amount */}
        <ChartSection title={ov.chartDailyTitle}>
          {chartAmountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartAmountData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtAxisNum} width={48} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(v) => <span className="text-gray-600 font-medium">{v}</span>} />
                <Bar dataKey={ov.labelPayIn}  fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey={ov.labelPayOut} fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : noDataEl}
        </ChartSection>

        {/* Chart 2: Daily Fee Trend */}
        <ChartSection title={ov.totalFee}>
          {chartFeeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartFeeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtAxisNum} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(v) => <span className="text-gray-600 font-medium">{v}</span>} />
                <Line dataKey={ov.totalFee} stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : noDataEl}
        </ChartSection>

      </div>
    </div>
  )
}
