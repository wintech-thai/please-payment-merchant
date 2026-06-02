'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { userApi } from '@/lib/api/user.api'
import { toast } from 'sonner'
import { ArrowLeft, Search, Loader2 } from 'lucide-react'
import { useLang } from '@/context/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import LeaveConfirmModal from '@/components/LeaveConfirmModal'
import type { ControllerPermissions } from '@/lib/api/types'

function SectionHeader({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
        <span className="w-1 h-5 bg-primary-500 rounded-full flex-shrink-0" />
        {children}
      </h2>
      {right}
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function CustomRoleUpdateContent() {
  const { t } = useLang()
  const tc = t.customRoles
  const params = useParams()
  const roleId = params?.id as string

  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [permGroups, setPermGroups] = useState<ControllerPermissions[]>([])
  const [permSearch, setPermSearch] = useState('')
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [loadingRole, setLoadingRole] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const { showConfirm, guardNavigation, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  useEffect(() => {
    const init = async () => {
      try {
        const [initRes, roleRes] = await Promise.allSettled([
          userApi.getInitialUserRolePermissions(),
          userApi.getCustomRoleById(roleId),
        ])

        let basePerms: ControllerPermissions[] = []
        if (initRes.status === 'fulfilled') {
          const raw = initRes.value.data as any
          basePerms = Array.isArray(raw) ? raw : (raw?.permissions ?? raw?.data ?? [])
        } else {
          toast.error(tc.failedToLoadPerms)
        }

        if (roleRes.status === 'fulfilled') {
          const raw = roleRes.value.data as any
          const role = raw?.role ?? raw?.customRole ?? raw
          setRoleName(role?.roleName ?? role?.name ?? '')
          setRoleDescription(role?.roleDescription ?? role?.description ?? '')
          const rawTags = role?.tags ?? ''
          setTags(rawTags ? rawTags.split(',').map((s: string) => s.trim()).filter(Boolean) : [])

          const existingPerms: ControllerPermissions[] = role?.permissions ?? []
          if (existingPerms.length > 0) {
            const existingMap = new Map<string, Map<string, boolean>>()
            existingPerms.forEach(ctrl => {
              const apiMap = new Map<string, boolean>()
              ctrl.apiPermissions.forEach(p => apiMap.set(p.apiName, p.isAllowed))
              existingMap.set(ctrl.controllerName, apiMap)
            })
            basePerms = basePerms.map(ctrl => ({
              ...ctrl,
              apiPermissions: ctrl.apiPermissions.map(p => ({
                ...p,
                isAllowed: existingMap.get(ctrl.controllerName)?.get(p.apiName) ?? p.isAllowed,
              })),
            }))
          }
        } else {
          toast.error(tc.failedToLoad2)
        }

        setPermGroups(basePerms)
      } finally {
        setLoadingPerms(false)
        setLoadingRole(false)
      }
    }
    init()
  }, [roleId])

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const val = tagInput.trim()
      if (!tags.includes(val)) setTags(prev => [...prev, val])
      setTagInput('')
      setIsDirty(true)
    }
  }

  const togglePermission = (controllerName: string, apiName: string) => {
    setIsDirty(true)
    setPermGroups(prev => prev.map(g =>
      g.controllerName !== controllerName ? g : {
        ...g,
        apiPermissions: g.apiPermissions.map(p => p.apiName !== apiName ? p : { ...p, isAllowed: !p.isAllowed }),
      }
    ))
  }

  const toggleController = (controllerName: string, value: boolean) => {
    setIsDirty(true)
    setPermGroups(prev => prev.map(g =>
      g.controllerName !== controllerName ? g : {
        ...g,
        apiPermissions: g.apiPermissions.map(p => ({ ...p, isAllowed: value })),
      }
    ))
  }

  const goBack = () => guardNavigation(() => { window.location.href = '/administration/custom-roles' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) { toast.error(tc.roleNameRequired); return }
    setSaving(true)
    try {
      const pendingTag = tagInput.trim()
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
      await userApi.updateCustomRoleById(roleId, {
        roleName: roleName.trim(),
        roleDescription: roleDescription.trim() || undefined,
        tags: finalTags.length ? finalTags.join(',') : undefined,
        permissions: permGroups,
      })
      setIsDirty(false)
      toast.success(tc.updatedSuccess)
      window.location.href = `/administration/custom-roles?highlight=${roleId}`
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tc.failedToUpdate)
      setSaving(false)
    }
  }

  const q = permSearch.toLowerCase()
  const filteredGroups = permGroups
    .map(g => ({ ...g, apiPermissions: q ? g.apiPermissions.filter(p => p.apiName.toLowerCase().includes(q)) : g.apiPermissions }))
    .filter(g => g.apiPermissions.length > 0 || g.controllerName.toLowerCase().includes(q))

  const totalSelected = permGroups.reduce((s, g) => s + g.apiPermissions.filter(p => p.isAllowed).length, 0)
  const totalPerms = permGroups.reduce((s, g) => s + g.apiPermissions.length, 0)

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)] text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">{t.admin.loading}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden h-[calc(100dvh-5rem)] sm:h-[calc(100dvh-6.5rem)]">
      {showConfirm && <LeaveConfirmModal onConfirm={confirmLeave} onCancel={cancelLeave} />}
      <div className="flex-none flex items-center gap-3 mb-6">
        <button onClick={goBack}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tc.editTitle}</h1>
          <p className="text-base text-gray-500 mt-0.5">{tc.editSubtitle}: <span className="font-semibold text-gray-700">{roleName}</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2 custom-scrollbar">
          {/* Role Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader>{tc.roleInfoSection}</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <FormField label={tc.fieldRoleName} required>
                <input value={roleName} onChange={e => { setRoleName(e.target.value); setIsDirty(true) }}
                  placeholder={tc.fieldRoleNamePlaceholder} className={inputCls} />
              </FormField>
              <FormField label={tc.fieldDescription}>
                <input value={roleDescription} onChange={e => { setRoleDescription(e.target.value); setIsDirty(true) }}
                  placeholder={tc.fieldDescPlaceholder} className={inputCls} />
              </FormField>
            </div>
            <FormField label={t.admin.tags}>
              <div className="flex flex-wrap gap-1.5 px-3 py-2 min-h-[42px] border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
                {tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded-full">
                    {tag}
                    <button type="button" onClick={() => { setTags(p => p.filter(t => t !== tag)); setIsDirty(true) }}
                      className="text-primary-400 hover:text-primary-700 ml-0.5 text-sm leading-none">×</button>
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? tc.typeAndPressEnterToAddTag : ''}
                  className="flex-1 min-w-24 text-sm outline-none bg-transparent" />
              </div>
            </FormField>
          </div>

          {/* Permissions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-7 py-6">
            <SectionHeader right={totalPerms > 0 ? (
              <span className="text-xs text-gray-400">{totalSelected} / {totalPerms} {tc.selectedCount}</span>
            ) : undefined}>
              {tc.permissionsSection}
            </SectionHeader>
            <div className="relative max-w-sm mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={permSearch} onChange={e => setPermSearch(e.target.value)}
                placeholder={tc.searchPermissions}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white" />
            </div>
            {loadingPerms ? (
              <div className="flex items-center gap-2 py-8 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">{tc.loadingPermissions}</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">{tc.noPermissionsFound}</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                {filteredGroups.map(group => {
                  const allChecked = group.apiPermissions.length > 0 && group.apiPermissions.every(p => p.isAllowed)
                  const someChecked = group.apiPermissions.some(p => p.isAllowed) && !allChecked
                  return (
                    <div key={group.controllerName}>
                      <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input type="checkbox" checked={allChecked}
                          ref={el => { if (el) el.indeterminate = someChecked }}
                          onChange={() => toggleController(group.controllerName, !allChecked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4" />
                        <span className="text-sm font-bold text-gray-800">{group.controllerName}</span>
                      </label>
                      {group.apiPermissions.map(perm => (
                        <label key={perm.apiName}
                          className="flex items-center gap-3 px-4 py-2.5 pl-11 cursor-pointer hover:bg-gray-50 transition-colors border-t border-gray-50">
                          <input type="checkbox" checked={perm.isAllowed}
                            onChange={() => togglePermission(group.controllerName, perm.apiName)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4" />
                          <span className="text-sm text-gray-700">{perm.apiName}</span>
                        </label>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-none -mx-3 sm:-mx-6 px-4 sm:px-8 py-4 flex items-center justify-end gap-3 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={goBack} className={cancelBtnCls}>
            {t.admin.cancel}
          </button>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{t.admin.saving}</> : t.admin.save}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white'
const cancelBtnCls = 'px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'
const primaryBtnCls = 'flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors'

export default function CustomRoleUpdatePage() {
  return <Suspense><CustomRoleUpdateContent /></Suspense>
}
