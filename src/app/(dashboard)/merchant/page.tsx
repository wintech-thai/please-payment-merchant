'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { userApi } from '@/lib/api/user.api'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Loader2, Copy, Check, Store, CreditCard, Webhook, Wallet, ChevronLeft, ChevronRight } from 'lucide-react'

interface MerchantData {
  // from GetMerchants (admin MerchantItem field names)
  id?: string
  orgId?: string
  code?: string
  name?: string
  contactEmail?: string
  contactPhone?: string
  payinFeePct?: number | null
  payoutFeePct?: number | null
  payinMinAmount?: number | null
  payinMaxAmount?: number | null
  payoutMinAmount?: number | null
  payoutMaxAmount?: number | null
  status?: string
  currentBalance?: number | null
  currentBalanceDecimal?: number | null
  // fallback aliases
  merchantCode?: string; orgCode?: string; orgCustomId?: string
  merchantName?: string; orgName?: string
  email?: string; merchantEmail?: string
  phone?: string; merchantPhone?: string
  payInFeePercent?: number; payOutFeePercent?: number
  payInMinAmount?: number; payInMaxAmount?: number
  payOutMinAmount?: number; payOutMaxAmount?: number
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
      <span className="w-1 h-4 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function ReadonlyField({ label, value, mono, suffix }: { label: string; value?: string | number | null; mono?: boolean; suffix?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </label>
      <div className={clsx(
        'px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700 min-h-[38px] flex items-center justify-between',
        mono && 'font-mono'
      )}>
        <span>{value ?? <span className="text-gray-300">—</span>}</span>
        {suffix && value != null && <span className="text-gray-400 text-xs font-semibold ml-1">{suffix}</span>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || '').toLowerCase()
  const styles = s === 'active'
    ? 'bg-green-50 text-green-700 border-green-200'
    : s === 'disabled'
    ? 'bg-gray-100 text-gray-500 border-gray-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', styles)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s === 'active' ? 'bg-green-500' : s === 'disabled' ? 'bg-gray-400' : 'bg-amber-500')} />
      {status || '-'}
    </span>
  )
}

function LimitRow({ label, min, max, minLabel, maxLabel }: { label: string; min?: number | null; max?: number | null; minLabel: string; maxLabel: string }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{minLabel}</p>
          <p className="text-sm font-semibold text-gray-800">
            {min != null ? min.toLocaleString() : <span className="text-gray-300 font-normal">—</span>}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{maxLabel}</p>
          <p className="text-sm font-semibold text-gray-800">
            {max != null ? max.toLocaleString() : <span className="text-gray-300 font-normal">—</span>}
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  )
}

function processPaymentUrl(raw: string): string {
  if (typeof window === 'undefined') return raw
  const apiDomain = window.location.hostname.replace(/^merchant/, 'api')
  return raw.replace('<PAYMENT-REQUEST-SERVICE>', apiDomain)
}

type Tab = 'info' | 'endpoint' | 'webhooks' | 'wallet'

