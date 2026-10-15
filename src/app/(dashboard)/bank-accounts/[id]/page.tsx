'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-4">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

export default function BankAccountDetailPage() {
  const { t } = useLang()
  const m = t.bankAccount
  const router = useRouter()
  const params = useParams()
  const bankAccountId = params.id as string

  const [account, setAccount] = useState<BankAccountItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bankAccountApi.getMyBankAccountById(bankAccountId)
      .then(res => {
        const raw = res.data as any
        if (raw?.Status === 'FORBIDDEN' || raw?.status === 'FORBIDDEN') {
          toast.error(m.failedToLoadAccount)
          router.push('/bank-accounts')
          return
        }
        const a: BankAccountItem = raw?.bankAccount ?? raw?.BankAccount ?? raw
        setAccount(a)
      })
      .catch(() => {
        toast.error(m.failedToLoadAccount)
        router.push('/bank-accounts')
      })
      .finally(() => setLoading(false))
  }, [bankAccountId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const balance = account?.currentBalanceDecimal ?? account?.currentBalance ?? account?.currentWalletBalanceDecimal ?? account?.currentWalletBalance

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {/* Header */}
      <div className="flex-none mb-6">
        <button
          onClick={() => router.push(`/bank-accounts?highlight=${bankAccountId}`)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {m.title}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{m.detailTitle}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {m.detailSubtitle} &quot;{account?.accountName || account?.accountNumber || bankAccountId.slice(0, 8)}&quot;
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-2">
        {/* Account Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.accountInfoSection}</SectionHeader>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldBank}</dt>
              <dd className="mt-0.5 font-semibold text-gray-800">{account?.bankName ?? account?.bankCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldAccountType}</dt>
              <dd className="mt-0.5 text-gray-700">
                {account?.accountType === 'PromptPay' ? m.accountTypePromptPay : account?.accountType === 'Native' ? m.accountTypeNative : (account?.accountType ?? '—')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldAccountNumber}</dt>
              <dd className="mt-0.5 text-gray-700">{account?.accountNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldAccountName}</dt>
              <dd className="mt-0.5 text-gray-700">{account?.accountName ?? '—'}</dd>
            </div>
            {account?.accountType === 'PromptPay' && (
              <div>
                <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldPromptPayId}</dt>
                <dd className="mt-0.5 text-gray-700">{account?.promptPayId ?? '—'}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldAccountLevel}</dt>
              <dd className="mt-0.5 text-gray-700">{account?.accountLevel ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.colStatus}</dt>
              <dd className="mt-0.5">
                {account?.status ? (
                  <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ring-1',
                    account.status.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
                  )}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', account.status.toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-gray-400')} />
                    {account.status}
                  </span>
                ) : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Pay-In Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{t.merchant.sectionTransactionLimits}</SectionHeader>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-4 bg-emerald-500 rounded-full flex-shrink-0" />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                {t.merchant.fieldPayIn}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldPayInMin}</dt>
                <dd className="mt-0.5 text-gray-700 tabular-nums">{account?.payinMinAmount != null ? fmtNum(account.payinMinAmount) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldPayInMax}</dt>
                <dd className="mt-0.5 text-gray-700 tabular-nums">{account?.payinMaxAmount != null ? fmtNum(account.payinMaxAmount) : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{m.fieldDailyQuota}</dt>
                <dd className="mt-0.5 text-gray-700 tabular-nums">{account?.dailyQuota != null ? fmtNum(account.dailyQuota) : '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
          <SectionHeader>{m.colBalance}</SectionHeader>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-900 tabular-nums">
              {balance != null ? balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </span>
            <Link
              href={`/bank-accounts/${bankAccountId}/wallet`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <Wallet className="w-4 h-4" />
              {m.txSummaryAction}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
