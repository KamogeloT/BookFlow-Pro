import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type Service = {
  id: string
  name: string
  code: string
  duration_minutes: number
  is_active: boolean
  branch_id: string | null
  category_id: string | null
}
type SubService = {
  id: string
  service_id: string
  name: string
  code: string
  duration_override_minutes: number | null
  is_active: boolean
}
type Branch = { id: string; name: string }
type Category = { id: string; name: string }
type ResourceType = { id: string; name: string; code: string }
type ServiceResourceLink = {
  id: string
  service_id: string
  resource_type_id: string
  is_active: boolean
}

const SETTINGS_ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

/** Turn a display name into a tenant-unique-style code when the user leaves Code blank */
function deriveServiceCodeFromName(name: string): string {
  const raw = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return (raw || 'SERVICE').slice(0, 64)
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Request failed'
}

export function ServicesSettingsPage() {
  return (
    <RoleGuard allowedRoles={[...SETTINGS_ROLES]}>
      <ServicesInner />
    </RoleGuard>
  )
}

function ServicesInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [services, setServices] = useState<Service[]>([])
  const [subsByService, setSubsByService] = useState<Record<string, SubService[]>>({})
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [newSvc, setNewSvc] = useState({
    name: '',
    code: '',
    duration_minutes: 30,
    branch_id: '',
    category_id: '',
    resource_type_id: '',
  })
  /** When true, code field updates whenever name changes */
  const [isServiceCodeAuto, setIsServiceCodeAuto] = useState(true)
  const [newSub, setNewSub] = useState<Record<string, { name: string; code: string }>>({})
  const [newCategoryName, setNewCategoryName] = useState('')
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([])
  const [serviceResourceLinks, setServiceResourceLinks] = useState<ServiceResourceLink[]>([])
  const [pendingLinkType, setPendingLinkType] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [svcRes, brRes, catRes, subRes, rtRes, srRes] = await Promise.all([
        supabase.from('services').select('id,name,code,duration_minutes,is_active,branch_id,category_id').eq('tenant_id', tenantId).order('code'),
        supabase.from('branches').select('id,name').eq('tenant_id', tenantId).order('name'),
        supabase.from('service_categories').select('id,name').eq('tenant_id', tenantId).order('name'),
        supabase.from('sub_services').select('id,service_id,name,code,duration_override_minutes,is_active').eq('tenant_id', tenantId),
        supabase.from('resource_types').select('id,name,code').eq('tenant_id', tenantId).order('code'),
        supabase
          .from('service_resources')
          .select('id,service_id,resource_type_id,is_active')
          .eq('tenant_id', tenantId),
      ])
      if (svcRes.error) throw svcRes.error
      if (brRes.error) throw brRes.error
      if (catRes.error) throw catRes.error
      if (subRes.error) throw subRes.error
      if (rtRes.error) throw rtRes.error
      if (srRes.error) throw srRes.error

      const list = (svcRes.data ?? []) as Service[]
      setServices(list)
      setBranches((brRes.data ?? []) as Branch[])
      setCategories((catRes.data ?? []) as Category[])
      setResourceTypes((rtRes.data ?? []) as ResourceType[])
      setServiceResourceLinks((srRes.data ?? []) as ServiceResourceLink[])
      const map: Record<string, SubService[]> = {}
      for (const s of list) map[s.id] = []
      for (const sub of (subRes.data ?? []) as SubService[]) {
        if (!map[sub.service_id]) map[sub.service_id] = []
        map[sub.service_id].push(sub)
      }
      setSubsByService(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function createService() {
    if (!tenantId) {
      setError('Could not resolve your organisation. Refresh the page and try again.')
      return
    }
    const name = newSvc.name.trim()
    if (!name) {
      setError('Enter a service name.')
      return
    }
    const code =
      newSvc.code
        .trim()
        .replace(/\s+/g, '_')
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '') || deriveServiceCodeFromName(name)

    if (!code) {
      setError('Enter a service name that can be turned into a code.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const { data: created, error: iErr } = await supabase
        .from('services')
        .insert({
          tenant_id: tenantId,
          name,
          code,
          duration_minutes: Math.max(1, Number(newSvc.duration_minutes) || 30),
          is_active: true,
          branch_id: newSvc.branch_id || null,
          category_id: newSvc.category_id || null,
        })
        .select('id')
        .single()
      if (iErr) throw new Error(iErr.message)
      if (!created?.id) throw new Error('Service was created but no id was returned.')

      if (newSvc.resource_type_id) {
        const { error: mapErr } = await supabase.from('service_resources').insert({
          tenant_id: tenantId,
          service_id: created.id,
          resource_type_id: newSvc.resource_type_id,
          is_active: true,
        })
        if (mapErr) throw new Error(mapErr.message)
      }

      setNewSvc({
        name: '',
        code: '',
        duration_minutes: 30,
        branch_id: '',
        category_id: '',
        resource_type_id: '',
      })
      setIsServiceCodeAuto(true)
      await load()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function updateService(s: Service, patch: Partial<Service>) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase.from('services').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', s.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function addSubService(serviceId: string) {
    if (!tenantId) return
    const raw = newSub[serviceId] ?? { name: '', code: '' }
    if (!raw.code.trim() || !raw.name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('sub_services').insert({
        tenant_id: tenantId,
        service_id: serviceId,
        name: raw.name.trim(),
        code: raw.code.trim().replace(/\s+/g, '_').toUpperCase(),
        is_active: true,
      })
      if (iErr) throw iErr
      setNewSub((prev) => ({ ...prev, [serviceId]: { name: '', code: '' } }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sub-service create failed')
    } finally {
      setBusy(false)
    }
  }

  async function updateSub(sub: SubService, patch: Partial<SubService>) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase.from('sub_services').update(patch).eq('id', sub.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function addCategory() {
    if (!tenantId || !newCategoryName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('service_categories').insert({
        tenant_id: tenantId,
        name: newCategoryName.trim(),
      })
      if (iErr) throw iErr
      setNewCategoryName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Category create failed')
    } finally {
      setBusy(false)
    }
  }

  function resourceTypeLabel(id: string) {
    return resourceTypes.find((t) => t.id === id)?.name ?? id
  }

  function linksForService(serviceId: string) {
    return serviceResourceLinks.filter((l) => l.service_id === serviceId)
  }

  function unlinkedResourceTypeOptions(serviceId: string) {
    const linked = new Set(linksForService(serviceId).map((l) => l.resource_type_id))
    return resourceTypes.filter((t) => !linked.has(t.id))
  }

  async function addServiceResourceLink(serviceId: string) {
    if (!tenantId) return
    const resourceTypeId = pendingLinkType[serviceId] ?? ''
    if (!resourceTypeId) {
      setError('Choose a resource type to link.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('service_resources').insert({
        tenant_id: tenantId,
        service_id: serviceId,
        resource_type_id: resourceTypeId,
        is_active: true,
      })
      if (iErr) throw iErr
      setPendingLinkType((prev) => ({ ...prev, [serviceId]: '' }))
      await load()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function updateServiceResourceLink(link: ServiceResourceLink, patch: Partial<ServiceResourceLink>) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase.from('service_resources').update(patch).eq('id', link.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function removeServiceResourceLink(linkId: string) {
    if (!confirm('Remove this resource-type link? Customers may not be able to book this service until you link a type again.')) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('service_resources').delete().eq('id', linkId)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('service_categories').delete().eq('id', id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed (services may still reference it).')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Services & Sub-services">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="Services & Sub-services" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="Services & Sub-services"
      description="Catalog of services. For online booking, each service needs at least one active link to a resource type (e.g. Staff, Room), plus an active resource and availability under Resource management."
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className="mb-10 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4">
        <h2 className="text-sm font-semibold mb-3">Service categories</h2>
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <input
            className={`${settingsInputClass} max-w-xs`}
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button type="button" className={settingsBtnPrimary} disabled={busy} onClick={() => void addCategory()}>
            Add category
          </button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-sm"
            >
              <span>{c.name}</span>
              <button type="button" className="text-red-600 text-xs underline" disabled={busy} onClick={() => void deleteCategory(c.id)}>
                remove
              </button>
            </li>
          ))}
        </ul>
        {categories.length === 0 ? <p className="text-xs text-gray-500">No categories yet.</p> : null}
      </section>

      <section className="mb-10 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4">
        <h2 className="text-sm font-semibold mb-3">Add service</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          <strong>Name</strong> is required. The <strong>code</strong> is generated from the name as you type; edit the code field anytime to override. Link a{' '}
          <strong>resource type</strong> so allocation can run (or add the link after creating the service).
        </p>
        {resourceTypes.length === 0 ? (
          <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-3">
            No resource types yet. Create types under{' '}
            <Link className="underline font-medium" to="/settings/resources">
              Resource management
            </Link>{' '}
            first, then link them here.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className={settingsInputClass}
            placeholder="Name *"
            value={newSvc.name}
            onChange={(e) => {
              const name = e.target.value
              setNewSvc((prev) => ({
                ...prev,
                name,
                code: isServiceCodeAuto ? deriveServiceCodeFromName(name) : prev.code,
              }))
            }}
          />
          <div className="space-y-1">
            <input
              className={settingsInputClass}
              placeholder="Code (auto)"
              value={newSvc.code}
              onChange={(e) => {
                setIsServiceCodeAuto(false)
                setNewSvc((prev) => ({ ...prev, code: e.target.value }))
              }}
              aria-label="Service code"
            />
            {isServiceCodeAuto ? (
              <span className="text-[10px] text-purple-700 dark:text-purple-300">Auto from name</span>
            ) : (
              <button
                type="button"
                className="text-[10px] text-purple-700 dark:text-purple-300 underline"
                onClick={() => {
                  setIsServiceCodeAuto(true)
                  setNewSvc((prev) => ({ ...prev, code: deriveServiceCodeFromName(prev.name) }))
                }}
              >
                Reset code from name
              </button>
            )}
          </div>
          <input
            className={settingsInputClass}
            type="number"
            min={1}
            placeholder="Duration (min)"
            value={newSvc.duration_minutes}
            onChange={(e) => setNewSvc({ ...newSvc, duration_minutes: Number(e.target.value) })}
          />
          <select
            className={settingsInputClass}
            value={newSvc.branch_id}
            onChange={(e) => setNewSvc({ ...newSvc, branch_id: e.target.value })}
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            className={settingsInputClass}
            value={newSvc.category_id}
            onChange={(e) => setNewSvc({ ...newSvc, category_id: e.target.value })}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={`${settingsInputClass} md:col-span-2 lg:col-span-4`}
            value={newSvc.resource_type_id}
            onChange={(e) => setNewSvc({ ...newSvc, resource_type_id: e.target.value })}
            aria-label="Resource type for booking"
          >
            <option value="">Resource type for booking (recommended)</option>
            {resourceTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} ({rt.code})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={`mt-3 ${settingsBtnPrimary}`}
          disabled={busy || !newSvc.name.trim()}
          onClick={() => void createService()}
        >
          {busy ? 'Creating…' : 'Create service'}
        </button>
      </section>

      <ul className="space-y-3">
        {services.map((s) => (
          <li key={s.id} className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-[200px] space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    className={settingsInputClass + ' max-w-xs'}
                    value={s.name}
                    onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                    onBlur={() => void updateService(s, { name: s.name })}
                  />
                  <span className="text-xs font-mono text-gray-500">{s.code}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    Duration
                    <input
                      type="number"
                      className="w-20 rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm"
                      value={s.duration_minutes}
                      onChange={(e) =>
                        setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, duration_minutes: Number(e.target.value) } : x)))
                      }
                      onBlur={() => void updateService(s, { duration_minutes: s.duration_minutes })}
                    />
                  </label>
                  <label className="text-xs flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={s.is_active}
                      onChange={(e) => void updateService(s, { is_active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
                <div className="rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/80 dark:bg-black/20 px-3 py-2 space-y-2">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Resource types for booking</div>
                  {linksForService(s.id).length === 0 ? (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      Not bookable yet — link at least one resource type (e.g. Staff or Room).
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {linksForService(s.id).map((link) => (
                        <li key={link.id} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium">{resourceTypeLabel(link.resource_type_id)}</span>
                          <label className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <input
                              type="checkbox"
                              checked={link.is_active}
                              onChange={(e) => void updateServiceResourceLink(link, { is_active: e.target.checked })}
                            />
                            Active
                          </label>
                          <button
                            type="button"
                            className="text-red-600 dark:text-red-400 underline"
                            disabled={busy}
                            onClick={() => void removeServiceResourceLink(link.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <select
                      className={`${settingsInputClass} max-w-[220px]`}
                      value={pendingLinkType[s.id] ?? ''}
                      onChange={(e) => setPendingLinkType((prev) => ({ ...prev, [s.id]: e.target.value }))}
                      aria-label={`Add resource type for ${s.name}`}
                    >
                      <option value="">Add resource type…</option>
                      {unlinkedResourceTypeOptions(s.id).map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name} ({rt.code})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={settingsBtnSecondary}
                      disabled={busy || unlinkedResourceTypeOptions(s.id).length === 0}
                      onClick={() => void addServiceResourceLink(s.id)}
                    >
                      Link
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={settingsBtnSecondary}
                onClick={() => setExpanded((e) => (e === s.id ? null : s.id))}
              >
                {expanded === s.id ? 'Hide sub-services' : 'Sub-services'}
              </button>
            </div>

            {expanded === s.id ? (
              <div className="mt-4 pl-3 border-l-2 border-purple-200 dark:border-purple-900 space-y-3">
                {(subsByService[s.id] ?? []).map((sub) => (
                  <div key={sub.id} className="flex flex-wrap gap-2 items-center text-sm">
                    <input
                      className={settingsInputClass + ' max-w-[200px]'}
                      value={sub.name}
                      onChange={(e) =>
                        setSubsByService((prev) => ({
                          ...prev,
                          [s.id]: (prev[s.id] ?? []).map((x) => (x.id === sub.id ? { ...x, name: e.target.value } : x)),
                        }))
                      }
                      onBlur={() => void updateSub(sub, { name: sub.name })}
                    />
                    <span className="font-mono text-xs text-gray-500">{sub.code}</span>
                    <label className="text-xs flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={sub.is_active}
                        onChange={(e) => void updateSub(sub, { is_active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <input
                    className={settingsInputClass + ' max-w-[180px]'}
                    placeholder="Sub name"
                    value={newSub[s.id]?.name ?? ''}
                    onChange={(e) => setNewSub((prev) => ({ ...prev, [s.id]: { ...(prev[s.id] ?? { name: '', code: '' }), name: e.target.value } }))}
                  />
                  <input
                    className={settingsInputClass + ' max-w-[140px]'}
                    placeholder="Code"
                    value={newSub[s.id]?.code ?? ''}
                    onChange={(e) => setNewSub((prev) => ({ ...prev, [s.id]: { ...(prev[s.id] ?? { name: '', code: '' }), code: e.target.value } }))}
                  />
                  <button type="button" className={settingsBtnSecondary} disabled={busy} onClick={() => void addSubService(s.id)}>
                    Add sub-service
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </SettingsShell>
  )
}