export default function MerchantInfoPage() {
  const { t } = useLang()
  const mi = t.merchantInfo
  const [activeTab, setActiveTab] = useState<Tab>('info')
  const [data, setData] = useState<MerchantData | null>(null)
  const [endpointUrl, setEndpointUrl] = useState('')
  const [webhooksData, setWebhooksData] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any | null>(null)
  const [walletTxs, setWalletTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [walletPage, setWalletPage] = useState(1)
  const [walletPageSize, setWalletPageSize] = useState(25)

  useEffect(() => {
    const load = async () => {
      try {
        // Call all merchant endpoints in parallel — backend resolves merchantId from current user
        const [detailRes, endpointRes, webhooksRes, walletRes] = await Promise.allSettled([
          userApi.getMyMerchantInfo(),
          userApi.getMerchantPaymentEndpoint(),
          userApi.getMerchantWebhooks(),
          userApi.getMerchantWallet(),
        ])

        if (detailRes.status === 'fulfilled') {
          const d = detailRes.value.data as any
          const detail = d?.merchant ?? d?.merchantInfo ?? d?.data ?? d
          if (detail) setData(detail)
        }

        if (endpointRes.status === 'fulfilled') {
          const d = endpointRes.value.data as any
          const raw = d?.paymentRequestEndpointUrl ?? d?.url ?? d?.endpointUrl ?? d?.paymentRequestUrl ?? ''
          setEndpointUrl(raw ? processPaymentUrl(raw) : '')
        }

        if (webhooksRes.status === 'fulfilled') {
          const d = webhooksRes.value.data as any
          setWebhooksData(Array.isArray(d) ? d : (d?.webhooks ?? d?.items ?? d?.data ?? []))
        }

        if (walletRes.status === 'fulfilled') {
          const d = walletRes.value.data as any
          const wallet = d?.wallet ?? d?.data ?? d
          setWalletData(wallet ?? null)

          const wId = wallet?.walletId ?? wallet?.id
          if (wId) {
            try {
              const txRes = await userApi.getMerchantWalletTransactions(wId, { offset: 0, limit: 100 })
              const txd = txRes.data as any
              const list = Array.isArray(txd) ? txd : (txd?.transactions ?? txd?.items ?? txd?.data ?? [])
              setWalletTxs(list)
            } catch {}
          }
        }
      } catch {
        toast.error(mi.failedToLoad)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const orgCode   = data?.code ?? data?.merchantCode ?? data?.orgCode ?? data?.orgCustomId ?? ''
  const orgName   = data?.name ?? data?.merchantName ?? data?.orgName ?? ''
  const email     = data?.contactEmail ?? data?.email ?? data?.merchantEmail ?? ''
  const phone     = data?.contactPhone ?? data?.phone ?? data?.merchantPhone ?? ''
  const status    = data?.status ?? ''
  const payInFee  = data?.payinFeePct ?? data?.payInFeePercent
  const payOutFee = data?.payoutFeePct ?? data?.payOutFeePercent
  const payInMin  = data?.payinMinAmount ?? data?.payInMinAmount
  const payInMax  = data?.payinMaxAmount ?? data?.payInMaxAmount
  const payOutMin = data?.payoutMinAmount ?? data?.payOutMinAmount
  const payOutMax = data?.payoutMaxAmount ?? data?.payOutMaxAmount

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info',     label: mi.tabInfo,     icon: <Store      className="w-4 h-4" /> },
    { key: 'endpoint', label: mi.tabEndpoint, icon: <CreditCard className="w-4 h-4" /> },
    { key: 'webhooks', label: mi.tabWebhooks, icon: <Webhook    className="w-4 h-4" /> },
    { key: 'wallet',   label: mi.tabWallet,   icon: <Wallet     className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[40vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin" />
          <p className="text-sm">{mi.loading}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-none">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{mi.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orgCode || mi.pageSubtitle}</p>
        </div>
        {status && <StatusBadge status={status} />}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 flex-none overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap',
                activeTab === tab.key
                  ? 'text-primary-700 bg-primary-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>

        <div className={clsx('flex-1 p-6 flex flex-col', activeTab === 'wallet' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar')}>

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 space-y-5">
                <SectionHeader>{mi.sectionBasicInfo}</SectionHeader>
                <ReadonlyField label={mi.fieldCode}  value={orgCode} />
                <ReadonlyField label={mi.fieldName}  value={orgName} />
                <ReadonlyField label={mi.fieldEmail} value={email} />
                <ReadonlyField label={mi.fieldPhone} value={phone} />
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {mi.fieldStatus}
                  </label>
                  <div className="px-3 py-2.5 rounded-lg bg-white border border-gray-100 min-h-[38px] flex items-center">
                    {status ? <StatusBadge status={status} /> : <span className="text-gray-300 text-sm">—</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                  <SectionHeader>{mi.sectionFees}</SectionHeader>
                  <div className="grid grid-cols-2 gap-5">
                    <ReadonlyField label={mi.fieldPayInFee}  value={payInFee}  suffix="%" />
                    <ReadonlyField label={mi.fieldPayOutFee} value={payOutFee} suffix="%" />
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                  <SectionHeader>{mi.sectionLimits}</SectionHeader>
                  <div className="space-y-4">
                    <LimitRow label={mi.fieldPayIn}  min={payInMin}  max={payInMax}  minLabel={mi.fieldMin} maxLabel={mi.fieldMax} />
                    <LimitRow label={mi.fieldPayOut} min={payOutMin} max={payOutMax} minLabel={mi.fieldMin} maxLabel={mi.fieldMax} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Endpoint tab ── */}
          {activeTab === 'endpoint' && (
            <div>
              <SectionHeader>{mi.sectionEndpoint}</SectionHeader>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {mi.endpointLabel}
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                {endpointUrl
                  ? <p className="flex-1 text-xs font-mono text-gray-700 break-all">{endpointUrl}</p>
                  : <p className="flex-1 text-xs text-gray-300 italic">—</p>}
                <button
                  onClick={() => endpointUrl && handleCopy(endpointUrl)}
                  disabled={!endpointUrl}
                  className={clsx(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    copied ? 'bg-green-100 text-green-700'
                    : endpointUrl ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? mi.copied : mi.copy}
                </button>
              </div>
            </div>
          )}

          {/* ── Webhooks tab ── */}
          {activeTab === 'webhooks' && (
            <div className="flex-1 flex flex-col min-h-0">
              <SectionHeader>{mi.sectionWebhooks}</SectionHeader>
              <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-[180px]">{mi.colWebhookEvent}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{mi.colWebhookDescription}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-[40%]">{mi.colWebhookEndpoint}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 w-[120px]">{mi.colWebhookStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooksData.length > 0 ? webhooksData.map((wh: any, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3 text-gray-700 font-medium">{wh.eventName ?? wh.event ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{wh.description ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="text-sm font-mono break-all">{wh.endpointUrl ?? wh.url ?? '—'}</div>
                          {(wh.method ?? wh.httpMethod) && (
                            <div className="text-xs text-gray-400 mt-0.5 font-semibold">{wh.method ?? wh.httpMethod}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                            wh.isActive
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          )}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', wh.isActive ? 'bg-green-500' : 'bg-gray-400')} />
                            {wh.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {wh.lastCalledDate && (
                            <div className="text-[10px] text-gray-400 mt-1">{new Date(wh.lastCalledDate).toLocaleString('th-TH')}</div>
                          )}
                          {wh.lastStatus && (
                            <div className="text-[10px] text-gray-500 mt-0.5 font-mono">{wh.lastStatus}</div>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">{mi.noWebhooks}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Wallet tab ── */}
          {activeTab === 'wallet' && !walletData && (
            <EmptyState title={mi.noWallet} description={mi.noWalletDesc} />
          )}

          {activeTab === 'wallet' && walletData && (() => {
            const walletBalance = walletData?.pointBalanceDecimal ?? walletData?.currentBalanceDecimal ?? walletData?.balance
            const totalTxs = walletTxs.length
            const totalPages = Math.max(1, Math.ceil(totalTxs / walletPageSize))
            const pagedTxs = walletTxs.slice((walletPage - 1) * walletPageSize, walletPage * walletPageSize)
            const rangeStart = totalTxs === 0 ? 0 : (walletPage - 1) * walletPageSize + 1
            const rangeEnd = Math.min(walletPage * walletPageSize, totalTxs)
            return (
              <div className="flex-1 flex flex-col min-h-0 gap-4">
                {/* Info cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <SectionHeader>{mi.sectionBasicInfo}</SectionHeader>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.fieldCode}</p>
                        <p className="text-sm font-semibold text-gray-800">{orgCode || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.fieldName}</p>
                        <p className="text-sm text-gray-700">{orgName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.fieldStatus}</p>
                        {status ? <StatusBadge status={status} /> : <span className="text-gray-300 text-sm">—</span>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.fieldEmail}</p>
                        <p className="text-sm text-gray-700 break-all">{email || '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <SectionHeader>{mi.sectionWallet}</SectionHeader>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.walletId}</p>
                        <p className="text-xs font-mono text-gray-600 break-all">{walletData?.walletId ?? walletData?.id ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.walletBalance}</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {walletBalance != null
                            ? Number(walletBalance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions table */}
                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{mi.sectionWalletTxs}</h3>
                  <div className="flex-1 overflow-auto rounded-xl border border-gray-100 min-h-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 whitespace-nowrap">{mi.colTxDate}</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{mi.colTxTags}</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{mi.colTxDesc}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{mi.colTxPayIn}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{mi.colTxPayOut}</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{mi.colTxType}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{mi.colTxPrevBalance}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">{mi.colTxBalance}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedTxs.length > 0 ? pagedTxs.map((tx: any, idx) => {
                          const isPayIn = tx.txType === 1
                          const amount = tx.txAmountDecimal ?? tx.txAmount
                          const tags = typeof tx.tags === 'string' ? tx.tags : Array.isArray(tx.tags) ? tx.tags.join(', ') : ''
                          const payOutMatch = tags.match(/PayOutRequestId=\[([^\]]+)\]/)
                          return (
                            <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition">
                              <td className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">
                                {(tx.createdDate ?? tx.createdAt)
                                  ? new Date(tx.createdDate ?? tx.createdAt).toLocaleString('th-TH')
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-sm max-w-[200px] truncate">
                                {tags
                                  ? payOutMatch
                                    ? <Link href={`/payment/pay-out-requests/${payOutMatch[1]}`} className="text-orange-600 hover:underline">{tags}</Link>
                                    : tags
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-sm max-w-[160px] truncate">
                                {tx.description ?? <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {isPayIn && amount != null
                                  ? <span className="text-green-600">+{Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {!isPayIn && amount != null
                                  ? <span className="text-red-500">-{Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={clsx(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                  isPayIn ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                )}>
                                  {isPayIn ? 'Pay-In' : 'Pay-Out'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-700">
                                {(tx.previousBalanceDecimal ?? tx.previousBalance) != null
                                  ? Number(tx.previousBalanceDecimal ?? tx.previousBalance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                                {(tx.currentBalanceDecimal ?? tx.currentBalance) != null
                                  ? Number(tx.currentBalanceDecimal ?? tx.currentBalance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : <span className="text-gray-300 font-normal">—</span>}
                              </td>
                            </tr>
                          )
                        }) : (
                          <tr>
                            <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">{mi.noTransactions}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-3 px-1">
                    <p className="text-sm text-gray-500 font-medium">
                      {totalTxs} {mi.records}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{mi.rowsPerPage}</span>
                        <select
                          value={walletPageSize}
                          onChange={e => { setWalletPageSize(Number(e.target.value)); setWalletPage(1) }}
                          className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
                        >
                          {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <span className="text-sm text-gray-500">{rangeStart}–{rangeEnd} of {totalTxs}</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setWalletPage(p => Math.max(1, p - 1))}
                          disabled={walletPage === 1}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setWalletPage(p => Math.min(totalPages, p + 1))}
                          disabled={walletPage === totalPages}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

