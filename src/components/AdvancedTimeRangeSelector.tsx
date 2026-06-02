'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Clock, ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'

export interface TimeRangeValue {
  type: 'relative' | 'absolute'
  value: string
  start?: number
  end?: number
  label?: string
}

interface Props {
  value: TimeRangeValue
  onChange: (value: TimeRangeValue) => void
  disabled?: boolean
  className?: string
}

function toLocalStr(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalStr(str: string): number {
  return Math.floor(new Date(str).getTime() / 1000)
}

function fmtAbsLabel(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function calcRelativeStart(value: string): number {
  const num = parseInt(value)
  const unit = value.replace(/\d/g, '')
  const now = Date.now()
  if (unit === 'm') return Math.floor((now - num * 60_000) / 1000)
  if (unit === 'h') return Math.floor((now - num * 3_600_000) / 1000)
  return Math.floor((now - num * 86_400_000) / 1000)
}

export function AdvancedTimeRangeSelector({ value, onChange, disabled, className }: Props) {
  const { t } = useLang()
  const tAL = t.auditLog

  const quickRanges = useMemo(() => [
    { value: '5m',  label: tAL.last5m },
    { value: '15m', label: tAL.last15m },
    { value: '30m', label: tAL.last30m },
    { value: '1h',  label: tAL.last1h },
    { value: '3h',  label: tAL.last3h },
    { value: '6h',  label: tAL.last6h },
    { value: '12h', label: tAL.last12h },
    { value: '24h', label: tAL.last24h },
    { value: '2d',  label: tAL.last2d },
    { value: '7d',  label: tAL.last7d },
    { value: '30d', label: tAL.last30d },
  ], [tAL])

  const [isOpen, setIsOpen] = useState(false)
  const [fromStr, setFromStr] = useState('')
  const [toStr, setToStr] = useState('')
  const [activeTab, setActiveTab] = useState<'quick' | 'absolute'>(value.type === 'absolute' ? 'absolute' : 'quick')
  const [search, setSearch] = useState('')
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setActiveTab(value.type === 'absolute' ? 'absolute' : 'quick') }, [value.type])

  const calcPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('resize', calcPos)
    window.addEventListener('scroll', calcPos, true)
    return () => { window.removeEventListener('resize', calcPos); window.removeEventListener('scroll', calcPos, true) }
  }, [isOpen, calcPos])

  useEffect(() => {
    if (!isOpen) return
    const nowSec = Math.floor(Date.now() / 1000)
    if (value.type === 'absolute' && value.start && value.end) {
      setFromStr(toLocalStr(value.start)); setToStr(toLocalStr(value.end))
    } else {
      setFromStr(toLocalStr(calcRelativeStart(value.value || '24h'))); setToStr(toLocalStr(nowSec))
    }
  }, [isOpen, value.type, value.value, value.start, value.end])

  const handleApplyAbsolute = () => {
    if (!fromStr || !toStr) return
    const start = fromLocalStr(fromStr)
    const end = fromLocalStr(toStr)
    onChange({ type: 'absolute', value: 'custom', start, end, label: `${fmtAbsLabel(start)} → ${fmtAbsLabel(end)}` })
    setIsOpen(false)
  }

  const handleSelectRelative = (range: { value: string; label: string }) => {
    onChange({ type: 'relative', value: range.value, label: range.label })
    setIsOpen(false)
  }

  const filteredRanges = search
    ? quickRanges.filter(r => r.label.toLowerCase().includes(search.toLowerCase()))
    : quickRanges

  const displayLabel = useMemo(() => {
    if (value.type === 'absolute') {
      if (value.start && value.end) return `${fmtAbsLabel(value.start)} → ${fmtAbsLabel(value.end)}`
      return value.label ?? tAL.customRange
    }
    return quickRanges.find(r => r.value === value.value)?.label ?? value.label ?? tAL.last24h
  }, [value, quickRanges, tAL])

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button ref={buttonRef} disabled={disabled}
        onClick={() => { if (!isOpen) calcPos(); setIsOpen(v => !v) }}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors min-w-[180px] justify-between disabled:opacity-50">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="fixed z-[200] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden w-[calc(100vw-2rem)] sm:w-[560px]"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}>
          <div className="flex sm:hidden border-b border-gray-100">
            <button onClick={() => setActiveTab('quick')}
              className={clsx('flex-1 py-2.5 text-xs font-medium transition-colors',
                activeTab === 'quick' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-400 hover:text-gray-600')}>
              {tAL.quickRanges}
            </button>
            <button onClick={() => setActiveTab('absolute')}
              className={clsx('flex-1 py-2.5 text-xs font-medium transition-colors',
                activeTab === 'absolute' ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' : 'text-gray-400 hover:text-gray-600')}>
              {tAL.absoluteRange}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row h-[360px] sm:h-[400px]">
            <div className={clsx('flex-1 p-5 border-r border-gray-100 flex flex-col gap-4', activeTab !== 'absolute' && 'hidden sm:flex')}>
              <h4 className="hidden sm:block font-semibold text-sm text-gray-800">{tAL.absoluteRange}</h4>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">{tAL.absoluteFrom}</label>
                  <input type="datetime-local" value={fromStr} onChange={e => setFromStr(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-700 bg-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">{tAL.absoluteTo}</label>
                  <input type="datetime-local" value={toStr} onChange={e => setToStr(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-700 bg-white" />
                </div>
              </div>
              <div className="mt-auto">
                <button onClick={handleApplyAbsolute} disabled={!fromStr || !toStr}
                  className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {tAL.apply}
                </button>
              </div>
            </div>

            <div className={clsx('w-full sm:w-[200px] flex flex-col bg-gray-50/60', activeTab !== 'quick' && 'hidden sm:flex')}>
              <div className="p-3 border-b border-gray-100">
                <input type="text" placeholder={tAL.searchRange} value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-400 focus:border-primary-400 transition-colors" />
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
                {filteredRanges.map(range => (
                  <button key={range.value} onClick={() => handleSelectRelative(range)}
                    className={clsx('w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-between gap-2',
                      value.type === 'relative' && value.value === range.value
                        ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-500 font-medium'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900')}>
                    <span>{range.label}</span>
                    {value.type === 'relative' && value.value === range.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
