'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useOrgChange } from '@/hooks/useOrgChange'
import { userApi } from '@/lib/api/user.api'
import { paymentRequestApi } from '@/lib/api/payment-request.api'
import { useLang } from '@/context/LanguageContext'
import { toast } from 'sonner'
import clsx from 'clsx'
import { Loader2, Copy, Check, Store, CreditCard, Webhook, Wallet, ChevronLeft, ChevronRight, ExternalLink, Mail, Phone, Hash, User, Activity, Percent, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Zap, Globe } from 'lucide-react'

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
  payinDailyTxAmountLimit?: number | null
  payinDailyTxCountLimit?: number | null
  currentPayinDailyTxAmount?: number | null
  currentPayinDailyTxCount?: number | null
  status?: string
  discardCent?: boolean | null
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

function DailyBar({ current, limit }: { current: number; limit: number }) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function SectionHeader({ children, icon, color = 'primary' }: { children: React.ReactNode; icon?: React.ReactNode; color?: 'primary' | 'emerald' | 'blue' | 'violet' | 'amber' }) {
  const bar = color === 'emerald' ? 'bg-emerald-500' : color === 'blue' ? 'bg-blue-500' : color === 'violet' ? 'bg-violet-500' : color === 'amber' ? 'bg-amber-500' : 'bg-primary-500'
  const ico = color === 'emerald' ? 'text-emerald-500' : color === 'blue' ? 'text-blue-500' : color === 'violet' ? 'text-violet-500' : color === 'amber' ? 'text-amber-500' : 'text-primary-400'
  return (
    <h2 className="flex items-center gap-2.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
      <span className={clsx('w-1 h-4 rounded-full flex-shrink-0', bar)} />
      {icon && <span className={ico}>{icon}</span>}
      {children}
    </h2>
  )
}

