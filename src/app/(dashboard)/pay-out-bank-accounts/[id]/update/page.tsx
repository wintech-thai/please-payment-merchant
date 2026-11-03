'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { bankAccountApi } from '@/lib/api/bank-account.api'
import type { BankAccountItem, BankItem } from '@/lib/api/types'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import { useLang } from '@/context/LanguageContext'

const PROMPTPAY_RE = /^(0\d{9}|\d{13})$/
const DIGITS_ONLY_RE = /^\d+$/

export default function UpdatePayOutBankAccountPage() {
  const { t, lang } = useLang()
  const m = { ...t.bankAccount, ...t.payOutBankAccount }
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [account, setAccount] = useState<BankAccountItem | null>(null)
  const [banks, setBanks] = useState<BankItem[]>([])
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [promptPayId, setPromptPayId] = useState('')
  const [accountType, setAccountType] = useState<'PromptPay' | 'Native' | ''>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => {
    Promise.allSettled([
      bankAccountApi.getMyPayOutBankAccountById(id),
      bankAccountApi.getAvailableBanks(),
    ]).then(([accRes, banksRes]) => {
      if (banksRes.status === 'fulfilled') {
        const raw = banksRes.value.data as any
        setBanks(Array.isArray(raw) ? raw : (raw?.banks ?? raw?.Banks ?? []))
      }
      if (accRes.status === 'fulfilled') {
        const raw = accRes.value.data as any
        const a: BankAccountItem = raw?.bankAccount ?? raw?.BankAccount ?? raw
        setAccount(a)
        setBankCode(a.bankCode ?? '')
        setAccountNumber(a.accountNumber ?? '')
        setAccountName(a.accountName ?? '')
        setPromptPayId(a.promptPayId ?? '')
        setAccountType((a.accountType as 'PromptPay' | 'Native') ?? '')
        setTags(a.tags ? a.tags.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      } else {
        toast.error(m.failedToLoadAccount)
        router.push(`/pay-out-bank-accounts?highlight=${id}`)
      }
    }).finally(() => setLoading(false))
  }, [id, router])

  const mark = () => { if (!isDirty) setIsDirty(true) }
  const clearErr = (key: string) => setErrors(p => ({ ...p, [key]: '' }))

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const v = tagInput.trim()
      if (v && !tags.includes(v)) { setTags(prev => [...prev, v]); mark() }
      setTagInput('')
    }
  }
  const removeTag = (tag: string) => { setTags(prev => prev.filter(tg => tg !== tag)); mark() }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!accountNumber.trim()) {
      errs.accountNumber = m.accountNumberRequired
    } else if (!DIGITS_ONLY_RE.test(accountNumber.trim())) {
      errs.accountNumber = m.accountNumberInvalid
    }
    if (!accountName.trim()) {
      errs.accountName = m.accountNameRequired
    } else if (accountName.trim().length > 100) {
      errs.accountName = m.accountNameTooLong
    }
    if (accountType === 'PromptPay') {
      if (!promptPayId.trim()) {
        errs.promptPayId = m.promptPayIdRequired
      } else if (!PROMPTPAY_RE.test(promptPayId.trim())) {
        errs.promptPayId = m.promptPayIdInvalid
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDirty) { router.push(`/pay-out-bank-accounts?highlight=${id}`); return }
    if (!validate()) return
    setSaving(true)
    try {
      await bankAccountApi.updatePayOutBankAccountById(id, {
        BankCode: bankCode,
        AccountNumber: accountNumber.trim(),
        AccountName: accountName.trim(),
        AccountType: accountType,
        PromptPayId: accountType === 'PromptPay' ? promptPayId.trim() : undefined,
        AccountLevel: 'Selected',
        Tags: tags.length ? tags.join(',') : undefined,
      })
      setIsDirty(false)
      toast.success(m.updatedSuccess)
      router.push(`/pay-out-bank-accounts?highlight=${id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.description
        || err?.response?.data?.message
        || err?.response?.data?.Description
        || err?.response?.data?.Message
        || err?.message
        || m.failedToUpdate
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {t.admin.loading}
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}

      <div className="flex-none flex items-center gap-3 mb-6">
        <button
          onClick={() => guardNavigation(() => router.push(`/pay-out-bank-accounts?highlight=${id}`))}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{m.editTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{m.editSubtitle} &quot;{account?.accountName || account?.accountNumber || id.slice(0, 8)}&quot;</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{m.accountInfoSection}</SectionHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={m.fieldBank}>
                <select
                  value={bankCode}
                  disabled
                  className={clsx(inputCls(false), 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-75')}
                >
                  <option value="">{m.fieldBankPlaceholder}</option>
                  {banks.map(b => {
                    const name = lang === 'th'
                      ? (b.bankNameTh || b.bankNameEng || b.bankShortName || '')
                      : (b.bankNameEng || b.bankNameTh || b.bankShortName || '')
                    return (
                      <option key={b.bankCode} value={b.bankCode}>
                        {name ? `${b.bankCode} - ${name}` : b.bankCode}
                      </option>
                    )
                  })}
                </select>
              </FormField>

              <FormField label={m.fieldAccountType} required error={errors.accountType}>
                <select
                  value={accountType}
                  onChange={e => {
                    const v = e.target.value as 'PromptPay' | 'Native' | ''
                    setAccountType(v)
                    if (v !== 'PromptPay') { setPromptPayId(''); clearErr('promptPayId') }
                    mark(); clearErr('accountType')
                  }}
                  className={inputCls(!!errors.accountType)}
                >
                  <option value="">—</option>
                  <option value="PromptPay">{m.accountTypePromptPay}</option>
                  <option value="Native">{m.accountTypeNative}</option>
                </select>
              </FormField>

              <FormField label={m.fieldAccountNumber} required error={errors.accountNumber}>
                <input
                  value={accountNumber}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    setAccountNumber(v); mark(); clearErr('accountNumber')
                  }}
                  placeholder={m.fieldAccountNumberPlaceholder}
                  inputMode="numeric"
                  className={inputCls(!!errors.accountNumber)}
                />
              </FormField>

              <FormField label={m.fieldAccountName} required error={errors.accountName}
                hint={`${accountName.length}/100`}>
                <input
                  value={accountName}
                  onChange={e => {
                    if (e.target.value.length <= 100) { setAccountName(e.target.value); mark(); clearErr('accountName') }
                  }}
                  placeholder={m.fieldAccountNamePlaceholder}
                  maxLength={100}
                  className={inputCls(!!errors.accountName)}
                />
              </FormField>

              <FormField
                label={m.fieldPromptPayId}
                required={accountType === 'PromptPay'}
                error={errors.promptPayId}
              >
                <input
                  value={promptPayId}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '')
                    setPromptPayId(v); mark(); clearErr('promptPayId')
                  }}
                  disabled={accountType !== 'PromptPay'}
                  placeholder={accountType === 'PromptPay' ? m.fieldPromptPayIdPlaceholder : '—'}
                  inputMode="numeric"
                  className={clsx(inputCls(!!errors.promptPayId), accountType !== 'PromptPay' && 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                />
              </FormField>

              <FormField label={m.fieldAccountLevel} required>
                <select
                  value="Selected"
                  onChange={() => {}}
                  className={inputCls(false)}
                >
                  <option value="Selected">{m.accountLevelMerchantSpecify}</option>
                </select>
              </FormField>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{t.admin.tags}</SectionHeader>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-primary-400 hover:text-primary-700">&times;</button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={t.admin.typeAndPressEnterToAddTags}
              className={inputCls(false)}
            />
          </div>

        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={() => guardNavigation(() => router.push(`/pay-out-bank-accounts?highlight=${id}`))}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.admin.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {saving && <Spinner />}
            {saving ? t.admin.saving : t.admin.saveChanges}
          </button>
        </div>
      </form>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900 mb-5">
      <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
      {children}
    </h2>
  )
}

function FormField({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {hint && <span className="text-[11px] text-gray-400 normal-case tracking-normal">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const inputCls = (hasError: boolean) =>
  clsx(
    'w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-colors',
    hasError ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'
  )
