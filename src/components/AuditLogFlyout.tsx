'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X, FileJson, Table as TableIcon, Search,
  ChevronLeft, ChevronRight, Copy, Check,
  Hash, ToggleLeft, Type,
} from 'lucide-react'
import clsx from 'clsx'
import { useLang } from '@/context/LanguageContext'
import type { AuditLogDocument } from '@/lib/api/audit-log.api'

const flattenObject = (obj: unknown, prefix = ''): Record<string, unknown> => {
  const items: Record<string, unknown> = {}
  if (!obj || typeof obj !== 'object') return items
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (key === 'id') continue
    const newKey = prefix ? `${prefix}.${key}` : key
    const val = (obj as Record<string, unknown>)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(items, flattenObject(val, newKey))
    } else {
      items[newKey] = val
    }
  }
  return items
}

const getTypeIcon = (val: unknown) => {
  if (typeof val === 'number') return <Hash size={12} />
  if (typeof val === 'boolean') return <ToggleLeft size={12} />
  return <Type size={12} />
}

const getValueColor = (val: unknown) => {
  if (typeof val === 'number') return 'text-emerald-600'
  if (typeof val === 'boolean') return 'text-primary-600 font-bold'
  if (val === null || val === undefined) return 'text-gray-400 italic'
  return 'text-amber-600'
}

const highlightJson = (json: unknown) =>
  JSON.stringify(json, null, 2).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-600'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) cls = 'text-primary-700 font-semibold'
      } else if (/true|false/.test(match)) cls = 'text-primary-600 font-bold'
      else if (/null/.test(match)) cls = 'text-gray-400 italic'
      else if (!isNaN(Number(match))) cls = 'text-emerald-600'
      return `<span class="${cls}">${match}</span>`
    }
  )

interface Props {
  event: AuditLogDocument | null
  events?: AuditLogDocument[]
  currentIndex?: number
  onNavigate?: (index: number) => void
  onClose: () => void
}

export default function AuditLogFlyout({ event, events = [], currentIndex = -1, onNavigate, onClose }: Props) {
  const { t } = useLang()
  const tAL = t.auditLog

  const [tab, setTab] = useState<'table' | 'json'>('table')
  const [search, setSearch] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const flatData = useMemo(() => (event ? flattenObject(event) : {}), [event])
  const sortedKeys = useMemo(() => Object.keys(flatData).sort(), [flatData])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!event) return
      if (document.activeElement?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') onNavigate?.(currentIndex - 1)
      if (e.key === 'ArrowRight') onNavigate?.(currentIndex + 1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [event, currentIndex, onNavigate, onClose])

  if (!event) return null

  const handleCopyValue = (text: unknown, id: string) => {
    const str = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text)
    navigator.clipboard.writeText(str)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2))
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const isMatch = (k: string, v: unknown, term: string) => {
    if (!term) return true
    const lo = term.toLowerCase()
    return k.toLowerCase().includes(lo) || String(v).toLowerCase().includes(lo)
  }

  const filteredKeys = sortedKeys.filter(k => isMatch(k, flatData[k], search))

  return (
    <>
      <div className="fixed inset-0 z-[99] bg-primary-950/20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full max-w-[640px] bg-white border-l border-primary-100 shadow-[-20px_0_60px_rgba(37,99,235,0.12)] z-[100] flex flex-col">
        {/* Header */}
        <div className="flex-none px-5 py-4 bg-primary-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">{tAL.flyoutTitle}</h3>
            {events.length > 0 && (
              <div className="flex items-center text-primary-100 text-[10px] font-medium gap-0.5 bg-primary-700 rounded-md border border-primary-500 p-0.5 select-none">
                <button disabled={currentIndex <= 0} onClick={() => onNavigate?.(currentIndex - 1)}
                  className="p-1 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 min-w-[64px] text-center tabular-nums">
                  {currentIndex >= 0 ? `${currentIndex + 1} ${tAL.flyoutOf} ${events.length}` : `0 ${tAL.flyoutOf} 0`}
                </span>
                <button disabled={currentIndex >= events.length - 1} onClick={() => onNavigate?.(currentIndex + 1)}
                  className="p-1 hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-primary-200 hover:text-white p-1.5 rounded-full hover:bg-primary-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-none flex px-5 border-b border-gray-100 bg-white">
          <button onClick={() => setTab('table')}
            className={clsx('flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 mr-6 transition-all',
              tab === 'table' ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent hover:text-gray-600')}>
            <TableIcon size={14} /> {tAL.flyoutTable}
          </button>
          <button onClick={() => setTab('json')}
            className={clsx('flex items-center gap-2 px-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
              tab === 'json' ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent hover:text-gray-600')}>
            <FileJson size={14} /> {tAL.flyoutJson}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {tab === 'table' ? (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-none p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder={tAL.flyoutSearchPlaceholder}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-none flex border-b border-primary-100 bg-primary-50 text-[10px] font-bold text-primary-600 uppercase tracking-widest select-none">
                <div className="w-[38%] px-4 py-2 border-r border-primary-100">{tAL.flyoutField}</div>
                <div className="w-[62%] px-4 py-2">{tAL.flyoutValue}</div>
              </div>
              <div className="flex-1 overflow-auto pb-8 custom-scrollbar">
                {filteredKeys.map(k => {
                  const v = flatData[k]
                  return (
                    <div key={k} className="flex border-b border-gray-50 hover:bg-primary-50/60 transition-colors">
                      <div className="w-[38%] px-4 py-2.5 border-r border-gray-100 flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 hidden sm:inline-block flex-shrink-0">{getTypeIcon(v)}</span>
                        <span className="font-semibold text-primary-700 truncate text-xs select-text cursor-text" title={k}>{k}</span>
                      </div>
                      <div className="w-[62%] px-4 py-2.5 min-w-0">
                        <div className="relative group/val pr-8 flex items-start min-h-[20px]">
                          <span className={clsx('font-mono text-xs select-text cursor-text break-all', getValueColor(v))}>{String(v)}</span>
                          <button onClick={() => handleCopyValue(v, k)}
                            className={clsx('absolute right-0 top-0 p-1.5 rounded-md bg-white border border-gray-200 text-gray-400 opacity-0 group-hover/val:opacity-100 transition-all flex-shrink-0 hover:border-primary-300 hover:text-primary-600',
                              copiedId === k && 'opacity-100 text-green-600 border-green-300')}>
                            {copiedId === k ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-none p-4 border-b border-gray-100">
                <button onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 hover:text-primary-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 transition-all hover:border-primary-300 hover:bg-primary-50">
                  {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {isCopied ? tAL.flyoutCopied : tAL.flyoutCopyJson}
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-gray-50 custom-scrollbar">
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap select-text text-gray-800"
                  dangerouslySetInnerHTML={{ __html: highlightJson(event) }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
