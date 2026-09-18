'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLang } from '@/context/LanguageContext'
import { summaryApi, type MerchantOverviewSummary, type MerchantDailySummaryItem, type PayerSummaryResponse } from '@/lib/api/summary.api'
import { AdvancedTimeRangeSelector, type TimeRangeValue } from '@/components/AdvancedTimeRangeSelector'
import { useOrgChange } from '@/hooks/useOrgChange'
import clsx from 'clsx'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100]
const DETAIL_HIGHLIGHTED_KEY = 'reportAnalytic_detailHighlightedKey'
const PAYER_HIGHLIGHTED_KEY = 'reportAnalytic_payerHighlightedKey'

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
  label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'orange' | 'purple' | 'neutral'
}) {
  const s = {
    green:   { card: 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600', dot: 'bg-white/40', label: 'text-emerald-100',  value: 'text-white', sub: 'text-emerald-200' },
    red:     { card: 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-600',           dot: 'bg-white/40', label: 'text-rose-100',     value: 'text-white', sub: 'text-rose-200' },
    orange:  { card: 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-600',     dot: 'bg-white/40', label: 'text-orange-100',   value: 'text-white', sub: 'text-orange-200' },
    purple:  { card: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 border-fuchsia-600',  dot: 'bg-white/40', label: 'text-fuchsia-100',  value: 'text-white', sub: 'text-fuchsia-200' },
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
  const rs = t.revenueSummary

  const [timeRange, setTimeRange] = useState<TimeRangeValue>({ type: 'relative', value: '30d' })
  const [summary, setSummary] = useState<MerchantOverviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [payerSummary, setPayerSummary] = useState<PayerSummaryResponse | null>(null)
  const [payerSearch, setPayerSearch] = useState('')
  const [detailHighlightedKey, setDetailHighlightedKey] = useState<string>(() => {
    try { return sessionStorage.getItem(DETAIL_HIGHLIGHTED_KEY) ?? '' } catch { return '' }
  })
  const [payerHighlightedKey, setPayerHighlightedKey] = useState<string>(() => {
    try { return sessionStorage.getItem(PAYER_HIGHLIGHTED_KEY) ?? '' } catch { return '' }
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const range = getDateRange(timeRange)
      const [summaryRes, payerRes] = await Promise.allSettled([
        summaryApi.getMerchantSummary(range),
        summaryApi.getPayerSummary(range),
      ])

      if (summaryRes.status === 'rejected') throw summaryRes.reason
      const d = summaryRes.value.data as any
      setSummary(d ?? null)

      if (payerRes.status === 'fulfilled') {
        const pd = payerRes.value.data as any
        setPayerSummary(pd?.payerSummary ?? pd?.PayerSummary ?? pd ?? null)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : ov.failedToLoad)
    } finally {
      setLoading(false)
    }
  }, [timeRange, refreshKey, ov.failedToLoad])

  useEffect(() => { load() }, [load])

  useOrgChange(() => setRefreshKey(k => k + 1))

  const payInAmount  = summary?.totalPayInAmount  ?? null
  const payOutAmount = summary?.totalPayOutAmount ?? null
  const payInFee     = summary?.totalPayInFee     ?? null
  const payOutFee    = summary?.totalPayOutFee    ?? null
  const withdrawalAmount = summary?.totalWithdrawalAmount ?? null
  const withdrawalFee    = summary?.totalWithdrawalFee    ?? null
  const withdrawalCount  = summary?.totalWithdrawalCount  ?? null
  const totalFee     = [payInFee, payOutFee, withdrawalFee].reduce<number | null>(
    (acc, v) => v != null ? (acc ?? 0) + v : acc, null)
  const payInCount   = summary?.totalPayInCount  ?? null
  const payOutCount  = summary?.totalPayOutCount ?? null
  const netFlow      = payInAmount != null && payOutAmount != null ? payInAmount - payOutAmount : null

  const dailyItems: MerchantDailySummaryItem[] = summary?.dailyMerchantRevenue ?? []

  const tableRows = dailyItems
    .filter((x): x is MerchantDailySummaryItem & { date: string } => !!x.date)
    .slice()
    .sort((a, b) => (a.date as string).localeCompare(b.date as string) || (a.merchantCode ?? '').localeCompare(b.merchantCode ?? ''))
    .map(x => ({
      date: new Date(x.date as string).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      merchant: x.merchantCode ?? '-',
      payInAmt: x.payInAmount ?? 0,
      payOutAmt: x.payOutAmount ?? 0,
      withdrawalAmt: x.withdrawalAmount ?? 0,
      payInFee: x.payInFee ?? 0,
      payOutFee: x.payOutFee ?? 0,
      withdrawalFee: x.withdrawalFee ?? 0,
      totalFee: (x.payInFee ?? 0) + (x.payOutFee ?? 0) + (x.withdrawalFee ?? 0),
    }))

  useEffect(() => { setPage(1) }, [tableRows.length])

  const totalPages = Math.max(1, Math.ceil(tableRows.length / itemsPerPage))
  const startRow = tableRows.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endRow = Math.min(page * itemsPerPage, tableRows.length)
  const pagedRows = tableRows.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const handleExportCsv = () => {
    const headers = [rs.colDate, rs.colMerchant, rs.colPayInAmount, rs.colPayOutAmount, rs.colWithdrawalAmount, rs.colPayInFee, rs.colPayOutFee, rs.colWithdrawalFee, rs.colTotalFee]
    const rows = pagedRows.map(r => [
      r.date, r.merchant,
      r.payInAmt.toFixed(2), r.payOutAmt.toFixed(2), r.withdrawalAmt.toFixed(2),
      r.payInFee.toFixed(2), r.payOutFee.toFixed(2), r.withdrawalFee.toFixed(2), r.totalFee.toFixed(2),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'transaction-summary.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const ps = t.payerSummary
  const payerRows = (payerSummary?.payers ?? [])
    .map(x => ({
      payerName: x.payerName ?? '-',
      txCount: x.transactionCount ?? 0,
      totalAmount: x.totalAmount ?? 0,
      firstSeen: x.firstSeenDate ? new Date(x.firstSeenDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
      lastSeen: x.lastSeenDate ? new Date(x.lastSeenDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
    }))
    .filter(r => !payerSearch.trim() || r.payerName.toLowerCase().includes(payerSearch.trim().toLowerCase()))

  const handleExportPayerCsv = () => {
    const headers = [ps.colPayerName, ps.colTxCount, ps.colTotalAmount, ps.colFirstSeen, ps.colLastSeen]
    const rows = payerRows.map(r => [r.payerName, String(r.txCount), r.totalAmount.toFixed(2), r.firstSeen, r.lastSeen])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'payer-summary.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const chartAmountData = dailyItems.map(item => ({
    date: fmtDate(item.date),
    [ov.labelPayIn]:  item.payInAmount  ?? 0,
    [ov.labelPayOut]: item.payOutAmount ?? 0,
    [ov.labelWithdrawal]: item.withdrawalAmount ?? 0,
  }))

  const FEE_PAYIN  = `${ov.labelPayIn} Fee`
  const FEE_PAYOUT = `${ov.labelPayOut} Fee`
  const FEE_WITHDRAWAL = `${ov.labelWithdrawal} Fee`

  const chartFeeData = dailyItems.map(item => ({
    date: fmtDate(item.date),
    [FEE_PAYIN]:  item.payInFee  ?? 0,
    [FEE_PAYOUT]: item.payOutFee ?? 0,
    [FEE_WITHDRAWAL]: item.withdrawalFee ?? 0,
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
      <div className="flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.revenueSummary.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t.revenueSummary.subtitle}</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label={ov.totalPayIn}  value={fmtMoney(payInAmount)}
            sub={payInCount != null ? `${payInCount.toLocaleString()} ${ov.transactions}` : undefined} accent="green" />
          <SummaryCard label={ov.totalPayOut} value={fmtMoney(payOutAmount)}
            sub={payOutCount != null ? `${payOutCount.toLocaleString()} ${ov.transactions}` : undefined} accent="red" />
          <SummaryCard label={ov.totalWithdrawal} value={fmtMoney(withdrawalAmount)}
            sub={withdrawalCount != null ? `${withdrawalCount.toLocaleString()} ${ov.transactions}` : undefined} accent="purple" />
          <SummaryCard label={ov.totalFee}    value={fmtMoney(totalFee)}    accent="orange" />
          <SummaryCard label={ov.netFlow}     value={fmtMoney(netFlow)}
            accent={netFlow == null ? 'neutral' : netFlow >= 0 ? 'green' : 'red'} />
          <SummaryCard label={ov.payInCount}  value={payInCount != null ? payInCount.toLocaleString() : '—'} />
          <SummaryCard label={ov.payOutCount} value={payOutCount != null ? payOutCount.toLocaleString() : '—'} />
          <SummaryCard label={ov.withdrawalCount} value={withdrawalCount != null ? withdrawalCount.toLocaleString() : '—'} />
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
                <Bar dataKey={ov.labelWithdrawal} fill="#d946ef" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : noDataEl}
        </ChartSection>

        {/* Chart 2: Daily Fee Stacked Bar */}
        <ChartSection title={ov.totalFee}>
          {chartFeeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartFeeData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={fmtAxisNum} width={48} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  formatter={(v) => <span className="text-gray-600 font-medium">{v}</span>} />
                <Bar dataKey={FEE_PAYIN}  stackId="fee" fill="#10b981" maxBarSize={28} />
                <Bar dataKey={FEE_PAYOUT} stackId="fee" fill="#f97316" maxBarSize={28} />
                <Bar dataKey={FEE_WITHDRAWAL} stackId="fee" fill="#d946ef" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : noDataEl}
        </ChartSection>

        {/* Detail table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
              <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              {rs.tableTitle}
            </h2>
            <button onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <Download className="w-3.5 h-3.5" />
              {rs.exportExcel}
            </button>
          </div>

          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-sm table-fixed min-w-[760px]">
              <colgroup>
                <col className="w-[10%]" /><col className="w-[13%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[11%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{rs.colDate}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colMerchant}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colPayInAmount}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colPayOutAmount}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colWithdrawalAmount}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colPayInFee}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colPayOutFee}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{rs.colWithdrawalFee}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{rs.colTotalFee}</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">{rs.noData}</td></tr>
                ) : pagedRows.map((r, i) => {
                  const rowKey = `${r.date}-${r.merchant}-${i}`
                  const isHighlighted = detailHighlightedKey === rowKey
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => {
                        const next = isHighlighted ? '' : rowKey
                        setDetailHighlightedKey(next)
                        try { sessionStorage.setItem(DETAIL_HIGHLIGHTED_KEY, next) } catch {}
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isHighlighted
                          ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                          : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      )}
                    >
                      <td className="py-3 px-5 text-xs text-gray-500 whitespace-nowrap border-b border-gray-100">{r.date}</td>
                      <td className="py-3 px-3 text-sm font-medium text-gray-800 truncate border-b border-gray-100">{r.merchant}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-blue-700 border-b border-gray-100">{fmtMoney(r.payInAmt)}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-orange-600 border-b border-gray-100">{fmtMoney(r.payOutAmt)}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-purple-600 border-b border-gray-100">{fmtMoney(r.withdrawalAmt)}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-emerald-700 border-b border-gray-100">{fmtMoney(r.payInFee)}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-amber-600 border-b border-gray-100">{fmtMoney(r.payOutFee)}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-fuchsia-600 border-b border-gray-100">{fmtMoney(r.withdrawalFee)}</td>
                      <td className="py-3 px-5 text-sm tabular-nums text-right font-semibold text-gray-900 border-b border-gray-100">{fmtMoney(r.totalFee)}</td>
                    </tr>
                  )
                })}
              </tbody>
              {pagedRows.length > 0 && (
                <tfoot className="bg-white border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="py-3 px-5 text-xs font-bold text-gray-600 uppercase tracking-wide">{rs.colTotal}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-blue-700">{fmtMoney(pagedRows.reduce((s, r) => s + r.payInAmt, 0))}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-orange-600">{fmtMoney(pagedRows.reduce((s, r) => s + r.payOutAmt, 0))}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-purple-600">{fmtMoney(pagedRows.reduce((s, r) => s + r.withdrawalAmt, 0))}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-emerald-700">{fmtMoney(pagedRows.reduce((s, r) => s + r.payInFee, 0))}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-amber-600">{fmtMoney(pagedRows.reduce((s, r) => s + r.payOutFee, 0))}</td>
                    <td className="py-3 px-3 text-sm tabular-nums text-right font-bold text-fuchsia-600">{fmtMoney(pagedRows.reduce((s, r) => s + r.withdrawalFee, 0))}</td>
                    <td className="py-3 px-5 text-sm tabular-nums text-right font-bold text-gray-900">{fmtMoney(pagedRows.reduce((s, r) => s + r.totalFee, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              <span className="font-semibold text-gray-800">{tableRows.length}</span> {rs.totalItems}
            </span>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs">{rs.rowsPerPage}</span>
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setPage(1) }}
                  className="bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer font-medium outline-none text-sm"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">
                  {tableRows.length === 0 ? '0-0' : `${startRow}-${endRow}`} of {tableRows.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payer Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
              <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
              {ps.tableTitle}
            </h2>
            <div className="flex items-center gap-2">
              <input
                value={payerSearch}
                onChange={e => setPayerSearch(e.target.value)}
                placeholder={ps.searchPlaceholder}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 w-44"
              />
              <button onClick={handleExportPayerCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                <Download className="w-3.5 h-3.5" />
                {ps.exportExcel}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 py-4 border-b border-gray-100">
            <SummaryCard label={ps.cardTotalPayers} value={(payerSummary?.totalPayers ?? 0).toLocaleString()} />
            <SummaryCard label={ps.cardTotalAmount} value={fmtMoney(payerSummary?.totalAmount)} accent="green" />
            <SummaryCard label={ps.cardTotalTx} value={(payerSummary?.totalTransactionCount ?? 0).toLocaleString()} />
          </div>

          <div className="overflow-auto custom-scrollbar">
            <table className="w-full text-sm table-fixed min-w-[640px]">
              <colgroup>
                <col className="w-[30%]" /><col className="w-[15%]" /><col className="w-[20%]" /><col className="w-[17%]" /><col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{ps.colPayerName}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{ps.colTxCount}</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{ps.colTotalAmount}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">{ps.colFirstSeen}</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">{ps.colLastSeen}</th>
                </tr>
              </thead>
              <tbody>
                {payerRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">{ps.noData}</td></tr>
                ) : payerRows.map((r, i) => {
                  const rowKey = `${r.payerName}-${i}`
                  const isHighlighted = payerHighlightedKey === rowKey
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => {
                        const next = isHighlighted ? '' : rowKey
                        setPayerHighlightedKey(next)
                        try { sessionStorage.setItem(PAYER_HIGHLIGHTED_KEY, next) } catch {}
                      }}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isHighlighted
                          ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                          : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      )}
                    >
                      <td className="py-3 px-5 text-sm font-medium text-gray-800 truncate border-b border-gray-100">{r.payerName}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right text-gray-700 border-b border-gray-100">{r.txCount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm tabular-nums text-right font-semibold text-gray-900 border-b border-gray-100">{fmtMoney(r.totalAmount)}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap border-b border-gray-100">{r.firstSeen}</td>
                      <td className="py-3 px-5 text-xs text-gray-500 whitespace-nowrap border-b border-gray-100">{r.lastSeen}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
  )
}