function ReadonlyField({ label, value, mono, suffix, icon }: { label: string; value?: string | number | null; mono?: boolean; suffix?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {icon && <span className="text-gray-300">{icon}</span>}
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

function FeeCard({ label, value, color }: { label: string; value?: number | null; color: 'emerald' | 'blue' }) {
  const isEmerald = color === 'emerald'
  const Icon = isEmerald ? ArrowDownCircle : ArrowUpCircle
  return (
    <div className={clsx(
      'rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden',
      isEmerald ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'
    )}>
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 bg-white -translate-y-4 translate-x-4" />
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80">
        <Icon className="w-3.5 h-3.5 text-white/70" />
        {label}
      </div>
      <div className="text-2xl font-bold text-white">
        {value != null ? `${value}%` : <span className="text-white/40 text-sm font-normal">—</span>}
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
  const [payOutEndpointUrl, setPayOutEndpointUrl] = useState('')
  const [copiedPayOut, setCopiedPayOut] = useState(false)
  const [webhooksData, setWebhooksData] = useState<any[]>([])
  const [walletData, setWalletData] = useState<any | null>(null)
  const [walletTxs, setWalletTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [walletPage, setWalletPage] = useState(1)
  const [walletPageSize, setWalletPageSize] = useState(25)
  const [highlightedTxIdx, setHighlightedTxIdx] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useOrgChange(() => setReloadKey(k => k + 1))

  useEffect(() => {
    const load = async () => {
      try {
        // Call all merchant endpoints in parallel — backend resolves merchantId from current user
        const [detailRes, endpointRes, payOutEndpointRes, webhooksRes, walletRes] = await Promise.allSettled([
          userApi.getMyMerchantInfo(),
          userApi.getMerchantPaymentEndpoint(),
          userApi.getMerchantPayOutEndpoint(),
          userApi.getMerchantWebhooks(),
          userApi.getMerchantWallet(),
        ])

        if (detailRes.status === 'rejected') throw detailRes.reason
        const d = detailRes.value.data as any
        const detail = d?.merchant ?? d?.merchantInfo ?? d?.data ?? d
        if (detail) setData(detail)

        if (endpointRes.status === 'fulfilled') {
          const d = endpointRes.value.data as any
          const raw = d?.paymentRequestEndpointUrl ?? d?.url ?? d?.endpointUrl ?? d?.paymentRequestUrl ?? ''
          setEndpointUrl(raw ? processPaymentUrl(raw) : '')
        }

        if (payOutEndpointRes.status === 'fulfilled') {
          const d = payOutEndpointRes.value.data as any
          const raw = d?.paymentRequestUrl ?? d?.payOutEndpointUrl ?? d?.payoutEndpointUrl ?? d?.paymentRequestEndpointUrl ?? d?.url ?? d?.endpointUrl ?? ''
          setPayOutEndpointUrl(raw ? processPaymentUrl(raw) : '')
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
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : mi.failedToLoad)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reloadKey])

  const orgCode   = data?.code ?? data?.merchantCode ?? data?.orgCode ?? data?.orgCustomId ?? ''
  const orgName   = data?.name ?? data?.merchantName ?? data?.orgName ?? ''
  const email     = data?.contactEmail ?? data?.email ?? data?.merchantEmail ?? ''
  const phone     = data?.contactPhone ?? data?.phone ?? data?.merchantPhone ?? ''
  const status    = data?.status ?? ''
  const payInFee  = data?.payinFeePct ?? data?.payInFeePercent
  const payOutFee = data?.payoutFeePct ?? data?.payOutFeePercent
  const payInMin    = data?.payinMinAmount ?? data?.payInMinAmount
  const payInMax    = data?.payinMaxAmount ?? data?.payInMaxAmount
  const payOutMin   = data?.payoutMinAmount ?? data?.payOutMinAmount
  const payOutMax   = data?.payoutMaxAmount ?? data?.payOutMaxAmount
  const payinDailyAmountLimit = data?.payinDailyTxAmountLimit ?? null
  const payinDailyCountLimit  = data?.payinDailyTxCountLimit ?? null
  const currentDailyAmount    = data?.currentPayinDailyTxAmount ?? null
  const currentDailyCount     = data?.currentPayinDailyTxCount ?? null
  const discardCent = data?.discardCent ?? false

  function handleCopy(text: string, type: 'payin' | 'payout' = 'payin') {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'payout') {
        setCopiedPayOut(true)
        setTimeout(() => setCopiedPayOut(false), 2000)
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    })
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; activeClass: string; iconClass: string }[] = [
    { key: 'info',     label: mi.tabInfo,     icon: <Store      className="w-4 h-4" />, activeClass: 'bg-emerald-500 text-white shadow-md shadow-emerald-200', iconClass: 'text-emerald-500' },
    { key: 'endpoint', label: mi.tabEndpoint, icon: <CreditCard className="w-4 h-4" />, activeClass: 'bg-blue-500 text-white shadow-md shadow-blue-200',    iconClass: 'text-blue-500' },
    { key: 'webhooks', label: mi.tabWebhooks, icon: <Webhook    className="w-4 h-4" />, activeClass: 'bg-violet-500 text-white shadow-md shadow-violet-200', iconClass: 'text-violet-500' },
    { key: 'wallet',   label: mi.tabWallet,   icon: <Wallet     className="w-4 h-4" />, activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-200',   iconClass: 'text-amber-500' },
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
        <div className="flex-none px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                  activeTab === tab.key
                    ? tab.activeClass
                    : clsx('text-gray-500 hover:bg-white hover:shadow-sm', `hover:${tab.iconClass}`)
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={clsx('flex-1 p-6 flex flex-col', activeTab === 'wallet' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar')}>

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Merchant header card */}
              <div className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-500 p-5 flex items-center gap-4 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-bold flex-shrink-0 border border-white/30">
                  {(orgName || orgCode || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{orgName || orgCode || '—'}</p>
                  <p className="text-sm text-white/70 truncate">{orgCode}</p>
                  {email && <p className="text-xs text-white/60 truncate mt-0.5">{email}</p>}
                </div>
                <div className="ml-auto flex-shrink-0">
                  <StatusBadge status={status} />
                </div>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6 space-y-5">
                <SectionHeader icon={<Store className="w-3.5 h-3.5" />} color="emerald">{mi.sectionBasicInfo}</SectionHeader>
                <ReadonlyField label={mi.fieldCode}  value={orgCode} icon={<Hash className="w-3 h-3" />} />
                <ReadonlyField label={mi.fieldName}  value={orgName} icon={<User className="w-3 h-3" />} />
                <ReadonlyField label={mi.fieldEmail} value={email}   icon={<Mail className="w-3 h-3" />} />
                <ReadonlyField label={mi.fieldPhone} value={phone}   icon={<Phone className="w-3 h-3" />} />
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    <Activity className="w-3 h-3 text-gray-300" />
                    {mi.fieldStatus}
                  </label>
                  <div className="px-3 py-2.5 rounded-lg bg-white border border-gray-100 min-h-[38px] flex items-center">
                    {status ? <StatusBadge status={status} /> : <span className="text-gray-300 text-sm">—</span>}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    <Zap className="w-3 h-3 text-gray-300" />
                    {mi.fieldDiscardCent}
                  </label>
                  <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 min-h-[38px] flex items-center gap-2">
                    <span className={clsx(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                      discardCent
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full', discardCent ? 'bg-emerald-500' : 'bg-gray-400')} />
                      {discardCent ? mi.discardCentEnabled : mi.discardCentDisabled}
                    </span>
                    <span className="text-xs text-gray-400">{mi.fieldDiscardCentHint}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                  <SectionHeader icon={<Percent className="w-3.5 h-3.5" />} color="emerald">{mi.sectionFees}</SectionHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <FeeCard label={mi.fieldPayInFee}  value={payInFee}  color="emerald" />
                    <FeeCard label={mi.fieldPayOutFee} value={payOutFee} color="blue" />
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                  <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} color="amber">{mi.sectionLimits}</SectionHeader>
                  <div className="space-y-4">
                    <LimitRow label={mi.fieldPayIn}  min={payInMin}  max={payInMax}  minLabel={mi.fieldMin} maxLabel={mi.fieldMax} />
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 overflow-hidden">
                      <div className="grid grid-cols-2 divide-x divide-amber-100">
                        <div className="px-4 py-3">
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">{mi.fieldDailyTxAmountLimit}</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {payinDailyAmountLimit != null ? (payinDailyAmountLimit === 0 ? '∞' : payinDailyAmountLimit.toLocaleString()) : <span className="text-gray-300 font-normal">—</span>}
                          </p>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">{mi.fieldDailyTxCountLimit}</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {payinDailyCountLimit != null ? (payinDailyCountLimit === 0 ? '∞' : payinDailyCountLimit.toLocaleString()) : <span className="text-gray-300 font-normal">—</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                    <LimitRow label={mi.fieldPayOut} min={payOutMin} max={payOutMax} minLabel={mi.fieldMin} maxLabel={mi.fieldMax} />
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* ── Endpoint tab ── */}
          {activeTab === 'endpoint' && (
            <div className="flex flex-col gap-5 max-w-2xl">
              <SectionHeader icon={<CreditCard className="w-3.5 h-3.5" />} color="blue">{mi.sectionEndpoint}</SectionHeader>

              {/* Pay-In endpoint */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border-b border-gray-200">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">POST</span>
                  <span className="text-xs font-semibold text-emerald-800">{mi.endpointLabel}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                  {endpointUrl
                    ? <code className="flex-1 text-xs text-gray-700 font-mono break-all">{endpointUrl}</code>
                    : <span className="flex-1 text-xs text-gray-300 italic">—</span>}
                  <button
                    onClick={() => endpointUrl && handleCopy(endpointUrl, 'payin')}
                    disabled={!endpointUrl}
                    className={clsx(
                      'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      copied ? 'bg-green-100 text-green-700'
                      : endpointUrl ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    )}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? mi.copied : mi.copy}
                  </button>
                </div>
              </div>

              {/* Pay-Out endpoint */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-gray-200">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">POST</span>
                  <span className="text-xs font-semibold text-blue-800">{mi.endpointPayOutLabel}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
                  {payOutEndpointUrl
                    ? <code className="flex-1 text-xs text-gray-700 font-mono break-all">{payOutEndpointUrl}</code>
                    : <span className="flex-1 text-xs text-gray-300 italic">—</span>}
                  <button
                    onClick={() => payOutEndpointUrl && handleCopy(payOutEndpointUrl, 'payout')}
                    disabled={!payOutEndpointUrl}
                    className={clsx(
                      'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                      copiedPayOut ? 'bg-green-100 text-green-700'
                      : payOutEndpointUrl ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    )}
                  >
                    {copiedPayOut ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPayOut ? mi.copied : mi.copy}
                  </button>
                </div>
              </div>

              {/* API Documentation link */}
              <div>
                <a
                  href={typeof window !== 'undefined' ? `https://${window.location.hostname.replace(/^merchant/, 'admin')}/documents/endpoints` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 text-primary-600 text-sm font-semibold hover:bg-primary-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {mi.viewApiDocs}
                </a>
              </div>
            </div>
          )}

          {/* ── Webhooks tab ── */}
          {activeTab === 'webhooks' && (
            <div className="flex-1 flex flex-col min-h-0">
              <SectionHeader icon={<Globe className="w-3.5 h-3.5" />} color="violet">{mi.sectionWebhooks}</SectionHeader>
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
                    {webhooksData.length > 0 ? (webhooksData as any[]).map((wh: any, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          {(() => {
                            const ev = wh.eventName ?? wh.event ?? ''
                            if (!ev) return <span className="text-gray-300">—</span>
                            const isSuccess = /success/i.test(ev)
                            const isReject = /reject/i.test(ev)
                            const cls = isSuccess
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : isReject
                              ? 'bg-red-100 text-red-600 border-red-200'
                              : 'bg-violet-100 text-violet-700 border-violet-200'
                            return (
                              <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border', cls)}>
                                <Zap className="w-3 h-3" />
                                {ev}
                              </span>
                            )
                          })()}
                        </td>
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
                        <td colSpan={4} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Webhook className="w-5 h-5 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">{mi.noWebhooks}</p>
                          </div>
                        </td>
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
                    <div className="mt-3 grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.walletId}</p>
                          <p className="text-xs text-gray-600 break-all">{walletData?.walletId ?? walletData?.id ?? '—'}</p>
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
                      <div className="space-y-3">
                        {payinDailyAmountLimit != null && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.fieldPayInDailyAmount}</p>
                            {payinDailyAmountLimit > 0 ? (
                              <>
                                <p className="text-xs text-gray-500 mb-1">
                                  {currentDailyAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'} / {payinDailyAmountLimit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <DailyBar current={currentDailyAmount ?? 0} limit={payinDailyAmountLimit} />
                              </>
                            ) : (
                              <p className="text-sm text-gray-600">{currentDailyAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'} / {mi.unlimitedText}</p>
                            )}
                          </div>
                        )}
                        {payinDailyCountLimit != null && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{mi.fieldPayInDailyCount}</p>
                            {payinDailyCountLimit > 0 ? (
                              <>
                                <p className="text-xs text-gray-500 mb-1">{currentDailyCount ?? 0} / {payinDailyCountLimit}</p>
                                <DailyBar current={currentDailyCount ?? 0} limit={payinDailyCountLimit} />
                              </>
                            ) : (
                              <p className="text-sm text-gray-600">{currentDailyCount ?? 0} / {mi.unlimitedText}</p>
                            )}
                          </div>
                        )}
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
                          const payInTxMatch = tags.match(/PaymentTxId=\[([^\]]+)\]/)
                          const payInReqMatch = tags.match(/PaymentRequestId=\[([^\]]+)\]/)
                          const refId1 = tags.match(/RefId1=\[([^\]]+)\]/)?.[1] ?? null
                          const tagUuid = (payOutMatch ?? payInTxMatch ?? payInReqMatch)?.[1] ?? null
                          const tagLink = payOutMatch
                            ? `/payment/pay-out-requests/${payOutMatch[1]}`
                            : payInTxMatch
                            ? `/payment/pay-in-transactions/${payInTxMatch[1]}`
                            : payInReqMatch
                            ? `/payment/pay-in-requests/${payInReqMatch[1]}`
                            : null
                          const tagLabel = refId1 ?? (payOutMatch ? 'Pay-Out' : payInTxMatch ? 'Pay-In Tx' : 'Pay-In Req')
                          const globalIdx = (walletPage - 1) * walletPageSize + idx
                          const isHighlighted = highlightedTxIdx === globalIdx
                          return (
                            <tr key={idx}
                              onClick={() => setHighlightedTxIdx(isHighlighted ? null : globalIdx)}
                              className={clsx(
                                'border-b border-gray-100 last:border-0 cursor-pointer transition-colors',
                                isHighlighted
                                  ? '!bg-primary-100 border-l-[3px] border-l-primary-500'
                                  : 'hover:bg-gray-50/50'
                              )}>
                              <td className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">
                                {(tx.createdDate ?? tx.createdAt)
                                  ? new Date(tx.createdDate ?? tx.createdAt).toLocaleString('th-TH')
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-sm max-w-[200px] truncate">
                                {tags
                                  ? tagLink && tagUuid
                                    ? payOutMatch
                                      ? <button
                                          type="button"
                                          onClick={async (e) => {
                                            e.stopPropagation()
                                            try {
                                              await paymentRequestApi.getPayOutRequestById(payOutMatch[1])
                                              window.open(tagLink, '_blank', 'noopener,noreferrer')
                                            } catch {
                                              toast.error(mi.crossMerchantTitle, { description: mi.crossMerchantDesc })
                                            }
                                          }}
                                          className="inline-block px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80 transition-opacity bg-red-100 text-red-700 cursor-pointer"
                                        >
                                          {tagLabel}
                                        </button>
                                      : <Link href={tagLink} target="_blank" rel="noopener noreferrer" className={clsx(
                                          'inline-block px-2 py-0.5 rounded text-xs font-semibold hover:opacity-80 transition-opacity',
                                          payInTxMatch && 'bg-green-100 text-green-700',
                                          payInReqMatch && 'bg-blue-100 text-blue-700',
                                        )}>
                                          {tagLabel}
                                        </Link>
                                    : <span className="text-gray-500 text-xs">{tags}</span>
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
                                  'inline-block px-2 py-0.5 rounded text-xs font-semibold',
                                  isPayIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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

