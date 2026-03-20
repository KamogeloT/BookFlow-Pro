import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type ResourceType = { id: string; name: string; code: string }

const SETTINGS_ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function ResourceManagementSettingsPage() {
  return (
    <RoleGuard allowedRoles={[...SETTINGS_ROLES]}>
      <ResourceMgmtInner />
    </RoleGuard>
  )
}

function ResourceMgmtInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [types, setTypes] = useState<ResourceType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newRow, setNewRow] = useState({ name: '', code: '' })

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('resource_types')
        .select('id,name,code')
        .eq('tenant_id', tenantId)
        .order('code')
      if (qErr) throw qErr
      setTypes((data ?? []) as ResourceType[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resource types')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function createType() {
    if (!tenantId || !newRow.code.trim() || !newRow.name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('resource_types').insert({
        tenant_id: tenantId,
        name: newRow.name.trim(),
        code: newRow.code.trim().replace(/\s+/g, '_').toUpperCase(),
      })
      if (iErr) throw iErr
      setNewRow({ name: '', code: '' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveType(t: ResourceType) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase.from('resource_types').update({ name: t.name, code: t.code }).eq('id', t.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteType(id: string) {
    if (!confirm('Delete this resource type? Resources using it may be blocked.')) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('resource_types').delete().eq('id', id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed (check dependencies).')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Resource Management">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="Resource Management" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="Resource Management"
      description="Resource types define what your physical resources are (rooms, vehicles, staff, etc.). Concrete resources are managed under Resources in the top menu."
      error={error}
      onDismissError={() => setError(null)}
    >
      <p className="mb-4 text-sm">
        <Link to="/resources" className="text-purple-700 dark:text-purple-300 underline font-medium">
          Open Resources →
        </Link>
      </p>

      <section className="mb-6 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4">
        <h2 className="text-sm font-semibold mb-3">Add resource type</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className={settingsInputClass + ' max-w-xs'}
            placeholder="Name"
            value={newRow.name}
            onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
          />
          <input
            className={settingsInputClass + ' max-w-[140px]'}
            placeholder="Code"
            value={newRow.code}
            onChange={(e) => setNewRow({ ...newRow, code: e.target.value })}
          />
          <button type="button" className={settingsBtnPrimary} disabled={busy} onClick={() => void createType()}>
            Add
          </button>
        </div>
      </section>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200/70 dark:border-gray-800">
        {types.map((t) => (
          <li key={t.id} className="p-4 flex flex-wrap gap-3 items-center">
            <input
              className={settingsInputClass + ' flex-1 min-w-[160px] max-w-md'}
              value={t.name}
              onChange={(e) => setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
            />
            <input
              className={settingsInputClass + ' w-32 font-mono text-xs'}
              value={t.code}
              onChange={(e) => setTypes((prev) => prev.map((x) => (x.id === t.id ? { ...x, code: e.target.value } : x)))}
            />
            <button type="button" className={settingsBtnSecondary} disabled={busy} onClick={() => void saveType(types.find((x) => x.id === t.id)!)}>
              Save
            </button>
            <button type="button" className="text-red-600 text-sm underline" disabled={busy} onClick={() => void deleteType(t.id)}>
              Delete
            </button>
          </li>
        ))}
        {types.length === 0 ? <li className="p-6 text-sm text-gray-500">No resource types yet.</li> : null}
      </ul>
    </SettingsShell>
  )
}
